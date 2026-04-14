import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';

interface UserResult {
  id: string; username: string; full_name: string | null;
  profile_picture_url: string | null; location: string | null; bio: string | null;
}

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    client.get(`/api/users/search?q=${encodeURIComponent(q)}`)
      .then(r => { setResults(r.data); setLoading(false); });
  }, [q]);

  return (
    <div style={page}>
      <div style={container}>
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
          Search results
        </h1>
        <p style={{ margin: '0 0 24px', color: '#475569', fontSize: 13 }}>
          "{q}" · {results.length} result{results.length !== 1 ? 's' : ''}
          {results.length > 0 && <span style={{ marginLeft: 8, color: '#334155' }}>· Profile views logged in audit trail</span>}
        </p>

        {loading ? (
          <p style={{ color: '#475569' }}>Searching...</p>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#334155' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <p>No users found matching "{q}"</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map(u => {
              const initials = (u.full_name || u.username).slice(0, 2).toUpperCase();
              return (
                <div key={u.id} style={resultCard}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {u.profile_picture_url ? (
                      <img src={u.profile_picture_url} alt="" style={avatar} />
                    ) : (
                      <div style={{ ...avatar, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                        {initials}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 15 }}>{u.full_name || u.username}</div>
                      <div style={{ color: '#6366f1', fontSize: 13 }}>@{u.username}</div>
                      {u.location && <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>📍 {u.location}</div>}
                      {u.bio && <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{u.bio}</div>}
                    </div>
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
const resultCard: React.CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px' };
const avatar: React.CSSProperties = { width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 };
