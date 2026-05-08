import { useState, useEffect, useRef } from 'react';
import { notificationsApi } from '../../api/client';
import { BellIcon, CheckIcon, RefreshIcon } from '../icons/Icons';

interface Notification {
  _id: string;
  recipientType: string;
  tenantId: string | null;
  type: string;
  severity: string | null;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const SEVERITY_COLOR: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  MEDIUM:   { color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

const TYPE_LABEL: Record<string, string> = {
  risk_alert:  'Risk Alert',
  gdpr_request: 'GDPR',
  breach:      'Breach',
  system:      'System',
};

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  unreadCount: number;
  onCountChange: (n: number) => void;
}

export default function NotificationsDrawer({ unreadCount, onCountChange }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await notificationsApi.getAll();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) load();
  };

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    onCountChange(Math.max(0, unreadCount - 1));
  };

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onCountChange(0);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: `1px solid ${open ? 'var(--border)' : 'var(--border)'}`,
          background: open ? 'var(--surface-2)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? 'var(--text)' : 'var(--text-3)',
          cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
        onMouseLeave={e => { if (!open) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; } }}
      >
        <BellIcon style={{ width: 16, height: 16 }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8,
            background: '#ef4444', borderRadius: '50%',
            border: '2px solid var(--surface)',
            animation: 'pulse 1.5s infinite',
          }} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="anim-slide-down"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: 340, maxHeight: 480,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, boxShadow: 'var(--shadow-lg)', zIndex: 999,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  padding: '1px 7px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                  fontSize: 11, fontWeight: 800,
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4 }}>
                <RefreshIcon style={{ width: 13, height: 13 }} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif", padding: '2px 0',
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {loading ? (
              <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 6 }} />
                      <div className="skeleton skeleton-text" style={{ width: '90%', height: 11 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BellIcon style={{ width: 20, height: 20, color: '#ef4444' }} />
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                  Notification service unavailable
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Could not connect to MongoDB. Notifications will appear here once the service is reachable.
                </p>
                <button onClick={load} style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-2)', fontSize: 11,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <RefreshIcon style={{ width: 11, height: 11 }} /> Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BellIcon style={{ width: 20, height: 20, color: 'var(--text-3)' }} />
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>All caught up</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)' }}>No notifications yet. HIGH/CRITICAL risk alerts will appear here.</p>
              </div>
            ) : (
              notifications.map(n => {
                const sev = n.severity ? SEVERITY_COLOR[n.severity] : null;
                return (
                  <div
                    key={n._id}
                    onClick={() => !n.read && handleMarkRead(n._id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      background: n.read ? 'transparent' : 'var(--accent-dim)',
                      cursor: n.read ? 'default' : 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!n.read) (e.currentTarget as HTMLDivElement).style.background = 'var(--accent-dim)'; }}
                    onMouseLeave={e => { if (!n.read) (e.currentTarget as HTMLDivElement).style.background = 'var(--accent-dim)'; }}
                  >
                    {/* Severity dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                      background: sev?.color ?? 'var(--text-3)',
                      boxShadow: sev ? `0 0 6px ${sev.color}60` : 'none',
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        {sev && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 4,
                            background: sev.bg, color: sev.color,
                            fontSize: 9, fontWeight: 800, letterSpacing: '0.3px',
                          }}>
                            {n.severity}
                          </span>
                        )}
                        <span style={{
                          padding: '1px 6px', borderRadius: 4,
                          background: 'var(--surface-2)', color: 'var(--text-3)',
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.3px',
                        }}>
                          {TYPE_LABEL[n.type] ?? n.type}
                        </span>
                        {!n.read && (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', marginLeft: 'auto', flexShrink: 0 }} />
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 3, lineHeight: 1.4 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 4 }}>
                        {n.message.length > 100 ? n.message.slice(0, 100) + '…' : n.message}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {timeAgo(n.createdAt)}
                        {n.read && <span style={{ marginLeft: 8 }}><CheckIcon style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle' }} /> read</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
