import { useState } from 'react';
import client from '../api/client';

interface Post {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
  content: string;
  image_url: string | null;
  visibility: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
}

interface Props {
  post: Post;
  currentUserId: string;
  onDelete?: (id: string) => void;
  onClickPost?: (id: string) => void;
}

export default function PostCard({ post, currentUserId, onDelete, onClickPost }: Props) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [loading, setLoading] = useState(false);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await client.post(`/api/posts/${post.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(c => res.data.liked ? c + 1 : c - 1);
    } finally {
      setLoading(false);
    }
  };

  const initials = (post.full_name || post.username).slice(0, 2).toUpperCase();
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const visibilityBadge: Record<string, string> = {
    public: '🌐', friends: '👥', private: '🔒',
  };

  return (
    <div style={cardStyle} onClick={() => onClickPost?.(post.id)}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        {/* Avatar */}
        {post.profile_picture_url ? (
          <img src={post.profile_picture_url} alt="" style={avatarStyle} />
        ) : (
          <div style={{ ...avatarStyle, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>
              {post.full_name || post.username}
            </span>
            <span style={{ color: '#475569', fontSize: 13 }}>@{post.username}</span>
            <span style={{ marginLeft: 'auto', color: '#334155', fontSize: 12 }}>{timeAgo(post.created_at)}</span>
          </div>
          <div style={{ color: '#475569', fontSize: 11, marginTop: 1 }}>
            {visibilityBadge[post.visibility]} {post.visibility}
          </div>
        </div>
        {post.user_id === currentUserId && onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(post.id); }}
            style={deleteBtn}
          >✕</button>
        )}
      </div>

      <p style={{ margin: '0 0 12px', color: '#cbd5e1', fontSize: 15, lineHeight: 1.6 }}>
        {post.content}
      </p>

      {post.image_url && (
        <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 300, objectFit: 'cover' }} />
      )}

      <div style={{ display: 'flex', gap: 20, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={toggleLike} style={{ ...actionBtn, color: liked ? '#f43f5e' : '#475569' }}>
          {liked ? '♥' : '♡'} {likeCount}
        </button>
        <button onClick={() => onClickPost?.(post.id)} style={{ ...actionBtn, color: '#475569' }}>
          💬 {post.comment_count}
        </button>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 14, padding: '20px 24px', marginBottom: 12, cursor: 'pointer',
  transition: 'border-color 0.15s',
};
const avatarStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
};
const actionBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
  fontWeight: 600, padding: '4px 8px', borderRadius: 6,
};
const deleteBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#475569', fontSize: 16, padding: 4,
};
