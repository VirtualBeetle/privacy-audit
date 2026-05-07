import { useState } from 'react';
import client from '../api/client';

export default function PrivacySettings() {
  const [exportMsg, setExportMsg] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    try {
      const r = await client.post('/api/privacy/export');
      setExportMsg(r.data.message);
    } catch {
      setExportMsg('Request failed. Please try again.');
    } finally {
      setLoading(l => ({ ...l, export: false }));
    }
  };

  const handleDelete = async () => {
    setLoading(l => ({ ...l, delete: true }));
    try {
      const r = await client.delete('/api/privacy/delete');
      setDeleteMsg(r.data.message);
      setShowDeleteConfirm(false);
    } catch {
      setDeleteMsg('Request failed. Please try again.');
    } finally {
      setLoading(l => ({ ...l, delete: false }));
    }
  };

  return (
    <div style={page}>
      <h1 style={{ margin: '0 0 4px', color: '#1e293b' }}>Privacy Settings</h1>
      <p style={{ margin: '0 0 32px', color: '#64748b', fontSize: 14 }}>Manage your data rights and privacy preferences</p>

      {/* Dashboard Link */}
      <div style={card}>
        <h3 style={sectionTitle}>🔍 Privacy Audit Dashboard</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
          See a full history of how your data has been accessed, by whom, and why — powered by the Privacy Audit Service.
        </p>
        <button
          onClick={handleViewDashboard}
          disabled={loading.dashboard}
          style={{ ...btnStyle, fontSize: 14 }}
        >
          {loading.dashboard ? 'Opening...' : 'View My Privacy Dashboard →'}
        </button>
      </div>

      {/* Data Export */}
      <div style={card}>
        <h3 style={sectionTitle}>📦 Request Data Export</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 6 }}>
          Under <strong>GDPR Article 20</strong> (Right to Data Portability), you can request a full export of all data held about you.
          You will receive a download link by email when your export is ready.
        </p>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
          Exports are typically ready within 24–48 hours.
        </p>
        {exportMsg ? (
          <div style={successBox}>{exportMsg}</div>
        ) : (
          <button onClick={handleExport} disabled={loading.export} style={btnStyle}>
            {loading.export ? 'Submitting...' : 'Request My Data Export'}
          </button>
        )}
      </div>

      {/* Account Deletion */}
      <div style={{ ...card, borderColor: '#fecaca' }}>
        <h3 style={{ ...sectionTitle, color: '#dc2626' }}>🗑️ Request Account Deletion</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 6 }}>
          Under <strong>GDPR Article 17</strong> (Right to Erasure), you can request permanent deletion of your account and all associated data.
        </p>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
          This action is irreversible. Your account will be deleted within 30 days of request.
        </p>
        {deleteMsg ? (
          <div style={{ ...successBox, background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>{deleteMsg}</div>
        ) : !showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} style={dangerBtn}>
            Request Account Deletion
          </button>
        ) : (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: 16 }}>
            <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>
              Are you sure? This will permanently delete your account and all medical records.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleDelete} disabled={loading.delete} style={dangerBtn}>
                {loading.delete ? 'Submitting...' : 'Yes, delete my account'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} style={outlineBtn}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const page: React.CSSProperties = { padding: '32px 40px', background: '#f8fafc', minHeight: 'calc(100vh - 53px)' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px', marginBottom: 20 };
const sectionTitle: React.CSSProperties = { margin: '0 0 12px', color: '#1e293b', fontSize: 15 };
const btnStyle: React.CSSProperties = { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const dangerBtn: React.CSSProperties = { padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const outlineBtn: React.CSSProperties = { padding: '9px 20px', background: 'none', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' };
const successBox: React.CSSProperties = { background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#16a34a', fontSize: 14 };
