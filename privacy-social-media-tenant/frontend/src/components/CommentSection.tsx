import { useEffect, useState } from 'react';
import client from '../api/client';

interface Comment {
  id: string;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
  content: string;
  created_at: string;
}

export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client.get(`/api/posts/${postId}/comments`).then(r => setComments(r.data));
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await client.post(`/api/posts/${postId}/comments`, { content: text.trim() });
      setComments(c => [...c, res.data]);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h4 style={{ margin: '0 0 14px', color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Comments ({comments.length})
      </h4>

      <div style={{ marginBottom: 16 }}>
        {comments.map(c => (
          <div key={c.id} style={commentStyle}>
            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13, marginBottom: 3 }}>
              {c.full_name || c.username}
              <span style={{ color: '#475569', fontWeight: 400, marginLeft: 6 }}>@{c.username}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 14 }}>{c.content}</div>
          </div>
        ))}
        {comments.length === 0 && <p style={{ color: '#334155', fontSize: 14 }}>No comments yet. Be the first!</p>}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write a comment..."
          style={inputStyle}
        />
        <button type="submit" disabled={submitting || !text.trim()} style={submitBtn}>
          {submitting ? '…' : 'Post'}
        </button>
      </form>
    </div>
  );
}

const commentStyle: React.CSSProperties = {
  padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
  borderRadius: 8, marginBottom: 8, borderLeft: '2px solid #6366f1',
};
const inputStyle: React.CSSProperties = {
  flex: 1, padding: '10px 14px',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#e2e8f0', fontSize: 14, outline: 'none',
};
const submitBtn: React.CSSProperties = {
  padding: '10px 18px', background: '#6366f1', color: '#fff',
  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
