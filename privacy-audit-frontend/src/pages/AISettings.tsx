import { useState, useEffect, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { devApi } from '../api/client';
import { AiIcon, CheckIcon, XIcon, RefreshIcon } from '../components/icons/Icons';

type AiProvider = 'gemini' | 'claude' | 'openai';

interface ProviderRecord {
  _id: string;
  provider: AiProvider;
  label: string;
  model: string;
  isActive: boolean;
  updatedBy: string;
  createdAt: string;
}

const PROVIDER_META: Record<AiProvider, { name: string; color: string; bg: string; models: string[] }> = {
  gemini: {
    name: 'Google Gemini',
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.1)',
    models: ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  },
  claude: {
    name: 'Anthropic Claude',
    color: '#a78bfa',
    bg: 'rgba(139,92,246,0.1)',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
  },
  openai: {
    name: 'OpenAI',
    color: '#34d399',
    bg: 'rgba(16,185,129,0.1)',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
};

function SkeletonProviderCard() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 10,
      border: '1px solid var(--border)', background: 'var(--surface-2)',
    }}>
      <div className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '60%', height: 12 }} />
      </div>
      <div className="skeleton" style={{ width: 70, height: 28, borderRadius: 8 }} />
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
  fontFamily: "'DM Sans', sans-serif", outline: 'none',
  transition: 'border-color 0.15s', width: '100%', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6,
};

export default function AISettings() {
  const [devToken, setDevToken] = useState(() => localStorage.getItem('dev_token') ?? '');
  const [tokenSaved, setTokenSaved] = useState(!!localStorage.getItem('dev_token'));
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [activeInfo, setActiveInfo] = useState<{ active: boolean; provider?: string; model?: string; label?: string; fallback?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const [newProvider, setNewProvider] = useState<AiProvider>('gemini');
  const [newLabel, setNewLabel] = useState('');
  const [newModel, setNewModel] = useState(PROVIDER_META.gemini.models[0]);
  const [newApiKey, setNewApiKey] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    if (!tokenSaved) return;
    setLoading(true);
    setError('');
    try {
      const [list, active] = await Promise.all([
        devApi.listAiProviders(devToken),
        devApi.getActiveAiProvider(devToken),
      ]);
      setProviders(list);
      setActiveInfo(active);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load providers — check dev token');
    } finally {
      setLoading(false);
    }
  }, [tokenSaved, devToken]);

  useEffect(() => { load(); }, [load]);

  const saveToken = () => {
    localStorage.setItem('dev_token', devToken);
    setTokenSaved(true);
  };

  const handleActivate = async (id: string) => {
    setActivating(id);
    try {
      await devApi.activateAiProvider(devToken, id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to activate');
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await devApi.deleteAiProvider(devToken, id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !newApiKey.trim()) {
      setAddError('Label and API key are required');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      await devApi.addAiProvider(devToken, { provider: newProvider, label: newLabel, model: newModel, apiKey: newApiKey });
      setShowAddForm(false);
      setNewLabel('');
      setNewApiKey('');
      setNewProvider('gemini');
      setNewModel(PROVIDER_META.gemini.models[0]);
      await load();
    } catch (e: any) {
      setAddError(e?.response?.data?.message ?? 'Failed to add provider');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }} className="anim-fade-up">
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AiIcon style={{ width: 22, height: 22, color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)',
              letterSpacing: '-0.4px', fontFamily: "'Space Grotesk', sans-serif",
            }}>
              AI Provider Settings
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
              Manage which AI model powers risk analysis — switchable at runtime, no redeploy needed.
            </p>
          </div>
        </div>

        {/* Dev token gate */}
        {!tokenSaved && (
          <div className="dg-card anim-fade-up d1" style={{ padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, background: 'rgba(91,94,246,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                🔑
              </span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
                Enter Dev Token
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Set <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4, fontSize: 11, color: 'var(--accent)' }}>DEV_TOKEN</code> in your Render audit-backend environment, then paste it here to manage AI providers.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="password"
                placeholder="dev token"
                value={devToken}
                onChange={e => setDevToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveToken()}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={{ ...fieldStyle }}
              />
              <button
                onClick={saveToken}
                disabled={!devToken.trim()}
                style={{
                  padding: '9px 22px', borderRadius: 10, border: 'none', whiteSpace: 'nowrap',
                  background: !devToken.trim() ? 'var(--surface-2)' : 'var(--accent)',
                  color: !devToken.trim() ? 'var(--text-3)' : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: !devToken.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                }}
              >
                Unlock
              </button>
            </div>
          </div>
        )}

        {tokenSaved && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }} className="anim-fade-up">
            <button
              onClick={() => {
                localStorage.removeItem('dev_token');
                setTokenSaved(false);
                setDevToken('');
                setProviders([]);
                setActiveInfo(null);
              }}
              style={{
                padding: '4px 12px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Clear token
            </button>
          </div>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        {/* Active provider banner */}
        {activeInfo && (
          <div className="anim-fade-up d2" style={{
            padding: '16px 20px', borderRadius: 12, marginBottom: 16,
            border: `1.5px solid ${activeInfo.active ? 'rgba(5,150,105,0.3)' : 'var(--border)'}`,
            background: activeInfo.active ? 'rgba(5,150,105,0.06)' : 'var(--surface-2)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: activeInfo.active ? 'rgba(5,150,105,0.12)' : 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeInfo.active
                ? <CheckIcon style={{ width: 18, height: 18, color: '#059669' }} />
                : <XIcon style={{ width: 18, height: 18, color: 'var(--text-3)' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {activeInfo.active
                  ? `Active: ${activeInfo.label ?? activeInfo.provider} — ${activeInfo.model}`
                  : 'No DB provider active'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {activeInfo.active
                  ? `All AI calls are routed to ${PROVIDER_META[activeInfo.provider as AiProvider]?.name ?? activeInfo.provider}.`
                  : (activeInfo.fallback ?? 'AI features will use env var fallback or fail.')}
              </div>
            </div>
            {activeInfo.active && activeInfo.provider && (() => {
              const meta = PROVIDER_META[activeInfo.provider as AiProvider];
              return (
                <span style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: meta?.bg, color: meta?.color,
                  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {meta?.name ?? activeInfo.provider}
                </span>
              );
            })()}
          </div>
        )}

        {/* Provider list card */}
        <div className="dg-card anim-fade-up d2" style={{ padding: '24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{
              margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Configured Providers {providers.length > 0 && `(${providers.length})`}
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {tokenSaved && (
                <button
                  onClick={load}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-3)', fontSize: 12,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <RefreshIcon style={{ width: 13, height: 13 }} />
                  Refresh
                </button>
              )}
              <button
                onClick={() => setShowAddForm(v => !v)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                + Add Provider
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SkeletonProviderCard />
              <SkeletonProviderCard />
            </div>
          ) : !tokenSaved ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
              Enter your dev token above to manage AI providers.
            </div>
          ) : providers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <AiIcon style={{ width: 36, height: 36, color: 'var(--text-3)', marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>No providers configured yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Add a provider to enable AI features.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {providers.map(p => {
                const meta = PROVIDER_META[p.provider];
                return (
                  <div key={p._id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 10,
                    border: `1px solid ${p.isActive ? 'rgba(5,150,105,0.3)' : 'var(--border)'}`,
                    background: p.isActive ? 'rgba(5,150,105,0.04)' : 'var(--surface-2)',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 20, height: 20, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {p.isActive
                        ? <CheckIcon style={{ width: 18, height: 18, color: '#059669' }} />
                        : <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', display: 'block' }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                          {p.label}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 5,
                          background: meta?.bg, color: meta?.color,
                          fontSize: 10, fontWeight: 700,
                        }}>
                          {meta?.name ?? p.provider}
                        </span>
                        {p.isActive && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 5,
                            background: 'rgba(5,150,105,0.15)', color: '#059669',
                            fontSize: 10, fontWeight: 800, letterSpacing: '0.3px',
                          }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, color: 'var(--text-3)',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {p.model}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {!p.isActive && (
                        <button
                          onClick={() => handleActivate(p._id)}
                          disabled={activating === p._id}
                          style={{
                            padding: '5px 12px', borderRadius: 8,
                            border: '1px solid var(--accent)', background: 'transparent',
                            color: 'var(--accent)', fontSize: 12, fontWeight: 700,
                            cursor: activating === p._id ? 'wait' : 'pointer',
                            fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91,94,246,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          {activating === p._id && <CircularProgress size={12} />}
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p._id)}
                        disabled={deleting === p._id}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: '1px solid transparent', background: 'transparent',
                          color: 'var(--text-3)', cursor: deleting === p._id ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--red-dim)';
                          e.currentTarget.style.color = 'var(--red)';
                          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-3)';
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                      >
                        {deleting === p._id
                          ? <CircularProgress size={13} />
                          : <XIcon style={{ width: 14, height: 14 }} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add provider form */}
          {showAddForm && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
              <h4 style={{
                margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Add New Provider
              </h4>
              {addError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', fontSize: 13 }}>
                  {addError}
                </Alert>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Provider</label>
                    <select
                      value={newProvider}
                      onChange={e => {
                        const p = e.target.value as AiProvider;
                        setNewProvider(p);
                        setNewModel(PROVIDER_META[p].models[0]);
                      }}
                      style={{ ...fieldStyle }}
                    >
                      <option value="gemini">Google Gemini (free tier available)</option>
                      <option value="claude">Anthropic Claude</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Model</label>
                    <select
                      value={newModel}
                      onChange={e => setNewModel(e.target.value)}
                      style={{ ...fieldStyle }}
                    >
                      {PROVIDER_META[newProvider].models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Gemini Flash — demo"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    style={{ ...fieldStyle }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>API Key</label>
                  <input
                    type="password"
                    placeholder={newProvider === 'gemini' ? 'AIza…' : newProvider === 'claude' ? 'sk-ant-…' : 'sk-…'}
                    value={newApiKey}
                    onChange={e => setNewApiKey(e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    style={{ ...fieldStyle }}
                  />
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
                    {newProvider === 'gemini'
                      ? 'Get a free key at aistudio.google.com → Get API key'
                      : newProvider === 'claude'
                      ? 'Get key at console.anthropic.com'
                      : 'Get key at platform.openai.com'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    style={{
                      padding: '9px 22px', borderRadius: 10, border: 'none',
                      background: 'var(--accent)', color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: adding ? 'wait' : 'pointer',
                      fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.15s',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {adding && <CircularProgress size={14} sx={{ color: '#fff' }} />}
                    {adding ? 'Saving…' : 'Add & Save'}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setAddError(''); }}
                    style={{
                      padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-2)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* How it works */}
        <div className="dg-card anim-fade-up d3" style={{ padding: '20px 24px' }}>
          <h4 style={{
            margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            How it works
          </h4>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Add one or more providers with their API keys — keys are AES-256-GCM encrypted before storing in MongoDB.',
              'Click "Activate" on the provider you want. All others are automatically deactivated.',
              'Every AI call (risk analysis cron, chat) reads the active provider from DB — no redeploy needed.',
              'If no DB provider is active, the service falls back to GEMINI_API_KEY or ANTHROPIC_API_KEY env vars.',
            ].map((step, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>{step}</li>
            ))}
          </ol>
        </div>

      </div>
    </div>
  );
}
