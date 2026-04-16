import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/api/auth/login', { email, password });
      const { token, role, user_id } = res.data;
      login(token, role, user_id);
      navigate(role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 40, width: 380 }}>
        <h1 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 22 }}>🏥 HealthTrack</h1>
        <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>Sign in to your account</p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontSize: 14, fontWeight: 600 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="james.obrien@demo.com"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontSize: 14, fontWeight: 600 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          New patient? <Link to="/register" style={{ color: '#2563eb' }}>Register here</Link>
        </p>

        <div style={{ marginTop: 24, background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 12, color: '#94a3b8' }}>
          <strong style={{ color: '#64748b' }}>Demo credentials:</strong><br />
          Patient: james.obrien@demo.com / patient123<br />
          Doctor: sarah.mitchell@healthdemo.com / doctor123
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px',
  background: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
