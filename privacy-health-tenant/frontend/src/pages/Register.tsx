import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', date_of_birth: '',
    gender: '', blood_type: '', phone: '', address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/api/auth/register', form);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 40, width: 440 }}>
        <h1 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 22 }}>🏥 Register</h1>
        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>Create your patient account</p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Email *', field: 'email', type: 'email', placeholder: 'you@example.com' },
            { label: 'Password *', field: 'password', type: 'password', placeholder: '••••••••' },
            { label: 'Full Name', field: 'full_name', type: 'text', placeholder: 'Jane Doe' },
            { label: 'Date of Birth', field: 'date_of_birth', type: 'date', placeholder: '' },
            { label: 'Phone', field: 'phone', type: 'tel', placeholder: '+353 87 123 4567' },
            { label: 'Address', field: 'address', type: 'text', placeholder: '1 Main St, Dublin' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, color: '#374151', fontSize: 13, fontWeight: 600 }}>{label}</label>
              <input type={type} value={(form as any)[field]} onChange={set(field)} style={inputStyle} placeholder={placeholder} />
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 4, color: '#374151', fontSize: 13, fontWeight: 600 }}>Gender</label>
            <select value={form.gender} onChange={set('gender')} style={inputStyle}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', marginBottom: 4, color: '#374151', fontSize: 13, fontWeight: 600 }}>Blood Type</label>
            <select value={form.blood_type} onChange={set('blood_type')} style={inputStyle}>
              <option value="">Select</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt}>{bt}</option>)}
            </select>
          </div>

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Already have an account? <Link to="/login" style={{ color: '#2563eb' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
  width: '100%', padding: '11px', background: '#2563eb', color: '#ffffff',
  border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
};
