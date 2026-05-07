import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MobileStepper from '@mui/material/MobileStepper';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ConnectAppModal from '../components/ConnectAppModal/ConnectAppModal';
import TenantTabs, { HEALTH_TENANT_ID, SOCIAL_TENANT_ID } from '../components/TenantTabs/TenantTabs';
import { dashboardApi, devApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { AuditEvent, LinkedAccount, TenantFilter } from '../types';
import {
  VerifyIcon, BrainIcon, RiskIcon, DownloadIcon, RefreshIcon,
  TrashIcon, CheckIcon, WebhookIcon, HealthIcon, SocialIcon,
  ShieldIcon, EventsIcon,
} from '../components/icons/Icons';

/* ── Props ──────────────────────────────────────────────────────── */
interface Props { initialSection?: string; }

/* ── Constants ──────────────────────────────────────────────────── */

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
};


/* ── Interfaces ─────────────────────────────────────────────────── */
interface AnalysisFinding { severity: string; title: string; description: string; suggestedAction: string; affectedEventCount: number; }
interface AnalysisRecord { _id: string; provider: string; aiModel: string; eventCount: number; findings: AnalysisFinding[]; createdAt: string; periodStart: string; periodEnd: string; }
interface BreachReport { id: string; description: string; severity: string; reportedAt: string; notifyDeadline: string; regulatorNotified: boolean; hoursRemaining: number; deadlineExceeded: boolean; }
interface PrivacyScore { score: number; grade: string; breakdown: Record<string, number>; totalEvents: number; }
interface ConsentRecord { dataType: string; granted: boolean; updatedAt?: string | null; }
interface DataMinimisationViolation { id: string; tenantId: string; tenantUserId: string; eventId: string; violatingFields: string[]; allowedFields: string[]; tenantName: string | null; detectedAt: string; }
interface ChainIntegrityResult { valid: boolean; eventCount: number; latestHash: string | null; brokenAtEventId?: string; gdprArticle: string; }

/* ── Helpers ────────────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Animated counter hook ──────────────────────────────────────── */
function useCountUp(target: number, duration = 900, delay = 0): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const t = setTimeout(() => {
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [target]);
  return val;
}

/* ── Score gauge ────────────────────────────────────────────────── */
function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);
  const r = 52; const circ = 2 * Math.PI * r;
  const pct = animated ? score / 100 : 0;
  const col = score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const gradeCol = score >= 75 ? { bg: '#dcfce7', text: '#15803d' } : score >= 50 ? { bg: '#fef3c7', text: '#92400e' } : { bg: '#fee2e2', text: '#991b1b' };
  return (
    <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={col} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${col}44)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>/ 100</div>
        <div style={{ marginTop: 6, padding: '2px 8px', borderRadius: 20, background: gradeCol.bg, color: gradeCol.text, fontSize: 11, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
          Grade {grade}
        </div>
      </div>
    </div>
  );
}

/* ── Animated stat card ─────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, accent, delay, trend }: {
  label: string; value: number | string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent: string; delay: number; trend?: { up: boolean; val: string; label: string };
}) {
  const isNum = typeof value === 'number';
  const animated = useCountUp(isNum ? (value as number) : 0, 900, delay * 60);
  const accentMap: Record<string, { bg: string; col: string; glow: string }> = {
    indigo: { bg: 'var(--accent-dim)',          col: 'var(--accent)',  glow: 'rgba(91,94,246,0.2)' },
    violet: { bg: 'rgba(124,58,237,0.1)',        col: '#7c3aed',        glow: 'rgba(124,58,237,0.2)' },
    green:  { bg: 'var(--green-dim)',            col: 'var(--green)',   glow: 'rgba(5,150,105,0.2)' },
    amber:  { bg: 'var(--amber-dim)',            col: 'var(--amber)',   glow: 'rgba(217,119,6,0.2)' },
    red:    { bg: 'var(--red-dim)',              col: 'var(--red)',     glow: 'rgba(220,38,38,0.2)' },
  };
  const a = accentMap[accent] ?? accentMap.indigo;
  return (
    <div
      className={`dg-card dg-card-lift anim-fade-up d${delay}`}
      style={{ padding: '20px 22px', flex: 1, overflow: 'hidden', position: 'relative', cursor: 'default' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: a.col, opacity: 0.7, borderRadius: '16px 16px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.col, boxShadow: `0 4px 12px ${a.glow}`, flexShrink: 0 }}>
          <Icon style={{ width: 15, height: 15 }} />
        </div>
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color: a.col, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, letterSpacing: '-1px' }}>
        {isNum ? animated : value}
      </div>
      {trend && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: trend.up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{trend.up ? '↑' : '↓'} {trend.val}</span>
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
}

/* ── Skeleton loaders ───────────────────────────────────────────── */
function SkeletonStatCard() {
  return (
    <div className="dg-card" style={{
      flex: 1, padding: '18px 20px', borderRadius: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="skeleton" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 0 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 9 }} />
      </div>
      <div>
        <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '65%', height: 12 }} />
      </div>
    </div>
  );
}

function SkeletonStatRow() {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {[0, 1, 2, 3].map(i => <SkeletonStatCard key={i} />)}
    </div>
  );
}

/* ── Donut chart ────────────────────────────────────────────────── */
function DonutChart({ data }: { data: { code: string; count: number }[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };
  let cumulative = 0;
  const r = 56; const circ = 2 * Math.PI * r; const cx = 80; const cy = 80;
  return (
    <div className="dg-card anim-fade-up d2" style={{ padding: '22px 24px', flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 18 }}>Events by Sensitivity</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
          {data.map((d, i) => {
            const pct = total > 0 ? d.count / total : 0;
            const offset = circ * (1 - cumulative / total);
            const dash = animated ? circ * pct : 0;
            cumulative += d.count;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={colors[d.code] ?? '#94a3b8'} strokeWidth="18"
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px`, transition: `stroke-dasharray 1s ${0.1 * i}s cubic-bezier(0.4,0,0.2,1)` }} />
            );
          })}
          <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text-3)', fontFamily: "'DM Sans', sans-serif" }}>events</text>
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map(d => (
            <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[d.code], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{d.code}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{d.count}</div>
              <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: colors[d.code], width: animated ? `${total > 0 ? (d.count / total) * 100 : 0}%` : '0%', transition: 'width 1s ease', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Bar chart ──────────────────────────────────────────────────── */
function BarChart({ data }: { data: { field: string; count: number }[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 400); return () => clearTimeout(t); }, []);
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="dg-card anim-fade-up d3" style={{ padding: '22px 24px', flex: 1.4 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 18 }}>Most Accessed Data Fields</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.slice(0, 7).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 120, fontSize: 12, color: 'var(--text-2)', fontWeight: 500, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.field.replace(/_/g, ' ')}
            </div>
            <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #5b5ef6, #7c3aed)', width: animated ? `${(d.count / max) * 100}%` : '0%', transition: `width 0.9s ${i * 60}ms cubic-bezier(0.4,0,0.2,1)`, borderRadius: 4 }} />
            </div>
            <div style={{ width: 26, fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', flexShrink: 0 }}>{d.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Section heading ────────────────────────────────────────────── */
function SectionHeading({ icon: Icon, title, subtitle, badge, action }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string; subtitle?: string;
  badge?: { label: string | number; color?: string };
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: badge ? 4 : 14 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 16, height: 16, color: 'var(--accent)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{subtitle}</div>}
      </div>
      {badge && (
        <span style={{ padding: '3px 12px', background: badge.color ?? 'var(--accent)', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {badge.label}
        </span>
      )}
      {action}
    </div>
  );
}

/* ── Risk card ──────────────────────────────────────────────────── */

/* ── Chain integrity card ───────────────────────────────────────── */
function ChainCard({ onVerify, result, verifying, events }: { onVerify: () => void; result: ChainIntegrityResult | null; verifying: boolean; events: AuditEvent[] }) {
  return (
    <div className="dg-card anim-fade-up d3" style={{ padding: '20px 22px' }}>
      <SectionHeading
        icon={VerifyIcon}
        title="Audit Log Integrity"
        subtitle="GDPR Article 30 · SHA-256 Hash Chain"
        action={
          <button
            onClick={onVerify}
            disabled={verifying}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', background: 'var(--accent-dim)',
              border: '1px solid var(--accent)', borderRadius: 9,
              cursor: verifying ? 'not-allowed' : 'pointer',
              color: 'var(--accent)', fontSize: 12, fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!verifying) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
          >
            <RefreshIcon style={{ width: 13, height: 13, ...(verifying ? { animation: 'spin 1s linear infinite' } : {}) }} />
            {verifying ? 'Verifying…' : 'Verify Now'}
          </button>
        }
      />
      <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: result ? 12 : 0 }}>
        Every event is linked to the previous via SHA-256 hash. Any modification breaks the chain, proving the log is tamper-evident.
      </div>

      {/* Mini blockchain visualization */}
      {events.length > 0 && (
        <div style={{ overflowX: 'auto', paddingBottom: 4, marginBottom: result ? 12 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 'max-content', padding: '8px 0' }}>
            {/* Genesis block */}
            <div style={{ width: 90, minHeight: 72, borderRadius: 8, border: '2px solid #5b5ef6', background: 'linear-gradient(135deg, #5b5ef6, #7c3aed)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 9, letterSpacing: 1 }}>GENESIS</span>
              <span style={{ color: '#e0e7ff', fontFamily: 'monospace', fontSize: 9, wordBreak: 'break-all' }}>000000...</span>
            </div>
            {[...events].reverse().slice(0, 4).reverse().map((ev, idx, arr) => {
              const isBroken = !result?.valid && result?.brokenAtEventId === ev.id;
              const isVerified = result?.valid;
              const borderColor = isBroken ? '#fca5a5' : isVerified ? '#86efac' : 'var(--border)';
              const bg = isBroken ? 'var(--red-dim)' : isVerified ? 'var(--green-dim)' : 'var(--surface-2)';
              const hashLabel = isVerified
                ? (idx === arr.length - 1 && result?.latestHash ? result.latestHash.slice(0, 12) + '…' : '✓ ok')
                : isBroken ? 'BROKEN!' : '—';
              return (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ color: isBroken ? '#fca5a5' : 'var(--text-3)', fontSize: 16, margin: '0 4px' }}>→</span>
                  <div style={{ width: 100, minHeight: 72, borderRadius: 8, border: `2px solid ${borderColor}`, background: bg, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700 }}>#{ev.eventId?.slice(-4) ?? idx}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>{ev.actionCode}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.dataFields?.slice(0, 2).join(', ')}</span>
                    <span style={{ fontSize: 9, color: isBroken ? 'var(--red)' : isVerified ? 'var(--green)' : 'var(--text-3)', fontFamily: 'monospace' }}>{hashLabel}</span>
                  </div>
                </div>
              );
            })}
            {events.length > 4 && (
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ color: 'var(--text-3)', fontSize: 16, margin: '0 4px' }}>→</span>
                <div style={{ width: 60, minHeight: 72, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <span style={{ color: 'var(--text-3)', fontSize: 9, textAlign: 'center' }}>+{events.length - 4}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 9, textAlign: 'center' }}>more</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="anim-scale-in" style={{
          padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
          background: result.valid ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${result.valid ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.2)'}`,
        }}>
          <CheckIcon style={{ width: 16, height: 16, color: result.valid ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: result.valid ? 'var(--green)' : 'var(--red)' }}>
              {result.valid ? `Chain intact — ${result.eventCount} events verified` : `Tamper detected at event ${result.brokenAtEventId?.slice(0, 8)}…`}
            </div>
            {result.latestHash && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>
                Latest hash: {result.latestHash.slice(0, 40)}…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Connected apps strip ───────────────────────────────────────── */
function ConnectedApps({ events }: { events: AuditEvent[] }) {
  const apps = [
    { name: 'HealthTrack', tenantId: HEALTH_TENANT_ID, icon: HealthIcon, color: '#059669', dimColor: 'rgba(5,150,105,0.1)' },
    { name: 'ConnectSocial', tenantId: SOCIAL_TENANT_ID, icon: SocialIcon, color: '#5b5ef6', dimColor: 'rgba(91,94,246,0.1)' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {apps.map((app, i) => {
        const evCount = events.filter(e => e.tenantId === app.tenantId).length;
        const latest = events.filter(e => e.tenantId === app.tenantId)[0];
        const isLive = latest && (Date.now() - new Date(latest.occurredAt).getTime()) < 300000;
        return (
          <div key={i} style={{ flex: 1, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: app.dimColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <app.icon style={{ width: 17, height: 17, color: app.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{app.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{evCount} events{latest ? ` · ${timeAgo(latest.occurredAt)}` : ''}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: isLive ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#10b981' : '#eab308', display: 'block', animation: isLive ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: isLive ? '#059669' : '#d97706', fontFamily: "'JetBrains Mono', monospace" }}>{isLive ? 'Live' : 'Connected'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────── */
export default function Dashboard({ initialSection }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([]);
  const [privacyScore, setPrivacyScore] = useState<PrivacyScore | null>(null);
  const [breachReports, setBreachReports] = useState<BreachReport[]>([]);
  const [breachInput, setBreachInput] = useState('');
  const [breachLoading, setBreachLoading] = useState(false);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [consentToggling, setConsentToggling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TenantFilter>('all');
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [violations, setViolations] = useState<DataMinimisationViolation[]>([]);
  const [chainResult, setChainResult] = useState<ChainIntegrityResult | null>(null);
  const [chainVerifying, setChainVerifying] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [, setLiveFlash] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ id: string; status: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ id: string; status: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [runAnalysisLoading, setRunAnalysisLoading] = useState(false);
  const [runAnalysisMsg, setRunAnalysisMsg] = useState('');
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  /* Section refs for initialSection scrolling */
  const gdprRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsData, analysisData, scoreData, breachData, consentsData, linkedData, violationsData] = await Promise.all([
        dashboardApi.getEvents(),
        dashboardApi.getAnalysisHistory().catch(() => []),
        dashboardApi.getPrivacyScore().catch(() => null),
        dashboardApi.getBreachReports().catch(() => []),
        user?.tenantUserId ? dashboardApi.getConsents(user.tenantUserId).catch(() => null) : Promise.resolve(null),
        user?.type === 'google_session' ? dashboardApi.getLinkedAccounts().catch(() => ({ linkedAccounts: [] })) : Promise.resolve({ linkedAccounts: [] }),
        dashboardApi.getViolations().catch(() => []),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setAnalysisHistory(Array.isArray(analysisData) ? analysisData : []);
      setPrivacyScore(scoreData);
      setBreachReports(Array.isArray(breachData) ? breachData : []);
      if (consentsData?.consents) setConsents(consentsData.consents);
      setLinkedAccounts(Array.isArray(linkedData?.linkedAccounts) ? linkedData.linkedAccounts : []);
      setViolations(Array.isArray(violationsData) ? violationsData : []);
    } catch {
      setError('Failed to load your privacy data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Scroll to section if initialSection prop set */
  useEffect(() => {
    if (!loading && initialSection) {
      setTimeout(() => {
        if (initialSection === 'gdpr') gdprRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [loading, initialSection]);

  /* SSE: real-time live updates */
  useEffect(() => {
    const url = dashboardApi.getStreamUrl();
    const es = new EventSource(url);
    es.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        const newEvent = payload.event as AuditEvent;
        setEvents(prev => { if (prev.some(e => e.id === newEvent.id)) return prev; return [newEvent, ...prev]; });
        if (payload.violation) {
          const v: DataMinimisationViolation = { id: newEvent.id, tenantId: newEvent.tenantId, tenantUserId: newEvent.tenantUserId, eventId: newEvent.eventId, violatingFields: payload.violation.violatingFields, allowedFields: payload.violation.allowedFields, tenantName: payload.violation.tenantName, detectedAt: new Date().toISOString() };
          setViolations(prev => [v, ...prev]);
        }
        setLiveFlash(true);
        setTimeout(() => setLiveFlash(false), 2000);
        if ((window as any).__dgSetLiveFlash) (window as any).__dgSetLiveFlash(true);
        setTimeout(() => { if ((window as any).__dgSetLiveFlash) (window as any).__dgSetLiveFlash(false); }, 2500);
      } catch { /* ignore */ }
    };
    es.onerror = () => { /* auto-reconnect */ };
    return () => es.close();
  }, []);

  /* Filtered events */
  const filtered = (() => {
    let evts = tab === 'all' ? events : events.filter(e => e.tenantId === tab);
    if (dateFilter !== 'all') {
      const cutoff = new Date();
      if (dateFilter === '24h') cutoff.setHours(cutoff.getHours() - 24);
      else if (dateFilter === '7d') cutoff.setDate(cutoff.getDate() - 7);
      else cutoff.setDate(cutoff.getDate() - 30);
      evts = evts.filter(e => new Date(e.occurredAt) >= cutoff);
    }
    return evts;
  })();

  const eventCounts: Record<string, number> = { all: events.length };
  events.forEach(e => { eventCounts[e.tenantId] = (eventCounts[e.tenantId] ?? 0) + 1; });

  /* ── Handlers ── */
  const handleVerifyChain = async () => {
    setChainVerifying(true);
    try { setChainResult(await dashboardApi.verifyChainIntegrity()); } catch { setChainResult(null); } finally { setChainVerifying(false); }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await dashboardApi.requestExport();
      setExportStatus({ id: res.requestId, status: res.status });
      const poll = setInterval(async () => {
        const s = await dashboardApi.getExportStatus(res.requestId);
        setExportStatus({ id: res.requestId, status: s.status });
        if (s.status === 'completed') { clearInterval(poll); await dashboardApi.downloadExport(res.requestId); }
        if (s.status === 'failed') clearInterval(poll);
      }, 2000);
    } catch { setExportStatus(null); } finally { setExportLoading(false); }
  };

  const handleDelete = async () => {
    setDeleteConfirm(false); setDeleteLoading(true);
    try {
      const res = await dashboardApi.requestDeletion();
      setDeleteStatus({ id: res.requestId, status: res.status });
      const poll = setInterval(async () => {
        const s = await dashboardApi.getDeletionStatus(res.requestId);
        setDeleteStatus({ id: res.requestId, status: s.status });
        if (s.status === 'completed' || s.status === 'failed') {
          clearInterval(poll);
          if (s.status === 'completed') { setEvents([]); }
        }
      }, 2000);
    } catch { setDeleteStatus(null); } finally { setDeleteLoading(false); }
  };

  const handleConsentToggle = async (dataType: string, granted: boolean) => {
    const userId = user?.tenantUserId ?? (user as any)?.dashboardUserId;
    if (!userId) return;
    setConsentToggling(dataType);
    try {
      await dashboardApi.setConsent(userId, dataType, granted);
      setConsents(prev => prev.map(c => c.dataType === dataType ? { ...c, granted } : c));
    } catch { /* silently handle */ } finally { setConsentToggling(null); }
  };

  const handleReportBreach = async () => {
    if (!breachInput.trim()) return;
    setBreachLoading(true);
    try {
      const report = await dashboardApi.reportBreach(breachInput.trim());
      setBreachReports(prev => [report, ...prev]);
      setBreachInput('');
    } catch { /* silently handle */ } finally { setBreachLoading(false); }
  };

  const handleNotifyRegulator = async (id: string) => {
    try {
      const updated = await dashboardApi.notifyRegulator(id);
      setBreachReports(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch { /* silently handle */ }
  };

  const getDevToken = () =>
    (import.meta.env.VITE_DEV_TOKEN as string | undefined) || localStorage.getItem('dev_token') || '';

  const handleRunAnalysis = async () => {
    const token = getDevToken();
    if (!token) { setRunAnalysisMsg('Dev token not set. Go to AI Settings to configure it first.'); return; }
    setRunAnalysisLoading(true); setRunAnalysisMsg('');
    try {
      const result = await devApi.triggerRiskAnalysis(token);
      const newHistory = await dashboardApi.getAnalysisHistory().catch(() => []);
      setAnalysisHistory(Array.isArray(newHistory) ? newHistory : []);
      setRunAnalysisMsg(`Done — ${result?.alerts ?? 0} alert(s) generated.`);
    } catch { setRunAnalysisMsg('Analysis failed. Check your dev token in AI Settings.'); } finally { setRunAnalysisLoading(false); }
  };

  /* ── Computed chart data ── */
  const sensitivityData = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(code => ({ code, count: filtered.filter(e => e.sensitivityCode === code).length })).filter(d => d.count > 0);
  const fieldCounts: Record<string, number> = {};
  filtered.forEach(e => e.dataFields.forEach(f => { fieldCounts[f] = (fieldCounts[f] ?? 0) + 1; }));
  const fieldData = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).map(([field, count]) => ({ field, count }));

  const totalEvents = filtered.length;
  const criticalCount = filtered.filter(e => e.sensitivityCode === 'CRITICAL').length;
  const thirdPartyCount = filtered.filter(e => e.thirdPartyInvolved).length;
  const consentRate = filtered.length > 0 ? Math.round((filtered.filter(e => e.consentObtained).length / filtered.length) * 100) : 0;

  /* ── Tour steps ── */
  const TOUR_STEPS = [
    { emoji: '📊', title: 'Stats Overview', description: 'The cards at the top show at a glance: total events, critical events, third-party sharing, and consent rate. These numbers update live as your tenants send events.' },
    { emoji: '🥧', title: 'Charts', description: 'The donut chart breaks events by sensitivity level (LOW → CRITICAL). The bar chart shows which data fields are accessed most — useful for identifying data minimisation opportunities.' },
    { emoji: '🚨', title: 'AI Privacy Risk Alerts', description: 'Every 6 hours the AI analyses your latest events and flags patterns that may indicate GDPR violations — missing consent, excessive third-party sharing, unusual access patterns.' },
    { emoji: '🔗', title: 'Audit Log Integrity', description: 'Every event is linked to the previous via SHA-256 hash. Click "Verify Now" to cryptographically confirm the log has not been tampered with. (GDPR Article 30)' },
    { emoji: '🤖', title: 'AI Chat Assistant', description: 'Click the purple chat button (bottom-right) to ask questions about your privacy data. The AI has full context of your recent events and risk alerts.' },
    { emoji: '⚖️', title: 'GDPR Rights', description: 'Exercise Article 20 (Data Portability — download a JSON export) and Article 17 (Right to Erasure). Deletion generates a cryptographic evidence hash for compliance.' },
  ];

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div className="skeleton" style={{ flex: 1, height: 68, borderRadius: 12 }} />
          <div className="skeleton" style={{ flex: 1, height: 68, borderRadius: 12 }} />
        </div>
        <div className="skeleton dg-card" style={{ height: 130, marginBottom: 14, borderRadius: 16 }} />
        <SkeletonStatRow />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginTop: 14, marginBottom: 14 }}>
          <div className="skeleton dg-card" style={{ height: 200, borderRadius: 16 }} />
          <div className="skeleton dg-card" style={{ height: 200, borderRadius: 16 }} />
        </div>
        <div className="skeleton dg-card" style={{ height: 160, borderRadius: 16, marginBottom: 14 }} />
        <div className="skeleton dg-card" style={{ height: 120, borderRadius: 16 }} />
      </div>
    );
  }

  const isAdmin = user?.type === 'dashboard_session';
  const isGoogleNoApps = user?.type === 'google_session' && linkedAccounts.length === 0;

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>

      {/* Tenant tabs */}
      <TenantTabs
        sessionType={user?.type ?? 'dashboard_session'}
        linkedAccounts={linkedAccounts}
        value={tab}
        onChange={setTab}
        onConnect={() => setConnectModalOpen(true)}
        eventCounts={eventCounts}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Empty state for google users with no linked apps */}
      {isGoogleNoApps && (
        <div className="anim-fade-up d1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 20, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldIcon style={{ width: 36, height: 36, color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8 }}>No apps connected yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 360, lineHeight: 1.65 }}>
              Connect an application to start seeing how your personal data is being used — all in one place.
            </div>
          </div>
          <button
            onClick={() => setConnectModalOpen(true)}
            style={{ padding: '11px 24px', background: 'linear-gradient(135deg, #5b5ef6, #7c3aed)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 16px rgba(91,94,246,0.35)' }}
          >
            + Connect application
          </button>
        </div>
      )}

      {!isGoogleNoApps && <>

        {/* Connected Apps — only for Google/tenant sessions, not admin */}
        {!isAdmin && (
          <div className="anim-fade-up d0" style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Connected Apps</div>
            <ConnectedApps events={events} />
          </div>
        )}

        {/* Privacy Health Score */}
        {privacyScore && (
          <div className="dg-card anim-fade-up d1" style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 32, marginBottom: 14 }}>
            <ScoreGauge score={privacyScore.score} grade={privacyScore.grade} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>Privacy Health Score</div>
                <span style={{ padding: '3px 10px', borderRadius: 20, background: privacyScore.score >= 75 ? 'var(--green-dim)' : privacyScore.score >= 50 ? 'var(--amber-dim)' : 'var(--red-dim)', color: privacyScore.score >= 75 ? 'var(--green)' : privacyScore.score >= 50 ? 'var(--amber)' : 'var(--red)', fontSize: 11, fontWeight: 700 }}>
                  Grade {privacyScore.grade}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.6 }}>
                Based on {privacyScore.totalEvents} events · consent, opt-out, third-party sharing, sensitivity
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {Object.entries(privacyScore.breakdown).map(([key, pts]) => (
                  <span key={key} style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()} · <strong style={{ color: 'var(--accent)' }}>{pts}pts</strong>
                  </span>
                ))}
              </div>
              <button
                onClick={() => dashboardApi.downloadPdfReport()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}
              >
                <DownloadIcon style={{ width: 13, height: 13 }} /> PDF Compliance Report
              </button>
            </div>
          </div>
        )}

        {/* Date filter + Events link */}
        <div className="anim-fade-up d1" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Filter:</span>
          {(['all', '24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateFilter(range)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                background: dateFilter === range ? 'var(--accent)' : 'var(--surface)',
                color: dateFilter === range ? '#fff' : 'var(--text-2)',
                transition: 'all 0.15s',
                boxShadow: dateFilter === range ? '0 2px 8px var(--accent-glow)' : 'var(--shadow-sm)',
              }}
            >
              {range === 'all' ? 'All time' : range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7d' : 'Last 30d'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => navigate('/events')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--accent)', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}
          >
            <EventsIcon style={{ width: 13, height: 13 }} /> View All Events →
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          <StatCard label="Total Events"    value={totalEvents}    icon={EventsIcon}  accent="indigo" delay={0} trend={{ up: true, val: '+' + totalEvents, label: 'total logged' }} />
          <StatCard label="Critical Events" value={criticalCount}  icon={RiskIcon}    accent="red"    delay={1} />
          <StatCard label="Third-party"     value={thirdPartyCount} icon={WebhookIcon} accent="amber"  delay={2} />
          <StatCard label="Consent Rate"    value={`${consentRate}%`} icon={VerifyIcon} accent="green" delay={3} />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginBottom: 14 }}>
          <DonutChart data={sensitivityData} />
          <BarChart data={fieldData} />
        </div>

        {/* Data Minimisation Violations */}
        {violations.length > 0 && (
          <div className="dg-card anim-fade-up d3" style={{ padding: '20px 22px', marginBottom: 14, border: '1px solid rgba(220,38,38,0.25)', background: 'var(--red-dim)' }}>
            <SectionHeading
              icon={RiskIcon}
              title="Data Minimisation Violations"
              subtitle="GDPR Article 5(1)(c) — Data accessed beyond declared purpose"
              badge={{ label: violations.length, color: 'var(--red)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {violations.map((v, i) => (
                <div key={v.id ?? i} style={{ background: 'var(--surface)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: v.tenantName?.includes('Health') ? 'rgba(5,150,105,0.1)' : 'rgba(91,94,246,0.1)', color: v.tenantName?.includes('Health') ? '#059669' : '#5b5ef6' }}>
                      {v.tenantName ?? 'Unknown App'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {new Date(v.detectedAt).toLocaleString('en-IE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 8 }}>Undeclared fields accessed:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {v.violatingFields.map(f => (
                      <span key={f} style={{ padding: '3px 9px', borderRadius: 6, background: 'var(--red-dim)', color: 'var(--red)', fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chain Integrity */}
        <div style={{ marginBottom: 14 }}>
          <ChainCard onVerify={handleVerifyChain} result={chainResult} verifying={chainVerifying} events={filtered.slice(0, 10)} />
        </div>

        {/* Risk Alerts — dedicated page nav card */}
        <div className="dg-card anim-fade-up d4" style={{ padding: '16px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BrainIcon style={{ width: 17, height: 17, color: 'var(--red)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>AI Privacy Risk Alerts</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>AI-generated findings — updated every 6 hours</div>
          </div>
          <button
            onClick={() => navigate('/risk')}
            style={{
              padding: '7px 16px', borderRadius: 9, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            View All Alerts →
          </button>
        </div>

        {/* Breach Notification (GDPR Art.33) */}
        <div className="dg-card anim-fade-up d4" style={{ padding: '20px 22px', marginBottom: 14, border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WarningAmberIcon sx={{ color: 'var(--amber)', fontSize: 18 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>Breach Notification (GDPR Art.33)</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>72-hour regulator notification simulation</div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--amber)', color: '#fff', fontSize: 11, fontWeight: 700 }}>Simulation</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 14 }}>
            Simulate reporting a data breach. GDPR Article 33 requires notifying the supervisory authority within 72 hours.
          </div>
          {breachReports.filter(r => !r.regulatorNotified).map(r => (
            <div key={r.id} style={{ marginBottom: 10, padding: '12px 16px', borderRadius: 10, background: r.deadlineExceeded ? 'var(--red-dim)' : r.hoursRemaining < 12 ? 'rgba(249,115,22,0.08)' : 'var(--green-dim)', border: `1px solid ${r.deadlineExceeded ? 'rgba(220,38,38,0.2)' : r.hoursRemaining < 12 ? 'rgba(249,115,22,0.2)' : 'rgba(5,150,105,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{r.description}</div>
                <div style={{ fontSize: 11, color: r.deadlineExceeded ? 'var(--red)' : r.hoursRemaining < 12 ? 'var(--amber)' : 'var(--green)', fontWeight: 600 }}>
                  {r.deadlineExceeded ? 'DEADLINE EXCEEDED — notification overdue!' : `${r.hoursRemaining}h remaining to notify regulator`}
                </div>
              </div>
              <button onClick={() => handleNotifyRegulator(r.id)} style={{ padding: '7px 14px', background: 'var(--text)', color: 'var(--surface)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                Notify Regulator
              </button>
            </div>
          ))}
          {breachReports.filter(r => r.regulatorNotified).map(r => (
            <div key={r.id} style={{ marginBottom: 6, padding: '8px 12px', borderRadius: 8, background: 'var(--green-dim)', border: '1px solid rgba(5,150,105,0.2)', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
              ✓ {r.description} — Regulator notified
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <TextField
              placeholder="Describe the data breach…"
              value={breachInput}
              onChange={e => setBreachInput(e.target.value)}
              size="small"
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { background: 'var(--surface)', color: 'var(--text)', '& fieldset': { borderColor: 'var(--border)' }, '&:hover fieldset': { borderColor: 'var(--accent)' }, '&.Mui-focused fieldset': { borderColor: 'var(--accent)' } }, '& input::placeholder': { color: 'var(--text-3)' } }}
            />
            <button
              onClick={handleReportBreach}
              disabled={breachLoading || !breachInput.trim()}
              style={{ padding: '0 18px', background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 9, cursor: breachLoading || !breachInput.trim() ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', opacity: !breachInput.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {breachLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Report Breach'}
            </button>
          </div>
        </div>

        {/* AI Analysis History */}
        {(analysisHistory.length > 0 || !user?.tenantUserId) && (
          <div className="dg-card anim-fade-up d4" style={{ padding: '20px 22px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: analysisHistory.length > 0 ? 4 : 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainIcon style={{ width: 16, height: 16, color: 'var(--accent)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>AI Analysis History</div>
                {analysisHistory.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Last: {timeAgo(analysisHistory[0].createdAt)} · {analysisHistory[0].findings?.length ?? 0} findings</div>
                )}
              </div>
              {analysisHistory.length > 0 && (
                <span style={{ padding: '3px 12px', background: 'var(--accent)', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{analysisHistory.length}</span>
              )}
              {!user?.tenantUserId && (
                <button
                  onClick={handleRunAnalysis}
                  disabled={runAnalysisLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, cursor: runAnalysisLoading ? 'not-allowed' : 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!runAnalysisLoading) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                >
                  {runAnalysisLoading ? <><CircularProgress size={12} sx={{ color: 'inherit' }} /> Running…</> : <><RefreshIcon style={{ width: 13, height: 13 }} /> Run Analysis Now</>}
                </button>
              )}
            </div>

            {runAnalysisMsg && (
              <Alert severity={runAnalysisMsg.startsWith('Done') ? 'success' : 'warning'} sx={{ mb: 2, py: 0.5, borderRadius: 1.5 }} onClose={() => setRunAnalysisMsg('')}>
                {runAnalysisMsg}
              </Alert>
            )}

            {analysisHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysisHistory.map(record => (
                  <Accordion key={record._id} elevation={0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--text-3)' }} />}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {new Date(record.createdAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>{record.provider}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace" }}>{record.aiModel}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>{record.eventCount} events · {record.findings?.length ?? 0} findings</span>
                      </div>
                    </AccordionSummary>
                    <AccordionDetails>
                      {record.findings?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {record.findings.map((f, i) => (
                            <div key={i} style={{ borderLeft: `3px solid ${SEVERITY_COLOR[f.severity] ?? '#94a3b8'}`, paddingLeft: 12, paddingTop: 4, paddingBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${SEVERITY_COLOR[f.severity]}20`, color: SEVERITY_COLOR[f.severity], fontFamily: "'JetBrains Mono', monospace" }}>{f.severity}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.title}</span>
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>{f.description}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Suggested: {f.suggestedAction}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No findings for this analysis run.</div>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No analysis records yet. Click "Run Analysis Now" to trigger the first analysis.</div>
            )}
          </div>
        )}

        {/* GDPR Controls */}
        {user?.tenantUserId && (
          <div ref={gdprRef} className="dg-card anim-fade-up d4" style={{ padding: '22px 24px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldIcon style={{ width: 16, height: 16, color: '#7c3aed' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>Your GDPR Rights</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Exercise your rights under the General Data Protection Regulation</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {/* Article 20 */}
              <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, letterSpacing: '0.5px' }}>ARTICLE 20</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Data Portability</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.55 }}>Download a complete JSON export of your audit records.</div>
                {exportStatus && (
                  <Alert severity={exportStatus.status === 'failed' ? 'error' : exportStatus.status === 'completed' ? 'success' : 'info'} sx={{ mb: 1.5, py: 0.5, borderRadius: 1 }}>
                    Export: {exportStatus.status}
                  </Alert>
                )}
                <button
                  onClick={handleExport}
                  disabled={exportLoading || exportStatus?.status === 'processing'}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", boxShadow: '0 3px 10px var(--accent-glow)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
                >
                  {exportLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DownloadIcon style={{ width: 13, height: 13 }} />}
                  {exportStatus?.status === 'completed' ? 'Download Export' : 'Request Export'}
                </button>
              </div>

              {/* Article 17 */}
              <div style={{ padding: 16, background: 'var(--red-dim)', borderRadius: 12, border: '1px solid rgba(220,38,38,0.2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 4, letterSpacing: '0.5px' }}>ARTICLE 17</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Right to Erasure</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.55 }}>Permanently delete all your privacy audit records.</div>
                {deleteStatus && (
                  <Alert severity={deleteStatus.status === 'failed' ? 'error' : deleteStatus.status === 'completed' ? 'success' : 'warning'} sx={{ mb: 1.5, py: 0.5, borderRadius: 1 }}>
                    Deletion: {deleteStatus.status}
                  </Alert>
                )}
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    disabled={deleteLoading || deleteStatus?.status === 'processing'}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-dim)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
                  >
                    <TrashIcon style={{ width: 13, height: 13 }} /> Request Deletion
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleDelete} disabled={deleteLoading} style={{ flex: 1, padding: '8px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Confirm</button>
                    <button onClick={() => setDeleteConfirm(false)} style={{ flex: 1, padding: '8px', background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>

            {/* Article 7 — Consent */}
            {(consents.length > 0 || violations.length > 0) && (
              <>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Article 7 — Consent Management</div>

                {/* Violation-derived consent requests */}
                {violations.length > 0 && (() => {
                  const violatingFields = [...new Set(violations.flatMap(v => v.violatingFields))];
                  const unconsentedFields = violatingFields.filter(f => !consents.find(c => c.dataType === f));
                  if (unconsentedFields.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: 'var(--amber-dim)', border: '1px solid rgba(217,119,6,0.2)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 8 }}>
                        ⚠ {unconsentedFields.length} field{unconsentedFields.length > 1 ? 's were' : ' was'} accessed without consent
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {unconsentedFields.map(field => {
                          const existing = consents.find(c => c.dataType === field);
                          const granted = existing?.granted ?? false;
                          return (
                            <div key={field} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: 9, border: '1px solid', borderColor: granted ? 'rgba(5,150,105,0.3)' : 'rgba(217,119,6,0.3)', background: granted ? 'var(--green-dim)' : 'rgba(255,255,255,0.5)' }}>
                              <FormControlLabel
                                control={<Switch size="small" checked={granted} onChange={e => handleConsentToggle(field, e.target.checked)} disabled={consentToggling === field} color="warning" />}
                                label={<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{field.replace(/_/g, ' ')}{consentToggling === field && <CircularProgress size={10} sx={{ ml: 0.5, verticalAlign: 'middle' }} />}</span>}
                                sx={{ m: 0 }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {consents.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {consents.map(c => (
                      <div key={c.dataType} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 9, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500, textTransform: 'capitalize' }}>{c.dataType.replace(/_/g, ' ')}</span>
                        <Switch size="small" checked={c.granted} onChange={e => handleConsentToggle(c.dataType, e.target.checked)} disabled={consentToggling === c.dataType} color="success" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Webhooks link */}
            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Webhook Notifications</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Register endpoints to receive HMAC-signed alerts for HIGH/CRITICAL risks.</div>
              </div>
              <button
                onClick={() => navigate('/webhooks')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}
              >
                <WebhookIcon style={{ width: 13, height: 13 }} /> Manage Webhooks
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 32 }} />
      </>}

      <ConnectAppModal open={connectModalOpen} onClose={() => setConnectModalOpen(false)} />

      {/* Demo Tour FAB */}
      <button
        onClick={() => { setTourStep(0); setTourOpen(true); }}
        style={{
          position: 'fixed', bottom: 96, right: 24,
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--surface)', border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 14px var(--accent-glow)',
          transition: 'all 0.15s', zIndex: 1200, fontSize: 20,
          color: 'var(--accent)', fontWeight: 800,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}
        title="Take a guided tour"
      >
        ?
      </button>

      {/* Demo Tour Dialog */}
      <Dialog open={tourOpen} onClose={() => setTourOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 0, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)' }}>
          <span style={{ fontSize: '1.4rem', marginRight: 8 }}>{TOUR_STEPS[tourStep].emoji}</span>
          {TOUR_STEPS[tourStep].title}
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>Step {tourStep + 1} of {TOUR_STEPS.length}</div>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{TOUR_STEPS[tourStep].description}</p>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', px: 3, pb: 2, pt: 0 }}>
          <MobileStepper
            variant="dots"
            steps={TOUR_STEPS.length}
            position="static"
            activeStep={tourStep}
            sx={{ width: '100%', background: 'transparent', p: 0, mb: 1.5 }}
            nextButton={tourStep < TOUR_STEPS.length - 1
              ? <button onClick={() => setTourStep(s => s + 1)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>Next <KeyboardArrowRightIcon sx={{ fontSize: 18 }} /></button>
              : <button onClick={() => setTourOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--accent)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>Done</button>}
            backButton={<button onClick={() => setTourStep(s => s - 1)} disabled={tourStep === 0} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: tourStep === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, color: tourStep === 0 ? 'var(--text-3)' : 'var(--text-2)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}><KeyboardArrowLeftIcon sx={{ fontSize: 18 }} /> Back</button>}
          />
        </DialogActions>
      </Dialog>
    </div>
  );
}
