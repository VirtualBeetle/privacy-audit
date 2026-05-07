import { useState, useEffect, useRef } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { onboardApi } from '../api/client';
import { CheckIcon, PersonAddIcon } from '../components/icons/Icons';

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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {label}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: copied ? 'rgba(5,150,105,0.1)' : 'var(--surface-2)',
            color: copied ? '#059669' : 'var(--text-2)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
          }}
        >
          {copied && <CheckIcon style={{ width: 11, height: 11 }} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{
        background: '#0d1117',
        borderRadius: 10, padding: '12px 14px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, color: '#c9d1d9',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        maxHeight: 140, overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.06)',
        lineHeight: 1.6,
      }}>
        {value}
      </div>
    </div>
  );
}

function CustomStepper({ steps, activeStep }: { steps: string[]; activeStep: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 32 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < activeStep
                ? 'rgba(5,150,105,0.15)'
                : i === activeStep
                ? 'var(--accent)'
                : 'var(--surface-2)',
              border: `2px solid ${i < activeStep ? '#059669' : i === activeStep ? 'var(--accent)' : 'var(--border)'}`,
              color: i < activeStep ? '#059669' : i === activeStep ? '#fff' : 'var(--text-3)',
              fontSize: 12, fontWeight: 800,
              transition: 'all 0.3s ease',
            }}>
              {i < activeStep
                ? <CheckIcon style={{ width: 14, height: 14 }} />
                : i + 1}
            </div>
            <span style={{
              fontSize: 11, fontWeight: i === activeStep ? 700 : 500,
              color: i === activeStep ? 'var(--text)' : 'var(--text-3)',
              textAlign: 'center', whiteSpace: 'nowrap',
              transition: 'color 0.3s',
            }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, marginTop: 15, marginLeft: 8, marginRight: 8,
              background: i < activeStep ? '#059669' : 'var(--border)',
              transition: 'background 0.4s ease',
              borderRadius: 2,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
  fontFamily: "'DM Sans', sans-serif", outline: 'none',
  width: '100%', boxSizing: 'border-box', transition: 'border-color 0.15s',
  marginBottom: 12,
};

export default function Onboard() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<RegisterPayload | null>(null);

  const [eventCount, setEventCount] = useState(0);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      } catch { /* ignore polling errors */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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
    <div style={{
      minHeight: '100%',
      overflowY: 'auto',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 16px 60px',
    }}>
      <div style={{ width: '100%', maxWidth: 620 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }} className="anim-fade-up">
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #5b5ef6, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(91,94,246,0.35)',
          }}>
            <PersonAddIcon style={{ width: 24, height: 24, color: '#fff' }} />
          </div>
          <h1 style={{
            margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-0.5px', fontFamily: "'Space Grotesk', sans-serif",
          }}>
            Get Started with{' '}
            <span style={{
              background: 'linear-gradient(90deg, #5b5ef6, #a855f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Privacy Audit
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)' }}>
            Set up your tenant in under 2 minutes.
          </p>
        </div>

        {/* Stepper */}
        <div className="anim-fade-up d1">
          <CustomStepper steps={STEPS} activeStep={step} />
        </div>

        {/* Card */}
        <div className="dg-card anim-fade-up d2" style={{ padding: '32px' }}>

          {/* ── Step 0: Register ── */}
          {step === 0 && (
            <div>
              <h2 style={{
                margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Create your tenant
              </h2>
              <p style={{ margin: '0 0 22px', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Your tenant is an isolated workspace that holds your audit events and privacy data.
              </p>
              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', fontSize: 13 }}>
                  {error}
                </Alert>
              )}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                Company / App name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Corp"
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={inputStyle}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                Admin email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@acme.com"
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={inputStyle}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={{ ...inputStyle, marginBottom: 24 }}
              />
              <button
                onClick={handleRegister}
                disabled={loading}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(90deg, #5b5ef6, #a855f7)',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {loading && <CircularProgress size={16} sx={{ color: '#fff' }} />}
                {loading ? 'Creating tenant…' : 'Create tenant →'}
              </button>
            </div>
          )}

          {/* ── Step 1: API Key + Test ── */}
          {step === 1 && payload && (
            <div>
              <h2 style={{
                margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Your API Key
              </h2>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                  Save this key now — it will not be shown again.
                </span>
              </div>

              <CopyBlock label="API Key" value={payload.tenant.apiKey} />

              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                Send a test event
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Run this curl command in your terminal to confirm the connection:
              </p>
              <CopyBlock label="Sample curl" value={payload.quickstart.sendEvent} />

              {/* Live event counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                {polling && !dashboardReady && (
                  <CircularProgress size={14} thickness={4} sx={{ color: 'var(--accent)' }} />
                )}
                {dashboardReady ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)',
                  }}>
                    <CheckIcon style={{ width: 14, height: 14, color: '#059669' }} />
                    <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                      {eventCount} event{eventCount !== 1 ? 's' : ''} received — ready!
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {eventCount > 0
                      ? `${eventCount} event${eventCount !== 1 ? 's' : ''} received — waiting for more…`
                      : 'Waiting for first event…'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(90deg, #5b5ef6, #a855f7)',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Continue to Dashboard
                </button>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: '10px 18px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-2)', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Open Dashboard ── */}
          {step === 2 && payload && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(5,150,105,0.12)', border: '2px solid rgba(5,150,105,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckIcon style={{ width: 28, height: 28, color: '#059669' }} />
              </div>
              <h2 style={{
                margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: 'var(--text)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                You're all set, {payload.tenant.name}!
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                Your tenant is registered and your first events are being processed. Open the dashboard to explore your privacy data.
              </p>
              <a
                href="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 32px', borderRadius: 10,
                  background: 'linear-gradient(90deg, #5b5ef6, #a855f7)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.88')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
              >
                Open Dashboard →
              </a>
              <p style={{ margin: '18px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
                Tenant ID:{' '}
                <code style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-2)' }}>
                  {payload.tenant.id}
                </code>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
