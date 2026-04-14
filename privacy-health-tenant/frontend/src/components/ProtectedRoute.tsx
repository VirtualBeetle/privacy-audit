import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'patient' | 'doctor';
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'} replace />;
  }

  return <>{children}</>;
}
