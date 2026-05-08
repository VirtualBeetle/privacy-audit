import { useState, useEffect, useCallback } from 'react';
import type { ToastType } from '../../utils/toast';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: { label: string; onClick: () => void };
  exiting?: boolean;
}

const COLORS: Record<ToastType, { border: string; icon: string; accent: string }> = {
  success: { border: 'rgba(34,197,94,0.4)',  icon: '#22c55e', accent: '#22c55e' },
  error:   { border: 'rgba(239,68,68,0.4)',  icon: '#f87171', accent: '#f87171' },
  warning: { border: 'rgba(251,191,36,0.4)', icon: '#fbbf24', accent: '#fbbf24' },
  info:    { border: 'var(--accent-dim)', icon: 'var(--accent)', accent: 'var(--accent)' },
};

function Icon({ type }: { type: ToastType }) {
  if (type === 'success') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  if (type === 'error') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  if (type === 'warning') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

const STYLE_ID = 'dg-toast-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes dg-toast-in  { from { opacity:0; transform:translateX(110%) scale(.96); } to { opacity:1; transform:translateX(0) scale(1); } }
    @keyframes dg-toast-out { from { opacity:1; transform:translateX(0) scale(1);     } to { opacity:0; transform:translateX(110%) scale(.96); } }
    .dg-toast-enter { animation: dg-toast-in .22s ease both; }
    .dg-toast-exit  { animation: dg-toast-out .2s ease both; }
  `;
  document.head.appendChild(el);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type, duration, action } = (e as CustomEvent).detail;
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts(prev => [...prev.slice(-4), { id, message, type, duration, action }]);
      setTimeout(() => dismiss(id), duration ?? 4000);
    };
    window.addEventListener('dg-toast', handler);
    return () => window.removeEventListener('dg-toast', handler);
  }, [dismiss]);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
      display: 'flex', flexDirection: 'column-reverse', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const c = COLORS[t.type];
        return (
          <div
            key={t.id}
            className={t.exiting ? 'dg-toast-exit' : 'dg-toast-enter'}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px',
              background: '#18181b',
              border: `1px solid ${c.border}`,
              borderRadius: 11,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              minWidth: 260, maxWidth: 380,
              pointerEvents: 'auto',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            <span style={{ color: c.icon, flexShrink: 0 }}><Icon type={t.type} /></span>
            <span style={{ flex: 1, fontSize: 13, color: '#fafafa', lineHeight: 1.45 }}>{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                style={{
                  padding: '3px 9px', borderRadius: 6, border: `1px solid ${c.accent}`,
                  background: 'transparent', color: c.accent,
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  fontFamily: 'inherit',
                }}
              >{t.action.label}</button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
