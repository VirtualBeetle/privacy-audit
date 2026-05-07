import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { Favorite as FavoriteIcon, People as PeopleIcon } from '@mui/icons-material';
import LinkIcon from '@mui/icons-material/Link';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../api/client';
import { HEALTH_TENANT_ID } from '../components/TenantTabs/TenantTabs';

/** Decode a JWT payload without verifying (frontend only). */
function decodeJwt(token: string): any {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function appLabelFromTenantId(tenantId: string) {
  if (tenantId === HEALTH_TENANT_ID) return 'HealthTrack';
  return 'ConnectSocial';
}

function AppIcon({ tenantId }: { tenantId: string }) {
  return tenantId === HEALTH_TENANT_ID
    ? <FavoriteIcon sx={{ fontSize: 32, color: '#ef4444' }} />
    : <PeopleIcon sx={{ fontSize: 32, color: '#0ea5e9' }} />;
}

function appColor(tenantId: string) {
  return tenantId === HEALTH_TENANT_ID ? '#ef4444' : '#0ea5e9';
}

/**
 * AuthRedirect
 *
 * Handles two redirect flows:
 *
 * 1. /auth/redirect?token=<handshake_token>
 *    The user clicked "View my privacy" in a tenant app.
 *    - If they already have a google_session: offer to LINK the tenant account.
 *    - Otherwise: exchange the token for an 8-hour session JWT and log in.
 *
 * 2. /auth/google/callback?token=<google_session_jwt>
 *    Returned from Google OAuth. Backend already issued the JWT — just store it.
 */
export default function AuthRedirect() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  // Link-confirmation state
  const [linkState, setLinkState] = useState<{
    handshakeToken: string;
    dashboardSessionToken: string;
    googleSessionToken: string;
    tenantId: string;
  } | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No token found in URL. Please request a new privacy link.');
      return;
    }

    // ── Google OAuth callback ─────────────────────────────────────────────────
    if (window.location.pathname.includes('/auth/google/callback')) {
      login(token);
      navigate('/dashboard', { replace: true });
      return;
    }

    // ── Handshake token (tenant → dashboard) ─────────────────────────────────
    // Check if the user already has a google_session
    const storedToken = localStorage.getItem('session_token');
    const storedPayload = storedToken ? decodeJwt(storedToken) : null;

    if (storedPayload?.type === 'google_session') {
      // Exchange first to get the dashboard_session JWT (to extract tenantId)
      dashboardApi
        .exchangeToken(token)
        .then((data) => {
          const payload = decodeJwt(data.sessionToken);
          setLinkState({
            handshakeToken: token,
            dashboardSessionToken: data.sessionToken,
            googleSessionToken: storedToken!,
            tenantId: payload?.tenantId ?? '',
          });
        })
        .catch(() => {
          setError('This link has expired or has already been used. Please request a new one from the app.');
        });
      return;
    }

    // No existing session — exchange and log in normally
    dashboardApi
      .exchangeToken(token)
      .then((data) => {
        login(data.sessionToken);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setError('This link has expired or has already been used. Please request a new one from the app.');
      });
  }, []);

  // ── Link confirmation ───────────────────────────────────────────────────────
  const handleLink = async () => {
    if (!linkState) return;
    setLinking(true);
    try {
      await dashboardApi.linkAccountWith(
        linkState.dashboardSessionToken,
        linkState.googleSessionToken,
      );
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Failed to link the account. Please try again.');
    } finally {
      setLinking(false);
    }
  };

  const handleLoginInstead = () => {
    if (!linkState) return;
    login(linkState.dashboardSessionToken);
    navigate('/dashboard', { replace: true });
  };

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          px: 2,
          background: '#f8fafc',
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/login')}>
          Back to login
        </Button>
      </Box>
    );
  }

  // ── Link confirmation UI ────────────────────────────────────────────────────
  if (linkState) {
    const appLabel = appLabelFromTenantId(linkState.tenantId);
    const color = appColor(linkState.tenantId);

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          px: 2,
          background: 'linear-gradient(160deg, #f1f5f9 0%, #e8edf5 100%)',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 440,
            width: '100%',
            p: 4,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          {/* App icon */}
          <Box
            sx={{
              width: 68,
              height: 68,
              borderRadius: 3,
              background: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <AppIcon tenantId={linkState.tenantId} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            Link {appLabel} to your account?
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 3.5, lineHeight: 1.7 }}>
            Your <strong>{appLabel}</strong> privacy data will appear on your DataGuard dashboard
            alongside any other connected apps. You'll see exactly how your data is being used.
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5, p: 1.5, borderRadius: 2, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <LinkIcon sx={{ color: '#6366f1', fontSize: 20, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: '#475569', textAlign: 'left' }}>
              This connects your <strong>{appLabel}</strong> account to your Google sign-in. You can unlink at any time.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleLink}
              disabled={linking}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                py: 1.2,
                backgroundColor: color,
                boxShadow: `0 4px 14px ${color}40`,
                '&:hover': { backgroundColor: color, filter: 'brightness(0.9)' },
              }}
            >
              {linking ? 'Linking…' : `Yes, link ${appLabel}`}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleLoginInstead}
              disabled={linking}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                py: 1.2,
                borderColor: '#e2e8f0',
                color: '#64748b',
                '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f8fafc' },
              }}
            >
              No, just view as {appLabel} user
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        background: '#f8fafc',
      }}
    >
      <CircularProgress size={40} thickness={4} />
      <Typography variant="body1" sx={{ color: '#64748b' }}>
        Signing you in…
      </Typography>
    </Box>
  );
}
