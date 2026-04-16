import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setQuery('');
  };

  return (
    <nav style={navStyle}>
      <div style={innerStyle}>
        {/* Logo */}
        <Link to={user.role === 'admin' ? '/admin' : '/feed'} style={logoStyle}>
          ◈ ConnectSocial
        </Link>

        {/* Search — only for regular users */}
        {user.role === 'user' && (
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 320, margin: '0 24px' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search people..."
              style={searchStyle}
            />
          </form>
        )}

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user.role === 'user' && (
            <>
              <NavLink to="/feed" label="Feed" active={isActive('/feed')} />
              <NavLink to="/checkins" label="Check-ins" active={isActive('/checkins')} />
              <NavLink to="/profile" label="Profile" active={isActive('/profile')} />
              <NavLink to="/privacy" label="Privacy" active={isActive('/privacy')} />
            </>
          )}
          {user.role === 'admin' && (
            <NavLink to="/admin" label="Dashboard" active={isActive('/admin')} />
          )}
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link to={to} style={{
      padding: '7px 14px',
      borderRadius: 8,
      textDecoration: 'none',
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      color: active ? '#fff' : '#94a3b8',
      background: active ? '#6366f1' : 'transparent',
      transition: 'all 0.15s',
    }}>
      {label}
    </Link>
  );
}

const navStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 100,
  background: 'rgba(15,23,42,0.95)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};
const innerStyle: React.CSSProperties = {
  maxWidth: 1100, margin: '0 auto', padding: '0 24px',
  height: 60, display: 'flex', alignItems: 'center',
};
const logoStyle: React.CSSProperties = {
  textDecoration: 'none', fontSize: 18, fontWeight: 700,
  color: '#6366f1', letterSpacing: '-0.5px', whiteSpace: 'nowrap',
};
const searchStyle: React.CSSProperties = {
  width: '100%', padding: '8px 14px',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 20, color: '#e2e8f0', fontSize: 14, outline: 'none',
};
const logoutBtn: React.CSSProperties = {
  padding: '7px 14px', background: 'transparent',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
  color: '#64748b', fontSize: 14, cursor: 'pointer',
  marginLeft: 4,
};
