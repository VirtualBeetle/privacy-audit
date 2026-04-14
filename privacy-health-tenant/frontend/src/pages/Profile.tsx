import { useEffect, useState } from 'react';
import client from '../api/client';

interface ProfileData {
  email: string;
  profile: {
    full_name: string;
    date_of_birth: string | null;
    gender: string;
    blood_type: string;
    phone: string;
    address: string;
  };
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

interface Insurance {
  id: string;
  provider_name: string;
  policy_number: string;
  coverage_type: string;
  expiry_date: string | null;
}

export default function Profile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    client.get('/api/patient/me').then(r => {
      setData(r.data);
      setForm({ full_name: r.data.profile.full_name, phone: r.data.profile.phone, address: r.data.profile.address });
    });
    client.get('/api/patient/emergency-contacts').then(r => setContacts(r.data));
    client.get('/api/patient/insurance').then(r => setInsurance(r.data));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.put('/api/patient/me', form);
      setSuccess('Profile updated successfully');
      setEditing(false);
      const r = await client.get('/api/patient/me');
      setData(r.data);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div style={page}><p style={{ color: '#94a3b8' }}>Loading...</p></div>;

  const p = data.profile;

  return (
    <div style={page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: '#1e293b' }}>My Profile</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{data.email}</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={outlineBtn}>Edit Profile</button>
        )}
      </div>

      {success && <div style={successBox}>{success}</div>}

      <div style={card}>
        <h3 style={sectionTitle}>Personal Information</h3>
        {editing ? (
          <div>
            {[
              { label: 'Full Name', key: 'full_name' },
              { label: 'Phone', key: 'phone' },
              { label: 'Address', key: 'address' },
            ].map(({ label, key }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={handleSave} disabled={saving} style={btnStyle}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)} style={outlineBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Full Name" value={p.full_name} />
            <Field label="Date of Birth" value={p.date_of_birth || '—'} />
            <Field label="Gender" value={p.gender || '—'} />
            <Field label="Blood Type" value={p.blood_type || '—'} />
            <Field label="Phone" value={p.phone || '—'} />
            <Field label="Address" value={p.address || '—'} />
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>Emergency Contacts</h3>
        {contacts.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 14 }}>No emergency contacts on file.</p> : contacts.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 24, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <Field label="Name" value={c.name} />
            <Field label="Relationship" value={c.relationship} />
            <Field label="Phone" value={c.phone} />
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>Insurance Details</h3>
        {insurance.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 14 }}>No insurance details on file.</p> : insurance.map(i => (
          <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Provider" value={i.provider_name} />
            <Field label="Policy Number" value={i.policy_number} />
            <Field label="Coverage Type" value={i.coverage_type} />
            <Field label="Expiry Date" value={i.expiry_date || '—'} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#1e293b' }}>{value}</div>
    </div>
  );
}

const page: React.CSSProperties = { padding: '32px 40px', background: '#f8fafc', minHeight: 'calc(100vh - 53px)' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px', marginBottom: 20 };
const sectionTitle: React.CSSProperties = { margin: '0 0 20px', color: '#1e293b', fontSize: 15 };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4, color: '#374151', fontSize: 13, fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const btnStyle: React.CSSProperties = { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const outlineBtn: React.CSSProperties = { padding: '9px 20px', background: 'none', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' };
const successBox: React.CSSProperties = { background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#16a34a', fontSize: 14 };
