import { useEffect, useState } from 'react';
import client from '../api/client';

interface AdminUser { id: string; email: string; username: string; full_name: string | null; role: string; location: string | null; created_at: string; }
interface AdminPost { id: string; user_id: string; username: string; content: string; visibility: string; created_at: string; }
type Tab = 'users' | 'posts';

const visibilityColor: Record<string, string> = { public: '#22c55e', friends: '#f59e0b', private: '#f43f5e' };

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [tab, setTab] = useState<Tab>('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([client.get('/api/admin/users'), client.get('/api/admin/posts')]).then(([u, p]) => {
      setUsers(u.data); setPosts(p.data); setLoading(false);
    });
  }, []);

  const userCount = users.filter(u => u.role === 'user').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div style={page}>
      <div style={container}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Admin Dashboard</h1>
        <p style={{ margin: '0 0 28px', color: '#475569', fontSize: 14 }}>Platform overview</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          <StatCard label="Total Users" value={userCount} color="#6366f1" />
          <StatCard label="Total Posts" value={posts.length} color="#8b5cf6" />
          <StatCard label="Admins" value={adminCount} color="#06b6d4" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
          {(['users', 'posts'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === t ? '#6366f1' : '#475569', fontWeight: tab === t ? 600 : 400,
              fontSize: 14, textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#475569' }}>Loading...</p>
        ) : tab === 'users' ? (
          <div style={tableCard}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Username', 'Email', 'Full Name', 'Role', 'Location', 'Joined'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={td}><span style={{ color: '#6366f1' }}>@{u.username}</span></td>
                    <td style={{ ...td, color: '#64748b' }}>{u.email}</td>
                    <td style={td}>{u.full_name || '—'}</td>
                    <td style={td}>
                      <span style={{ background: u.role === 'admin' ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.15)', color: u.role === 'admin' ? '#06b6d4' : '#818cf8', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#64748b' }}>{u.location || '—'}</td>
                    <td style={{ ...td, color: '#475569', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('en-IE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={tableCard}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Author', 'Content', 'Visibility', 'Posted'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < posts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={td}><span style={{ color: '#6366f1' }}>@{p.username}</span></td>
                    <td style={{ ...td, color: '#94a3b8' }}>{p.content.slice(0, 60)}{p.content.length > 60 ? '…' : ''}</td>
                    <td style={td}>
                      <span style={{ color: visibilityColor[p.visibility] || '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                        {p.visibility}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#475569', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('en-IE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontSize: 30, fontWeight: 700, color }}>{value}</div>
      <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f172a', paddingTop: 24, paddingBottom: 40 };
const container: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '0 24px' };
const tableCard: React.CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'auto' };
const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };
const td: React.CSSProperties = { padding: '13px 16px', fontSize: 14, color: '#f1f5f9' };
