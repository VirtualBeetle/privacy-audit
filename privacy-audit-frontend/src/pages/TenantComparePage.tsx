import { useState, useEffect } from 'react';
import { tenantsApi, dashboardApi } from '../api/client';
import { useAuth, isSuperAdmin } from '../contexts/AuthContext';
import type { AuditEvent } from '../types';

const SMAP: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };

interface TenantData {
  id: string;
  name: string;
  events: AuditEvent[];
  loading: boolean;
}

function DonutMini({ data, size = 80 }: { data: { code: string; count: number }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface-3)' }} />;
  let cumulative = 0;
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {data.map((d, i) => {
        const pct = d.count / total;
        const offset = circ * (1 - cumulative / total);
        const dash = circ * pct;
        cumulative += d.count;
        return (
          <circle key={i} cx={cx} cy={cx} r={r} fill="none"
            stroke={SMAP[d.code] ?? '#94a3b8'} strokeWidth={10}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={offset}
            strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

function GaugeMini({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", minWidth: 38, textAlign: 'right' }}>
        {Math.round(value)}{max === 100 ? '%' : ''}
      </span>
    </div>
  );
}

function TenantColumn({ td }: { td: TenantData }) {
  const total = td.events.length;
  const critical = td.events.filter(e => e.sensitivityCode === 'CRITICAL').length;
  const thirdParty = td.events.filter(e => e.thirdPartyInvolved).length;
  const consented = td.events.filter(e => e.consentObtained).length;
  const consentRate = total > 0 ? (consented / total) * 100 : 0;
  const trustScore = Math.max(0, Math.round(100 - critical * 5 - thirdParty * 2 + consentRate / 2));

  const sensitivityData = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(code => ({
    code, count: td.events.filter(e => e.sensitivityCode === code).length,
  })).filter(d => d.count > 0);

  const fieldCounts: Record<string, number> = {};
  td.events.forEach(e => (e.dataFields ?? []).forEach(f => { fieldCounts[f] = (fieldCounts[f] ?? 0) + 1; }));
  const topFields = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxField = Math.max(1, ...topFields.map(f => f[1]));

  const trustColor = trustScore >= 75 ? 'var(--green)' : trustScore >= 50 ? 'var(--amber)' : 'var(--red)';

  if (td.loading) {
    return (
      <div className="dg-card" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 28, width: '60%', borderRadius: 8 }} />
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 20, borderRadius: 6 }} />)}
      </div>
    );
  }

  return (
    <div className="dg-card" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{td.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{total} events</div>
      </div>

      {/* Trust score */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Trust Score</div>
        <div style={{ fontSize: 38, fontWeight: 800, color: trustColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, marginBottom: 6 }}>{trustScore}</div>
        <GaugeMini value={trustScore} color={trustColor} />
      </div>

      {/* Consent rate */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Consent Rate</div>
        <GaugeMini value={consentRate} color={consentRate >= 80 ? 'var(--green)' : consentRate >= 50 ? 'var(--amber)' : 'var(--red)'} />
      </div>

      {/* Sensitivity mix */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Sensitivity Mix</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <DonutMini data={sensitivityData} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sensitivityData.map(d => (
              <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SMAP[d.code], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-2)', flex: 1 }}>{d.code}</span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)', fontWeight: 700 }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk score */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Critical Events</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: critical > 0 ? 'var(--red)' : 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>{critical}</div>
      </div>

      {/* Top data fields */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Top Data Fields</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {topFields.map(([field, count]) => (
            <div key={field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'capitalize' }}>{field.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{ width: `${(count / maxField) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
              </div>
            </div>
          ))}
          {topFields.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No data fields recorded</div>}
        </div>
      </div>
    </div>
  );
}

export default function TenantComparePage() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!superAdmin) return;
    (async () => {
      setLoading(true);
      try {
        const all = await tenantsApi.listAll();
        const first2 = all.slice(0, 2);
        const initial: TenantData[] = first2.map(t => ({ id: t.id, name: t.name, events: [], loading: true }));
        setTenants(initial);
        setLoading(false);

        // Load events for each tenant
        await Promise.all(first2.map(async (t, i) => {
          try {
            const stats = await dashboardApi.getTenantStats(t.id);
            // Use stats to build synthetic events representation
            setTenants(prev => prev.map((td, idx) =>
              idx === i ? { ...td, events: stats.recentActivity.map(a => ({
                id: a.id, sensitivityCode: a.severity, action: a.action,
                dataFields: [], consentObtained: false, thirdPartyInvolved: false,
                occurredAt: a.occurredAt, timestamp: a.occurredAt,
              } as any)), loading: false } : td
            ));
          } catch {
            const raw = await dashboardApi.getEvents().catch(() => []);
            const evts = (Array.isArray(raw) ? raw : []).filter((e: any) => e.tenantId === t.id);
            setTenants(prev => prev.map((td, idx) => idx === i ? { ...td, events: evts, loading: false } : td));
          }
        }));
      } catch { setLoading(false); }
    })();
  }, [superAdmin]);

  if (!superAdmin) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center', color: 'var(--text-2)', fontSize: 14 }}>
        Super admin access required to compare tenants.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 28 }} className="anim-fade-up">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', fontFamily: "'Space Grotesk', sans-serif" }}>
            Tenant Comparison
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
            Side-by-side comparison of privacy metrics for the top 2 tenants.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', gap: 16 }}>
            {[1, 2].map(i => <div key={i} className="skeleton dg-card" style={{ flex: 1, height: 480, borderRadius: 16 }} />)}
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)' }}>No tenants found.</div>
        ) : (
          <div className="anim-fade-up d1" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {tenants.map(td => <TenantColumn key={td.id} td={td} />)}
          </div>
        )}
      </div>
    </div>
  );
}
