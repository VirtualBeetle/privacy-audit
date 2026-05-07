import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../contexts/AuthContext';
import { useAIChat, type ChatMessage, type ThinkingStep } from './useAIChat';
import ResponseCard from './ResponseCard';
import SlashLauncher, { SLASH_COMMANDS } from './SlashLauncher';

// ── Design tokens (panel-local, matte-black scheme per design) ────────────────
const C = {
  panelBg:  '#0e0e10',
  bg:       '#0a0a0c',
  card:     '#131316',
  border:   '#1f1f23',
  border2:  '#27272a',
  accent:   '#a78bfa',
  accentDim:'rgba(167,139,250,0.12)',
  text:     '#fafafa',
  textMid:  '#d4d4d8',
  textDim:  '#a1a1aa',
  textMute: '#71717a',
  textGhost:'#52525b',
  green:    '#22c55e',
  greenGlow:'rgba(34,197,94,0.2)',
  amber:    '#fbbf24',
  mono:     "'JetBrains Mono', monospace",
  sans:     "'Inter', system-ui, sans-serif",
};

// ── CSS injection (keyframes that can't be inline) ────────────────────────────
const STYLE_ID = 'dg-ai-chat-styles';
if (!document.getElementById(STYLE_ID)) {
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes dg-spin { to { transform: rotate(360deg); } }
    @keyframes dg-blink { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-2px)} }
    @keyframes dg-fade-up { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
    @keyframes dg-slide-in { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:translateX(0)} }
    @keyframes dg-panel-in { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
    .dg-msg { animation: dg-fade-up .25s ease both; }
    .dg-panel { animation: dg-panel-in .2s ease both; }
    .dg-history { animation: dg-slide-in .2s ease both; }
    .dg-spin { animation: dg-spin 1s linear infinite; }
  `;
  document.head.appendChild(el);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ThinkingSteps({ steps }: { steps: ThinkingStep[] }) {
  if (!steps.length) return null;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '11px 13px', background: C.panelBg,
      border: `1px solid #1a1a1f`, borderRadius: 10,
    }}>
      {steps.map((step) => (
        <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
          {step.status === 'done' ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg className="dg-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
            </svg>
          )}
          <span style={{
            color: step.status === 'done' ? C.textGhost : C.text,
            textDecoration: step.status === 'done' ? 'line-through' : 'none',
          }}>
            {step.label}
            {step.status === 'active' && '…'}
          </span>
        </div>
      ))}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '9px 13px', background: C.card,
      border: `1px solid ${C.border}`, borderRadius: '14px 14px 14px 4px',
    }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: C.textGhost,
          display: 'block',
          animation: `dg-blink 1.2s ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  );
}

function AIAvatar() {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 1,
      background: `linear-gradient(140deg, #6366f1, #8b5cf6)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </div>
  );
}

function MessageBubble({ msg, onFollowUp }: { msg: ChatMessage; onFollowUp: (t: string) => void }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="dg-msg" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          background: '#1a1a1f', border: `1px solid ${C.border2}`,
          color: C.text, padding: '8px 13px',
          borderRadius: '14px 14px 4px 14px', fontSize: 13,
          maxWidth: '85%', lineHeight: 1.55,
        }}>
          {msg.text.startsWith('/') ? (
            <span>
              <span style={{ color: C.accent, fontFamily: C.mono, fontWeight: 600 }}>
                {msg.text.split(' ')[0]}
              </span>
              {msg.text.includes(' ') ? ' ' + msg.text.slice(msg.text.indexOf(' ') + 1) : ''}
            </span>
          ) : msg.text}
        </div>
      </div>
    );
  }

  const hasContent = msg.text || msg.card;
  const isStreaming = msg.streaming;

  return (
    <div className="dg-msg" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <AIAvatar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

        {/* Thinking steps */}
        {msg.steps && msg.steps.length > 0 && (
          <ThinkingSteps steps={msg.steps} />
        )}

        {/* AI text — markdown rendered */}
        {msg.text && (
          <div style={{ color: C.textMid, fontSize: 13, lineHeight: 1.65, fontFamily: C.sans }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ children }) => (
                  <strong style={{ color: C.text, fontWeight: 600 }}>{children}</strong>
                ),
                code: ({ children, className }) => {
                  const isBlock = !!className;
                  return isBlock ? (
                    <pre style={{
                      background: '#1a1a1f', border: `1px solid ${C.border2}`,
                      borderRadius: 7, padding: '10px 12px', overflowX: 'auto',
                      fontSize: 11.5, fontFamily: C.mono, color: C.textMid, margin: '8px 0',
                    }}>
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code style={{
                      background: '#1a1a1f', border: `1px solid ${C.border2}`,
                      padding: '1px 6px', borderRadius: 4,
                      fontSize: 11.5, color: C.accent, fontFamily: C.mono,
                    }}>{children}</code>
                  );
                },
                ul: ({ children }) => (
                  <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{children}</ul>
                ),
                li: ({ children }) => (
                  <li style={{ margin: '3px 0', color: C.textMid }}>{children}</li>
                ),
                p: ({ children }) => (
                  <p style={{ margin: '4px 0' }}>{children}</p>
                ),
              }}
            >
              {msg.text}
            </ReactMarkdown>
          </div>
        )}

        {/* Typing indicator while streaming with no text yet */}
        {isStreaming && !hasContent && <TypingDots />}

        {/* Response card */}
        {msg.card && <ResponseCard card={msg.card} />}

        {/* Follow-up chips */}
        {msg.followUps && msg.followUps.length > 0 && !isStreaming && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
            {msg.followUps.map((fu) => (
              <button
                key={fu}
                onClick={() => onFollowUp(fu)}
                style={{
                  padding: '5px 11px', background: C.card,
                  border: `1px solid ${C.border2}`, borderRadius: 20,
                  fontSize: 11.5, color: C.textDim, cursor: 'pointer',
                  fontFamily: C.sans, fontWeight: 450,
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all .15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#18181b';
                  (e.currentTarget as HTMLButtonElement).style.color = C.text;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#3f3f46';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = C.card;
                  (e.currentTarget as HTMLButtonElement).style.color = C.textDim;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.border2;
                }}
              >
                <span style={{ color: C.accent, fontSize: 10 }}>↳</span>{fu}
              </button>
            ))}
          </div>
        )}

        {/* Sources strip */}
        {msg.sources && msg.sources.length > 0 && !isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: C.textGhost, padding: '0 2px' }}>
            <span>Based on</span>
            {msg.sources.map((s, i) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#3f3f46', display: 'block' }} />}
                <span style={{ color: C.textMute, borderBottom: '1px dotted #3f3f46', cursor: 'default' }}>{s}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ firstName, onPrompt }: { firstName: string; onPrompt: (t: string) => void }) {
  const role = 'any'; // could be role-aware

  const prompts = [
    { icon: QuestionIcon, text: 'Why is my privacy score below 80?' },
    { icon: AlertIcon,    text: 'Show critical events from last 7 days' },
    { icon: ChatIcon,     text: 'Explain the most recent risk alert' },
    { icon: InfoIcon,     text: 'What does CRITICAL severity mean?' },
  ];

  return (
    <div style={{ padding: '24px 4px 16px' }}>
      <h2 style={{
        fontSize: 19, color: C.text, lineHeight: 1.3, letterSpacing: '-0.02em',
        marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
      }}>
        Hi {firstName} — what would you like to know about{' '}
        <span style={{
          background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>your data</span>?
      </h2>
      <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: 20 }}>
        I can explain risk alerts, find specific events, or draft GDPR requests on your behalf.
      </p>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', color: '#52525b', textTransform: 'uppercase', marginBottom: 8 }}>
        Suggested for you
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {prompts.map(({ icon: Icon, text }) => (
          <button
            key={text}
            onClick={() => onPrompt(text)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 11,
              padding: '11px 13px', background: C.card,
              border: `1px solid ${C.border}`, borderRadius: 10,
              cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#16161a';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a30';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.card;
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 7, background: C.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.accent, flexShrink: 0, marginTop: 1,
            }}>
              <Icon />
            </div>
            <div style={{ flex: 1, fontSize: 12.5, color: '#d4d4d8', lineHeight: 1.5, fontWeight: 450 }}>{text}</div>
            <div style={{ color: '#3f3f46', fontSize: 11, alignSelf: 'center', flexShrink: 0 }}>→</div>
          </button>
        ))}
      </div>

      <div style={{
        marginTop: 12, padding: '10px 12px', background: C.bg,
        border: `1px dashed ${C.border2}`, borderRadius: 9,
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11.5, color: C.textMute,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <span>
          Type <kbd style={{ padding: '1px 5px', background: '#18181b', border: `1px solid ${C.border2}`, borderRadius: 4, fontSize: 10, color: C.textDim, fontFamily: C.mono }}>/</kbd> for commands like{' '}
          {['/explain', '/draft', '/compare'].map((c) => (
            <code key={c} style={{ color: C.accent, fontFamily: C.mono, fontSize: 11 }}>{c} </code>
          ))}
        </span>
      </div>
    </div>
  );
}

function HistorySidebar({
  sessions, loading, onSelect, onNew, onClose,
}: {
  sessions: Array<{ _id: string; title: string; updatedAt: string }>;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  return (
    <div className="dg-history" style={{
      position: 'absolute', inset: 0, background: C.panelBg,
      zIndex: 10, display: 'flex', flexDirection: 'column',
      borderRadius: 'inherit',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '12px 14px',
        borderBottom: `1px solid ${C.border}`, gap: 8, flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid transparent`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMute, cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#18181b'; (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.textMute; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>Chat History</span>
        <button
          onClick={onNew}
          style={{ padding: '5px 11px', background: C.accentDim, border: `1px solid rgba(167,139,250,0.3)`, borderRadius: 7, fontSize: 11.5, color: C.accent, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s', flexShrink: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.accentDim; }}
        >
          + New chat
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: C.textMute, fontSize: 12 }}>
            Loading…
          </div>
        )}
        {!loading && !sessions.length && (
          <div style={{ padding: '20px 14px', color: C.textMute, fontSize: 12, textAlign: 'center' }}>
            No previous conversations
          </div>
        )}
        {sessions.map((s) => (
          <button
            key={s._id}
            onClick={() => onSelect(s._id)}
            style={{
              width: '100%', padding: '10px 14px', background: 'transparent',
              border: 'none', textAlign: 'left', cursor: 'pointer',
              borderBottom: `1px solid ${C.border}`, transition: 'background .1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#131316'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <div style={{ fontSize: 12.5, color: C.textMid, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
              {s.title || 'Untitled conversation'}
            </div>
            <div style={{ fontSize: 11, color: C.textMute }}>
              {new Date(s.updatedAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface AIChatPanelProps {
  mode?: 'panel' | 'page';  // panel = floating, page = full page (embedded)
  onExpandToPage?: () => void;
}

export default function AIChatPanel({ mode = 'panel', onExpandToPage }: AIChatPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashIdx, setSlashIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chat = useAIChat();
  const isPage = mode === 'page';

  // Hide FAB on /ai-chat route
  const isOnChatPage = location.pathname === '/ai-chat';

  const firstName = (() => {
    const dn = (user as any)?.displayName ?? '';
    return dn.split(' ')[0] || 'there';
  })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.streaming]);

  useEffect(() => {
    if ((open || isPage) && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, isPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';

    // Slash command detection
    if (val.startsWith('/') && !val.includes(' ')) {
      setSlashQuery(val.slice(1));
      setSlashIdx(0);
    } else {
      setSlashQuery(null);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashQuery !== null) {
      const filtered = SLASH_COMMANDS.filter((c) => c.cmd.slice(1).startsWith(slashQuery.toLowerCase()));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filtered[slashIdx]) selectSlashCommand(filtered[slashIdx].cmd);
      } else if (e.key === 'Escape') {
        setSlashQuery(null);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [slashQuery, slashIdx]);

  const selectSlashCommand = (cmd: string) => {
    setInput(cmd + ' ');
    setSlashQuery(null);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || chat.streaming) return;
    setInput('');
    setSlashQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    chat.send(text);
  };

  const canSend = input.trim().length > 0 && !chat.streaming;
  const hasMessages = chat.messages.length > 0;
  const eventContextLine = `context: ${hasMessages ? 'active session' : '—'}`;

  // ── Panel content (shared between panel and page modes) ─────────────────────
  const panelContent = (
    <div style={{
      width: '100%', height: '100%', background: '#0e0e10',
      border: isPage ? 'none' : `1px solid ${C.border}`,
      borderRadius: isPage ? 0 : 16,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: isPage ? 'none' : '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset',
      position: 'relative',
    }}>

      {/* History sidebar overlay */}
      {chat.historyOpen && (
        <HistorySidebar
          sessions={chat.sessions}
          loading={chat.loadingHistory}
          onSelect={chat.loadSession}
          onNew={chat.newChat}
          onClose={chat.closeHistory}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
        background: C.bg, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(140deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>

        {/* Title + status */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            DataGuard AI
          </div>
          <div style={{ fontSize: 11, color: C.textMute, display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', display: 'block', flexShrink: 0,
              background: chat.streaming ? C.amber : C.green,
              boxShadow: chat.streaming ? `0 0 0 2px rgba(251,191,36,0.2)` : `0 0 0 2px ${C.greenGlow}`,
            }} />
            {chat.streaming ? 'Processing…' : hasMessages ? 'Active conversation' : 'Ready — audit context loaded'}
          </div>
        </div>

        {/* History button */}
        <IconBtn title="Chat history" onClick={chat.openHistory}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </IconBtn>

        {/* Expand to full page — only in panel mode */}
        {!isPage && (
          <IconBtn title="Open full view" onClick={() => { setOpen(false); navigate('/ai-chat'); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </IconBtn>
        )}

        {/* Stop streaming / close */}
        {chat.streaming ? (
          <IconBtn title="Stop generation" onClick={chat.stopStreaming}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="6" width="12" height="12" rx="1"/>
            </svg>
          </IconBtn>
        ) : !isPage ? (
          <IconBtn title="Close" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </IconBtn>
        ) : null}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
        onScrollCapture={() => {}}
      >
        {!hasMessages ? (
          <EmptyState firstName={firstName} onPrompt={(t) => { chat.send(t); }} />
        ) : (
          chat.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onFollowUp={chat.submitFollowUp} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{
        padding: '12px 14px 14px', borderTop: `1px solid ${C.border}`,
        background: C.bg, flexShrink: 0, position: 'relative',
      }}>
        {/* Slash launcher */}
        {slashQuery !== null && (
          <SlashLauncher
            query={slashQuery}
            activeIndex={slashIdx}
            onSelect={selectSlashCommand}
            onIndexChange={setSlashIdx}
          />
        )}

        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: C.card, border: `1px solid ${C.border2}`,
          borderRadius: 11, padding: '8px 8px 8px 12px',
          transition: 'border-color .15s',
        }}
          onFocus={() => {}} onBlur={() => {}}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={chat.streaming}
            placeholder={chat.streaming ? 'Generating response…' : hasMessages ? 'Ask a follow-up…' : 'Ask about your data privacy…'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: C.text, fontSize: 13, fontFamily: C.sans,
              padding: '5px 0', resize: 'none', lineHeight: 1.5,
              caretColor: slashQuery !== null ? C.accent : C.text,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 30, height: 30, borderRadius: 7, border: 'none', flexShrink: 0,
              background: canSend ? C.accent : C.border2,
              color: canSend ? C.bg : C.textGhost,
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 7, fontSize: 10.5, color: C.textGhost, padding: '0 2px',
        }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {!chat.streaming ? (
              <><Kbd>↵</Kbd> send · <Kbd>⇧↵</Kbd> new line</>
            ) : (
              <><span style={{ color: C.accent }}>●</span> Streaming · <Kbd>esc</Kbd> to stop</>
            )}
          </div>
          <div>Powered by DataGuard AI · {eventContextLine}</div>
        </div>
      </div>
    </div>
  );

  // ── Page mode: just return the panel content ──────────────────────────────
  if (isPage) {
    return panelContent;
  }

  // ── Panel mode: FAB + floating panel ─────────────────────────────────────
  if (isOnChatPage) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28,
      zIndex: 9999, display: 'flex', flexDirection: 'column',
      alignItems: 'flex-end', gap: 14,
    }}>
      {open && (
        <div className="dg-panel" style={{ width: 440, height: 720, transformOrigin: 'bottom right' }}>
          {panelContent}
        </div>
      )}

      {/* FAB */}
      <div style={{ position: 'relative' }}>
        {!open && (
          <div style={{
            position: 'absolute', inset: '-4px', borderRadius: '50%',
            background: 'rgba(99,102,241,0.2)',
            animation: 'pulseRing 2.2s ease-out infinite',
          }} />
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Close AI chat' : 'Open DataGuard AI'}
          style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none',
            cursor: 'pointer', position: 'relative', zIndex: 1,
            background: open
              ? 'linear-gradient(135deg, #ef4444, #f97316)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: open ? '0 8px 24px rgba(239,68,68,0.4)' : '0 8px 28px rgba(99,102,241,0.5)',
            transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Utility components ────────────────────────────────────────────────────────

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: 7, background: 'transparent',
        border: '1px solid transparent', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: C.textMute, cursor: 'pointer', transition: 'all .15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#18181b';
        (e.currentTarget as HTMLButtonElement).style.color = C.text;
        (e.currentTarget as HTMLButtonElement).style.borderColor = C.border2;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = C.textMute;
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      padding: '1px 5px', background: '#18181b', border: `1px solid ${C.border2}`,
      borderRadius: 4, fontSize: 10, color: C.textDim, fontFamily: C.mono, lineHeight: 1.2,
    }}>{children}</kbd>
  );
}

// ── Empty state icons ─────────────────────────────────────────────────────────

function QuestionIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>;
}
function AlertIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function ChatIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function InfoIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
}

// re-export C for AIChatPage
export { C as CHAT_COLORS };
