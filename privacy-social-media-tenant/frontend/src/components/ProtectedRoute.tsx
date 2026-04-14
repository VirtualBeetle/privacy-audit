import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={loadingStyle}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/feed'} replace />;
  }
  return <>{children}</>;
}

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0f172a', color: '#94a3b8', fontSize: 16,
};
