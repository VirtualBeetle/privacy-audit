import { useState, useEffect } from 'react';
import { dashboardApi } from '../api/client';
import type { AuditEvent } from '../types';
import {
  SearchIcon, FilterIcon, RefreshIcon,
} from '../components/icons/Icons';

/* ── Helpers ──────────────────────────────────────────────────── */
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Config maps ──────────────────────────────────────────────── */
const ACTION_CFG: Record<string, { bg: string; col: string }> = {
  READ:    { bg: 'rgba(37,99,235,0.1)',   col: '#2563eb' },
  EXPORT:  { bg: 'rgba(180,83,9,0.1)',    col: '#b45309' },
  DELETE:  { bg: 'rgba(185,28,28,0.1)',   col: '#b91c1c' },
  SHARE:   { bg: 'rgba(190,18,60,0.1)',   col: '#be123c' },
  WRITE:   { bg: 'rgba(21,128,61,0.1)',   col: '#15803d' },
  ANALYSE: { bg: 'rgba(109,40,217,0.1)',  col: '#6d28d9' },
};

const SENS_BORDER: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
};

const SENS_COLOR: Record<string, { bg: string; col: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.1)',  col: '#ef4444' },
  HIGH:     { bg: 'rgba(249,115,22,0.1)', col: '#f97316' },
  MEDIUM:   { bg: 'rgba(234,179,8,0.1)',  col: '#eab308' },
  LOW:      { bg: 'rgba(34,197,94,0.1)',  col: '#22c55e' },
};

/* ── Skeleton rows ────────────────────────────────────────────── */
function SkeletonEventCard() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[60, 80, 70, 90].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: 22, borderRadius: 6 }} />
        ))}
      </div>
      <div className="skeleton skeleton-text" style={{ width: '65%', marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {[55, 70, 60].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: 20, borderRadius: 5 }} />
        ))}
      </div>
    </div>
  );
}

/* ── Chip component ───────────────────────────────────────────── */
function Chip({ label, bg, col }: { label: string; bg: string; col: string }) {
  return (
    <span style={{
      padding: '3px 9px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      background: bg,
      color: col,
      fontFamily: "'JetBrains Mono', monospace",
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

/* ── Tenant badge ─────────────────────────────────────────────── */
function TenantBadge({ name }: { name: string }) {
  const isHealth = name?.toLowerCase().includes('health');
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: isHealth ? 'rgba(5,150,105,0.1)' : 'rgba(91,94,246,0.1)',
      color: isHealth ? '#059669' : '#5b5ef6',
      border: `1px solid ${isHealth ? 'rgba(5,150,105,0.2)' : 'rgba(91,94,246,0.2)'}`,
      flexShrink: 0,
    }}>
      {name}
    </span>
  );
}

/* ── Event card ───────────────────────────────────────────────── */
function EventCard({ event, idx }: { event: AuditEvent; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const ac = ACTION_CFG[event.actionCode] ?? ACTION_CFG.READ;
  const border = SENS_BORDER[event.sensitivityCode] ?? '#94a3b8';
  const sc = SENS_COLOR[event.sensitivityCode] ?? SENS_COLOR.LOW;
  const delay = idx < 6 ? `d${idx}` : '';

  return (
    <div
      className={`anim-fade-up ${delay}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${border}`,
        borderRadius: 12,
        padding: '14px 16px',
        transition: 'all 0.18s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = 'var(--shadow-md)';
        el.style.transform = 'translateX(2px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = 'none';
        el.style.transform = 'none';
      }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* Top row: badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Chip label={event.actionLabel || event.actionCode} bg={ac.bg} col={ac.col} />
          <Chip label={event.sensitivityCode} bg={sc.bg} col={sc.col} />
          <span style={{
            padding: '3px 9px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: 'var(--surface-2)',
            color: 'var(--text-2)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {event.actorType}
          </span>
          {event.thirdPartyInvolved && (
            <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--amber-dim)', color: 'var(--amber)' }}>
              3rd Party
            </span>
          )}
          {!event.consentObtained && (
            <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--red-dim)', color: 'var(--red)' }}>
              No Consent
            </span>
          )}
          <TenantBadge name={event.tenantName} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
            {timeAgo(event.occurredAt)}
          </span>
          <span style={{
            color: 'var(--text-3)',
            fontSize: 16,
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'none',
            display: 'inline-block',
          }}>⌄</span>
        </div>
      </div>

      {/* Reason */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{event.reasonLabel}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          By {event.actorLabel}{event.actorIdentifier ? ` · ${event.actorIdentifier}` : ''}
        </div>
      </div>

      {/* Data fields */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
        {event.dataFields.map(f => (
          <span key={f} style={{
            padding: '2px 8px',
            borderRadius: 5,
            fontSize: 11,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {f.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="anim-fade-in"
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px 20px',
          }}
        >
          {([
            ['Region',      event.region ?? '—'],
            ['Retention',   `${event.retentionDays} days`],
            ['Consent',     event.consentObtained ? '✓ Yes' : '✗ No'],
            ['Third Party', event.thirdPartyName ?? 'None'],
            ['Occurred',    new Date(event.occurredAt).toLocaleString('en-IE')],
            ['Event ID',    (event.eventId ?? '').slice(0, 16) + '…'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 2 }}>
                {label}
              </div>
              <div style={{
                fontSize: 12.5,
                color: label === 'Consent'
                  ? (event.consentObtained ? 'var(--green)' : 'var(--red)')
                  : 'var(--text)',
                fontFamily: (label === 'Event ID' || label === 'Retention') ? "'JetBrains Mono', monospace" : 'inherit',
              }}>
                {val}
              </div>
            </div>
          ))}
          {event.meta && Object.keys(event.meta).length > 0 && (
            <div style={{
              gridColumn: '1 / -1',
              padding: '10px 12px',
              background: 'var(--surface-2)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>Meta</div>
              {Object.entries(event.meta).map(([k, v]) => (
                <div key={k} style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-2)', marginBottom: 2 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{k}</span>: {String(v)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Select filter ────────────────────────────────────────────── */
function SelectFilter({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '8px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        fontSize: 12.5,
        color: 'var(--text)',
        outline: 'none',
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
    >
      <option value="All">{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function EventsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [sensFilter, setSensFilter] = useState('All');
  const [tenantFilter, setTenantFilter] = useState('All');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await dashboardApi.getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  // SSE: live updates
  useEffect(() => {
    const url = dashboardApi.getStreamUrl();
    const es = new EventSource(url);
    es.onmessage = msg => {
      try {
        const payload = JSON.parse(msg.data);
        const newEvent = payload.event as AuditEvent;
        setEvents(prev => {
          if (prev.some(e => e.id === newEvent.id)) return prev;
          return [newEvent, ...prev];
        });
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      e.reasonLabel.toLowerCase().includes(q) ||
      e.dataFields.some(f => f.includes(q)) ||
      e.actorLabel.toLowerCase().includes(q);
    const matchAction = actionFilter === 'All' || e.actionCode === actionFilter;
    const matchSens = sensFilter === 'All' || e.sensitivityCode === sensFilter;
    const matchTenant = tenantFilter === 'All' || e.tenantName === tenantFilter;
    return matchSearch && matchAction && matchSens && matchTenant;
  });

  return (
    <div style={{
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: 16,
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div className="anim-fade-up d0" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '0 12px',
          flex: 1,
          maxWidth: 340,
          transition: 'border-color 0.15s',
        }}
          onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; }}
          onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
        >
          <SearchIcon style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events, fields, actors…"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '9px 0',
              fontSize: 13,
              color: 'var(--text)',
              width: '100%',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>

        <SelectFilter value={actionFilter} onChange={setActionFilter} options={['READ', 'WRITE', 'SHARE', 'DELETE', 'EXPORT', 'ANALYSE']} placeholder="All actions" />
        <SelectFilter value={sensFilter} onChange={setSensFilter} options={['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']} placeholder="All sensitivity" />
        <SelectFilter value={tenantFilter} onChange={setTenantFilter} options={['HealthTrack', 'ConnectSocial']} placeholder="All apps" />

        <div style={{ flex: 1 }} />

        {/* Queue + chain badges */}
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{
            padding: '5px 12px',
            borderRadius: 20,
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            border: '1px solid rgba(91,94,246,0.2)',
          }}>BullMQ async queue</span>
          <span style={{
            padding: '5px 12px',
            borderRadius: 20,
            background: 'var(--green-dim)',
            color: 'var(--green)',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            border: '1px solid rgba(5,150,105,0.2)',
          }}>SHA-256 chained</span>
        </div>

        {/* Refresh */}
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 9,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            color: 'var(--text-2)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}
        >
          <RefreshIcon style={{ width: 13, height: 13, ...(refreshing ? { animation: 'spin 1s linear infinite' } : {}) }} />
          Refresh
        </button>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="anim-fade-up d1" style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
          Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {events.length} events
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--red-dim)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 10,
          fontSize: 13,
          color: 'var(--red)',
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Event list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 24 }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonEventCard key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map((e, i) => <EventCard key={e.id} event={e} idx={i} />)
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
            <FilterIcon style={{ width: 40, height: 40, margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>No events match your filters</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting the search or filter options</div>
          </div>
        )}
      </div>
    </div>
  );
}
