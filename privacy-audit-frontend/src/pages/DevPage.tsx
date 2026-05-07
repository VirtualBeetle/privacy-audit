import { useState } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { devApi } from '../api/client';
import { useAuth, isSuperAdmin } from '../contexts/AuthContext';
import { DevIcon, RefreshIcon, CheckIcon, TrashIcon } from '../components/icons/Icons';

const HEALTH_ID = '11111111-1111-1111-1111-111111111111';
const SOCIAL_ID = '22222222-2222-2222-2222-222222222222';

const TENANTS = [
  { id: HEALTH_ID, name: 'HealthTrack' },
  { id: SOCIAL_ID, name: 'ConnectSocial' },
];

interface QueueStats {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  health: 'ok' | 'degraded';
}

function ActionCard({
  title, sub, color, children,
}: { title: string; sub: string; color: string; children: React.ReactNode }) {
  return (
    <div className="dg-card" style={{ padding: '20px 22px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </h3>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>{sub}</p>
      {children}
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 6,
      background: ok ? 'rgba(5,150,105,0.12)' : 'rgba(239,68,68,0.12)',
      color: ok ? '#059669' : '#ef4444',
      fontSize: 11, fontWeight: 800, letterSpacing: '0.3px',
    }}>
      {label}
    </span>
  );
}

const btnStyle = (disabled: boolean, danger = false): React.CSSProperties => ({
  padding: '8px 18px', borderRadius: 9, border: 'none',
  background: disabled ? 'var(--surface-2)' : danger ? 'rgba(239,68,68,0.1)' : 'var(--accent)',
  color: disabled ? 'var(--text-3)' : danger ? 'var(--red)' : '#fff',
  fontSize: 13, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: "'DM Sans', sans-serif",
  transition: 'all 0.15s',
  display: 'flex', alignItems: 'center', gap: 7,
  whiteSpace: 'nowrap' as const,
});

const selectStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)',
  background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12,
  fontFamily: "'DM Sans', sans-serif", outline: 'none', cursor: 'pointer',
};

export default function DevPage() {
  const { user } = useAuth();
  const token = localStorage.getItem('dev_token') ?? '';

  if (!isSuperAdmin(user)) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <DevIcon style={{ width: 40, height: 40, marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', margin: '0 0 4px' }}>Admin access required</p>
          <p style={{ fontSize: 12, margin: 0 }}>This page is visible to super admins only.</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <DevIcon style={{ width: 40, height: 40, color: 'var(--text-3)', marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', margin: '0 0 6px' }}>Dev token not set</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Set your <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4, fontSize: 11, color: 'var(--accent)' }}>DEV_TOKEN</code> in <strong>Settings → Security</strong> to unlock dev controls.
          </p>
        </div>
      </div>
    );
  }

  return <DevPageContent token={token} />;
}

function DevPageContent({ token }: { token: string }) {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);

  // Seed events state
  const [seedTenant, setSeedTenant] = useState(HEALTH_ID);
  const [seedUserId, setSeedUserId] = useState('demo-user-001');

  // Breach state
  const [breachTenant, setBreachTenant] = useState(HEALTH_ID);
  const [breachSeverity, setBreachSeverity] = useState('high');

  // Clear events state
  const [clearTenant, setClearTenant] = useState(HEALTH_ID);

  const show = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const run = async (key: string, fn: () => Promise<any>) => {
    setBusy(b => ({ ...b, [key]: true }));
    try {
      const r = await fn();
      show('success', r?.message ?? 'Done.');
    } catch (e: any) {
      show('error', e?.response?.data?.message ?? 'Request failed');
    } finally {
      setBusy(b => ({ ...b, [key]: false }));
    }
  };

  const fetchQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${(import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080'}/api/dev/queue-status`, {
        headers: { 'x-dev-token': token },
      });
      if (res.ok) setQueueStats(await res.json());
    } catch {
      /* silently ignore */
    } finally {
      setQueueLoading(false);
    }
  };

  const StatBox = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div style={{
      flex: 1, padding: '10px 14px', borderRadius: 10,
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }} className="anim-fade-up">
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DevIcon style={{ width: 20, height: 20, color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', fontFamily: "'Space Grotesk', sans-serif" }}>
              Dev / Demo Controls
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
              Seed data, trigger pipeline stages, manage tenants for live demonstration.
            </p>
          </div>
        </div>

        {feedback && (
          <Alert
            severity={feedback.type}
            onClose={() => setFeedback(null)}
            sx={{ mb: 3, borderRadius: '10px', fontSize: 13 }}
          >
            {feedback.msg}
          </Alert>
        )}

        {/* Queue stats bar */}
        <div className="dg-card anim-fade-up d1" style={{ padding: '18px 22px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
                BullMQ Queue Status
              </span>
              {queueStats && (
                <StatusBadge ok={queueStats.health === 'ok'} label={queueStats.health === 'ok' ? 'HEALTHY' : 'DEGRADED'} />
              )}
            </div>
            <button onClick={fetchQueue} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)',
              fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              <RefreshIcon style={{ width: 12, height: 12 }} /> Refresh
            </button>
          </div>
          {queueLoading ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {[0,1,2,3,4].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: 52, borderRadius: 10 }} />)}
            </div>
          ) : queueStats ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <StatBox label="Waiting" value={queueStats.waiting} color="#eab308" />
              <StatBox label="Active" value={queueStats.active} color="#6366f1" />
              <StatBox label="Completed" value={queueStats.completed} color="#10b981" />
              <StatBox label="Failed" value={queueStats.failed} color="#ef4444" />
              <StatBox label="Delayed" value={queueStats.delayed} color="#9ca3af" />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--text-3)' }}>
              Could not reach queue status endpoint.
            </div>
          )}
        </div>

        {/* Grid of action cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Trigger Risk Analysis */}
          <ActionCard title="Trigger Risk Analysis" sub="Run full AI privacy risk analysis across all active tenants immediately (normally every 6h)." color="#818cf8">
            <button
              disabled={!!busy['risk']}
              onClick={() => run('risk', () => devApi.triggerRiskAnalysis(token))}
              style={btnStyle(!!busy['risk'])}
            >
              {busy['risk'] ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <CheckIcon style={{ width: 14, height: 14 }} />}
              {busy['risk'] ? 'Running…' : 'Run Now'}
            </button>
          </ActionCard>

          {/* Seed Events */}
          <ActionCard title="Seed Events" sub="Inject 20 realistic audit events for a specific tenant and user." color="#10b981">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={seedTenant} onChange={e => setSeedTenant(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  {TENANTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input
                  type="text"
                  value={seedUserId}
                  onChange={e => setSeedUserId(e.target.value)}
                  placeholder="user id"
                  style={{ ...selectStyle, flex: 1, background: 'var(--surface-2)' }}
                />
              </div>
              <button
                disabled={!!busy['seed']}
                onClick={() => run('seed', () => fetch(
                  `${(import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080'}/api/dev/seed-events`,
                  { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-dev-token': token }, body: JSON.stringify({ tenantId: seedTenant, tenantUserId: seedUserId }) }
                ).then(r => r.json()))}
                style={btnStyle(!!busy['seed'])}
              >
                {busy['seed'] ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : null}
                {busy['seed'] ? 'Seeding…' : 'Seed 20 Events'}
              </button>
            </div>
          </ActionCard>

          {/* Trigger Breach */}
          <ActionCard title="Simulate Breach" sub="Create an Art.33 breach report and start the 72-hour regulatory notification countdown." color="#ef4444">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={breachTenant} onChange={e => setBreachTenant(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  {TENANTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={breachSeverity} onChange={e => setBreachSeverity(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
              <button
                disabled={!!busy['breach']}
                onClick={() => run('breach', () => fetch(
                  `${(import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080'}/api/dev/trigger-breach`,
                  { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-dev-token': token }, body: JSON.stringify({ tenantId: breachTenant, severity: breachSeverity }) }
                ).then(r => r.json()))}
                style={btnStyle(!!busy['breach'], true)}
              >
                {busy['breach'] ? <CircularProgress size={13} sx={{ color: 'var(--red)' }} /> : null}
                {busy['breach'] ? 'Creating…' : 'Trigger Breach'}
              </button>
            </div>
          </ActionCard>

          {/* Retention Purge */}
          <ActionCard title="Trigger Retention Purge" sub="Delete audit events past their retentionDays threshold. Normally runs nightly at 02:00 UTC." color="#f59e0b">
            <button
              disabled={!!busy['retention']}
              onClick={() => run('retention', () => fetch(
                `${(import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080'}/api/dev/trigger-retention`,
                { method: 'POST', headers: { 'x-dev-token': token } }
              ).then(r => r.json()))}
              style={btnStyle(!!busy['retention'])}
            >
              {busy['retention'] ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : null}
              {busy['retention'] ? 'Running…' : 'Run Purge'}
            </button>
          </ActionCard>

          {/* Weekly Digest */}
          <ActionCard title="Send Weekly Digest" sub="Dispatch weekly privacy summary emails to all tenant admins right now." color="#60a5fa">
            <button
              disabled={!!busy['digest']}
              onClick={() => run('digest', () => fetch(
                `${(import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080'}/api/dev/trigger-weekly-digest`,
                { method: 'POST', headers: { 'x-dev-token': token } }
              ).then(r => r.json()))}
              style={btnStyle(!!busy['digest'])}
            >
              {busy['digest'] ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : null}
              {busy['digest'] ? 'Sending…' : 'Send Digest'}
            </button>
          </ActionCard>

          {/* Clear Events */}
          <ActionCard title="Clear Events" sub="Delete all audit events for a tenant. Use before a fresh demo run." color="#ef4444">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select value={clearTenant} onChange={e => setClearTenant(e.target.value)} style={selectStyle}>
                {TENANTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button
                disabled={!!busy['clear']}
                onClick={() => run('clear', () => fetch(
                  `${(import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080'}/api/dev/clear-events`,
                  { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-dev-token': token }, body: JSON.stringify({ tenantId: clearTenant }) }
                ).then(r => r.json()))}
                style={btnStyle(!!busy['clear'], true)}
              >
                {busy['clear'] ? <CircularProgress size={13} sx={{ color: 'var(--red)' }} /> : <TrashIcon style={{ width: 13, height: 13 }} />}
                {busy['clear'] ? 'Clearing…' : 'Clear Events'}
              </button>
            </div>
          </ActionCard>

        </div>
      </div>
    </div>
  );
}
