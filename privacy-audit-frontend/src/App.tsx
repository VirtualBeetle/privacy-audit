import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/Header/Header';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AuthRedirect from './pages/AuthRedirect';
import Onboard from './pages/Onboard';
import Webhooks from './pages/Webhooks';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  },
  palette: {
    background: { default: '#f8fafc' },
  },
});

function PrivateRoute({ element }: { element: ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <>
      <Header />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboard" element={<Onboard />} />
        <Route path="/auth/redirect" element={<AuthRedirect />} />
        <Route path="/auth/google/callback" element={<AuthRedirect />} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute element={<Dashboard />} />} />
        <Route path="/webhooks" element={<PrivateRoute element={<Webhooks />} />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
