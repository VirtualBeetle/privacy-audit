import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import CommentSection from '../components/CommentSection';

interface Post {
  id: string; user_id: string; username: string; full_name: string | null;
  profile_picture_url: string | null; content: string; image_url: string | null;
  visibility: string; like_count: number; comment_count: number;
  liked_by_me: boolean; created_at: string;
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (id) client.get(`/api/posts/${id}`).then(r => setPost(r.data));
  }, [id]);

  if (!post) return <div style={page}><p style={{ color: '#475569' }}>Loading...</p></div>;

  return (
    <div style={page}>
      <div style={container}>
        <Link to="/feed" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 20 }}>
          ← Back to feed
        </Link>
        <PostCard post={post} currentUserId={user?.user_id || ''} />
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24 }}>
          <CommentSection postId={post.id} />
        </div>
      </div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#0f172a', paddingTop: 24, paddingBottom: 40 };
const container: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '0 20px' };
