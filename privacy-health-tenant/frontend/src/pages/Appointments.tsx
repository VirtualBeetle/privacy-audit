import { useEffect, useState } from 'react';
import client from '../api/client';

interface Appointment {
  id: string;
  scheduled_at: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  doctor_name: string;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: '#dbeafe', color: '#2563eb' },
  completed: { bg: '#dcfce7', color: '#16a34a' },
  cancelled: { bg: '#fee2e2', color: '#dc2626' },
};

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/api/patient/appointments').then(r => {
      setAppointments(r.data);
      setLoading(false);
    });
  }, []);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div style={page}>
      <h1 style={{ margin: '0 0 4px', color: '#1e293b' }}>Appointments</h1>
      <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>Your upcoming and past appointments</p>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      ) : appointments.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No appointments found.</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Date & Time', 'Doctor', 'Status', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((a, i) => {
                const sc = statusColors[a.status] || statusColors.scheduled;
                return (
                  <tr key={a.id} style={{ borderBottom: i < appointments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={td}>{formatDate(a.scheduled_at)}</td>
                    <td style={td}>{a.doctor_name}</td>
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
      )}
    </div>
  );
}

const page: React.CSSProperties = { padding: '32px 40px', background: '#f8fafc', minHeight: 'calc(100vh - 53px)' };
const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: '#1e293b' };
