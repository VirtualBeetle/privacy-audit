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
      navigate(role === 'admin' ? '/admin' : '/feed');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={bgGlow} />
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>◈</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>SocialDemo</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>Sign in to your account</p>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={field}>
            <label style={label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={input} placeholder="emma.thornton@demo.com" />
          </div>
          <div style={field}>
            <label style={label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={input} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} style={btn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', color: '#475569', fontSize: 13 }}>
          New here? <Link to="/register" style={{ color: '#6366f1' }}>Create account</Link>
        </p>

        <div style={demoBox}>
          <strong style={{ color: '#64748b', display: 'block', marginBottom: 4 }}>Demo credentials</strong>
          <span style={{ color: '#475569' }}>User: emma.thornton@demo.com / user123</span><br />
          <span style={{ color: '#475569' }}>Admin: admin@socialdemo.com / admin123</span>
        </div>
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh', background: '#0f172a',
  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
};
const bgGlow: React.CSSProperties = {
  position: 'absolute', width: 600, height: 600, borderRadius: '50%',
  background: 'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)',
  top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none',
};
const card: React.CSSProperties = {
  background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18, padding: '40px 36px', width: 380, position: 'relative', zIndex: 1,
};
const field: React.CSSProperties = { marginBottom: 16 };
const label: React.CSSProperties = { display: 'block', marginBottom: 6, color: '#94a3b8', fontSize: 13, fontWeight: 600 };
const input: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  width: '100%', padding: '12px', marginTop: 8,
  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
};
const errorBox: React.CSSProperties = {
  background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
  borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#f43f5e', fontSize: 14,
};
const demoBox: React.CSSProperties = {
  marginTop: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 8,
  padding: 12, fontSize: 12, lineHeight: 1.7,
};
