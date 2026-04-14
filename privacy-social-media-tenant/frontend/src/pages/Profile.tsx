import { useEffect, useState } from 'react';
import client from '../api/client';

interface UserProfile {
  id: string; email: string; username: string; full_name: string | null;
  bio: string | null; profile_picture_url: string | null; location: string | null;
  role: string; created_at: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', bio: '', location: '', profile_picture_url: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const load = () => client.get('/api/users/me').then(r => {
    setProfile(r.data);
    setForm({ full_name: r.data.full_name || '', bio: r.data.bio || '', location: r.data.location || '', profile_picture_url: r.data.profile_picture_url || '' });
  });

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.put('/api/users/me', form);
      setSuccess('Profile updated!');
      setEditing(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } finally { setSaving(false); }
  };

  if (!profile) return <div style={page}><p style={{ color: '#475569' }}>Loading...</p></div>;

  const initials = (profile.full_name || profile.username).slice(0, 2).toUpperCase();

  return (
    <div style={page}>
      <div style={container}>
        {/* Cover + avatar */}
        <div style={coverStyle}>
          <div style={gradientCover} />
          <div style={avatarWrapper}>
            {profile.profile_picture_url ? (
              <img src={profile.profile_picture_url} alt="" style={avatarImg} />
            ) : (
              <div style={{ ...avatarImg, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 28 }}>
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* Info card */}
        <div style={infoCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 2px', color: '#f1f5f9', fontSize: 22, fontWeight: 700 }}>
                {profile.full_name || profile.username}
              </h2>
              <div style={{ color: '#6366f1', fontSize: 14, marginBottom: 8 }}>@{profile.username}</div>
              {profile.bio && <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 8px' }}>{profile.bio}</p>}
              {profile.location && <div style={{ color: '#475569', fontSize: 13 }}>📍 {profile.location}</div>}
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} style={editBtn}>Edit Profile</button>
            )}
          </div>

          {success && <div style={successBox}>{success}</div>}

          {editing && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { key: 'full_name', label: 'Full Name', ph: 'Your name' },
                { key: 'location', label: 'Location', ph: 'Dublin, Ireland' },
                { key: 'profile_picture_url', label: 'Profile Picture URL', ph: 'https://...' },
              ].map(({ key, label, ph }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={inputStyle} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSave} disabled={saving} style={saveBtn}>{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setEditing(false)} style={cancelBtn}>Cancel</button>
              </div>
            </div>
          )}

          {/* Account info */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoField label="Email" value={profile.email} />
            <InfoField label="Role" value={profile.role} />
            <InfoField label="Member since" value={new Date(profile.created_at).toLocaleDateString('en-IE', { year: 'numeric', month: 'long' })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#94a3b8' }}>{value}</div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f172a', paddingBottom: 40 };
const container: React.CSSProperties = { maxWidth: 640, margin: '0 auto' };
const coverStyle: React.CSSProperties = { position: 'relative', height: 160 };
const gradientCover: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', borderRadius: '0 0 0 0' };
const avatarWrapper: React.CSSProperties = { position: 'absolute', bottom: -40, left: 28 };
const avatarImg: React.CSSProperties = { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #0f172a' };
const infoCard: React.CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', padding: '56px 28px 28px', margin: '0 0 0 0' };
const editBtn: React.CSSProperties = { padding: '8px 16px', background: 'transparent', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 8, color: '#6366f1', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const saveBtn: React.CSSProperties = { padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const cancelBtn: React.CSSProperties = { padding: '9px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#64748b', fontSize: 14, cursor: 'pointer' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4, color: '#64748b', fontSize: 12, fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const successBox: React.CSSProperties = { marginTop: 14, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '8px 12px', color: '#22c55e', fontSize: 13 };
