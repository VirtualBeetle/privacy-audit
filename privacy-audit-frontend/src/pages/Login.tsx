import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../api/client';
import {
  ShieldIcon, VerifyIcon, BrainIcon, GdprIcon, GoogleIcon,
  ChevRightIcon,
} from '../components/icons/Icons';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080';

const FEATURES = [
  { icon: VerifyIcon, label: 'SHA-256 tamper-evident audit log' },
  { icon: BrainIcon,  label: 'AI risk analysis every 6 hours' },
  { icon: GdprIcon,   label: 'GDPR Article 17, 20, 33 controls' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'main' | 'token' | 'email'>('main');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoLogging, setAutoLogging] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const isJwt = (t: string) => t.trim().split('.').length === 3;
  const isUuid = (t: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.trim());

  /* ── Auto-consume ?token= query param ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoToken = params.get('token');
    if (autoToken) {
      setAutoLogging(true);
      dashboardApi
        .exchangeToken(autoToken)
        .then(data => { login(data.sessionToken); navigate('/dashboard'); })
        .catch(() => {
          setAutoLogging(false);
          setError('This link has expired (valid for 24 hours). Go back to the app and click "View my privacy" again.');
        });
    }
  }, []);

  const handleTokenLogin = async () => {
    const t = token.trim();
    if (!t) return;
    if (isUuid(t)) {
      setError('This looks like a user ID, not a token. Go back to the app and click "View my privacy" — it will generate a proper token.');
      return;
    }
    if (!isJwt(t)) {
      setError('Invalid token format. A valid token starts with "eyJ…" and has two dots. Request a fresh link from the app.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await dashboardApi.exchangeToken(t);
      login(data.sessionToken);
      navigate('/dashboard');
    } catch {
      setError('Token has expired (tokens are valid for 24 hours). Go back to the app and click "View my privacy" again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Invalid credentials');
      login(data.access_token);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared input style ── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.15s',
  };

  const btnPrimaryStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #5b5ef6, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: '0 4px 16px rgba(91,94,246,0.35)',
    transition: 'all 0.18s ease',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f2f8' }}>

      {/* ── Left panel: brand ───────────────────────────────── */}
      <div style={{
        width: '48%',
        background: 'linear-gradient(160deg, #0f1729 0%, #1a1040 60%, #0f1729 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '56px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid background */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
          <defs>
            <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>

        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '35%',
          left: '30%',
          width: 400,
          height: 400,
          background: 'radial-gradient(ellipse, rgba(91,94,246,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 72, position: 'relative' }}>
          <div style={{
            width: 42,
            height: 42,
            background: 'linear-gradient(135deg, #5b5ef6, #7c3aed)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(91,94,246,0.45)',
          }}>
            <ShieldIcon style={{ width: 22, height: 22, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.3px' }}>
              DataGuard
            </div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
              Privacy Dashboard
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          <div style={{
            fontSize: 38,
            fontWeight: 800,
            color: '#f1f5f9',
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.15,
            letterSpacing: '-1px',
            marginBottom: 20,
          }}>
            Your data.<br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Your rights.
            </span>
          </div>
          <div style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.75, maxWidth: 360, marginBottom: 48 }}>
            See exactly how your personal data is accessed, shared, and used — across every application you've connected.
          </div>

          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'rgba(91,94,246,0.15)',
                border: '1px solid rgba(91,94,246,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <f.icon style={{ width: 15, height: 15, color: '#818cf8' }} />
              </div>
              <span style={{ fontSize: 13.5, color: '#cbd5e1', fontWeight: 500 }}>{f.label}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: '#475569', position: 'relative' }}>
          Griffith College Dublin · MSCC Dissertation 2026
        </div>
      </div>

      {/* ── Right panel: form ───────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: 'var(--bg)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* ── Auto-login spinner ── */}
          {autoLogging && (
            <div className="anim-fade-up d0" style={{ textAlign: 'center', padding: '48px 0' }}>
              <CircularProgress size={36} sx={{ color: 'var(--accent)' }} />
              <div style={{ marginTop: 16, fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>
                Signing you in automatically…
              </div>
            </div>
          )}

          {/* ── Main mode ── */}
          {!autoLogging && mode === 'main' && (
            <div className="anim-fade-up d0">
              <div style={{ marginBottom: 36 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px', marginBottom: 6 }}>
                  Sign in to DataGuard
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>View your privacy audit records</div>
              </div>

              {/* Google */}
              <button
                onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '12px 20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 24,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.18s ease',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
              >
                <GoogleIcon style={{ width: 18, height: 18 }} />
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>or sign in as admin</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {/* Email/password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <input
                  type="email"
                  placeholder="admin@healthdemo.internal"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--red-dim)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 9,
                  fontSize: 12.5,
                  color: 'var(--red)',
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleEmailLogin}
                disabled={loading || !email.trim() || !password.trim()}
                style={{
                  ...btnPrimaryStyle,
                  marginBottom: 16,
                  opacity: (!email.trim() || !password.trim()) ? 0.55 : 1,
                  cursor: (!email.trim() || !password.trim()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => { if (email.trim() && password.trim()) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(91,94,246,0.4)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(91,94,246,0.35)'; }}
              >
                {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <>Sign in as admin <ChevRightIcon style={{ width: 16, height: 16 }} /></>}
              </button>

              {/* Token fallback link */}
              <button
                onClick={() => { setMode('token'); setError(''); }}
                style={{
                  width: '100%',
                  padding: '9px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  color: 'var(--text-3)',
                  fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                }}
              >
                Came from an app with a handshake token? Click here
              </button>

              {/* Demo accounts */}
              <div style={{ marginTop: 24 }}>
                <button
                  onClick={() => setShowDemo(v => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '9px 14px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: showDemo ? '10px 10px 0 0' : 10,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.15s',
                  }}
                >
                  <span>Demo accounts (click to fill)</span>
                  <span style={{
                    transform: showDemo ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    fontSize: 10,
                  }}>▼</span>
                </button>

                {showDemo && (
                  <div style={{
                    border: '1px solid var(--border)',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    overflow: 'hidden',
                  }}>
                    {[
                      {
                        label: 'Super Admin',
                        badge: 'super_admin',
                        badgeColor: '#7c3aed',
                        email: 'see Render env SUPER_ADMIN_EMAIL',
                        password: 'see Render env SUPER_ADMIN_PASSWORD',
                        note: 'Set in Render environment variables',
                        clickable: false,
                      },
                      {
                        label: 'HealthTrack Admin',
                        badge: 'tenant_admin',
                        badgeColor: '#0284c7',
                        email: 'admin@healthdemo.internal',
                        password: 'HealthDemo123!',
                        note: null,
                        clickable: true,
                      },
                      {
                        label: 'ConnectSocial Admin',
                        badge: 'tenant_admin',
                        badgeColor: '#0284c7',
                        email: 'admin@socialdemo.internal',
                        password: 'SocialDemo123!',
                        note: null,
                        clickable: true,
                      },
                      {
                        label: 'Google User',
                        badge: 'google_session',
                        badgeColor: '#059669',
                        email: null,
                        password: null,
                        note: 'Use "Continue with Google" above',
                        clickable: false,
                      },
                    ].map((acct, i, arr) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (acct.clickable && acct.email && acct.password) {
                            setEmail(acct.email);
                            setPassword(acct.password);
                            setShowDemo(false);
                          }
                        }}
                        style={{
                          padding: '10px 14px',
                          borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                          background: 'var(--surface)',
                          cursor: acct.clickable ? 'pointer' : 'default',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (acct.clickable) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{acct.label}</span>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.4px',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: `${acct.badgeColor}22`,
                            color: acct.badgeColor,
                          }}>{acct.badge}</span>
                          {acct.clickable && (
                            <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 'auto' }}>click to fill →</span>
                          )}
                        </div>
                        {acct.email ? (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {acct.email}
                          </div>
                        ) : null}
                        {acct.note ? (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                            {acct.note}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Token mode ── */}
          {!autoLogging && mode === 'token' && (
            <div className="anim-fade-up d0">
              <button
                onClick={() => { setMode('main'); setError(''); setToken(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-3)',
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: 28,
                  padding: 0,
                }}
              >
                ← Back to sign in
              </button>

              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>
                Paste your app token
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.6 }}>
                The tenant app provides a short-lived JWT token (valid 24 hours) for seamless sign-in. Paste it below.
              </div>

              <textarea
                value={token}
                onChange={e => { setToken(e.target.value); setError(''); }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                rows={4}
                style={{
                  ...inputStyle,
                  resize: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  marginBottom: error ? 10 : 16,
                  borderColor: error ? 'var(--red)' : 'var(--border)',
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)'; }}
              />

              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--red-dim)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 9,
                  fontSize: 12.5,
                  color: 'var(--red)',
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleTokenLogin}
                disabled={loading || !token.trim()}
                style={{
                  ...btnPrimaryStyle,
                  opacity: !token.trim() ? 0.55 : 1,
                  cursor: !token.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Sign in with token'}
              </button>

              <div style={{
                marginTop: 16,
                padding: '12px 14px',
                background: 'var(--accent-dim)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--accent)',
                lineHeight: 1.6,
              }}>
                <strong>Tip:</strong> Tokens expire after 24 hours. If you get an "expired" error, go back to the app and click "View my privacy" again.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
