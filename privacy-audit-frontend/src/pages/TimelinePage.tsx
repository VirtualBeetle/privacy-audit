import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../api/client';
import type { AuditEvent } from '../types';

const SMAP: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };

function groupByDate(events: AuditEvent[]): { label: string; date: string; events: AuditEvent[] }[] {
  const map = new Map<string, AuditEvent[]>();
  events.forEach(e => {
    const d = new Date(e.timestamp ?? e.occurredAt);
    const key = d.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  });
  return Array.from(map.entries()).map(([key, evts]) => {
    const date = new Date(key);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (date.toDateString() === today.toDateString()) label = 'Today';
    else if (date.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = date.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return { label, date: key, events: evts };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function TimelinePage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? events.filter(e =>
        (e.action ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.sensitivityCode ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.dataFields ?? []).some(f => f.toLowerCase().includes(search.toLowerCase()))
      )
    : events;

  const groups = groupByDate(filtered);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 24 }} className="anim-fade-up">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', fontFamily: "'Space Grotesk', sans-serif" }}>
            Privacy Timeline
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
            Vertical chronological view of all privacy events — grouped by date.
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 24 }} className="anim-fade-up d1">
          <input
            type="text"
            placeholder="Search events, actions, data fields…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--surface-2)',
              color: 'var(--text)', fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="skeleton" style={{ height: 20, width: 160, borderRadius: 6, marginBottom: 12 }} />
                {[1, 2].map(j => <div key={j} className="skeleton dg-card" style={{ height: 72, borderRadius: 14, marginBottom: 8 }} />)}
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)', fontSize: 14 }}>
            No events {search ? 'matching your search' : 'found'}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {groups.map((group, gi) => (
              <div key={group.date} className={`anim-fade-up d${Math.min(gi, 4)}`}>
                {/* Date header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: gi > 0 ? 24 : 0, position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10, paddingTop: 8, paddingBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>{group.label}</div>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                    {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Events */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.events.map(e => {
                    const col = SMAP[e.sensitivityCode] ?? '#94a3b8';
                    const d = new Date(e.timestamp ?? e.occurredAt);
                    const time = d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={e.id} className="dg-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Time + dot */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, width: 44 }}>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-3)', fontWeight: 600 }}>{time}</span>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: col, boxShadow: `0 0 0 3px ${col}25` }} />
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: `${col}20`, color: col, fontFamily: "'JetBrains Mono', monospace" }}>
                              {e.sensitivityCode}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.action ?? e.actionCode}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                            {(e.dataFields ?? []).slice(0, 4).map(f => (
                              <span key={f} style={{ padding: '1px 6px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-3)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{f}</span>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 12 }}>
                            {e.consentObtained !== undefined && (
                              <span style={{ color: e.consentObtained ? 'var(--green)' : 'var(--text-3)' }}>
                                {e.consentObtained ? '✓ Consented' : '✗ No consent'}
                              </span>
                            )}
                            {e.thirdPartyInvolved && <span style={{ color: 'var(--amber)' }}>⚠ 3rd party</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 48 }} />
      </div>
    </div>
  );
}
