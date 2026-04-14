import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ? { color: '#2563eb', fontWeight: 700 } : {};

  if (!user) return null;

  return (
    <nav style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '12px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 32,
    }}>
      <span style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>
        🏥 HealthDemo
      </span>

      {user.role === 'patient' && (
        <>
          <Link to="/patient/dashboard" style={{ textDecoration: 'none', color: '#475569', ...isActive('/patient/dashboard') }}>Dashboard</Link>
          <Link to="/patient/records" style={{ textDecoration: 'none', color: '#475569', ...isActive('/patient/records') }}>Records</Link>
          <Link to="/patient/appointments" style={{ textDecoration: 'none', color: '#475569', ...isActive('/patient/appointments') }}>Appointments</Link>
          <Link to="/patient/profile" style={{ textDecoration: 'none', color: '#475569', ...isActive('/patient/profile') }}>Profile</Link>
          <Link to="/patient/privacy" style={{ textDecoration: 'none', color: '#475569', ...isActive('/patient/privacy') }}>Privacy</Link>
        </>
      )}

      {user.role === 'doctor' && (
        <Link to="/doctor/dashboard" style={{ textDecoration: 'none', color: '#475569', ...isActive('/doctor/dashboard') }}>Patients</Link>
      )}

      <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 13 }}>
        {user.role === 'doctor' ? '👨‍⚕️ Doctor' : '🧑 Patient'}
      </span>
      <button
        onClick={logout}
        style={{
          background: 'none',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '6px 16px',
          cursor: 'pointer',
          color: '#64748b',
        }}
      >
        Logout
      </button>
    </nav>
  );
}
