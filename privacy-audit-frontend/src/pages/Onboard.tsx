import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { onboardApi } from '../api/client';

const STEPS = ['Register Tenant', 'Copy API Key & Test', 'Open Dashboard'];

interface RegisterPayload {
  tenant: { id: string; name: string; email: string; apiKey: string };
  dashboardUrl: string;
  quickstart: { sendEvent: string; loginDashboard: string };
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? '#22c55e' : '#6366f1' }}>
            {copied ? <CheckCircleOutlineIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        sx={{
          background: '#0f172a',
          borderRadius: 2,
          p: 1.5,
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          color: '#e2e8f0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: 140,
          overflowY: 'auto',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

export default function Onboard() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<RegisterPayload | null>(null);

  // Step 2 polling state
  const [eventCount, setEventCount] = useState(0);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start polling once we have a tenantId
  useEffect(() => {
    if (step !== 1 || !payload) return;
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const status = await onboardApi.getStatus(payload.tenant.id);
        setEventCount(status.eventCount ?? 0);
        if (status.dashboardReady) {
          setDashboardReady(true);
          clearInterval(pollRef.current!);
          setPolling(false);
        }
      } catch {
        // ignore polling errors silently
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, payload]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await onboardApi.register(name.trim(), email.trim(), password);
      setPayload(data);
      setStep(1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #f1f5f9 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pt: { xs: 4, md: 8 },
        px: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 640 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.2 }}
          >
            Get Started with{' '}
            <span style={{ background: 'linear-gradient(90deg,#6366f1,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Privacy Audit
            </span>
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
            Set up your tenant in under 2 minutes.
          </Typography>
        </Box>

        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: { xs: 3, md: 4 } }}>

          {/* ── Step 0: Register ── */}
          {step === 0 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Create your tenant</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                Your tenant is an isolated workspace that holds your audit events and privacy data.
              </Typography>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
              <TextField
                label="Company / App name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                size="small"
              />
              <TextField
                label="Admin email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                size="small"
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                sx={{ mb: 3 }}
                size="small"
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleRegister}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{
                  py: 1.2,
                  fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(90deg,#6366f1,#a855f7)',
                  '&:hover': { background: 'linear-gradient(90deg,#4f46e5,#9333ea)' },
                }}
              >
                {loading ? 'Creating tenant…' : 'Create tenant'}
              </Button>
            </Box>
          )}

          {/* ── Step 1: API Key + Test ── */}
          {step === 1 && payload && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Your API Key</Typography>
              <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
                Save this key now — it will not be shown again.
              </Alert>

              <CopyBlock label="API Key" value={payload.tenant.apiKey} />

              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', mb: 1 }}>
                Send a test event
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
                Run this curl command in your terminal to confirm the connection is working:
              </Typography>
              <CopyBlock label="Sample curl" value={payload.quickstart.sendEvent} />

              {/* Live event counter */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                {polling && !dashboardReady && (
                  <CircularProgress size={16} thickness={4} sx={{ color: '#6366f1' }} />
                )}
                {dashboardReady ? (
                  <Chip
                    icon={<CheckCircleOutlineIcon />}
                    label={`${eventCount} event${eventCount !== 1 ? 's' : ''} received — ready!`}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                ) : (
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {eventCount > 0
                      ? `${eventCount} event${eventCount !== 1 ? 's' : ''} received — waiting for more…`
                      : 'Waiting for first event…'}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => setStep(2)}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'none',
                    background: 'linear-gradient(90deg,#6366f1,#a855f7)',
                    '&:hover': { background: 'linear-gradient(90deg,#4f46e5,#9333ea)' },
                  }}
                >
                  Continue to Dashboard
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setStep(2)}
                  sx={{ fontWeight: 600, textTransform: 'none', color: '#64748b', borderColor: '#e2e8f0' }}
                >
                  Skip for now
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Step 2: Open Dashboard ── */}
          {step === 2 && payload && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#22c55e', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                You're all set, {payload.tenant.name}!
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                Your tenant is registered and your first events are being processed. Open the dashboard to explore your privacy data.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  href="/login"
                  size="large"
                  endIcon={<OpenInNewIcon />}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 4,
                    background: 'linear-gradient(90deg,#6366f1,#a855f7)',
                    '&:hover': { background: 'linear-gradient(90deg,#4f46e5,#9333ea)' },
                  }}
                >
                  Open Dashboard
                </Button>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Tenant ID: <strong style={{ fontFamily: 'monospace' }}>{payload.tenant.id}</strong>
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
