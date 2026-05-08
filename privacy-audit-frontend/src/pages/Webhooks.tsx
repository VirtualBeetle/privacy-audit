import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import { dashboardApi } from '../api/client';
import { WebhookIcon, TrashIcon, RefreshIcon, CheckIcon } from '../components/icons/Icons';

interface Webhook {
  id: string;
  url: string;
  triggerOn: string;
  createdAt: string;
}

const TRIGGER_META: Record<string, { label: string; color: string; bg: string }> = {
  ALL_RISK:      { label: 'All risk alerts', color: 'var(--accent)', bg: 'rgba(129,140,248,0.12)' },
  HIGH_RISK:     { label: 'HIGH + CRITICAL', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  CRITICAL_RISK: { label: 'CRITICAL only',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function SkeletonCard() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 10,
      border: '1px solid var(--border)', background: 'var(--surface-2)',
    }}>
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton skeleton-text" style={{ width: '55%', marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '28%', height: 14 }} />
      </div>
      <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 8 }} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
        background: copied ? 'rgba(5,150,105,0.1)' : 'var(--surface)',
        color: copied ? '#059669' : 'var(--text-2)',
        fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {copied && <CheckIcon style={{ width: 11, height: 11 }} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [url, setUrl] = useState('');
  const [triggerOn, setTriggerOn] = useState('ALL_RISK');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setFetchLoading(true);
    try {
      const data = await dashboardApi.getWebhooks();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch { setWebhooks([]); }
    finally { setFetchLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!url.trim()) return;
    setError('');
    setLoading(true);
    setNewSecret(null);
    try {
      const result = await dashboardApi.addWebhook(url.trim(), triggerOn);
      setNewSecret(result.signingSecret);
      setUrl('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to register webhook.');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await dashboardApi.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch { /* silently handle */ }
  };

  const inputStyle: React.CSSProperties = {
    padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", outline: 'none', transition: 'border-color 0.15s',
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }} className="anim-fade-up">
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(91,94,246,0.1)', border: '1px solid rgba(91,94,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WebhookIcon style={{ width: 20, height: 20, color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)',
              letterSpacing: '-0.4px', fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Webhook Management
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
              Receive HMAC-signed POST notifications when risk alerts are detected.
            </p>
          </div>
        </div>

        {/* Register form card */}
        <div className="dg-card anim-fade-up d1" style={{ padding: '24px', marginBottom: 16 }}>
          <h3 style={{
            margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--text)',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            Register a new webhook
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Verify the{' '}
            <code style={{
              background: 'var(--surface-2)', padding: '1px 5px',
              borderRadius: 4, fontSize: 11, color: 'var(--accent)',
            }}>
              X-Signature-256
            </code>{' '}
            header on your server using the signing secret.
          </p>

          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '10px', fontSize: 13 }}>
              {error}
            </Alert>
          )}

          {newSecret && (
            <div style={{
              marginBottom: 16, padding: '14px 16px', borderRadius: 10,
              background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)',
            }}>
              <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginBottom: 10 }}>
                ✓ Webhook registered! Save your signing secret — shown only once:
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px',
              }}>
                <code style={{
                  flex: 1, fontSize: 12, color: 'var(--text)',
                  fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all',
                }}>
                  {newSecret}
                </code>
                <CopyButton text={newSecret} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              style={{ ...inputStyle, flex: 1, minWidth: 220 }}
            />
            <select
              value={triggerOn}
              onChange={e => setTriggerOn(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="ALL_RISK">All risk alerts</option>
              <option value="HIGH_RISK">HIGH + CRITICAL</option>
              <option value="CRITICAL_RISK">CRITICAL only</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={loading || !url.trim()}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: loading || !url.trim() ? 'var(--surface-2)' : 'var(--accent)',
                color: loading || !url.trim() ? 'var(--text-3)' : '#fff',
                fontSize: 13, fontWeight: 700, cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Registering…' : '+ Register'}
            </button>
          </div>
        </div>

        {/* Webhook list card */}
        <div className="dg-card anim-fade-up d2" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{
              margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Active webhooks {!fetchLoading && `(${webhooks.length})`}
            </h3>
            <button
              onClick={load}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
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
          </div>

          {fetchLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : webhooks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <WebhookIcon style={{ width: 40, height: 40, color: 'var(--text-3)', marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>
                No webhooks registered yet
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                Register your first endpoint above to start receiving notifications.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {webhooks.map(w => {
                const trigger = TRIGGER_META[w.triggerOn] ?? { label: w.triggerOn, color: 'var(--text-2)', bg: 'var(--surface-2)' };
                return (
                  <div key={w.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--surface-2)',
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(91,94,246,0.08)', border: '1px solid rgba(91,94,246,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <WebhookIcon style={{ width: 16, height: 16, color: 'var(--accent)' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text)',
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 5,
                      }}>
                        {w.url}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 5,
                          background: trigger.bg, color: trigger.color,
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
                        }}>
                          {trigger.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(w.id)}
                      title="Delete webhook"
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: '1px solid transparent', background: 'transparent',
                        color: 'var(--text-3)', cursor: 'pointer', flexShrink: 0,
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
                      <TrashIcon style={{ width: 15, height: 15 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security notes */}
        <div className="dg-card anim-fade-up d3" style={{ padding: '18px 24px', marginTop: 16 }}>
          <h4 style={{
            margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            Security Notes
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              'Each POST request carries an HMAC-SHA256 signature in the X-Signature-256 header.',
              'Verify the signature on your server using the signing secret before trusting the payload.',
              'Secrets are displayed only once at registration time — store them in a secrets manager.',
            ].map((note, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>{note}</li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
