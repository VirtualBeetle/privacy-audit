import { useState, useEffect, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { devApi } from '../api/client';
import { useAuth, isSuperAdmin, isTenantAdmin, isGoogleUser } from '../contexts/AuthContext';
import {
  SettingsIcon, AiIcon, ShieldIcon, CheckIcon, XIcon, RefreshIcon, BellIcon,
} from '../components/icons/Icons';

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

const fieldStyle: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
  fontFamily: "'DM Sans', sans-serif", outline: 'none',
  transition: 'border-color 0.15s', width: '100%', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
  textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 6,
};

function SectionCard({
  icon, iconBg, title, sub, children, delay = 0,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  sub: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div className={`dg-card anim-fade-up d${delay}`} style={{ padding: '24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: iconBg ?? 'rgba(99,102,241,0.1)',
          border: `1px solid ${iconBg ? iconBg.replace('0.1)', '0.2)') : 'rgba(99,102,241,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

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

/* ── Profile Section ─────────────────────────────────────────────────────── */
function ProfileSection() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const tenantAdmin = isTenantAdmin(user);
  const googleUser = isGoogleUser(user);

  const displayName =
    user?.displayName ??
    (user?.tenantUserId ? `User ${user.tenantUserId.slice(0, 8)}` : 'Unknown');

  const roleLabel = googleUser ? 'Google account'
    : superAdmin ? 'Super Admin'
    : tenantAdmin ? 'Tenant Admin'
    : 'Tenant User';

  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SectionCard
      icon={<SettingsIcon style={{ width: 18, height: 18, color: 'var(--accent)' }} />}
      title="Profile"
      sub="Your account identity and session details"
      delay={1}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt={displayName}
            style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {initials}
          </div>
        )}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {displayName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {user?.email ?? '—'}
          </div>
          <span style={{
            display: 'inline-block', marginTop: 5, padding: '2px 9px', borderRadius: 5,
            background: superAdmin ? 'var(--accent-dim)' : tenantAdmin ? 'rgba(245,158,11,0.12)' : googleUser ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.1)',
            color: superAdmin ? 'var(--accent)' : tenantAdmin ? '#f59e0b' : googleUser ? '#10b981' : '#9ca3af',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.4px',
          }}>
            {roleLabel.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Display Name</label>
          <input
            type="text"
            defaultValue={displayName}
            disabled={!superAdmin && !tenantAdmin}
            style={{ ...fieldStyle, opacity: (!superAdmin && !tenantAdmin) ? 0.6 : 1 }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            defaultValue={user?.email ?? ''}
            disabled
            style={{ ...fieldStyle, opacity: 0.6 }}
          />
        </div>
      </div>

      {(user?.tenantId) && (
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Tenant ID</label>
          <input
            type="text"
            value={user.tenantId}
            disabled
            style={{ ...fieldStyle, opacity: 0.6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
          />
        </div>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
        {superAdmin || tenantAdmin
          ? 'Name changes take effect on next login.'
          : 'Profile is managed by your tenant application.'}
      </p>
    </SectionCard>
  );
}

const NOTIF_DEFAULTS = { criticalEvents: true, newRiskAlerts: true, flashTopbar: false };
type NotifPrefs = typeof NOTIF_DEFAULTS;

function loadNotifPrefs(): NotifPrefs {
  try { return { ...NOTIF_DEFAULTS, ...JSON.parse(localStorage.getItem('dg-notif-prefs') ?? '{}') }; } catch { return NOTIF_DEFAULTS; }
}

export function getNotifPrefs(): NotifPrefs { return loadNotifPrefs(); }

/* ── Notifications Section (P18-29) ──────────────────────────────────────── */
function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotifPrefs>(loadNotifPrefs);

  const toggle = (key: keyof NotifPrefs) => {
    setPrefs(p => {
      const next = { ...p, [key]: !p[key] };
      localStorage.setItem('dg-notif-prefs', JSON.stringify(next));
      return next;
    });
  };

  const ITEMS = [
    { key: 'criticalEvents' as const, label: 'Toast for CRITICAL events', sub: 'Show a toast when a CRITICAL event arrives via live stream', color: '#ef4444' },
    { key: 'newRiskAlerts' as const, label: 'Toast for new risk alerts', sub: 'Show a toast when AI analysis generates new findings', color: '#f97316' },
    { key: 'flashTopbar' as const, label: 'Flash topbar on new event', sub: 'Briefly highlight the topbar notification bell when events arrive', color: 'var(--accent)' },
  ];

  return (
    <SectionCard
      icon={<BellIcon style={{ width: 18, height: 18, color: '#f59e0b' }} />}
      iconBg="rgba(245,158,11,0.1)"
      title="Notification Preferences"
      sub="Saved to localStorage — takes effect immediately"
      delay={2}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ITEMS.map(item => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 14px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface-2)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: item.color, boxShadow: `0 0 6px ${item.color}60` }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{item.sub}</div>
            </div>
            <button
              onClick={() => toggle(item.key)}
              style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                background: prefs[item.key] ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 2,
                left: prefs[item.key] ? 20 : 2,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }} />
            </button>
          </div>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
        Key: <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>dg-notif-prefs</code> in localStorage.
      </p>
    </SectionCard>
  );
}

/* ── Sessions Section (P18-28) ───────────────────────────────────────────── */
function SessionsSection() {
  const { user, logout } = useAuth();
  const token = localStorage.getItem('session_token') ?? '';
  const ua = navigator.userAgent;
  const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
  const os = ua.includes('Mac') ? 'macOS' : ua.includes('Win') ? 'Windows' : ua.includes('Linux') ? 'Linux' : 'Unknown OS';

  const handleSignOutAll = () => {
    sessionStorage.clear();
    logout();
    window.location.href = '/login';
  };

  return (
    <SectionCard
      icon={<ShieldIcon style={{ width: 18, height: 18, color: '#10b981' }} />}
      iconBg="rgba(16,185,129,0.1)"
      title="Active Sessions"
      sub="Review and revoke active login sessions"
      delay={3}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>💻</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{browser} on {os}</span>
              <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: 'var(--green-dim)', color: 'var(--green)' }}>● Active</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
              Token: {token.slice(0, 12)}{token.length > 12 ? '…' : ''} · {user?.type ?? 'session'}
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>This device</span>
        </div>
      </div>
      <button
        onClick={handleSignOutAll}
        style={{
          padding: '9px 18px', borderRadius: 10, border: '1px solid var(--red)',
          background: 'var(--red-dim)', color: 'var(--red)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-dim)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
      >
        Sign Out Everywhere
      </button>
      <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Clears all local tokens and redirects to login.</p>
    </SectionCard>
  );
}

/* ── Security Section ────────────────────────────────────────────────────── */
function SecuritySection() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const tenantAdmin = isTenantAdmin(user);
  const googleUser = isGoogleUser(user);

  const [devToken, setDevToken] = useState(() => localStorage.getItem('dev_token') ?? '');
  const [tokenSaved, setTokenSaved] = useState(!!localStorage.getItem('dev_token'));
  const [showToken, setShowToken] = useState(false);

  if (!superAdmin && !tenantAdmin && !googleUser) return null;

  return (
    <SectionCard
      icon={<ShieldIcon style={{ width: 18, height: 18, color: '#10b981' }} />}
      iconBg="rgba(16,185,129,0.1)"
      title="Security"
      sub={superAdmin ? 'Dev token management and session info' : tenantAdmin ? 'API key and session details' : 'Linked accounts and session'}
      delay={3}
    >
      {superAdmin && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Dev Token (for API access)</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="Paste DEV_TOKEN from Render env"
                value={devToken}
                onChange={e => setDevToken(e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={fieldStyle}
              />
              <button
                onClick={() => setShowToken(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
                  fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <button
              onClick={() => {
                if (tokenSaved) {
                  localStorage.removeItem('dev_token');
                  setTokenSaved(false);
                  setDevToken('');
                } else {
                  localStorage.setItem('dev_token', devToken);
                  setTokenSaved(true);
                }
              }}
              style={{
                padding: '9px 18px', borderRadius: 10, border: 'none', whiteSpace: 'nowrap',
                background: tokenSaved ? 'var(--red-dim)' : 'var(--accent)',
                color: tokenSaved ? 'var(--red)' : '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
              }}
            >
              {tokenSaved ? 'Clear' : 'Save'}
            </button>
          </div>
          {tokenSaved && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#059669' }}>
              Token saved to localStorage. Used by Dev/Demo tab and AI Settings.
            </p>
          )}
        </div>
      )}

      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 8 }}>
          Current Session
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { label: 'Session type', value: user?.type ?? '—' },
            { label: 'Role', value: user?.role ?? (googleUser ? 'google_session' : '—') },
            ...(user?.tenantId ? [{ label: 'Tenant ID', value: user.tenantId }] : []),
            ...(user?.tenantUserId ? [{ label: 'User ID', value: user.tenantUserId }] : []),
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 100 }}>{row.label}</span>
              <code style={{
                fontSize: 11, color: 'var(--text)',
                fontFamily: "'JetBrains Mono', monospace",
                background: 'var(--surface)', padding: '2px 6px', borderRadius: 4,
              }}>
                {row.value}
              </code>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

/* ── AI Settings Section ─────────────────────────────────────────────────── */
function AISettingsSection() {
  const [devToken] = useState(() => localStorage.getItem('dev_token') ?? '');
  const tokenSaved = !!devToken;

  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [activeInfo, setActiveInfo] = useState<{ active: boolean; provider?: string; model?: string; label?: string; fallback?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState<AiProvider>('gemini');
  const [newLabel, setNewLabel] = useState('');
  const [newModel, setNewModel] = useState(PROVIDER_META.gemini.models[0]);
  const [newApiKey, setNewApiKey] = useState('');

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
      setError(e?.response?.data?.message ?? 'Failed to load providers — check dev token in Security section');
    } finally {
      setLoading(false);
    }
  }, [tokenSaved, devToken]);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id: string) => {
    setActivating(id);
    try { await devApi.activateAiProvider(devToken, id); await load(); }
    catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to activate'); }
    finally { setActivating(null); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try { await devApi.deleteAiProvider(devToken, id); await load(); }
    catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to delete'); }
    finally { setDeleting(null); }
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !newApiKey.trim()) { setAddError('Label and API key are required'); return; }
    setAdding(true);
    setAddError('');
    try {
      await devApi.addAiProvider(devToken, { provider: newProvider, label: newLabel, model: newModel, apiKey: newApiKey });
      setShowAddForm(false);
      setNewLabel(''); setNewApiKey('');
      setNewProvider('gemini'); setNewModel(PROVIDER_META.gemini.models[0]);
      await load();
    } catch (e: any) { setAddError(e?.response?.data?.message ?? 'Failed to add provider'); }
    finally { setAdding(false); }
  };

  return (
    <SectionCard
      icon={<AiIcon style={{ width: 18, height: 18, color: '#a78bfa' }} />}
      iconBg="rgba(167,139,250,0.1)"
      title="AI Provider"
      sub="Switchable at runtime — no redeploy needed"
      delay={4}
    >
      {!tokenSaved && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          fontSize: 13, color: '#d97706', marginBottom: 16,
        }}>
          Set your dev token in the <strong>Security</strong> section above first, then reload this page to manage AI providers.
        </div>
      )}

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}

      {activeInfo && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          border: `1px solid ${activeInfo.active ? 'rgba(5,150,105,0.3)' : 'var(--border)'}`,
          background: activeInfo.active ? 'rgba(5,150,105,0.06)' : 'var(--surface-2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {activeInfo.active
            ? <CheckIcon style={{ width: 16, height: 16, color: '#059669', flexShrink: 0 }} />
            : <XIcon style={{ width: 16, height: 16, color: 'var(--text-3)', flexShrink: 0 }} />}
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {activeInfo.active
                ? `${activeInfo.label ?? activeInfo.provider} — ${activeInfo.model}`
                : (activeInfo.fallback ?? 'No provider active')}
            </span>
          </div>
          {activeInfo.active && activeInfo.provider && (() => {
            const meta = PROVIDER_META[activeInfo.provider as AiProvider];
            return <span style={{ padding: '2px 8px', borderRadius: 5, background: meta?.bg, color: meta?.color, fontSize: 10, fontWeight: 700 }}>{meta?.name}</span>;
          })()}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          Providers {providers.length > 0 && `(${providers.length})`}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {tokenSaved && (
            <button onClick={load} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)',
              fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              <RefreshIcon style={{ width: 12, height: 12 }} /> Refresh
            </button>
          )}
          <button onClick={() => setShowAddForm(v => !v)} style={{
            padding: '5px 12px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            + Add
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonProviderCard /><SkeletonProviderCard />
        </div>
      ) : !tokenSaved ? null : providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 13 }}>No providers configured yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {providers.map(p => {
            const meta = PROVIDER_META[p.provider];
            return (
              <div key={p._id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${p.isActive ? 'rgba(5,150,105,0.3)' : 'var(--border)'}`,
                background: p.isActive ? 'rgba(5,150,105,0.04)' : 'var(--surface-2)',
              }}>
                <div style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.isActive
                    ? <CheckIcon style={{ width: 16, height: 16, color: '#059669' }} />
                    : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)', display: 'block' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.label}</span>
                    <span style={{ padding: '1px 7px', borderRadius: 5, background: meta?.bg, color: meta?.color, fontSize: 10, fontWeight: 700 }}>{meta?.name}</span>
                    {p.isActive && <span style={{ padding: '1px 7px', borderRadius: 5, background: 'rgba(5,150,105,0.15)', color: '#059669', fontSize: 10, fontWeight: 800 }}>ACTIVE</span>}
                  </div>
                  <code style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>{p.model}</code>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!p.isActive && (
                    <button onClick={() => handleActivate(p._id)} disabled={activating === p._id}
                      style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                      {activating === p._id && <CircularProgress size={10} />}Activate
                    </button>
                  )}
                  <button onClick={() => handleDelete(p._id)} disabled={deleting === p._id}
                    style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}>
                    {deleting === p._id ? <CircularProgress size={11} /> : <XIcon style={{ width: 12, height: 12 }} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddForm && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
          {addError && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', fontSize: 13 }}>{addError}</Alert>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Provider</label>
                <select value={newProvider} onChange={e => { const v = e.target.value as AiProvider; setNewProvider(v); setNewModel(PROVIDER_META[v].models[0]); }} style={fieldStyle}>
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Model</label>
                <select value={newModel} onChange={e => setNewModel(e.target.value)} style={fieldStyle}>
                  {PROVIDER_META[newProvider].models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Label</label>
              <input type="text" placeholder="e.g. Gemini Flash — demo" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>API Key</label>
              <input type="password" placeholder={newProvider === 'gemini' ? 'AIza…' : newProvider === 'claude' ? 'sk-ant-…' : 'sk-…'}
                value={newApiKey} onChange={e => setNewApiKey(e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} style={fieldStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAdd} disabled={adding} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                {adding && <CircularProgress size={13} sx={{ color: '#fff' }} />}{adding ? 'Saving…' : 'Save Provider'}
              </button>
              <button onClick={() => { setShowAddForm(false); setAddError(''); }} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 28 }} className="anim-fade-up">
          <h1 style={{
            margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-0.4px', fontFamily: "'Space Grotesk', sans-serif",
          }}>
            Settings
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
            Manage your account, preferences and security.
          </p>
        </div>

        <ProfileSection />
        <NotificationsSection />
        <SessionsSection />
        <SecuritySection />
        {superAdmin && <AISettingsSection />}

      </div>
    </div>
  );
}
