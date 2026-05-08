import { useState } from 'react';

const STEPS = [
  {
    title: 'Connect an App',
    icon: '🔌',
    description: 'Send your first event from your app using one of the DataGuard SDKs.',
    content: (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SDK Snippet (JavaScript)</div>
        <pre style={{
          background: '#0d0d12', color: '#e2e8f0', padding: '16px', borderRadius: 10,
          fontSize: 12, fontFamily: "'JetBrains Mono', monospace", overflowX: 'auto',
          lineHeight: 1.7, margin: 0,
        }}>
{`import { DataGuard } from '@dataguard/sdk';

const dg = new DataGuard({
  tenantId: 'YOUR_TENANT_ID',
  apiKey:   'YOUR_API_KEY',
});

await dg.track({
  userId:    'user-123',
  action:    'profile_view',
  dataField: 'email',
});`}
        </pre>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>
          SDKs available: Go, Python, JavaScript/TypeScript. See the <a href="/guide" style={{ color: 'var(--accent)' }}>Guide</a> for full docs.
        </div>
      </div>
    ),
  },
  {
    title: 'Verify Webhook',
    icon: '🔗',
    description: 'Make sure your backend webhook endpoint is reachable so DataGuard can notify you of CRITICAL events.',
    content: (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Example webhook payload</div>
        <pre style={{
          background: '#0d0d12', color: '#e2e8f0', padding: '16px', borderRadius: 10,
          fontSize: 12, fontFamily: "'JetBrains Mono', monospace", overflowX: 'auto',
          lineHeight: 1.7, margin: 0,
        }}>
{`POST https://your-server.com/privacy-hook
X-DataGuard-Signature: sha256=<hmac>

{
  "event":    "HIGH_RISK_ALERT",
  "tenantId": "xxx",
  "severity": "CRITICAL",
  "message":  "Unconsented data access detected"
}`}
        </pre>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>
          Register your webhook URL in <a href="/webhooks" style={{ color: 'var(--accent)' }}>Webhooks</a> to receive HMAC-signed alerts.
        </div>
      </div>
    ),
  },
  {
    title: 'Watch Your First Event',
    icon: '📡',
    description: 'Once you send an event from your app, it appears here in real time via Server-Sent Events.',
    content: (
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Dashboard</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Live feed of all events, sensitivity breakdown, and AI risk score</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Risk Alerts</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>AI analyzes patterns and flags potential GDPR violations automatically</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 20 }}>⚖️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>GDPR Rights</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Users can export their data (Art. 20) or request deletion (Art. 17)</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

interface Props {
  onDismiss: () => void;
}

export default function OnboardingWizard({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 520, borderRadius: 20,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--surface-3)' }}>
          <div style={{
            height: '100%', width: `${((step + 1) / STEPS.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent), var(--brand))',
            transition: 'width 0.4s ease',
          }} />
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent-dim), var(--brand-dim))',
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 24,
            }}>
              {current.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                Step {step + 1} of {STEPS.length}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
                {current.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
                {current.description}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ marginBottom: 24 }}>{current.content}</div>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 20 : 8, height: 8, borderRadius: 4,
                background: i === step ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.3s ease', cursor: 'pointer',
              }} onClick={() => setStep(i)} />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ← Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={onDismiss}
              style={{
                padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-3)', fontSize: 13,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Skip
            </button>
            <button
              onClick={() => {
                if (step < STEPS.length - 1) setStep(s => s + 1);
                else onDismiss();
              }}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, var(--accent), var(--brand))',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 4px 14px var(--accent-glow)',
              }}
            >
              {step < STEPS.length - 1 ? 'Next →' : 'Get Started ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
