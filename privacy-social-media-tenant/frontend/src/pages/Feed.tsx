import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

interface Post {
  id: string; user_id: string; username: string; full_name: string | null;
  profile_picture_url: string | null; content: string; image_url: string | null;
  visibility: string; like_count: number; comment_count: number;
  liked_by_me: boolean; created_at: string;
}

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [imageUrl, setImageUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  const loadFeed = () =>
    client.get('/api/posts/feed').then(r => { setPosts(r.data); setLoading(false); });

  useEffect(() => { loadFeed(); }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await client.post('/api/posts', { content: content.trim(), visibility, image_url: imageUrl || undefined });
      setContent(''); setImageUrl(''); setShowCompose(false);
      loadFeed();
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await client.delete(`/api/posts/${id}`);
    setPosts(p => p.filter(x => x.id !== id));
  };

  return (
    <div style={page}>
      <div style={container}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Feed</h1>
          <button onClick={() => setShowCompose(s => !s)} style={composeBtn}>
            {showCompose ? '✕ Close' : '+ New Post'}
          </button>
        </div>

        {/* Compose box */}
        {showCompose && (
          <div style={composeCard}>
            <form onSubmit={handlePost}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                style={textarea}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="Image URL (optional)"
                  style={{ ...smallInput, flex: 1, minWidth: 180 }}
                />
                <select value={visibility} onChange={e => setVisibility(e.target.value)} style={smallInput}>
                  <option value="public">🌐 Public</option>
                  <option value="friends">👥 Friends</option>
                  <option value="private">🔒 Private</option>
                </select>
                <button type="submit" disabled={posting || !content.trim()} style={postBtn}>
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>Loading feed...</div>
        ) : posts.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>No posts yet. Be the first!</div>
        ) : (
          posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              currentUserId={user?.user_id || ''}
              onDelete={handleDelete}
              onClickPost={id => navigate(`/posts/${id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f172a', paddingTop: 24, paddingBottom: 40 };
const container: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '0 20px' };
const composeCard: React.CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 16 };
const composeBtn: React.CSSProperties = { padding: '8px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const textarea: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' };
const smallInput: React.CSSProperties = { padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' };
const postBtn: React.CSSProperties = { padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
