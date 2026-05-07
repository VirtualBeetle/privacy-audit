import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, isSuperAdmin, isTenantAdmin, isGoogleUser } from '../../contexts/AuthContext';
import { ChevDownIcon, LogoutIcon, SettingsIcon } from '../icons/Icons';
import { notificationsApi } from '../../api/client';
import NotificationsDrawer from '../NotificationsDrawer/NotificationsDrawer';

interface LiveBadgeProps { flash: boolean; }

function LiveBadge({ flash }: LiveBadgeProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 20,
      background: flash ? 'rgba(5,150,105,0.12)' : 'rgba(156,163,175,0.08)',
      border: `1px solid ${flash ? 'rgba(5,150,105,0.25)' : 'rgba(156,163,175,0.15)'}`,
      transition: 'all 0.4s ease',
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: flash ? '#10b981' : '#9ca3af',
        display: 'block',
        animation: flash ? 'pulse 1.5s infinite' : 'none',
        boxShadow: flash ? '0 0 0 2px rgba(16,185,129,0.2)' : 'none',
        transition: 'all 0.4s ease',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.4px',
        color: flash ? '#059669' : '#9ca3af',
        fontFamily: "'JetBrains Mono', monospace",
        transition: 'color 0.4s ease',
      }}>
        {flash ? 'NEW EVENT' : 'LIVE'}
      </span>
    </div>
  );
}

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':       { title: 'Privacy Overview',     sub: 'Your personal data access timeline' },
  '/events':          { title: 'Audit Events',          sub: 'Full tamper-evident event log with SHA-256 hash chain' },
  '/risk':            { title: 'Risk Alerts',           sub: 'AI-generated privacy risk findings' },
  '/gdpr':            { title: 'GDPR Rights',           sub: 'Exercise your data rights' },
  '/webhooks':        { title: 'Webhooks',              sub: 'HMAC-signed notification endpoints' },
  '/ai-settings':     { title: 'Settings',              sub: 'Account, AI provider & preferences' },
  '/settings':        { title: 'Settings',              sub: 'Account, AI provider & preferences' },
  '/onboard':         { title: 'Onboard Tenant',        sub: 'Connect a new tenant application' },
  '/dev':             { title: 'Dev / Demo Controls',   sub: 'Seed data, trigger analysis, manage tenants' },
  '/queue':           { title: 'Queue Monitor',         sub: 'BullMQ audit event processing status' },
  '/connected-apps':  { title: 'Connected Apps',        sub: 'Manage tenant connections' },
  '/guide':           { title: 'User Guide',             sub: 'Credentials, features & demo walkthrough' },
};

interface TopbarProps {
  liveFlash?: boolean;
}

export default function Topbar({ liveFlash = false }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const data = await notificationsApi.getUnreadCount();
        if (active) setUnreadCount(data.count ?? 0);
      } catch {
        // silently ignore — bell badge just stays at 0
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const meta = PAGE_META[location.pathname] ?? { title: 'DataGuard', sub: 'Privacy Dashboard' };

  const displayName =
    user?.displayName ??
    (user?.tenantUserId ? `User ${user.tenantUserId.slice(0, 8)}` : 'Guest');

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      height: 64,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Left: page title */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--text)',
          fontFamily: "'Space Grotesk', sans-serif",
          lineHeight: 1.2,
          letterSpacing: '-0.3px',
        }}>
          {meta.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
          {meta.sub}
        </div>
      </div>

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LiveBadge flash={liveFlash} />

        {/* Notification bell */}
        <NotificationsDrawer unreadCount={unreadCount} onCountChange={setUnreadCount} />

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: 'var(--border)' }} />

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '5px 8px 5px 5px',
              background: menuOpen ? 'var(--surface-2)' : 'transparent',
              border: '1px solid',
              borderColor: menuOpen ? 'var(--border)' : 'transparent',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            }}
            onMouseLeave={e => {
              if (!menuOpen) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
              }
            }}
          >
            {/* Avatar */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #5b5ef6, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: '#fff',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {initials}
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {isGoogleUser(user) ? 'Google account' : isSuperAdmin(user) ? 'Super admin' : isTenantAdmin(user) ? 'Tenant admin' : 'Tenant user'}
              </div>
            </div>
            <ChevDownIcon style={{ width: 14, height: 14, color: 'var(--text-3)', marginLeft: 2 }} />
          </button>

          {menuOpen && (
            <div
              className="anim-slide-down"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 200,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-lg)',
                zIndex: 999,
                padding: 6,
              }}
            >
              {[
                { label: 'Settings', icon: SettingsIcon, action: () => { setMenuOpen(false); navigate('/settings'); } },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'background 0.12s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <item.icon style={{ width: 15, height: 15, color: 'var(--text-3)' }} />
                  {item.label}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  width: '100%',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: 'var(--red)',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.12s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-dim)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <LogoutIcon style={{ width: 15, height: 15 }} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
