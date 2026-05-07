import { useState, useEffect } from 'react';
import { useAuth, isSuperAdmin, isGoogleUser } from '../contexts/AuthContext';
import { dashboardApi, tenantsApi } from '../api/client';
import { api } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedAccount {
  id: string;
  tenantId: string;
  tenantUserId: string;
  linkedAt: string;
}

interface AvailableTenant {
  id: string;
  name: string;
}

interface AdminTenant {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  retentionDays: number;
  createdAt: string;
  eventCount: number;
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6,
      background: bg, color,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
    }}>
      {children}
    </span>
  );
}

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 24px', marginBottom: 20,
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Google user view ─────────────────────────────────────────────────────────

function GoogleUserView() {
  const [linked, setLinked] = useState<LinkedAccount[]>([]);
  const [available, setAvailable] = useState<AvailableTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardApi.getLinkedAccounts(),
      tenantsApi.listAvailable(),
    ]).then(([la, av]) => {
      setLinked(la.linkedAccounts ?? []);
      setAvailable(av ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const linkedTenantIds = new Set(linked.map((l) => l.tenantId));
  const unlinkable = available.filter((t) => linkedTenantIds.has(t.id));
  const linkable = available.filter((t) => !linkedTenantIds.has(t.id));

  const handleLink = async () => {
    if (!selectedTenant || !email || !password) {
      setLinkError('All fields are required.');
      return;
    }
    setLinking(true);
    setLinkError('');
    setLinkSuccess('');
    try {
      const loginRes = await api.post('/auth/login', { email, password }).then((r) => r.data);
      const dashboardToken: string = loginRes.access_token;
      const googleToken = localStorage.getItem('session_token') ?? '';
      await dashboardApi.linkAccountWith(dashboardToken, googleToken);
      const refreshed = await dashboardApi.getLinkedAccounts();
      setLinked(refreshed.linkedAccounts ?? []);
      setLinkSuccess('Account linked successfully.');
      setShowLinkForm(false);
      setEmail('');
      setPassword('');
      setSelectedTenant('');
    } catch (err: any) {
      setLinkError(err?.response?.data?.message ?? 'Could not link account. Check your credentials.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (account: LinkedAccount) => {
    setUnlinkingId(account.id);
    try {
      await dashboardApi.unlinkAccount(account.tenantId, account.tenantUserId);
      setLinked((prev) => prev.filter((l) => l.id !== account.id));
    } catch {
      // silently ignore
    } finally {
      setUnlinkingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 28px' }}>
        {[0, 1].map((i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  const tenantName = (tenantId: string) =>
    available.find((t) => t.id === tenantId)?.name ?? tenantId.slice(0, 8) + '…';

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.3px' }}>
          Connected Apps
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Link your Google account to tenant applications to view their audit events in your dashboard.
        </div>
      </div>

      {/* Linked accounts */}
      <SectionCard title="Linked Accounts" sub={`${linked.length} tenant app${linked.length !== 1 ? 's' : ''} connected`}>
        {linked.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>
            No apps linked yet. Use the button below to connect a tenant application.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {linked.map((acc) => (
              <div
                key={acc.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--surface-2)', borderRadius: 10,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #5b5ef6, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: '#fff',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    {tenantName(acc.tenantId)[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {tenantName(acc.tenantId)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                      User ID: {acc.tenantUserId.slice(0, 12)}… · Linked {new Date(acc.linkedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleUnlink(acc)}
                  disabled={unlinkingId === acc.id}
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: '#ef4444', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    opacity: unlinkingId === acc.id ? 0.5 : 1,
                  }}
                >
                  {unlinkingId === acc.id ? 'Removing…' : 'Unlink'}
                </button>
              </div>
            ))}
          </div>
        )}

        {linkSuccess && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#22c55e' }}>
            {linkSuccess}
          </div>
        )}
      </SectionCard>

      {/* Link new account */}
      {linkable.length > 0 && (
        <SectionCard title="Link a New App" sub="Enter the tenant account credentials to connect it to your Google identity">
          {!showLinkForm ? (
            <button
              onClick={() => setShowLinkForm(true)}
              style={{
                padding: '8px 18px', borderRadius: 9,
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              + Link App
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>TENANT APP</label>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)', color: 'var(--text)',
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <option value="">Select tenant…</option>
                  {linkable.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>TENANT ACCOUNT EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tenant.com"
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, boxSizing: 'border-box',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)', color: 'var(--text)',
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, boxSizing: 'border-box',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)', color: 'var(--text)',
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none',
                  }}
                />
              </div>
              {linkError && (
                <div style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#ef4444' }}>
                  {linkError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleLink}
                  disabled={linking}
                  style={{
                    padding: '8px 18px', borderRadius: 9,
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    opacity: linking ? 0.6 : 1,
                  }}
                >
                  {linking ? 'Linking…' : 'Link Account'}
                </button>
                <button
                  onClick={() => { setShowLinkForm(false); setLinkError(''); }}
                  style={{
                    padding: '8px 14px', borderRadius: 9,
                    border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-2)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

// ─── Super admin view ──────────────────────────────────────────────────────────

function AdminView() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    tenantsApi.listAll()
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const total = tenants.length;
  const active = tenants.filter((t) => t.isActive).length;
  const totalEvents = tenants.reduce((s, t) => s + t.eventCount, 0);

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.3px' }}>
          Tenant Management
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          All registered tenant applications and their current status.
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total Tenants', value: total, color: 'var(--accent)' },
          { label: 'Active', value: active, color: '#22c55e' },
          { label: 'Total Events', value: totalEvents.toLocaleString(), color: '#6366f1' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontWeight: 500, letterSpacing: '0.3px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Could not load tenants. Please refresh.
        </div>
      ) : tenants.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No tenants registered yet.
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 180px 90px 90px 110px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}>
            {['Tenant', 'Email', 'Status', 'Events', 'Registered'].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {h}
              </div>
            ))}
          </div>
          {tenants.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 180px 90px 90px 110px',
                padding: '12px 16px', alignItems: 'center',
                borderBottom: i < tenants.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                  {t.id.slice(0, 12)}…
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{t.email}</div>
              <div>
                {t.isActive
                  ? <Badge color="#22c55e" bg="rgba(34,197,94,0.1)">Active</Badge>
                  : <Badge color="#9ca3af" bg="rgba(156,163,175,0.1)">Inactive</Badge>
                }
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace" }}>
                {t.eventCount.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {new Date(t.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ConnectedAppsPage() {
  const { user } = useAuth();

  if (isSuperAdmin(user)) return <AdminView />;
  if (isGoogleUser(user)) return <GoogleUserView />;

  return (
    <div style={{ padding: '60px 28px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
        This page is only available for Google-authenticated users and administrators.
      </div>
    </div>
  );
}
