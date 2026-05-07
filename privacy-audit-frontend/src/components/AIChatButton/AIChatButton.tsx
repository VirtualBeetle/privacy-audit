import { useState, useRef, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { dashboardApi } from '../../api/client';
import { ShieldIcon, XIcon } from '../icons/Icons';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const WELCOME: Message = {
  role: 'ai',
  text: "Hi! I'm DataGuard AI. I can help you understand your recent privacy data activity. What would you like to know?",
};

/* Sparkle icon for the FAB */
function SparkleIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.5 3l1.5 4.5L15.5 9l-4.5 1.5L9.5 15l-1.5-4.5L3.5 9l4.5-1.5L9.5 3z"/>
      <path d="M18.5 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" opacity="0.7"/>
      <path d="M16 3l.8 2.2 2.2.8-2.2.8L16 9l-.8-2.2L13 6l2.2-.8L16 3z" opacity="0.5"/>
    </svg>
  );
}

/* Send arrow icon */
function ArrowUpIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/>
      <polyline points="5,12 12,5 19,12"/>
    </svg>
  );
}

export default function AIChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [providerLabel, setProviderLabel] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setSending(true);

    try {
      const res = await dashboardApi.aiChat(text, sessionId);
      setSessionId(res.sessionId);
      setProviderLabel('Online');
      setMessages(prev => [...prev, { role: 'ai', text: res.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: 'Sorry, I could not reach the AI service. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !sending;

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28,
      zIndex: 9999, display: 'flex', flexDirection: 'column',
      alignItems: 'flex-end', gap: 14,
    }}>

      {/* ── Chat panel ─────────────────────────────────── */}
      {open && (
        <div
          className="anim-scale-in"
          style={{
            width: 360, borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.15)',
            background: 'var(--surface)',
            transformOrigin: 'bottom right',
          }}
        >
          {/* Header — always dark for brand consistency */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(56,189,248,0.45)',
            }}>
              <ShieldIcon style={{ width: 18, height: 18, color: '#fff' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                color: '#f8fafc', fontWeight: 700, fontSize: 14, lineHeight: 1.2,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                DataGuard AI
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
                  display: 'block', boxShadow: '0 0 6px #22c55e',
                  animation: 'pulse 2s infinite',
                }} />
                <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                  {providerLabel || 'Online'}
                </span>
              </div>
            </div>

            <span style={{
              padding: '2px 9px', borderRadius: 6,
              background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
            }}>
              AI
            </span>

            <button
              onClick={() => setOpen(false)}
              style={{
                width: 28, height: 28, borderRadius: 8, border: 'none', flexShrink: 0,
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <XIcon style={{ width: 13, height: 13 }} />
            </button>
          </div>

          {/* Messages area */}
          <div style={{
            height: 310, overflowY: 'auto', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: 12,
            background: 'var(--surface-2)',
            scrollbarWidth: 'thin',
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start', gap: 8,
                  animation: 'fadeUp 0.25s cubic-bezier(0.22,1,0.36,1) both',
                }}
              >
                {msg.role === 'ai' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 2,
                    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(56,189,248,0.3)',
                  }}>
                    <SparkleIcon style={{ width: 13, height: 13, color: '#fff' }} />
                  </div>
                )}

                <div style={{
                  maxWidth: '80%',
                  padding: msg.role === 'user' ? '9px 14px' : '10px 14px',
                  borderRadius: msg.role === 'user'
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'var(--surface)',
                  border: msg.role === 'ai' ? '1px solid var(--border)' : 'none',
                  boxShadow: msg.role === 'user'
                    ? '0 4px 12px rgba(99,102,241,0.35)'
                    : '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <p style={{
                    margin: 0, fontSize: 13, lineHeight: 1.6,
                    color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: 'pre-line',
                  }}>
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SparkleIcon style={{ width: 13, height: 13, color: '#fff' }} />
                </div>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--accent)', display: 'block',
                      animation: `floatY 1.1s ease-in-out ${i * 160}ms infinite`,
                      opacity: 0.7,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask about your data privacy…"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 88) + 'px';
                }}
                onKeyDown={handleKeyDown}
                disabled={sending}
                style={{
                  flex: 1, padding: '9px 13px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text)', fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none', resize: 'none', lineHeight: 1.5,
                  transition: 'border-color 0.15s', overflow: 'hidden',
                  minHeight: 38,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                  width: 38, height: 38, borderRadius: 12, border: 'none', flexShrink: 0,
                  background: canSend
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'var(--surface-2)',
                  color: canSend ? '#fff' : 'var(--text-3)',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: canSend ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                }}
                onMouseEnter={e => { if (canSend) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {sending
                  ? <CircularProgress size={14} sx={{ color: 'var(--text-3)' }} />
                  : <ArrowUpIcon style={{ width: 16, height: 16 }} />}
              </button>
            </div>
            <p style={{
              margin: '8px 0 0', fontSize: 10.5, color: 'var(--text-3)',
              textAlign: 'center', fontFamily: "'DM Sans', sans-serif",
            }}>
              Powered by DataGuard AI · your data stays private
            </p>
          </div>
        </div>
      )}

      {/* ── FAB ────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        {!open && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: '#6366f1',
            animation: 'pulseRing 2.2s ease-out infinite',
          }} />
        )}
        <button
          onClick={() => setOpen(v => !v)}
          title={open ? 'Close AI chat' : 'Ask DataGuard AI'}
          style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            cursor: 'pointer', position: 'relative', zIndex: 1,
            background: open
              ? 'linear-gradient(135deg, #ef4444, #f97316)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: open
              ? '0 8px 24px rgba(239,68,68,0.4)'
              : '0 8px 28px rgba(99,102,241,0.5)',
            transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {open
            ? <XIcon style={{ width: 20, height: 20, color: '#fff' }} />
            : <SparkleIcon style={{ width: 26, height: 26, color: '#fff' }} />}
        </button>
      </div>
    </div>
  );
}
