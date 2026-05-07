import { useState, useEffect } from 'react';
import { useAuth, isSuperAdmin, isTenantAdmin } from '../contexts/AuthContext';
import { QueueIcon, RefreshIcon } from '../components/icons/Icons';

interface QueueStats {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  health: 'ok' | 'degraded';
}

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080';

function StatCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="dg-card" style={{ flex: 1, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color, borderRadius: '0',
      }} />
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="dg-card" style={{ flex: 1, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div className="skeleton" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 0 }} />
      <div className="skeleton" style={{ width: 50, height: 26, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '65%', height: 12 }} />
    </div>
  );
}

export default function QueuePage() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const tenantAdmin = isTenantAdmin(user);
  const token = localStorage.getItem('dev_token') ?? '';

  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/dev/queue-status`, {
        headers: { 'x-dev-token': token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError('Could not connect to queue service. The BullMQ status endpoint requires a dev token and backend connection.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (!superAdmin && !tenantAdmin) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <QueueIcon style={{ width: 40, height: 40, marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', margin: 0 }}>Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }} className="anim-fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <QueueIcon style={{ width: 20, height: 20, color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', fontFamily: "'Space Grotesk', sans-serif" }}>
                Queue Monitor
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
                BullMQ audit event processing pipeline — live stats
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {lastRefreshed && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button onClick={load} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)',
              fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <RefreshIcon style={{ width: 13, height: 13 }} /> Refresh
            </button>
          </div>
        </div>

        {!token ? (
          <div className="dg-card anim-fade-up d1" style={{ padding: '36px', textAlign: 'center' }}>
            <QueueIcon style={{ width: 40, height: 40, color: 'var(--text-3)', marginBottom: 16 }} />
            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>Dev token required</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Set your dev token in <strong>Settings → Security</strong> to view live queue statistics.
            </p>
          </div>
        ) : error ? (
          <>
            {/* Error state — styled empty state, not just a raw error */}
            <div className="dg-card anim-fade-up d1" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <QueueIcon style={{ width: 24, height: 24, color: '#ef4444' }} />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>
                Queue service unavailable
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                {error}
              </p>
              <button onClick={load} style={{
                padding: '8px 20px', borderRadius: 9, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <RefreshIcon style={{ width: 13, height: 13 }} /> Try again
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }} className="anim-fade-up d1">
              {loading ? (
                <>
                  {[0,1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
                </>
              ) : stats ? (
                <>
                  <StatCard label="Waiting" value={stats.waiting} color="#eab308" sub="Jobs pending processing" />
                  <StatCard label="Active" value={stats.active} color="#6366f1" sub="Currently processing" />
                  <StatCard label="Completed" value={stats.completed} color="#10b981" sub="Successfully processed" />
                  <StatCard label="Failed" value={stats.failed} color="#ef4444" sub="Needs investigation" />
                  <StatCard label="Delayed" value={stats.delayed} color="#9ca3af" sub="Scheduled for later" />
                </>
              ) : null}
            </div>

            {/* Health + queue name card */}
            {stats && (
              <div className="dg-card anim-fade-up d2" style={{ padding: '18px 22px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 10,
                    background: stats.health === 'ok' ? 'rgba(5,150,105,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${stats.health === 'ok' ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: stats.health === 'ok' ? '#10b981' : '#ef4444',
                      animation: 'pulse 1.5s infinite',
                      boxShadow: `0 0 0 2px ${stats.health === 'ok' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: stats.health === 'ok' ? '#059669' : '#ef4444' }}>
                      {stats.health === 'ok' ? 'HEALTHY' : 'DEGRADED'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      Queue: <code style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', fontSize: 12 }}>{stats.queue}</code>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      BullMQ + Redis — processes every incoming audit event, computes SHA-256 hash chain, runs data minimisation checks
                    </div>
                  </div>
                  {stats.failed > 0 && (
                    <div style={{
                      marginLeft: 'auto', padding: '8px 14px', borderRadius: 10,
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      fontSize: 12, color: '#ef4444', fontWeight: 600,
                    }}>
                      {stats.failed} failed job{stats.failed !== 1 ? 's' : ''} — check BullMQ logs
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pipeline explanation */}
            <div className="dg-card anim-fade-up d3" style={{ padding: '20px 22px' }}>
              <h4 style={{
                margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.6px',
              }}>
                Pipeline: What each job does
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { step: '1', label: 'Receive event', desc: 'Tenant app POSTs audit event via SDK → validated, queued via BullMQ (202 Accepted)', color: '#6366f1' },
                  { step: '2', label: 'Hash chain', desc: 'Worker fetches previous event\'s hash, computes SHA-256(prevHash + eventFields), stores result', color: '#8b5cf6' },
                  { step: '3', label: 'Data minimisation', desc: 'Checks data fields against tenant\'s allowedDataFields policy, emits violation event via SSE if breach detected', color: '#f59e0b' },
                  { step: '4', label: 'Persist', desc: 'Saves to PostgreSQL with hash chain values — tamper-evident, verifiable via GET /dashboard/chain-integrity', color: '#10b981' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginTop: 1,
                      background: item.color + '20', border: `1px solid ${item.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: item.color,
                    }}>
                      {item.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
