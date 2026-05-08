import { useState, useEffect, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar/Sidebar';
import Topbar from './components/Topbar/Topbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AuthRedirect from './pages/AuthRedirect';
import Onboard from './pages/Onboard';
import Webhooks from './pages/Webhooks';
// AISettings kept for potential direct URL access (ai-settings route uses SettingsPage)
import EventsPage from './pages/EventsPage';
import RiskPage from './pages/RiskPage';
import SettingsPage from './pages/SettingsPage';
import DevPage from './pages/DevPage';
import QueuePage from './pages/QueuePage';
import ConnectedAppsPage from './pages/ConnectedAppsPage';
import GDPRPage from './pages/GDPRPage';
import GuidePage from './pages/GuidePage';
import TenantDetailPage from './pages/TenantDetailPage';
import ConsentMatrixPage from './pages/ConsentMatrixPage';
import { AIChatPanel, AIChatPage } from './components/AIChat';
import ToastContainer from './components/Toast/ToastContainer';
import CommandPalette from './components/CommandPalette/CommandPalette';

/* ── MUI theme — minimal, inherits from CSS vars ─────────── */
const muiTheme = createTheme({
  typography: { fontFamily: "'DM Sans', system-ui, sans-serif" },
  palette: { background: { default: 'transparent' } },
  components: {
    MuiPaper:   { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiBackdrop: { styleOverrides: { root: { backdropFilter: 'blur(4px)' } } },
  },
});

function PrivateRoute({ element }: { element: ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" replace />;
}

const PUBLIC_PATHS = ['/login', '/auth/redirect', '/auth/google/callback'];

function AppShell() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [liveFlash, setLiveFlash] = useState(false);

  const isPublic = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));

  // Expose a global setter so Dashboard can trigger the live flash
  useEffect(() => {
    (window as any).__dgSetLiveFlash = (v: boolean) => setLiveFlash(v);
    return () => { delete (window as any).__dgSetLiveFlash; };
  }, []);

  if (isPublic || !isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboard" element={<Onboard />} />
        <Route path="/auth/redirect" element={<AuthRedirect />} />
        <Route path="/auth/google/callback" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        <Topbar liveFlash={liveFlash} />
        <main
          key={location.pathname}
          className="page-enter"
          style={{ flex: 1, overflow: 'hidden', background: 'var(--bg)' }}
        >
          <Routes>
            <Route path="/dashboard"        element={<PrivateRoute element={<Dashboard />} />} />
            <Route path="/events"           element={<PrivateRoute element={<EventsPage />} />} />
            <Route path="/risk"             element={<PrivateRoute element={<RiskPage />} />} />
            <Route path="/gdpr"             element={<PrivateRoute element={<GDPRPage />} />} />
            <Route path="/webhooks"         element={<PrivateRoute element={<Webhooks />} />} />
            <Route path="/settings"         element={<PrivateRoute element={<SettingsPage />} />} />
            <Route path="/ai-settings"      element={<PrivateRoute element={<SettingsPage />} />} />
            <Route path="/dev"              element={<PrivateRoute element={<DevPage />} />} />
            <Route path="/queue"             element={<PrivateRoute element={<QueuePage />} />} />
            <Route path="/connected-apps"   element={<PrivateRoute element={<ConnectedAppsPage />} />} />
            <Route path="/guide"            element={<PrivateRoute element={<GuidePage />} />} />
            <Route path="/ai-chat"          element={<PrivateRoute element={<AIChatPage />} />} />
            <Route path="/tenants/:id"      element={<PrivateRoute element={<TenantDetailPage />} />} />
            <Route path="/consent-matrix"   element={<PrivateRoute element={<ConsentMatrixPage />} />} />
            <Route path="/onboard"          element={<PrivateRoute element={<Onboard />} />} />
            <Route path="/auth/redirect"    element={<AuthRedirect />} />
            <Route path="/auth/google/callback" element={<AuthRedirect />} />
            <Route path="*"                 element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      {/* Floating AI chat panel — self-hides on /ai-chat route */}
      <AIChatPanel />
      {/* Global overlays */}
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </AuthProvider>
      </MuiThemeProvider>
    </ThemeProvider>
  );
}
