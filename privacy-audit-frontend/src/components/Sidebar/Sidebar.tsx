import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, isSuperAdmin, isTenantAdmin, isGoogleUser } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ShieldIcon, DashboardIcon, EventsIcon, RiskIcon, GdprIcon,
  WebhookIcon, SettingsIcon, LogoutIcon, SunIcon, MoonIcon,
  PersonAddIcon, QueueIcon, DevIcon, AppsIcon, HelpIcon, BrainIcon, VerifyIcon,
} from '../icons/Icons';

interface NavItemProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  isDark: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: 'var(--text-3)',
      padding: '10px 16px 4px',
      textTransform: 'uppercase',
      userSelect: 'none',
    }}>
      {children}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, badge, onClick, isDark }: NavItemProps) {
  const [hov, setHov] = useState(false);

  const bg = active
    ? 'var(--accent-dim)'
    : hov
    ? isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
    : 'transparent';

  const col = active
    ? 'var(--accent)'
    : hov
    ? 'var(--text)'
    : 'var(--text-2)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 14px',
        borderRadius: 10,
        border: 'none',
        background: bg,
        color: col,
        position: 'relative',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: active ? 600 : 450,
        letterSpacing: '-0.01em',
      }}
    >
      {active && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: '20%',
          width: 3,
          height: '60%',
          background: 'var(--accent)',
          borderRadius: '0 3px 3px 0',
        }} />
      )}
      <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span style={{
          minWidth: 18,
          height: 18,
          background: 'var(--red)',
          borderRadius: 9,
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 5px',
          flexShrink: 0,
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [themeHov, setThemeHov] = useState(false);
  const [logoutHov, setLogoutHov] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const superAdmin = isSuperAdmin(user);
  const tenantAdmin = isTenantAdmin(user);
  const anyAdmin = superAdmin || tenantAdmin;
  const googleUser = isGoogleUser(user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const p = location.pathname;

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = superAdmin ? 'Super Admin' : tenantAdmin ? 'Tenant Admin' : googleUser ? 'Google User' : 'User';

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(v => !v)}
        style={{
          display: 'none',
          position: 'fixed', top: 12, left: 12, zIndex: 2000,
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--surface)', border: '1px solid var(--border)',
          cursor: 'pointer', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: 'var(--text)',
        }}
        className="mobile-hamburger"
        aria-label="Toggle menu"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
          className="mobile-overlay"
        />
      )}

    <nav style={{
      width: 216,
      minHeight: '100vh',
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 8px',
      flexShrink: 0,
      borderRight: '1px solid var(--border)',
      position: 'relative',
      zIndex: 1000,
      overflowY: 'auto',
      overflowX: 'hidden',
    }}
      className={`dg-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
    >
      {/* Logo + brand */}
      <div
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '18px 8px 16px',
          cursor: 'pointer',
          borderBottom: '1px solid var(--border-soft)',
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 34,
          height: 34,
          background: 'var(--brand)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px var(--brand-glow)',
          flexShrink: 0,
        }}>
          <ShieldIcon style={{ width: 18, height: 18, color: '#fff' }} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text)',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            DataGuard
          </div>
          <div style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--text-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Privacy Audit · V2
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1 }}>
        <SectionLabel>Overview</SectionLabel>
        <NavItem isDark={isDark} icon={DashboardIcon} label="Dashboard" active={p === '/dashboard'} onClick={() => navigate('/dashboard')} />
        <NavItem isDark={isDark} icon={EventsIcon} label="Audit Events" active={p === '/events'} onClick={() => navigate('/events')} />
        {anyAdmin && (
          <NavItem isDark={isDark} icon={RiskIcon} label="Risk Alerts" active={p === '/risk'} onClick={() => navigate('/risk')} />
        )}
        <NavItem isDark={isDark} icon={GdprIcon} label="GDPR Rights" active={p === '/gdpr'} onClick={() => navigate('/gdpr')} />
        <NavItem isDark={isDark} icon={VerifyIcon} label="Consent Matrix" active={p === '/consent-matrix'} onClick={() => navigate('/consent-matrix')} />

        <SectionLabel>Tools</SectionLabel>
        <NavItem isDark={isDark} icon={BrainIcon} label="AI Chat" active={p === '/ai-chat'} onClick={() => navigate('/ai-chat')} />
        <NavItem isDark={isDark} icon={EventsIcon} label="Timeline" active={p === '/timeline'} onClick={() => navigate('/timeline')} />
        {anyAdmin && (
          <NavItem isDark={isDark} icon={WebhookIcon} label="Webhooks" active={p === '/webhooks'} onClick={() => navigate('/webhooks')} />
        )}
        {anyAdmin && (
          <NavItem isDark={isDark} icon={QueueIcon} label="Queue Monitor" active={p === '/queue'} onClick={() => navigate('/queue')} />
        )}
        {(superAdmin || googleUser) && (
          <NavItem isDark={isDark} icon={AppsIcon} label="Connected Apps" active={p === '/connected-apps'} onClick={() => navigate('/connected-apps')} />
        )}
        {superAdmin && (
          <NavItem isDark={isDark} icon={RiskIcon} label="Compare Tenants" active={p === '/compare'} onClick={() => navigate('/compare')} />
        )}
        {superAdmin && (
          <NavItem isDark={isDark} icon={PersonAddIcon} label="Onboard Tenant" active={p === '/onboard'} onClick={() => navigate('/onboard')} />
        )}
        {superAdmin && (
          <NavItem isDark={isDark} icon={DevIcon} label="Dev / Demo" active={p === '/dev'} onClick={() => navigate('/dev')} />
        )}
        <NavItem isDark={isDark} icon={HelpIcon} label="User Guide" active={p === '/guide'} onClick={() => navigate('/guide')} />
        <NavItem isDark={isDark} icon={SettingsIcon} label="Settings" active={p === '/settings'} onClick={() => navigate('/settings')} />
      </div>

      {/* Bottom: theme toggle + user avatar */}
      <div style={{
        borderTop: '1px solid var(--border-soft)',
        paddingTop: 10,
        paddingBottom: 14,
        flexShrink: 0,
      }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          onMouseEnter={() => setThemeHov(true)}
          onMouseLeave={() => setThemeHov(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 14px',
            borderRadius: 10,
            border: 'none',
            background: themeHov ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') : 'transparent',
            color: 'var(--text-2)',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 450,
            textAlign: 'left',
          }}
        >
          {isDark
            ? <SunIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
            : <MoonIcon style={{ width: 16, height: 16, flexShrink: 0 }} />}
          <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHov(true)}
          onMouseLeave={() => setLogoutHov(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 14px',
            borderRadius: 10,
            border: 'none',
            background: logoutHov ? 'var(--red-dim)' : 'transparent',
            color: logoutHov ? 'var(--red)' : 'var(--text-2)',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 450,
            textAlign: 'left',
          }}
        >
          <LogoutIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>Sign out</span>
        </button>

        {/* User avatar row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px 2px',
        }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent)',
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}>
              {displayName}
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--text-3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {roleLabel}
            </div>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
