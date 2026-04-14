import { useEffect, useState } from 'react';
import client from '../api/client';

interface Checkin {
  id: string; place_name: string; city: string; country: string; checked_in_at: string;
}

export default function Checkins() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [form, setForm] = useState({ place_name: '', city: '', country: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => client.get('/api/checkins').then(r => setCheckins(r.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.place_name || !form.city || !form.country) return;
    setSubmitting(true);
    try {
      await client.post('/api/checkins', form);
      setForm({ place_name: '', city: '', country: '' });
      setShowForm(false);
      load();
    } finally { setSubmitting(false); }
  };

  const countryFlags: Record<string, string> = {
    Ireland: '🇮🇪', Italy: '🇮🇹', India: '🇮🇳', 'United Kingdom': '🇬🇧',
    France: '🇫🇷', Germany: '🇩🇪', Spain: '🇪🇸', USA: '🇺🇸',
  };

  return (
    <div style={page}>
      <div style={container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Check-ins</h1>
            <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
              ⚠️ Location data shared with GeoPartner Ltd. — viewable in Privacy Settings
            </p>
          </div>
          <button onClick={() => setShowForm(s => !s)} style={addBtn}>
            {showForm ? '✕' : '+ Check In'}
          </button>
        </div>

        {showForm && (
          <div style={formCard}>
            <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 15 }}>New Check-in</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[{ k: 'place_name', ph: 'Place name', label: 'Place *' }, { k: 'city', ph: 'City', label: 'City *' }, { k: 'country', ph: 'Country', label: 'Country *' }].map(({ k, ph, label }) => (
                  <div key={k} style={{ gridColumn: k === 'place_name' ? '1 / -1' : 'auto' }}>
                    <label style={labelStyle}>{label}</label>
                    <input value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={inputStyle} />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={submitting} style={submitBtn}>
                {submitting ? 'Checking in...' : 'Check In 📍'}
              </button>
            </form>
          </div>
        )}

        {checkins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
            <p>No check-ins yet. Share your location!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {checkins.map(c => {
              const flag = countryFlags[c.country] || '🌍';
              return (
                <div key={c.id} style={checkinCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={flagCircle}>{flag}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 15, marginBottom: 2 }}>
                        {c.place_name}
                      </div>
                      <div style={{ color: '#6366f1', fontSize: 13 }}>{c.city}, {c.country}</div>
                    </div>
                    <div style={{ color: '#334155', fontSize: 12 }}>
                      {new Date(c.checked_in_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: '#334155' }}>
                    🔗 Location shared with GeoPartner Ltd. · Logged in Privacy Audit Trail
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f172a', paddingTop: 24, paddingBottom: 40 };
const container: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '0 20px' };
const addBtn: React.CSSProperties = { padding: '8px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const formCard: React.CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 20 };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4, color: '#64748b', fontSize: 12, fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const submitBtn: React.CSSProperties = { padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const checkinCard: React.CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 };
const flagCircle: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 };
