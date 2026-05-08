import { useEffect, useRef } from 'react';

const C = {
  bg:      '#131316',
  border:  '#2a2a30',
  border2: '#1f1f23',
  accent:  '#a78bfa',
  text:    '#fafafa',
  textDim: '#a1a1aa',
  textMute:'#52525b',
  mono:    "'JetBrains Mono', monospace",
  hover:   '#18181b',
  active:  '#1a1a1f',
};

export const SLASH_COMMANDS = [
  { cmd: '/explain', desc: 'Explain a risk alert, event, or privacy score' },
  { cmd: '/draft',   desc: 'Draft a GDPR request or DPC complaint' },
  { cmd: '/compare', desc: 'Compare this week vs last week statistics' },
  { cmd: '/verify',  desc: 'Verify the audit log SHA-256 hash chain integrity' },
  { cmd: '/report',  desc: 'Generate a 30-day privacy compliance report' },
];

interface SlashLauncherProps {
  query: string;        // text after the slash
  activeIndex: number;
  onSelect: (cmd: string) => void;
  onIndexChange: (i: number) => void;
}

export default function SlashLauncher({
  query,
  activeIndex,
  onSelect,
  onIndexChange,
}: SlashLauncherProps) {
  const filtered = SLASH_COMMANDS.filter((c) =>
    c.cmd.slice(1).startsWith(query.toLowerCase()),
  );
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const item = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!filtered.length) return null;

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 6px)',
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 11,
      boxShadow: '0 12px 28px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 50,
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px', borderBottom: `1px solid ${C.border2}`,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, color: C.textMute, fontWeight: 600, letterSpacing: '0.4px',
        textTransform: 'uppercase',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
        Commands matching &quot;/{query}&quot;
      </div>

      {/* List */}
      <div ref={listRef}>
        {filtered.map((item, i) => (
          <button
            key={item.cmd}
            onMouseDown={(e) => { e.preventDefault(); onSelect(item.cmd); }}
            onMouseEnter={() => onIndexChange(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 11, width: '100%',
              padding: '9px 12px', background: i === activeIndex ? C.active : 'transparent',
              border: 'none', borderLeft: `2px solid ${i === activeIndex ? C.accent : 'transparent'}`,
              cursor: 'pointer', textAlign: 'left', transition: 'background .1s',
            }}
          >
            <span style={{ fontFamily: C.mono, fontSize: 11.5, color: C.accent, fontWeight: 600, width: 88, flexShrink: 0 }}>
              {item.cmd}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: C.textDim }}>{item.desc}</span>
            {i === activeIndex && (
              <span style={{ fontSize: 9, color: C.textMute, fontFamily: C.mono }}>↵</span>
            )}
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '6px 12px', borderTop: `1px solid ${C.border2}`,
        display: 'flex', gap: 10, fontSize: 10, color: C.textMute,
      }}>
        {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'dismiss']].map(([key, label]) => (
          <span key={key} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <kbd style={{ padding: '1px 5px', background: '#18181b', border: `1px solid #27272a`, borderRadius: 4, fontSize: 9, color: C.textDim, fontFamily: C.mono, lineHeight: 1.4 }}>{key}</kbd>
            {label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto' }}>{filtered.length} of {SLASH_COMMANDS.length}</span>
      </div>
    </div>
  );
}
