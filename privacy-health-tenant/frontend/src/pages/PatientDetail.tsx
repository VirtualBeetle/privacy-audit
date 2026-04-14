import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import RecordCard from '../components/RecordCard';

interface PatientProfile {
  full_name: string;
  date_of_birth: string | null;
  gender: string;
  blood_type: string;
  phone: string;
  address: string;
  email: string;
}

interface MedRecord {
  id: string;
  diagnosis: string;
  prescriptions: string;
  test_results: string;
  record_date: string | null;
  doctor_name: string;
}

interface Appointment {
  id: string;
  scheduled_at: string | null;
  status: string;
  notes: string;
  doctor_name: string;
}

type Tab = 'profile' | 'records' | 'appointments';

const statusColors: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: '#dbeafe', color: '#2563eb' },
  completed: { bg: '#dcfce7', color: '#16a34a' },
  cancelled: { bg: '#fee2e2', color: '#dc2626' },
};

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [records, setRecords] = useState<MedRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get(`/api/doctor/patients/${id}`),
      client.get(`/api/doctor/patients/${id}/records`),
      client.get(`/api/doctor/patients/${id}/appointments`),
    ]).then(([p, r, a]) => {
      setProfile(p.data);
      setRecords(r.data);
      setAppointments(a.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div style={page}><p style={{ color: '#94a3b8' }}>Loading...</p></div>;
  if (!profile) return <div style={page}><p>Patient not found</p></div>;

  return (
    <div style={page}>
      <div style={{ marginBottom: 4 }}>
        <Link to="/doctor/dashboard" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>← Back to patients</Link>
      </div>
      <h1 style={{ margin: '8px 0 4px', color: '#1e293b' }}>{profile.full_name}</h1>
      <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>{profile.email}</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        {(['profile', 'records', 'appointments'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: 'none',
              fontSize: 14,
              cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
              color: tab === t ? '#2563eb' : '#64748b',
              fontWeight: tab === t ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Field label="Full Name" value={profile.full_name} />
            <Field label="Date of Birth" value={profile.date_of_birth || '—'} />
            <Field label="Gender" value={profile.gender || '—'} />
            <Field label="Blood Type" value={profile.blood_type || '—'} />
            <Field label="Phone" value={profile.phone || '—'} />
            <Field label="Address" value={profile.address || '—'} />
          </div>
        </div>
      )}

      {tab === 'records' && (
        records.length === 0
          ? <p style={{ color: '#94a3b8' }}>No records found.</p>
          : records.map(r => <RecordCard key={r.id} {...r} />)
      )}

      {tab === 'appointments' && (
        appointments.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No appointments found.</p>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Date & Time', 'Status', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map((a, i) => {
                  const sc = statusColors[a.status] || statusColors.scheduled;
                  return (
                    <tr key={a.id} style={{ borderBottom: i < appointments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={td}>{a.scheduled_at ? new Date(a.scheduled_at).toLocaleString('en-IE') : '—'}</td>
                      <td style={td}>
                        <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ ...td, color: '#64748b' }}>{a.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#1e293b' }}>{value}</div>
    </div>
  );
}

const page: React.CSSProperties = { padding: '32px 40px', background: '#f8fafc', minHeight: 'calc(100vh - 53px)' };
const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: '#1e293b' };
