import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Shield as ShieldIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../api/client';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoLogging, setAutoLogging] = useState(false);

  const isJwt = (t: string) => t.trim().split('.').length === 3;
  const isUuid = (t: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.trim());

  const attemptLogin = async (rawToken: string) => {
    const t = rawToken.trim();
    if (isUuid(t)) {
      setError('This looks like a user ID, not a login token. Go back to the app and click "View my privacy" — it will generate a proper token automatically.');
      return;
    }
    if (!isJwt(t)) {
      setError('Invalid token format. A valid token starts with "eyJ..." and contains two dots. Go back to the app and request a fresh link.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await dashboardApi.exchangeToken(t);
      login(data.sessionToken);
      navigate('/dashboard');
    } catch {
      setError('This token has expired (tokens are valid for 15 minutes). Go back to the app and click "View my privacy" again to get a fresh link.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-consume ?token= param — set by tenant apps after issuing a handshake token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoToken = params.get('token');
    if (autoToken) {
      setAutoLogging(true);
      setToken(autoToken);
      dashboardApi.exchangeToken(autoToken)
        .then((data) => { login(data.sessionToken); navigate('/dashboard'); })
        .catch(() => {
          setAutoLogging(false);
          setError('This link has expired (valid for 15 minutes). Go back to the app and click "View my privacy" again.');
        });
    }
  }, []);

  const handleTokenLogin = () => attemptLogin(token);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          width: '100%',
          borderRadius: 3,
          p: { xs: 3, sm: 5 },
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(56,189,248,0.4)',
            }}
          >
            <ShieldIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}
            >
              DataGuard
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
              Privacy Dashboard
            </Typography>
          </Box>
        </Box>

        <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 0.5 }}>
          Sign in to your privacy dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 4 }}>
          View how your personal data is accessed across connected apps.
        </Typography>

        {/* Google OAuth */}
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
          sx={{
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#f1f5f9',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.5,
            mb: 3,
            '&:hover': { borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' },
          }}
          startIcon={
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          }
        >
          Continue with Google
        </Button>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }}>
          <Typography sx={{ color: '#64748b', fontSize: '0.75rem', px: 1 }}>
            or enter a link token
          </Typography>
        </Divider>

        {/* Auto-login spinner */}
        {autoLogging && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CircularProgress size={28} sx={{ color: '#38bdf8', mb: 1.5 }} />
            <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Signing you in automatically…
            </Typography>
          </Box>
        )}

        {/* Token-based login (fallback — tenant apps use ?token= auto-flow) */}
        {!autoLogging && (
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1.5 }}>
          Received a "View my privacy" link from an app? Paste the token here:
        </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {!autoLogging && (
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="eyJ... (JWT token from the app — not your user ID)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
              },
            }}
          />
        )}

        {!autoLogging && <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleTokenLogin}
          disabled={loading || !token.trim()}
          sx={{
            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 700,
            py: 1.5,
            '&:disabled': { opacity: 0.5 },
          }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Access my privacy data'}
        </Button>}
      </Paper>
    </Box>
  );
}
