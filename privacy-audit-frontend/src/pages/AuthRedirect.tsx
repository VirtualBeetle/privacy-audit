import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../api/client';

/**
 * AuthRedirect
 *
 * Handles two redirect flows:
 *
 * 1. /auth/redirect?token=<handshake_token>
 *    The user clicked "View my privacy" in a tenant app. Exchange the
 *    15-min handshake token for an 8-hour session JWT.
 *
 * 2. /auth/google/callback?token=<google_session_jwt>
 *    Returned from Google OAuth callback. The backend already issued the JWT.
 *    Just store it and redirect.
 */
export default function AuthRedirect() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No token found in URL. Please request a new privacy link.');
      return;
    }

    // /auth/google/callback: token is already a signed google_session JWT
    if (window.location.pathname.includes('/auth/google/callback')) {
      login(token);
      navigate('/dashboard', { replace: true });
      return;
    }

    // /auth/redirect: token is a 15-min handshake token — exchange it
    dashboardApi
      .exchangeToken(token)
      .then((data) => {
        login(data.sessionToken);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setError(
          'This link has expired or has already been used. Please request a new one from the app.',
        );
      });
  }, []);

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
        Signing you in...
      </Typography>
    </Box>
  );
}
