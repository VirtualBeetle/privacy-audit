import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tenantsApi, dashboardApi } from '../api/client';
import { useAuth, isSuperAdmin } from '../contexts/AuthContext';
import type { AuditEvent } from '../types';
import { ShieldIcon, EventsIcon, RiskIcon, VerifyIcon, WebhookIcon } from '../components/icons/Icons';

const SMAP: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string; sub?: string;
}) {
  return (
    <div className="dg-card" style={{ padding: '18px 20px', flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '16px 16px 0 0', opacity: 0.8 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 14, height: 14, color }} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/* Activity heatmap (day × hour) */
function Heatmap({ grid }: { grid: number[][] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxVal = Math.max(1, ...grid.flat());

  return (
    <div className="dg-card" style={{ padding: '20px 22px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 14 }}>
        Activity Heatmap
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 8 }}>events by day × hour</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 2, minWidth: 600 }}>
          {/* hour labels */}
          <div />
          {hours.map(h => (
            <div key={h} style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
              {h % 6 === 0 ? `${h}h` : ''}
            </div>
          ))}
          {/* rows */}
          {DAYS.map((day, di) => (
            <>
              <div key={day} style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', fontWeight: 600 }}>{day}</div>
              {hours.map(h => {
                const val = grid[di][h];
                const intensity = val / maxVal;
                return (
                  <div
                    key={h}
                    title={`${day} ${h}:00 — ${val} events`}
                    style={{
                      height: 16, borderRadius: 3,
                      background: intensity === 0
                        ? 'var(--surface-3)'
                        : `rgba(124, 58, 237, ${0.1 + intensity * 0.85})`,
                      cursor: val > 0 ? 'pointer' : 'default',
                    }}
                  />
                );
              })}
            </>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 10, color: 'var(--text-3)' }}>
          <span>Less</span>
          {[0.1, 0.3, 0.55, 0.75, 0.95].map(op => (
            <div key={op} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(124, 58, 237, ${op})` }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

/* Sensitivity mix bar */
function SensitivityMix({ events }: { events: AuditEvent[] }) {
  const total = events.length || 1;
  const counts = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => ({
    label: s, count: events.filter(e => e.sensitivityCode === s).length, color: SMAP[s],
  }));
  return (
    <div className="dg-card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 14 }}>Sensitivity Mix</div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 12, marginBottom: 14 }}>
        {counts.filter(c => c.count > 0).map(c => (
          <div key={c.label} style={{ flex: c.count / total, background: c.color, transition: 'flex 0.5s ease' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {counts.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, fontWeight: 600 }}>{c.label}</span>
            <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{c.count}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 35, textAlign: 'right' }}>
              {Math.round((c.count / (events.length || 1)) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 3rd party breakdown */
function ThirdPartyPanel({ events }: { events: AuditEvent[] }) {
  const tp = events.filter(e => e.thirdPartyInvolved);
  const recipients: Record<string, number> = {};
  tp.forEach(e => { const r = e.recipientId ?? 'Unknown'; recipients[r] = (recipients[r] ?? 0) + 1; });
  const sorted = Object.entries(recipients).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="dg-card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", flex: 1 }}>
          3rd Party Sharing
        </div>
        <span style={{ padding: '2px 8px', borderRadius: 20, background: tp.length > 0 ? 'var(--amber-dim)' : 'var(--green-dim)', color: tp.length > 0 ? 'var(--amber)' : 'var(--green)', fontSize: 11, fontWeight: 700 }}>
          {tp.length} events
        </span>
      </div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ No third-party sharing detected</div>
      ) : sorted.map(([r, n]) => (
        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r}</span>
          <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div style={{ width: `${(n / tp.length) * 100}%`, height: '100%', background: 'var(--amber)', borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);

  const [tenant, setTenant] = useState<{ id: string; name: string; email: string; isActive: boolean; retentionDays: number; createdAt: string; eventCount: number } | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [heatmapGrid, setHeatmapGrid] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)));
  const [stats, setStats] = useState<{ eventsCount: number; consentRate: number; thirdPartyCount: number; trustScore: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !superAdmin) return;
    (async () => {
      setLoading(true);
      try {
        const [allTenants, statsRes, heatmapRes, eventsRaw] = await Promise.all([
          tenantsApi.listAll(),
          dashboardApi.getTenantStats(id).catch(() => null),
          dashboardApi.getActivityHeatmap(id).catch(() => ({ grid: Array.from({ length: 7 }, () => Array(24).fill(0)) })),
          dashboardApi.getEvents().catch(() => []),
        ]);
        const found = allTenants.find(t => t.id === id);
        setTenant(found ?? null);
        if (statsRes) setStats(statsRes);
        setHeatmapGrid(heatmapRes.grid);
        const raw = (eventsRaw as any).events ?? eventsRaw ?? [];
        setEvents(Array.isArray(raw) ? raw : []);
      } catch {
        setError('Failed to load tenant data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, superAdmin]);

  if (!superAdmin) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Super admin access required to view tenant details.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton dg-card" style={{ height: 100, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--red)' }}>{error || 'Tenant not found.'}</div>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          ← Back
        </button>
      </div>
    );
  }

  const criticalCount = events.filter(e => e.sensitivityCode === 'CRITICAL').length;
  const thirdPartyCount = stats?.thirdPartyCount ?? events.filter(e => e.thirdPartyInvolved).length;
  const consentRate = stats?.consentRate ?? (events.length > 0 ? Math.round((events.filter(e => e.consentObtained).length / events.length) * 100) : 0);
  const trustScore = stats?.trustScore ?? Math.max(0, 100 - criticalCount * 5 - thirdPartyCount * 2 + consentRate / 2);
  const totalEventsCount = stats?.eventsCount ?? events.length;

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>

      {/* Back + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
          ← Back
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Tenants</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>/</span>
        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{tenant.name}</span>
      </div>

      {/* Hero */}
      <div className="dg-card anim-fade-up d0" style={{ padding: '24px 28px', marginBottom: 14, background: 'linear-gradient(135deg, var(--accent-dim), var(--brand-dim))', border: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px var(--brand-glow)', flexShrink: 0 }}>
            <ShieldIcon style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                {tenant.name}
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: tenant.isActive ? 'var(--green-dim)' : 'var(--red-dim)', color: tenant.isActive ? 'var(--green)' : 'var(--red)' }}>
                {tenant.isActive ? '● Active' : '○ Inactive'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{tenant.email}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Member since {new Date(tenant.createdAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })} · {tenant.retentionDays}d retention
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: trustScore >= 75 ? 'var(--green)' : trustScore >= 50 ? 'var(--amber)' : 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>
              {Math.round(trustScore)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Trust Score</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }} className="anim-fade-up d1">
        <KpiCard label="Total Events" value={totalEventsCount} icon={EventsIcon} color="var(--accent)" sub="last 30 days" />
        <KpiCard label="Critical Events" value={criticalCount} icon={RiskIcon} color="var(--red)" sub={`${Math.round((criticalCount / (events.length || 1)) * 100)}% of total`} />
        <KpiCard label="3rd Party Sharing" value={thirdPartyCount} icon={WebhookIcon} color="var(--amber)" sub="events shared" />
        <KpiCard label="Consent Rate" value={`${consentRate}%`} icon={VerifyIcon} color="var(--green)" sub="events consented" />
        <KpiCard label="Trust Score" value={Math.round(trustScore)} icon={ShieldIcon} color={trustScore >= 75 ? 'var(--green)' : trustScore >= 50 ? 'var(--amber)' : 'var(--red)'} sub="DataGuard metric" />
      </div>

      {/* Heatmap */}
      <div className="anim-fade-up d2" style={{ marginBottom: 14 }}>
        <Heatmap grid={heatmapGrid} />
      </div>

      {/* Bottom row: sensitivity + 3rd party + recent events */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 14, marginBottom: 14 }} className="anim-fade-up d3">
        <SensitivityMix events={events} />
        <ThirdPartyPanel events={events} />

        {/* Recent events */}
        <div className="dg-card" style={{ display: 'flex', flexDirection: 'column', maxHeight: 320 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-soft)', fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0 }}>
            Recent Events
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {events.slice(0, 15).map(e => (
              <div key={e.id} style={{ padding: '9px 16px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: SMAP[e.sensitivityCode] ?? '#94a3b8', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: SMAP[e.sensitivityCode] ?? 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, minWidth: 58 }}>{e.sensitivityCode}</span>
                <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.action}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{timeAgo(e.timestamp)}</span>
              </div>
            ))}
            {events.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No events yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* GDPR Rights summary */}
      <div className="dg-card anim-fade-up d4" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 14 }}>GDPR Rights Panel</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { art: 'Art. 5(1)(c)', label: 'Data Minimisation', status: 'Monitored', ok: true },
            { art: 'Art. 7', label: 'Consent', status: `${consentRate}% rate`, ok: consentRate >= 80 },
            { art: 'Art. 17', label: 'Right to Erasure', status: 'Available', ok: true },
            { art: 'Art. 30', label: 'Audit Log', status: `${events.length} events`, ok: true },
          ].map(item => (
            <div key={item.art} style={{ padding: '12px 14px', borderRadius: 10, background: item.ok ? 'var(--green-dim)' : 'var(--red-dim)', border: `1px solid ${item.ok ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: item.ok ? 'var(--green)' : 'var(--red)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{item.art}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{item.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
