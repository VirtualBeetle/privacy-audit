import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section { id: string; label: string }

const SECTIONS: Section[] = [
  { id: 'credentials', label: 'User Credentials' },
  { id: 'user-types',  label: 'User Types' },
  { id: 'features',    label: 'Feature Map' },
  { id: 'scenarios',   label: 'Demo Scenarios' },
  { id: 'api-keys',    label: 'API Keys & Dev' },
  { id: 'architecture', label: 'Architecture' },
];

// ─── Small helpers ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handle}
      style={{
        padding: '2px 8px', borderRadius: 5,
        border: '1px solid var(--border)',
        background: copied ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)',
        color: copied ? '#22c55e' : 'var(--text-3)',
        fontSize: 10, fontWeight: 600, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 0.15s',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function Mono({ children }: { children: string }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 5,
      padding: '1px 6px',
      color: 'var(--text)',
    }}>
      {children}
    </span>
  );
}

function SectionBlock({ id, title, sub, children }: {
  id: string; title: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div id={id} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '22px 26px', marginBottom: 20,
      scrollMarginTop: 80,
    }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.2px' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function CredCard({
  role, email, password, apiKey, note, color,
}: {
  role: string;
  email?: string;
  password?: string;
  apiKey?: string;
  note?: string;
  color: string;
}) {
  return (
    <div style={{
      border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: '14px 16px',
      background: `${color}08`,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.4px', marginBottom: 10, textTransform: 'uppercase' }}>
        {role}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', width: 72, flexShrink: 0 }}>Email</span>
            <Mono>{email}</Mono>
            <CopyButton text={email} />
          </div>
        )}
        {password && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', width: 72, flexShrink: 0 }}>Password</span>
            <Mono>{password}</Mono>
            <CopyButton text={password} />
          </div>
        )}
        {apiKey && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', width: 72, flexShrink: 0 }}>API Key</span>
            <Mono>{apiKey}</Mono>
            <CopyButton text={apiKey} />
          </div>
        )}
        {note && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, marginTop: 1,
      }}>
        {n}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState('credentials');

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Sticky nav */}
      <div style={{
        width: 180,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        padding: '24px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 10 }}>
          Contents
        </div>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setActiveSection(s.id);
              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              padding: '7px 10px', borderRadius: 8, border: 'none',
              background: activeSection === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: activeSection === s.id ? 'var(--accent)' : 'var(--text-3)',
              fontSize: 12, fontWeight: activeSection === s.id ? 600 : 400,
              cursor: 'pointer', textAlign: 'left',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.12s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 28px 48px',
        scrollbarWidth: 'thin',
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.4px' }}>
            DataGuard — User Guide
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            Demo credentials, feature walkthrough, and architecture notes for the Griffith College MSCC Dissertation 2026.
          </div>
        </div>

        {/* ── Credentials ── */}
        <SectionBlock id="credentials" title="User Credentials" sub="All accounts auto-seeded on every deployment">

          <CredCard
            role="Super Admin"
            note="Set your own credentials via SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables on Render. The super admin sees all tenants, has Dev Controls access, and can configure AI providers."
            color="#6366f1"
          />

          <CredCard
            role="HealthTrack — Tenant Admin"
            email="admin@healthdemo.internal"
            password="HealthDemo123!"
            apiKey="health-tenant-api-key"
            note="Tenant admin for the HealthTrack medical demo. Sees all HealthTrack events (all users, no user-id filter). Can manage webhooks, view risk alerts, and see GDPR requests for their tenant."
            color="#f97316"
          />

          <CredCard
            role="ConnectSocial — Tenant Admin"
            email="admin@socialdemo.internal"
            password="SocialDemo123!"
            apiKey="social-tenant-api-key"
            note="Tenant admin for the ConnectSocial social media demo. Same capabilities as HealthTrack admin, scoped to ConnectSocial data."
            color="#ec4899"
          />

          <CredCard
            role="Google User"
            note="Click 'Continue with Google' on the login page. After login, go to Connected Apps to link one or both tenant accounts. A linked account lets you see that tenant's events from a personal-rights perspective."
            color="#22c55e"
          />

          <div style={{ padding: '12px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text-2)' }}>Note on tenant users:</strong> Individual end-users of HealthTrack or ConnectSocial apps don't have a direct dashboard password. They access the dashboard via a one-time handshake token generated by the tenant app when they click "View my privacy data". For demo purposes, use the Dev Controls page to seed events for a specific user ID, then use the token exchange flow.
          </div>
        </SectionBlock>

        {/* ── User types ── */}
        <SectionBlock id="user-types" title="User Types & Capabilities" sub="What each role can see and do in the dashboard">
          {[
            {
              role: 'Super Admin',
              color: '#6366f1',
              badge: 'super_admin',
              nav: ['Overview', 'Audit Events', 'Risk Alerts', 'GDPR Rights', 'Webhooks', 'Connected Apps', 'Onboard Tenant', 'Queue Monitor', 'Dev / Demo', 'Settings'],
              can: [
                'See audit events across ALL tenants',
                'Manage AI providers in Settings',
                'Trigger risk analysis and seed events via Dev Controls',
                'View BullMQ queue status',
                'Onboard new tenant applications',
                'See all notifications (risk alerts from every tenant)',
              ],
            },
            {
              role: 'Tenant Admin',
              color: '#f97316',
              badge: 'tenant_admin',
              nav: ['Overview', 'Audit Events', 'Risk Alerts', 'GDPR Rights', 'Webhooks', 'Queue Monitor', 'Settings'],
              can: [
                'See all events for their own tenant',
                'View and manage webhooks for their tenant',
                'See AI risk alerts scoped to their tenant',
                'View GDPR export/deletion request overview for their tenant',
                'Receive HIGH/CRITICAL risk notifications',
              ],
            },
            {
              role: 'Tenant User (End User)',
              color: '#eab308',
              badge: 'end_user',
              nav: ['Overview', 'Audit Events', 'GDPR Rights', 'Settings'],
              can: [
                'See only their own events (filtered by tenantUserId)',
                'Request GDPR Article 20 data export (JSON download)',
                'Request GDPR Article 17 account deletion',
                'View their privacy health score',
                'Chat with DataGuard AI about their data',
              ],
            },
            {
              role: 'Google User',
              color: '#22c55e',
              badge: 'google_session',
              nav: ['Overview', 'Audit Events', 'GDPR Rights', 'Connected Apps', 'Settings'],
              can: [
                'Link multiple tenant accounts via Connected Apps',
                'See a cross-app aggregated view of their events',
                'Unlink tenant accounts at any time',
                'Exercise GDPR rights per linked tenant',
              ],
            },
          ].map((u) => (
            <div key={u.role} style={{
              borderLeft: `3px solid ${u.color}`,
              padding: '12px 14px',
              background: `${u.color}06`,
              borderRadius: '0 10px 10px 0',
              marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: u.color }}>{u.role}</span>
                <span style={{ padding: '1px 7px', borderRadius: 4, background: `${u.color}20`, color: u.color, fontSize: 9, fontWeight: 800, letterSpacing: '0.4px', fontFamily: "'JetBrains Mono', monospace" }}>
                  {u.badge}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Nav: </span>{u.nav.join(' · ')}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {u.can.map((c) => (
                  <li key={c} style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </SectionBlock>

        {/* ── Feature map ── */}
        <SectionBlock id="features" title="Feature Map" sub="Every feature and the GDPR article it demonstrates">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { page: 'Audit Events', art: 'Art.30', desc: 'Full tamper-evident event log. Each event has a SHA-256 hash linking to the previous one. Expand any event to see HASH and PREV values. Click "SHA-256 chained →" to go to the Queue Monitor.' },
              { page: 'Risk Alerts', art: 'Art.35', desc: 'AI-generated DPIA findings. The system analyses the last 24h of events every 6 hours and creates structured findings (LOW/MEDIUM/HIGH/CRITICAL). HIGH+ alerts trigger notifications and webhooks.' },
              { page: 'GDPR Rights — admin', art: 'Art.17/20', desc: 'For admins: overview table of all export and deletion requests across their tenant(s), with status tracking.' },
              { page: 'GDPR Rights — user', art: 'Art.17/20', desc: 'For end users: request a data export (JSON download) or account deletion. Deletion produces a SHA-256 evidence hash for accountability.' },
              { page: 'Webhooks', art: 'Art.28', desc: 'Register HMAC-signed notification endpoints. DataGuard fires a signed POST for every HIGH/CRITICAL risk alert.' },
              { page: 'Connected Apps', art: 'Art.5', desc: 'Google users link tenant accounts. Admins see a full tenant management table with event counts and status.' },
              { page: 'Queue Monitor', art: 'Art.32', desc: 'BullMQ + Redis pipeline status: waiting / active / completed / failed / delayed. Shows the async audit event processing pipeline.' },
              { page: 'Breach Notification', art: 'Art.33', desc: 'Report a data breach via the Overview page. Starts a 72-hour countdown to regulatory notification.' },
              { page: 'Dev / Demo Controls', art: 'N/A', desc: 'Super admin only. Seed events, trigger risk analysis on demand, simulate breaches, run retention purge, send weekly digest.' },
              { page: 'Settings → AI', art: 'N/A', desc: 'Configure the active AI provider (Gemini, Claude, OpenAI). Set API key, model, label. Only one provider is active at a time.' },
              { page: 'Notifications Bell', art: 'Art.35', desc: 'MongoDB-backed real-time notifications. Pulsing red dot when unread. Polls every 60 seconds. Shows severity badge, type, time ago. Click to mark read.' },
            ].map((f, i) => (
              <div key={f.page} style={{
                display: 'grid', gridTemplateColumns: '180px 70px 1fr',
                padding: '10px 12px', gap: 16, alignItems: 'start',
                borderBottom: i < 10 ? '1px solid var(--border)' : 'none',
                borderRadius: i === 0 ? '8px 8px 0 0' : i === 10 ? '0 0 8px 8px' : 0,
                background: 'var(--surface-2)',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{f.page}</span>
                <span style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', fontSize: 10, fontWeight: 700, width: 'fit-content' }}>{f.art}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>{f.desc}</span>
              </div>
            ))}
          </div>
        </SectionBlock>

        {/* ── Demo scenarios ── */}
        <SectionBlock id="scenarios" title="Demo Scenarios" sub="Step-by-step flows to showcase the system during a presentation">

          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>Scenario 1 — End-to-end risk detection</div>
          <Step n={1} title="Log in as Super Admin" desc="Use your SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD credentials." />
          <Step n={2} title="Go to Dev / Demo Controls" desc="Click 'Seed Events' — pick HealthTrack tenant and any user ID (e.g. user-demo-001). Seed 30+ events." />
          <Step n={3} title="Click 'Trigger Risk Analysis'" desc="This runs the AI DPIA analysis immediately (normally runs every 6 hours). Wait a few seconds." />
          <Step n={4} title="Go to Risk Alerts page" desc="New HIGH/CRITICAL findings appear. Expand one to see the description and suggested action." />
          <Step n={5} title="Check the notification bell" desc="A pulsing red dot indicates unread notifications. Open the drawer — the risk alert notification is there." />
          <Step n={6} title="Verify the hash chain" desc="Go to Audit Events, click 'SHA-256 chained →', then on Queue Monitor click 'Verify Chain Integrity'." />

          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginTop: 20, marginBottom: 12 }}>Scenario 2 — User exercises GDPR rights</div>
          <Step n={1} title="Log in as HealthTrack Admin" desc="Email: admin@healthdemo.internal · Password: HealthDemo123!" />
          <Step n={2} title="Go to GDPR Rights" desc="Admin view shows the management table. Switch to 'Art.17 Deletions' tab." />
          <Step n={3} title="Switch to a tenant user session" desc="In a new tab, use the Dev Controls to get a session token for a specific user, or use the handshake token flow." />
          <Step n={4} title="Request an Art.20 export" desc="Click 'Request Export'. The system processes it async and auto-downloads a JSON file when complete." />
          <Step n={5} title="Request Art.17 erasure" desc="Click 'Request Deletion', confirm. A SHA-256 evidence hash is stored proving the deletion happened." />
          <Step n={6} title="Back in admin view: refresh GDPR page" desc="The deletion request now shows as 'completed' in the management table." />

          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginTop: 20, marginBottom: 12 }}>Scenario 3 — Google user cross-app view</div>
          <Step n={1} title="Click 'Continue with Google'" desc="Authenticate with your Google account." />
          <Step n={2} title="Go to Connected Apps" desc="Click 'Link App'. Pick HealthTrack, enter admin@healthdemo.internal and HealthDemo123!." />
          <Step n={3} title="Link ConnectSocial too" desc="Repeat for admin@socialdemo.internal and SocialDemo123!." />
          <Step n={4} title="Go to Audit Events" desc="Now see a merged event feed from both tenant apps — HealthTrack events and ConnectSocial events together." />
        </SectionBlock>

        {/* ── API Keys ── */}
        <SectionBlock id="api-keys" title="API Keys & Developer Access" sub="Keys for sending events and accessing admin endpoints">

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>Tenant API Keys (for POST /api/events)</div>
            <CredCard role="HealthTrack App" apiKey="health-tenant-api-key" color="#f97316" />
            <CredCard role="ConnectSocial App" apiKey="social-tenant-api-key" color="#ec4899" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Dev Token (for /api/dev/* endpoints)</div>
            <div style={{ padding: '12px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Set your dev token in <strong style={{ color: 'var(--text-2)' }}>Settings → Security → Dev Token</strong>. Store it in localStorage. The Dev Controls page reads it from there to authenticate <Mono>/api/dev/*</Mono> calls.
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Example: Send an event via curl</div>
            <div style={{
              padding: '12px 14px', borderRadius: 9,
              background: '#0f1729', border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: '#a5b4fc', lineHeight: 1.8, overflowX: 'auto',
              whiteSpace: 'pre',
            }}>
{`curl -X POST https://your-app.onrender.com/api/events \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: health-tenant-api-key" \\
  -d '{
    "event_id": "evt-demo-001",
    "tenant_user_id": "user-demo-001",
    "action": { "code": "READ", "label": "Profile view" },
    "data_fields": ["email", "name", "date_of_birth"],
    "reason": { "code": "CLINICAL_CARE", "label": "Doctor consultation" },
    "actor": { "type": "EMPLOYEE", "label": "Dr Smith" },
    "sensitivity": { "code": "HIGH", "label": "Medical" },
    "occurred_at": "2026-05-08T10:00:00Z"
  }'`}
            </div>
          </div>
        </SectionBlock>

        {/* ── Architecture ── */}
        <SectionBlock id="architecture" title="System Architecture" sub="Tech stack and GDPR compliance mapping">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Frontend', value: 'React 18 + Vite + TypeScript · CSS custom properties · MUI components', color: '#6366f1' },
              { label: 'Backend', value: 'NestJS (Node.js) · TypeORM + PostgreSQL · Mongoose + MongoDB · BullMQ + Redis', color: '#f97316' },
              { label: 'AI Layer', value: 'AiOrchestrationService — swappable provider: Google Gemini, Anthropic Claude, OpenAI GPT', color: '#a855f7' },
              { label: 'Auth', value: 'JWT (dashboard_session / google_session) · Google OAuth 2.0 · API Key (HMAC-SHA256)', color: '#22c55e' },
              { label: 'Hosting', value: 'Render.com — backend + frontend as static site · PostgreSQL on Render · MongoDB Atlas', color: '#eab308' },
              { label: 'Real-time', value: 'Server-Sent Events (SSE) for live audit event push · BullMQ queues for async processing', color: '#ec4899' },
            ].map((t) => (
              <div key={t.label} style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.color, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{t.value}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>GDPR Article → Feature mapping</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {[
              ['Art.5(1)(a)', 'Lawfulness & transparency', 'Every event has reasonCode + reasonLabel stating the legal basis'],
              ['Art.5(1)(c)', 'Data minimisation', 'Tenant declares allowedDataFields; violations flagged automatically'],
              ['Art.6',       'Legal basis',         'Consent flag + reason codes on every event'],
              ['Art.7',       'Consent management',  'consentObtained + userOptedOut flags tracked per event'],
              ['Art.17',      'Right to erasure',    'Hard-delete with SHA-256 evidence hash for accountability'],
              ['Art.20',      'Data portability',    'JSON export of all events, 24h download window'],
              ['Art.28',      'Data processor',      'Webhook HMAC signing proves data processor authentication'],
              ['Art.30',      'Records of processing', 'SHA-256 hash chain — every event is linked to the previous'],
              ['Art.33',      'Breach notification', '72h countdown timer + regulator notification simulation'],
              ['Art.35',      'DPIA',                'Automated 6h AI risk analysis cycle (continuous DPIA)'],
            ].map(([art, title, impl], i) => (
              <div key={art} style={{
                display: 'grid', gridTemplateColumns: '80px 160px 1fr',
                padding: '9px 14px', gap: 16,
                borderBottom: i < 9 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'var(--surface-2)' : 'transparent',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>{art}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{impl}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}
