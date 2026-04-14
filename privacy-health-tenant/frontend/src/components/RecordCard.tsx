interface RecordCardProps {
  diagnosis: string;
  prescriptions: string;
  test_results: string;
  record_date: string | null;
  doctor_name: string;
}

export default function RecordCard({ diagnosis, prescriptions, test_results, record_date, doctor_name }: RecordCardProps) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '20px 24px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#1e293b', fontSize: 16 }}>{diagnosis}</h3>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>{record_date || '—'}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Prescription: </span>
        <span style={{ color: '#475569', fontSize: 13 }}>{prescriptions}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Test Results: </span>
        <span style={{ color: '#475569', fontSize: 13 }}>{test_results}</span>
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>Attending: {doctor_name}</span>
      </div>
    </div>
  );
}
