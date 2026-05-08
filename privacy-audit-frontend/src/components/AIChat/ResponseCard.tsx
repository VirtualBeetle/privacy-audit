import type { CardData } from './useAIChat';

// ── Shared primitives ─────────────────────────────────────────────────────────

const C = {
  bg:      '#0a0a0c',
  surface: '#0e0e10',
  card:    '#131316',
  border:  '#1f1f23',
  border2: '#27272a',
  accent:  '#a78bfa',
  accentDim: 'rgba(167,139,250,0.12)',
  text:    '#fafafa',
  textMid: '#d4d4d8',
  textDim: '#a1a1aa',
  textMute:'#71717a',
  green:   '#22c55e',
  greenDim:'rgba(34,197,94,0.12)',
  red:     '#f87171',
  redDim:  'rgba(239,68,68,0.12)',
  amber:   '#fbbf24',
  amberDim:'rgba(251,191,36,0.12)',
  mono:    "'JetBrains Mono', monospace",
};

function RCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

function RHead({ icon, title, tag, tagColor }: {
  icon: React.ReactNode; title: string;
  tag?: string; tagColor?: string;
}) {
  return (
    <div style={{
      padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9,
      borderBottom: `1px solid ${C.border}`, background: C.bg,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6, background: C.accentDim,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.accent, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C.text, letterSpacing: '-0.005em' }}>{title}</div>
      {tag && (
        <span style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.6px', padding: '2px 7px',
          borderRadius: 4, textTransform: 'uppercase', fontFamily: C.mono,
          background: tagColor ?? C.accentDim, color: C.accent,
        }}>{tag}</span>
      )}
    </div>
  );
}

function RBody({ children, noPad }: { children: React.ReactNode; noPad?: boolean }) {
  return <div style={{ padding: noPad ? 0 : '13px 14px' }}>{children}</div>;
}

function RFoot({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderTop: `1px solid ${C.border}`, padding: '9px 14px',
      display: 'flex', alignItems: 'center', gap: 8, background: C.bg,
    }}>{children}</div>
  );
}

function Btn({ label, primary, icon, onClick }: {
  label: string; primary?: boolean; icon?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 11px', background: primary ? C.accent : 'transparent',
        border: `1px solid ${primary ? C.accent : C.border2}`,
        borderRadius: 7, fontSize: 11.5, color: primary ? C.bg : C.textDim,
        cursor: 'pointer', fontFamily: 'inherit', fontWeight: primary ? 600 : 500,
        display: 'flex', alignItems: 'center', gap: 5, transition: 'all .15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
    >
      {icon}{label}
    </button>
  );
}

// ── Chain Verify Card ─────────────────────────────────────────────────────────

function ChainVerifyCard({ data }: { data: Record<string, unknown> }) {
  const valid = data.valid as boolean;
  const eventCount = data.eventCount as number ?? 0;
  const latestHash = data.latestHash as string | null;
  const algorithm = data.algorithm as string ?? 'SHA-256';
  const timestamp = data.timestamp as string ?? '';

  return (
    <RCard>
      <RHead
        icon={<CheckIcon />}
        title="Chain integrity verified"
        tag={valid ? 'VALID' : 'TAMPERED'}
        tagColor={valid ? C.greenDim : C.redDim}
      />
      <RBody>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px',
          background: valid ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
          border: `1px solid ${valid ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: 9, marginBottom: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: valid ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: valid ? C.green : C.red,
          }}>
            {valid ? <CheckCircleIcon /> : <XCircleIcon />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              {eventCount} / {eventCount} events verified
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
              {valid ? 'No broken links · GDPR Art. 30 compliant' : `Tampering detected at event ${data.brokenAtEventId}`}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 11, color: C.textMute, fontFamily: C.mono, lineHeight: 1.7,
          background: C.bg, padding: '9px 11px', borderRadius: 7, border: `1px solid ${C.border}`,
        }}>
          <span style={{ color: C.textMute }}>algorithm</span>{'  : '}
          <span style={{ color: C.accent }}>{algorithm}</span>{'\n'}
          {latestHash && (
            <><span style={{ color: C.textMute }}>latest hash</span>{' : '}
            <span style={{ color: C.accent }}>{latestHash}</span>{'\n'}</>
          )}
          <span style={{ color: C.textMute }}>timestamp</span>{'  : '}
          <span style={{ color: C.accent }}>{timestamp.replace('T', ' ').replace(/\.\d+Z/, ' UTC')}</span>
        </div>
      </RBody>
      <RFoot>
        <Btn label="Receipt PDF" icon={<DownloadIcon />} />
        <Btn label="Share proof" icon={<LinkIcon />} />
        <div style={{ flex: 1 }} />
        <Btn label="Open verifier" primary />
      </RFoot>
    </RCard>
  );
}

// ── Comparison Card ───────────────────────────────────────────────────────────

function ComparisonCard({ data }: { data: Record<string, unknown> }) {
  const periodA = data.periodA as string ?? 'Last 7 days';
  const periodB = data.periodB as string ?? 'Previous 7 days';
  const a = (data.statsA as Record<string, unknown>) ?? {};
  const b = (data.statsB as Record<string, unknown>) ?? {};

  const row = (label: string, aVal: unknown, bVal: unknown, higherIsBetter = true) => {
    const aNum = typeof aVal === 'number' ? aVal : 0;
    const bNum = typeof bVal === 'number' ? bVal : 0;
    const aGood = higherIsBetter ? aNum >= bNum : aNum <= bNum;
    const bGood = higherIsBetter ? bNum >= aNum : bNum <= aNum;
    return (
      <div key={label} style={{ display: 'contents' }}>
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.textDim, fontWeight: 500 }}>{label}</div>
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', fontFamily: C.mono, fontSize: 12, fontWeight: 600, color: aGood ? C.green : C.red }}>
          {typeof aVal === 'number' && label.includes('%') ? `${aVal}%` : String(aVal ?? '—')}
        </div>
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', fontFamily: C.mono, fontSize: 12, fontWeight: 600, color: bGood ? C.green : C.red }}>
          {typeof bVal === 'number' && label.includes('%') ? `${bVal}%` : String(bVal ?? '—')}
        </div>
      </div>
    );
  };

  return (
    <RCard>
      <RHead icon={<BarChartIcon />} title="Period comparison · 14d" />
      <RBody noPad>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', fontSize: 12 }}>
          <div style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.5px', background: C.bg }} />
          <div style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.5px', background: C.bg }}>{periodA}</div>
          <div style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.5px', background: C.bg }}>{periodB}</div>
          {row('Events', a.total, b.total)}
          {row('Consent rate %', a.consentRate, b.consentRate)}
          {row('3rd-party shares', a.thirdParty, b.thirdParty, false)}
          {row('Critical events', a.critical, b.critical, false)}
          <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, color: C.textDim }}>Trust score</div>
          <div style={{ padding: '8px 12px', textAlign: 'right', fontFamily: C.mono, fontSize: 12, fontWeight: 600, color: (a.trustScore as number ?? 0) >= (b.trustScore as number ?? 0) ? C.green : C.red }}>
            {String(a.grade ?? '')} · {String(a.trustScore ?? '')}
          </div>
          <div style={{ padding: '8px 12px', textAlign: 'right', fontFamily: C.mono, fontSize: 12, fontWeight: 600, color: (b.trustScore as number ?? 0) >= (a.trustScore as number ?? 0) ? C.green : C.red }}>
            {String(b.grade ?? '')} · {String(b.trustScore ?? '')}
          </div>
        </div>
      </RBody>
      <RFoot>
        <Btn label="View events" />
        <div style={{ flex: 1 }} />
        <Btn label="Open dashboard" primary />
      </RFoot>
    </RCard>
  );
}

// ── Draft Card ────────────────────────────────────────────────────────────────

function DraftCard({ data }: { data: Record<string, unknown> }) {
  const to = data.to as string ?? '';
  const cc = data.cc as string ?? 'DPC Ireland';
  const subject = data.subject as string ?? '';
  const body = data.body as string ?? '';

  const copyToClipboard = () => {
    const text = `To: ${to}\nCC: ${cc}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <RCard>
      <RHead icon={<FileIcon />} title="GDPR letter — draft" tag="DRAFT" />
      <RBody>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {to && (
            <span style={{ padding: '2px 8px', background: '#1a1a1f', border: `1px solid ${C.border2}`, borderRadius: 20, fontSize: 10.5, color: C.textDim }}>
              To: <strong style={{ color: C.text }}>{to}</strong>
            </span>
          )}
          <span style={{ padding: '2px 8px', background: '#1a1a1f', border: `1px solid ${C.border2}`, borderRadius: 20, fontSize: 10.5, color: C.textDim }}>
            CC: <strong style={{ color: C.text }}>{cc}</strong>
          </span>
        </div>
        <div style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: 12, fontSize: 11.5, color: C.textMid, lineHeight: 1.7,
          fontFamily: C.mono, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto',
        }}>
          {subject && <><span style={{ color: C.accent }}>Subject: {subject}</span>{'\n\n'}</>}
          {body}
        </div>
      </RBody>
      <RFoot>
        <Btn label="Edit" icon={<EditIcon />} />
        <Btn label="Copy" icon={<CopyIcon />} onClick={copyToClipboard} />
        <div style={{ flex: 1 }} />
        <Btn label="Send via DPC portal" primary />
      </RFoot>
    </RCard>
  );
}

// ── Minimal inline SVG icons ──────────────────────────────────────────────────

const iconStyle = { width: 12, height: 12, display: 'block' } as const;

function CheckIcon() {
  return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function CheckCircleIcon() {
  return <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function XCircleIcon() {
  return <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}
function DownloadIcon() {
  return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
function LinkIcon() {
  return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}
function BarChartIcon() {
  return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function FileIcon() {
  return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function EditIcon() {
  return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function CopyIcon() {
  return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}

// ── Report Card (risk-summary) ────────────────────────────────────────────────

function ReportCard({ data }: { data: Record<string, unknown> }) {
  const score = data.score as number ?? 0;
  const grade = data.grade as string ?? 'N/A';
  const period = data.period as string ?? 'Last 30 days';
  const total = data.totalEvents as number ?? 0;
  const consentRate = data.consentRate as number ?? 0;
  const noConsentCount = data.noConsentCount as number ?? 0;
  const criticalCount = data.criticalCount as number ?? 0;
  const highCount = data.highCount as number ?? 0;
  const thirdPartyCount = data.thirdPartyCount as number ?? 0;
  const topFields = (data.topDataFields as [string, number][] | undefined) ?? [];
  const generatedAt = data.generatedAt as string ?? '';
  const scoreColor = score >= 90 ? C.green : score >= 75 ? C.accent : score >= 60 ? C.amber : C.red;

  const downloadReport = () => {
    const lines = [
      `DataGuard Privacy Compliance Report`,
      `Period: ${period}`,
      `Generated: ${new Date(generatedAt).toLocaleString('en-IE')}`,
      ``,
      `OVERALL GRADE: ${grade} (${score}/100)`,
      ``,
      `KEY METRICS`,
      `Total Events:       ${total}`,
      `Consent Rate:       ${consentRate}%`,
      `No Consent Events:  ${noConsentCount}`,
      `Critical Events:    ${criticalCount}`,
      `High Events:        ${highCount}`,
      `Third-party Shares: ${thirdPartyCount}`,
      ``,
      `TOP DATA FIELDS ACCESSED`,
      ...topFields.map(([f, n]) => `  ${f.padEnd(24)} ${n} times`),
      ``,
      `This report was generated by DataGuard AI (GDPR Art. 30).`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dataguard-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <RCard>
      <RHead icon={<ReportIcon />} title={`Compliance Report · ${period}`} tag={`GRADE ${grade}`} tagColor={score >= 75 ? C.greenDim : C.redDim} />
      <RBody>
        {/* Score gauge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, marginBottom: 12 }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor, fontFamily: C.mono, lineHeight: 1 }}>{grade}</div>
            <div style={{ fontSize: 10, color: C.textMute, marginTop: 2 }}>{score}/100</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, background: C.border2, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: 3, transition: 'width .6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.textMute }}>
              <span>{total} events analysed</span>
              <span>{consentRate}% consent rate</span>
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 12 }}>
          {[
            { label: 'No-consent events', value: noConsentCount, color: noConsentCount > 0 ? C.amber : C.green, bad: true },
            { label: 'Critical severity', value: criticalCount, color: criticalCount > 0 ? C.red : C.green, bad: true },
            { label: 'High severity', value: highCount, color: highCount > 0 ? C.amber : C.green, bad: true },
            { label: 'Third-party shares', value: thirdPartyCount, color: thirdPartyCount > 0 ? C.amber : C.green, bad: true },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '8px 11px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: C.textMute, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color, fontFamily: C.mono }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Top data fields */}
        {topFields.length > 0 && (
          <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Top data fields accessed
          </div>
        )}
        {topFields.slice(0, 6).map(([field, count]) => (
          <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 11.5, color: C.textMid, flex: 1 }}>{field.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: 11, color: C.textMute, fontFamily: C.mono, flexShrink: 0 }}>{count}×</div>
            <div style={{ width: 60, height: 4, background: C.border2, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ height: '100%', width: `${Math.min((count / (topFields[0]?.[1] ?? 1)) * 100, 100)}%`, background: C.accent, borderRadius: 2 }} />
            </div>
          </div>
        ))}

        {generatedAt && (
          <div style={{ marginTop: 10, fontSize: 10, color: C.textMute, fontFamily: C.mono }}>
            Generated {new Date(generatedAt).toLocaleString('en-IE')} · GDPR Art. 30
          </div>
        )}
      </RBody>
      <RFoot>
        <Btn label="Download .txt" icon={<DownloadIcon />} onClick={downloadReport} />
        <div style={{ flex: 1 }} />
        <Btn label="View events" primary />
      </RFoot>
    </RCard>
  );
}

function ReportIcon() {
  return <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}

// ── Main switch ───────────────────────────────────────────────────────────────

export default function ResponseCard({ card }: { card: CardData }) {
  switch (card.cardType) {
    case 'chain-verify':  return <ChainVerifyCard data={card as unknown as Record<string, unknown>} />;
    case 'comparison':    return <ComparisonCard data={card as unknown as Record<string, unknown>} />;
    case 'draft':         return <DraftCard data={card as unknown as Record<string, unknown>} />;
    case 'risk-summary':  return <ReportCard data={card as unknown as Record<string, unknown>} />;
    default:              return null;
  }
}
