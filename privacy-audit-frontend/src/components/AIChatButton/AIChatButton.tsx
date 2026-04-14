import { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import { AutoAwesome as AutoAwesomeIcon, Close as CloseIcon, Send as SendIcon, Shield as ShieldIcon } from '@mui/icons-material';
import { dashboardApi } from '../../api/client';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const WELCOME: Message = {
  role: 'ai',
  text: "Hi! I'm DataGuard AI. I can help you understand your recent privacy data activity. What would you like to know?",
};

export default function AIChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [providerLabel, setProviderLabel] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const res = await dashboardApi.aiChat(text, sessionId);
      setSessionId(res.sessionId);
      setProviderLabel(`${res.provider} / ${res.model}`);
      setMessages((prev) => [...prev, { role: 'ai', text: res.reply }]);
    } catch {
      setMessages((prev) => [
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

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
      }}
    >
      {/* Chat panel */}
      <Collapse in={open} timeout={300} unmountOnExit>
        <Box
          className="anim-slide-right"
          sx={{
            width: 360,
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            border: '1px solid rgba(99,102,241,0.2)',
            background: '#fff',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              px: 2.5,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(56,189,248,0.4)', flexShrink: 0,
              }}
            >
              <ShieldIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>
                DataGuard AI
              </Typography>
              <Box className="flex items-center gap-1">
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 5px #22c55e' }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                  {providerLabel ? providerLabel : 'Online'}
                </Typography>
              </Box>
            </Box>

            <Chip
              label="AI"
              size="small"
              sx={{ backgroundColor: 'rgba(99,102,241,0.25)', color: '#a5b4fc', fontSize: '0.65rem', fontWeight: 700, height: 20 }}
            />
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box sx={{ height: 300, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f8fafc' }}>
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'ai' && (
                  <Box
                    sx={{
                      width: 26, height: 26, borderRadius: '8px',
                      background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mr: 1, flexShrink: 0, mt: 0.3,
                    }}
                  >
                    <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 14 }} />
                  </Box>
                )}
                <Box
                  sx={{
                    maxWidth: '80%',
                    px: 1.8, py: 1.2,
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: msg.role === 'ai' ? '1px solid #e2e8f0' : 'none',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: msg.role === 'user' ? '#fff' : '#1e293b', fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}
                  >
                    {msg.text}
                  </Typography>
                </Box>
              </Box>
            ))}

            {/* Typing indicator */}
            {sending && (
              <Box className="flex items-center gap-2">
                <Box
                  sx={{
                    width: 26, height: 26, borderRadius: '8px',
                    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 14 }} />
                </Box>
                <Box sx={{ px: 1.8, py: 1.2, borderRadius: '16px 16px 16px 4px', background: '#fff', border: '1px solid #e2e8f0' }}>
                  <Box className="flex gap-1 items-center" sx={{ py: 0.3 }}>
                    {[0, 1, 2].map((i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 6, height: 6, borderRadius: '50%', backgroundColor: '#94a3b8',
                          animation: `floatY 1.2s ease-in-out ${i * 200}ms infinite`,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}

            <div ref={bottomRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 1.5, borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            <Box className="flex items-center gap-1.5">
              <TextField
                fullWidth
                size="small"
                multiline
                maxRows={3}
                placeholder="Ask about your data privacy…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    backgroundColor: '#f8fafc',
                  },
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={!input.trim() || sending}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                  '&.Mui-disabled': { background: 'linear-gradient(135deg, #c7d2fe, #ddd6fe)', color: '#fff' },
                  '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
                }}
              >
                {sending
                  ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                  : <SendIcon sx={{ fontSize: 16 }} />
                }
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block', textAlign: 'center', mt: 0.8 }}>
              Powered by DataGuard AI — your data stays private
            </Typography>
          </Box>
        </Box>
      </Collapse>

      {/* FAB */}
      <Tooltip title={open ? '' : 'Ask DataGuard AI'} placement="left">
        <Box sx={{ position: 'relative' }}>
          {!open && (
            <Box
              sx={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                backgroundColor: '#6366f1', animation: 'pulseRing 2s ease-out infinite',
              }}
            />
          )}
          <Box
            onClick={() => setOpen((v) => !v)}
            className="cursor-pointer"
            sx={{
              width: 56, height: 56, borderRadius: '50%',
              background: open
                ? 'linear-gradient(135deg, #ef4444, #f97316)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.45)',
              transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              '&:hover': { transform: 'scale(1.1)', boxShadow: '0 12px 32px rgba(99,102,241,0.55)' },
              position: 'relative', zIndex: 1,
            }}
          >
            {open
              ? <CloseIcon sx={{ color: '#fff', fontSize: 22 }} />
              : <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 22 }} />
            }
          </Box>
        </Box>
      </Tooltip>
    </Box>
  );
}
