import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '', bio: '', location: '', profile_picture_url: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/api/auth/register', form);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={bgGlow} />
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>◈</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Join ConnectSocial</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Create your account</p>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {[
            { key: 'email', label: 'Email *', type: 'email', ph: 'you@example.com' },
            { key: 'username', label: 'Username *', type: 'text', ph: 'cool_username' },
            { key: 'password', label: 'Password *', type: 'password', ph: '••••••••' },
            { key: 'full_name', label: 'Full Name', type: 'text', ph: 'Jane Doe' },
            { key: 'location', label: 'Location', type: 'text', ph: 'Dublin, Ireland' },
            { key: 'profile_picture_url', label: 'Profile Picture URL', type: 'url', ph: 'https://...' },
          ].map(({ key, label, type, ph }) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{label}</label>
              <input type={type} value={(form as any)[key]} onChange={set(key)} style={input} placeholder={ph} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Bio</label>
            <textarea value={form.bio} onChange={set('bio')} rows={2} style={{ ...input, resize: 'none' }} placeholder="Tell people about yourself..." />
          </div>
          <button type="submit" disabled={loading} style={btn}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 16, textAlign: 'center', color: '#475569', fontSize: 13 }}>
          Already have an account? <Link to="/login" style={{ color: '#6366f1' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' };
const bgGlow: React.CSSProperties = { position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' };
const card: React.CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '36px 32px', width: 420, position: 'relative', zIndex: 1 };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4, color: '#94a3b8', fontSize: 12, fontWeight: 600 };
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const btn: React.CSSProperties = { width: '100%', padding: '11px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' };
const errorBox: React.CSSProperties = { background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f43f5e', fontSize: 13 };
