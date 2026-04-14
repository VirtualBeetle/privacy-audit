import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

interface Profile {
  email: string;
  profile: { full_name: string; blood_type: string; date_of_birth: string };
}

export default function PatientDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [apptCount, setApptCount] = useState(0);

  useEffect(() => {
    client.get('/api/patient/me').then(r => setProfile(r.data));
    client.get('/api/patient/records').then(r => setRecordCount(r.data.length));
    client.get('/api/patient/appointments').then(r => setApptCount(r.data.length));
  }, []);

  const name = profile?.profile.full_name || 'Patient';

  return (
    <div style={page}>
      <h1 style={{ margin: '0 0 4px', color: '#1e293b' }}>Welcome, {name}</h1>
      <p style={{ margin: '0 0 32px', color: '#64748b' }}>{profile?.email}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Medical Records" value={recordCount} link="/patient/records" color="#2563eb" />
        <StatCard label="Appointments" value={apptCount} link="/patient/appointments" color="#16a34a" />
        <StatCard label="Blood Type" value={profile?.profile.blood_type || '—'} link="/patient/profile" color="#7c3aed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <QuickLink to="/patient/records" icon="📋" label="Medical Records" desc="View your diagnoses and prescriptions" />
        <QuickLink to="/patient/appointments" icon="📅" label="Appointments" desc="See upcoming and past appointments" />
        <QuickLink to="/patient/profile" icon="👤" label="Profile" desc="View and update your personal details" />
        <QuickLink to="/patient/privacy" icon="🔒" label="Privacy Settings" desc="Manage your data and GDPR rights" />
      </div>
    </div>
  );
}

function StatCard({ label, value, link, color }: { label: string; value: string | number; link: string; color: string }) {
  return (
    <Link to={link} style={{ textDecoration: 'none' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', cursor: 'pointer' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{label}</div>
      </div>
    </Link>
  );
}

function QuickLink({ to, icon, label, desc }: { to: string; icon: string; label: string; desc: string }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', cursor: 'pointer' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{label}</div>
        <div style={{ color: '#94a3b8', fontSize: 13 }}>{desc}</div>
      </div>
    </Link>
  );
}

const page: React.CSSProperties = { padding: '32px 40px', background: '#f8fafc', minHeight: 'calc(100vh - 53px)' };
