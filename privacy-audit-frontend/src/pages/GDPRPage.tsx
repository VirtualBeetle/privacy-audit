import { useState, useEffect, useRef } from 'react';
import Alert from '@mui/material/Alert';
import { useAuth, isAnyAdmin } from '../contexts/AuthContext';
import { dashboardApi } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GdprRequest {
  id: string;
  tenantId: string;
  tenantUserId: string;
  status: string;
  eventCount?: number | null;
  requestedAt: string;
  completedAt: string | null;
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  completed:  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  processing: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  requested:  { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  failed:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? { color: 'var(--text-3)', bg: 'var(--surface-2)' };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6,
      background: c.bg, color: c.color,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

function SectionCard({ title, sub, badge, children }: {
  title: string; sub?: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 24px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── Admin management view ────────────────────────────────────────────────────

function AdminView() {
  const [data, setData] = useState<{ exports: GdprRequest[]; deletions: GdprRequest[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'exports' | 'deletions'>('exports');

  useEffect(() => {
    dashboardApi.getGdprRequests()
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const rows = tab === 'exports' ? (data?.exports ?? []) : (data?.deletions ?? []);

  const stats = data ? {
    totalExports: data.exports.length,
    completedExports: data.exports.filter((e) => e.status === 'completed').length,
    totalDeletions: data.deletions.length,
    completedDeletions: data.deletions.filter((d) => d.status === 'completed').length,
  } : null;

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 920 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.3px' }}>
          GDPR Request Management
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Overview of all Article 20 (Data Portability) and Article 17 (Right to Erasure) requests.
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Total Exports', value: stats.totalExports, color: '#6366f1' },
            { label: 'Completed Exports', value: stats.completedExports, color: '#22c55e' },
            { label: 'Total Deletions', value: stats.totalDeletions, color: '#f97316' },
            { label: 'Completed Deletions', value: stats.completedDeletions, color: '#22c55e' },
          ].map((s) => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500, letterSpacing: '0.3px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['exports', 'deletions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px', borderRadius: 8,
              border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
              background: tab === t ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-3)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              textTransform: 'capitalize',
            }}
          >
            {t === 'exports' ? `Art.20 Exports (${data?.exports.length ?? 0})` : `Art.17 Deletions (${data?.deletions.length ?? 0})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />)}
        </div>
      ) : error ? (
        <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Could not load GDPR requests.
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>No {tab} yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {tab === 'exports' ? 'Article 20 data export requests will appear here.' : 'Article 17 erasure requests will appear here.'}
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: tab === 'exports' ? '1fr 160px 120px 80px 120px' : '1fr 160px 120px 120px',
            padding: '9px 16px', background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
          }}>
            {(tab === 'exports'
              ? ['Request ID', 'Tenant User', 'Status', 'Events', 'Requested']
              : ['Request ID', 'Tenant User', 'Status', 'Requested']
            ).map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {h}
              </div>
            ))}
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: tab === 'exports' ? '1fr 160px 120px 80px 120px' : '1fr 160px 120px 120px',
                padding: '11px 16px', alignItems: 'center',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                {r.id.slice(0, 14)}…
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace" }}>
                {r.tenantUserId.slice(0, 12)}…
              </div>
              <div><StatusBadge status={r.status} /></div>
              {tab === 'exports' && (
                <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {(r as any).eventCount ?? '—'}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {new Date(r.requestedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User rights view ──────────────────────────────────────────────────────────

function UserRightsView() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ id: string; status: string } | null>(null);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{ id: string; status: string } | null>(null);
  const [deletionConfirm, setDeletionConfirm] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await dashboardApi.requestExport();
      setExportStatus({ id: res.requestId, status: res.status });
      pollRef.current = setInterval(async () => {
        const s = await dashboardApi.getExportStatus(res.requestId);
        setExportStatus({ id: res.requestId, status: s.status });
        if (s.status === 'completed') {
          clearInterval(pollRef.current!);
          await dashboardApi.downloadExport(res.requestId);
        }
        if (s.status === 'failed') clearInterval(pollRef.current!);
      }, 2000);
    } catch {
      setExportStatus(null);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeletion = async () => {
    if (!deletionConfirm) { setDeletionConfirm(true); return; }
    setDeletionLoading(true);
    setDeletionConfirm(false);
    try {
      const res = await dashboardApi.requestDeletion();
      setDeletionStatus({ id: res.requestId, status: res.status });
      const poll = setInterval(async () => {
        const s = await dashboardApi.getDeletionStatus(res.requestId);
        setDeletionStatus({ id: res.requestId, status: s.status });
        if (s.status === 'completed' || s.status === 'failed') clearInterval(poll);
      }, 2000);
    } catch {
      setDeletionStatus(null);
    } finally {
      setDeletionLoading(false);
    }
  };

  const articles = [
    {
      art: 'Art. 5(1)(a)',
      title: 'Lawfulness & Transparency',
      desc: 'Every processing operation is logged with a stated purpose and legal basis.',
    },
    {
      art: 'Art. 17',
      title: 'Right to Erasure',
      desc: 'Request hard-deletion of all your audit records. A SHA-256 evidence hash is retained for regulatory accountability.',
    },
    {
      art: 'Art. 20',
      title: 'Data Portability',
      desc: 'Download a machine-readable JSON export of every audit event associated with your account.',
    },
    {
      art: 'Art. 30',
      title: 'Records of Processing',
      desc: 'A tamper-evident SHA-256 hash chain links every event. Verify integrity at any time.',
    },
  ];

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.3px' }}>
          Your GDPR Rights
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Exercise your data rights under the General Data Protection Regulation.
        </div>
      </div>

      {/* Rights overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
        {articles.map((a) => (
          <div key={a.art} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                padding: '2px 7px', borderRadius: 5,
                background: 'rgba(99,102,241,0.1)', color: 'var(--accent)',
                fontSize: 9, fontWeight: 800, letterSpacing: '0.4px',
              }}>
                {a.art}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{a.title}</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Export */}
      <SectionCard
        title="Article 20 — Data Portability"
        sub="Download a complete JSON export of your audit records."
      >
        {exportStatus && (
          <Alert
            severity={exportStatus.status === 'failed' ? 'error' : exportStatus.status === 'completed' ? 'success' : 'info'}
            sx={{ mb: 1.5, py: 0.5, borderRadius: 1, fontSize: 12 }}
          >
            {exportStatus.status === 'completed'
              ? 'Export ready — download started.'
              : exportStatus.status === 'failed'
              ? 'Export failed. Please try again.'
              : 'Processing your export…'}
          </Alert>
        )}
        <button
          onClick={handleExport}
          disabled={exportLoading || exportStatus?.status === 'processing'}
          style={{
            padding: '9px 20px', borderRadius: 9,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            opacity: (exportLoading || exportStatus?.status === 'processing') ? 0.6 : 1,
          }}
        >
          {exportLoading || exportStatus?.status === 'processing' ? 'Exporting…' : 'Request Export'}
        </button>
      </SectionCard>

      {/* Deletion */}
      <SectionCard
        title="Article 17 — Right to Erasure"
        sub="Permanently delete all your audit records. A cryptographic evidence hash is kept for regulatory accountability."
      >
        {deletionStatus && (
          <Alert
            severity={deletionStatus.status === 'failed' ? 'error' : deletionStatus.status === 'completed' ? 'success' : 'warning'}
            sx={{ mb: 1.5, py: 0.5, borderRadius: 1, fontSize: 12 }}
          >
            {deletionStatus.status === 'completed'
              ? 'Your data has been erased. An evidence hash has been retained for compliance.'
              : deletionStatus.status === 'failed'
              ? 'Deletion failed. Please contact support.'
              : 'Deletion in progress…'}
          </Alert>
        )}
        {deletionConfirm && (
          <div style={{
            padding: '12px 14px', marginBottom: 12,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 9, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
          }}>
            <strong style={{ color: '#ef4444' }}>This cannot be undone.</strong> All your audit records will be permanently deleted. Click the button again to confirm.
          </div>
        )}
        <button
          onClick={handleDeletion}
          disabled={deletionLoading}
          style={{
            padding: '9px 20px', borderRadius: 9,
            background: deletionConfirm ? '#ef4444' : 'transparent',
            color: deletionConfirm ? '#fff' : '#ef4444',
            border: '1px solid #ef4444',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            opacity: deletionLoading ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          {deletionLoading ? 'Processing…' : deletionConfirm ? 'Confirm Delete' : 'Request Deletion'}
        </button>
        {deletionConfirm && (
          <button
            onClick={() => setDeletionConfirm(false)}
            style={{
              marginLeft: 8, padding: '9px 14px', borderRadius: 9,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function GDPRPage() {
  const { user } = useAuth();
  if (isAnyAdmin(user)) return <AdminView />;
  return <UserRightsView />;
}
