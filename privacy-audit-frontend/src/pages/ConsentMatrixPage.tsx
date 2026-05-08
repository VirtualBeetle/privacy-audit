import { useState, useEffect } from 'react';
import { dashboardApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';
import { VerifyIcon, DownloadIcon } from '../components/icons/Icons';

/* ── Data field categories ────────────────────────────────────────── */
const FIELD_CATEGORIES = {
  'Health': [
    { field: 'medical_record', label: 'Medical Records', sensitivity: 'CRITICAL', desc: 'Diagnoses, prescriptions, procedures' },
    { field: 'health_metric', label: 'Health Metrics', sensitivity: 'HIGH', desc: 'Heart rate, blood pressure, sleep data' },
    { field: 'appointment', label: 'Appointments', sensitivity: 'MEDIUM', desc: 'Scheduled medical visits' },
    { field: 'medication', label: 'Medication', sensitivity: 'HIGH', desc: 'Drug names, dosages, schedules' },
  ],
  'Identity': [
    { field: 'email', label: 'Email Address', sensitivity: 'MEDIUM', desc: 'Primary email for communications' },
    { field: 'profile', label: 'Profile Info', sensitivity: 'LOW', desc: 'Name, display photo, bio' },
    { field: 'phone_number', label: 'Phone Number', sensitivity: 'HIGH', desc: 'Mobile and home numbers' },
    { field: 'date_of_birth', label: 'Date of Birth', sensitivity: 'HIGH', desc: 'Used for age verification' },
  ],
  'Location & Behaviour': [
    { field: 'location', label: 'Location Data', sensitivity: 'HIGH', desc: 'GPS coordinates, home/work addresses' },
    { field: 'device_info', label: 'Device Info', sensitivity: 'MEDIUM', desc: 'Device type, OS, browser' },
    { field: 'usage_pattern', label: 'Usage Patterns', sensitivity: 'MEDIUM', desc: 'App usage frequency and timing' },
    { field: 'search_history', label: 'Search History', sensitivity: 'HIGH', desc: 'Within-app search queries' },
  ],
  'Financial': [
    { field: 'payment_info', label: 'Payment Info', sensitivity: 'CRITICAL', desc: 'Card details, billing address' },
    { field: 'financial_record', label: 'Financial Records', sensitivity: 'CRITICAL', desc: 'Transactions, balances' },
  ],
};

const ALL_FIELDS = Object.values(FIELD_CATEGORIES).flat();

const APPS = [
  { id: 'healthtrack', name: 'HealthTrack', icon: '🏥', desc: 'Health records app' },
  { id: 'connectsocial', name: 'ConnectSocial', icon: '💬', desc: 'Social network app' },
];

const SENSITIVITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--red)',
  HIGH: 'var(--amber)',
  MEDIUM: 'var(--blue)',
  LOW: 'var(--green)',
};

const SENSITIVITY_BG: Record<string, string> = {
  CRITICAL: 'var(--red-dim)',
  HIGH: 'var(--amber-dim)',
  MEDIUM: 'var(--blue-dim)',
  LOW: 'var(--green-dim)',
};

function SensitivityBadge({ level }: { level: string }) {
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800,
      fontFamily: "'JetBrains Mono', monospace",
      background: SENSITIVITY_BG[level] ?? 'var(--surface-3)',
      color: SENSITIVITY_COLORS[level] ?? 'var(--text-3)',
    }}>
      {level}
    </span>
  );
}

/* Toggle cell */
function ConsentToggle({ granted, required, onChange, toggling }: {
  granted: boolean; required: boolean; onChange: (g: boolean) => void; toggling: boolean;
}) {
  if (required) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>Required</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        onClick={() => !toggling && onChange(!granted)}
        disabled={toggling}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
          background: granted ? 'var(--green)' : 'var(--surface-3)',
          transition: 'background 0.2s ease',
          position: 'relative',
          opacity: toggling ? 0.6 : 1,
        }}
      >
        <span style={{
          position: 'absolute',
          top: 3, left: granted ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

export default function ConsentMatrixPage() {
  const { user } = useAuth();
  const userId = user?.tenantUserId ?? (user as any)?.dashboardUserId ?? '';

  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Health');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    dashboardApi.getConsents(userId)
      .then(data => {
        const map: Record<string, boolean> = {};
        if (Array.isArray(data)) {
          data.forEach((c: { dataType: string; granted: boolean }) => { map[c.dataType] = c.granted; });
        }
        setConsents(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleToggle = async (field: string, appId: string, granted: boolean) => {
    if (!userId) { toast.error('No user session — cannot update consent.'); return; }
    const key = `${appId}:${field}`;
    setToggling(key);
    try {
      await dashboardApi.setConsent(userId, field, granted);
      setConsents(prev => ({ ...prev, [key]: granted, [field]: granted }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      toast.success(`Consent ${granted ? 'granted' : 'withdrawn'} for ${field.replace(/_/g, ' ')}`, {
        action: {
          label: 'Download Receipt',
          onClick: () => {
            const ts = new Date().toISOString();
            const body = [
              'DATAGUARD CONSENT MATRIX RECEIPT',
              '─'.repeat(44),
              `Date/Time:   ${ts}`,
              `User ID:     ${userId}`,
              `App:         ${appId}`,
              `Data Field:  ${field}`,
              `Action:      ${granted ? 'CONSENT GRANTED' : 'CONSENT WITHDRAWN'}`,
              `Basis:       GDPR Article 7 — Consent`,
              '─'.repeat(44),
              'DataGuard Privacy Audit Platform',
            ].join('\n');
            const blob = new Blob([body], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `consent-receipt-${field}-${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          },
        },
      });
    } catch {
      toast.error('Consent update failed.');
    } finally {
      setToggling(null);
    }
  };

  const downloadAllReceipts = () => {
    const ts = new Date().toISOString();
    const lines = [
      'DATAGUARD CONSENT MATRIX — FULL EXPORT',
      '═'.repeat(50),
      `Generated: ${ts}`,
      `User ID:   ${userId}`,
      '─'.repeat(50),
      '',
      'Data Field Consent Status:',
      '',
    ];
    ALL_FIELDS.forEach(f => {
      const granted = consents[f.field] ?? false;
      lines.push(`  ${f.field.padEnd(24)} ${granted ? 'GRANTED' : 'WITHDRAWN'}`);
    });
    lines.push('', '─'.repeat(50), 'GDPR Article 7 — Freely given, specific, informed consent', 'DataGuard Privacy Audit Platform');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent-matrix-export-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryFields = FIELD_CATEGORIES[activeCategory as keyof typeof FIELD_CATEGORIES] ?? [];
  const grantedCount = ALL_FIELDS.filter(f => consents[f.field]).length;

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>

      {/* Header */}
      <div className="anim-fade-up d0" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em', marginBottom: 6 }}>
              Consent Matrix
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 540 }}>
              Choose what each app can see. Your preferences are saved immediately and backed by a downloadable GDPR Article 7 receipt.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {saved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, background: 'var(--green-dim)', color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>
                <VerifyIcon style={{ width: 13, height: 13 }} /> Saved
              </div>
            )}
            <button
              onClick={downloadAllReceipts}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              <DownloadIcon style={{ width: 13, height: 13 }} /> Export All Receipts
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="anim-fade-up d1" style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Consented fields', value: grantedCount, total: ALL_FIELDS.length, color: 'var(--green)' },
          { label: 'Withdrawn', value: ALL_FIELDS.length - grantedCount, total: ALL_FIELDS.length, color: 'var(--red)' },
          { label: 'Apps monitored', value: APPS.length, total: null, color: 'var(--accent)' },
          { label: 'GDPR basis', value: 'Art. 7', total: null, color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="dg-card" style={{ flex: 1, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
              {s.value}{s.total ? <span style={{ fontSize: 14, color: 'var(--text-3)' }}>/{s.total}</span> : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div className="anim-fade-up d2" style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.keys(FIELD_CATEGORIES).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
              background: activeCategory === cat ? 'var(--accent)' : 'var(--surface)',
              color: activeCategory === cat ? '#fff' : 'var(--text-2)',
              borderColor: activeCategory === cat ? 'var(--accent)' : 'var(--border)',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Consent matrix table */}
      <div className="dg-card anim-fade-up d3" style={{ overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `1fr repeat(${APPS.length}, 140px)`,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          <div style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Data Field
          </div>
          {APPS.map(app => (
            <div key={app.id} style={{ padding: '12px 16px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{app.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{app.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{app.desc}</div>
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${APPS.length}, 140px)`, borderBottom: '1px solid var(--border-soft)', padding: '14px 20px' }}>
              <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 4 }} />
              {APPS.map(a => <div key={a.id} className="skeleton" style={{ height: 22, width: 40, margin: '0 auto', borderRadius: 11 }} />)}
            </div>
          ))
        ) : categoryFields.map((f, i) => {
          const isRequired = f.sensitivity === 'CRITICAL';
          return (
            <div
              key={f.field}
              style={{
                display: 'grid',
                gridTemplateColumns: `1fr repeat(${APPS.length}, 140px)`,
                borderBottom: '1px solid var(--border-soft)',
                background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)',
              }}
            >
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.label}</span>
                  <SensitivityBadge level={f.sensitivity} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>{f.field}</span>
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{f.desc}</span>
              </div>
              {APPS.map(app => {
                const key = `${app.id}:${f.field}`;
                const granted = consents[key] ?? consents[f.field] ?? false;
                return (
                  <div key={app.id} style={{ padding: '14px 16px', borderLeft: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ConsentToggle
                      granted={isRequired ? true : granted}
                      required={isRequired}
                      toggling={toggling === key}
                      onChange={(g) => handleToggle(f.field, app.id, g)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="anim-fade-up d4" style={{ marginTop: 18, padding: '14px 18px', borderRadius: 12, background: 'var(--accent-dim)', border: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>
          <strong style={{ color: 'var(--accent)' }}>GDPR Article 7</strong> — Your consent is freely given, specific, and informed. You can withdraw at any time without affecting the lawfulness of processing before withdrawal.
          CRITICAL sensitivity fields marked "Required" are essential for app operation and processed under a legitimate interest basis.
        </div>
      </div>
    </div>
  );
}
