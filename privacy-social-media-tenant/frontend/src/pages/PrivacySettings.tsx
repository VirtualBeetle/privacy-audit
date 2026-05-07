import { useState } from 'react';
import client from '../api/client';

export default function PrivacySettings() {
  const [exportMsg, setExportMsg] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState({ export: false, delete: false, dashboard: false });

  const handleViewDashboard = async () => {
    setLoading(l => ({ ...l, dashboard: true }));
    try {
      const r = await client.get('/api/privacy/dashboard-token');
      window.location.href = r.data.url;
    } catch {
      // ignore — stay on page
    } finally {
      setLoading(l => ({ ...l, dashboard: false }));
    }
  };

  const handleExport = async () => {
    setLoading(l => ({ ...l, export: true }));
    const r = await client.post('/api/privacy/export').catch(() => null);
    setExportMsg(r?.data?.message || 'Export requested.');
    setLoading(l => ({ ...l, export: false }));
  };

  const handleDelete = async () => {
    setLoading(l => ({ ...l, delete: true }));
    const r = await client.delete('/api/privacy/delete').catch(() => null);
    setDeleteMsg(r?.data?.message || 'Deletion requested.');
    setConfirmDelete(false);
    setLoading(l => ({ ...l, delete: false }));
  };

  const auditEvents = [
    { icon: '📊', label: 'Feed Recommendation', desc: 'Your profile (username, location, bio) is read by the feed algorithm each time the feed loads.', actor: 'SYSTEM', sensitivity: 'MEDIUM' },
    { icon: '🎯', label: 'Ad Targeting', desc: 'Your location and email are read to serve targeted advertisements.', actor: 'SYSTEM / Third Party', sensitivity: 'HIGH' },
    { icon: '🔍', label: 'Search Views', desc: 'When another user searches for you, your profile is surfaced and logged.', actor: 'OTHER USER', sensitivity: 'LOW' },
    { icon: '📈', label: 'Post Analytics', desc: 'Third-party analytics services read your post content and timestamps.', actor: 'THIRD PARTY', sensitivity: 'MEDIUM' },
    { icon: '📍', label: 'Location Sharing', desc: 'Check-in data (city, country, place name) is shared with GeoPartner Ltd.', actor: 'DATA BROKER', sensitivity: 'HIGH' },
  ];

  const sensitivityColor = (s: string) => s === 'HIGH' ? '#f43f5e' : s === 'MEDIUM' ? '#f59e0b' : '#22c55e';

  return (
    <div style={page}>
      <div style={container}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Privacy Settings</h1>
        <p style={{ margin: '0 0 32px', color: '#475569', fontSize: 14 }}>
          Understand how your data is used and exercise your GDPR rights.
        </p>

        {/* Audit Dashboard */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={iconCircle}>🔍</div>
            <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16 }}>Privacy Audit Dashboard</h3>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 14px' }}>
            See the complete history of how your data has been accessed — who read it, why, and whether it was shared with third parties.
          </p>
          <button
            onClick={handleViewDashboard}
            disabled={loading.dashboard}
            style={primaryBtn}
          >
            {loading.dashboard ? 'Opening...' : 'View My Privacy Dashboard →'}
          </button>
        </div>

        {/* What's being tracked */}
        <div style={card}>
          <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 15 }}>How Your Data Is Used</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {auditEvents.map(ev => (
              <div key={ev.label} style={eventRow}>
                <span style={{ fontSize: 20 }}>{ev.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{ev.label}</span>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: `${sensitivityColor(ev.sensitivity)}20`, color: sensitivityColor(ev.sensitivity), fontWeight: 600 }}>
                      {ev.sensitivity}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{ev.desc}</div>
                  <div style={{ color: '#334155', fontSize: 11, marginTop: 3 }}>Actor: {ev.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={iconCircle}>📦</div>
            <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16 }}>Request Data Export</h3>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 6px' }}>
            <strong style={{ color: '#94a3b8' }}>GDPR Article 20</strong> — Right to Data Portability.
            Request a full export of all data held about you.
          </p>
          <p style={{ color: '#334155', fontSize: 13, margin: '0 0 16px' }}>Ready within 24–48 hours.</p>
          {exportMsg ? (
            <div style={successBox}>{exportMsg}</div>
          ) : (
            <button onClick={handleExport} disabled={loading.export} style={primaryBtn}>
              {loading.export ? 'Submitting...' : 'Request Data Export'}
            </button>
          )}
        </div>

        {/* Delete */}
        <div style={{ ...card, borderColor: 'rgba(244,63,94,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ ...iconCircle, background: 'rgba(244,63,94,0.1)' }}>🗑️</div>
            <h3 style={{ margin: 0, color: '#f43f5e', fontSize: 16 }}>Request Account Deletion</h3>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 6px' }}>
            <strong style={{ color: '#94a3b8' }}>GDPR Article 17</strong> — Right to Erasure.
            Permanently delete your account and all associated data.
          </p>
          <p style={{ color: '#334155', fontSize: 13, margin: '0 0 16px' }}>Irreversible. Completed within 30 days.</p>
          {deleteMsg ? (
            <div style={{ ...successBox, background: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.3)', color: '#f43f5e' }}>{deleteMsg}</div>
          ) : !confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={dangerBtn}>Request Account Deletion</button>
          ) : (
            <div style={{ background: 'rgba(244,63,94,0.08)', borderRadius: 10, padding: 16 }}>
              <p style={{ color: '#fca5a5', fontSize: 14, margin: '0 0 12px' }}>
                Are you absolutely sure? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleDelete} disabled={loading.delete} style={dangerBtn}>
                  {loading.delete ? 'Submitting...' : 'Yes, delete my account'}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={cancelBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f172a', paddingTop: 24, paddingBottom: 40 };
const container: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '0 20px' };
const card: React.CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24, marginBottom: 16 };
const iconCircle: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const eventRow: React.CSSProperties = { display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 };
const primaryBtn: React.CSSProperties = { padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const dangerBtn: React.CSSProperties = { padding: '9px 20px', background: '#f43f5e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const cancelBtn: React.CSSProperties = { padding: '9px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#64748b', fontSize: 14, cursor: 'pointer' };
const successBox: React.CSSProperties = { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', color: '#22c55e', fontSize: 14 };
