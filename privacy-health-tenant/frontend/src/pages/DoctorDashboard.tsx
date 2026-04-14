import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

interface Patient {
  patient_id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  blood_type: string;
  email: string;
}

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    client.get('/api/doctor/patients').then(r => {
      setPatients(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={page}>
      <h1 style={{ margin: '0 0 4px', color: '#1e293b' }}>Patient List</h1>
      <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>
        {patients.length} patient{patients.length !== 1 ? 's' : ''} under your care
      </p>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Full Name', 'Email', 'Date of Birth', 'Blood Type', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map((p, i) => (
                <tr key={p.patient_id} style={{ borderBottom: i < patients.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={td}>{p.full_name || '—'}</td>
                  <td style={{ ...td, color: '#64748b' }}>{p.email}</td>
                  <td style={td}>{p.date_of_birth || '—'}</td>
                  <td style={td}>
                    <span style={{ background: '#dbeafe', color: '#2563eb', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                      {p.blood_type || '—'}
                    </span>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => navigate(`/doctor/patients/${p.patient_id}`)}
                      style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const page: React.CSSProperties = { padding: '32px 40px', background: '#f8fafc', minHeight: 'calc(100vh - 53px)' };
const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: '#1e293b' };
