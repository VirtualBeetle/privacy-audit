import { useEffect, useState } from 'react';
import client from '../api/client';
import RecordCard from '../components/RecordCard';

interface Record {
  id: string;
  diagnosis: string;
  prescriptions: string;
  test_results: string;
  record_date: string | null;
  doctor_name: string;
}

export default function MedicalRecords() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/api/patient/records').then(r => {
      setRecords(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={page}>
      <h1 style={{ margin: '0 0 4px', color: '#1e293b' }}>Medical Records</h1>
      <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>Your complete medical history</p>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      ) : records.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No medical records found.</p>
      ) : (
        records.map(r => <RecordCard key={r.id} {...r} />)
      )}
    </div>
  );
}

const page: React.CSSProperties = { padding: '32px 40px', background: '#f8fafc', minHeight: 'calc(100vh - 53px)' };
