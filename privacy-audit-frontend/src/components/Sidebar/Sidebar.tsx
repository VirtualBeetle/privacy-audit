import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ShieldIcon, DashboardIcon, EventsIcon, RiskIcon,
  GdprIcon, WebhookIcon, SettingsIcon, LogoutIcon,
  SunIcon, MoonIcon,
} from '../icons/Icons';

interface NavItemProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span style={{
          position: 'absolute',
          left: 'calc(100% + 12px)',
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#1e2435',
          color: '#f1f5f9',
          padding: '5px 11px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.12s ease',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {label}
        </span>
      )}
    </span>
  );
}

function NavItem({ icon: Icon, label, active, badge, onClick }: NavItemProps) {
  const [hov, setHov] = useState(false);

  const bg = active
    ? 'rgba(99,102,241,0.18)'
    : hov
    ? 'rgba(255,255,255,0.07)'
    : 'transparent';

  const col = active ? '#a5b4fc' : hov ? '#e2e8f0' : '#94a3b8';

  return (
    <Tooltip label={label}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 40,
          borderRadius: 10,
          border: 'none',
          background: bg,
          color: col,
          position: 'relative',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {active && (
          <span style={{
            position: 'absolute',
            left: -12,
            top: '20%',
            width: 3,
            height: '60%',
            background: '#818cf8',
            borderRadius: '0 3px 3px 0',
          }} />
        )}
        <Icon style={{ width: 18, height: 18 }} />
        {badge != null && badge > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 14,
            height: 14,
            background: '#ef4444',
            borderRadius: 7,
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview',     icon: DashboardIcon },
  { path: '/events',    label: 'Audit Events', icon: EventsIcon },
  { path: '/risk',      label: 'Risk Alerts',  icon: RiskIcon },
  { path: '/gdpr',      label: 'GDPR Rights',  icon: GdprIcon },
  { path: '/webhooks',  label: 'Webhooks',     icon: WebhookIcon },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [themeHov, setThemeHov] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentPath = location.pathname;

  return (
    <nav style={{
      width: 64,
      minHeight: '100vh',
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 10px',
      flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.05)',
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('/dashboard')}
        style={{
          width: 40,
          height: 40,
          background: 'linear-gradient(135deg, #5b5ef6, #7c3aed)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '18px 0 24px',
          boxShadow: '0 4px 16px rgba(91,94,246,0.45)',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.06)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
      >
        <ShieldIcon style={{ width: 20, height: 20, color: '#fff' }} />
      </div>

      {/* Main nav */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flex: 1,
        width: '100%',
        alignItems: 'center',
      }}>
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={currentPath === item.path || currentPath.startsWith(item.path + '/')}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>

      {/* Bottom section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingTop: 12,
        marginBottom: 16,
        width: '100%',
      }}>
        {/* Dark / light toggle */}
        <Tooltip label={isDark ? 'Light mode' : 'Dark mode'}>
          <button
            onClick={toggleTheme}
            onMouseEnter={() => setThemeHov(true)}
            onMouseLeave={() => setThemeHov(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 40,
              borderRadius: 10,
              border: 'none',
              background: themeHov ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: themeHov ? '#e2e8f0' : '#94a3b8',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {isDark
              ? <SunIcon style={{ width: 18, height: 18 }} />
              : <MoonIcon style={{ width: 18, height: 18 }} />}
          </button>
        </Tooltip>

        <NavItem
          icon={SettingsIcon}
          label="AI Settings"
          active={currentPath === '/ai-settings'}
          onClick={() => navigate('/ai-settings')}
        />
        <NavItem
          icon={LogoutIcon}
          label="Sign out"
          active={false}
          onClick={handleLogout}
        />
      </div>
    </nav>
  );
}
