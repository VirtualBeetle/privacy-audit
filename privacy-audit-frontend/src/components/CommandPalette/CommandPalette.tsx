import { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';
import { devApi } from '../../api/client';

const STYLE_ID = 'dg-cmdk-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes dg-cmd-in  { from { opacity:0; transform:scale(.96) translateY(-6px); } to { opacity:1; transform:scale(1) translateY(0); } }
    [cmdk-overlay]  { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:99990; display:flex; align-items:flex-start; justify-content:center; padding-top:15vh; }
    [cmdk-root]     { background:#111113; border:1px solid #2a2a30; border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,0.6); width:520px; max-width:90vw; overflow:hidden; animation:dg-cmd-in .18s ease; }
    [cmdk-input]    { width:100%; padding:16px 18px; background:transparent; border:none; border-bottom:1px solid #1f1f23; outline:none; color:#fafafa; font-size:14px; font-family:"DM Sans",system-ui,sans-serif; }
    [cmdk-input]::placeholder { color:#52525b; }
    [cmdk-list]     { max-height:360px; overflow-y:auto; padding:6px; }
    [cmdk-group]    { margin-bottom:4px; }
    [cmdk-group-heading] { padding:8px 10px 4px; font-size:10.5px; font-weight:700; color:#52525b; text-transform:uppercase; letter-spacing:0.5px; }
    [cmdk-item]     { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:8px; cursor:pointer; font-size:13px; color:#d4d4d8; transition:background .1s; }
    [cmdk-item][aria-selected=true] { background:#1a1a1f; color:#fafafa; }
    [cmdk-empty]    { padding:20px; text-align:center; font-size:13px; color:#52525b; }
    [cmdk-separator]{ height:1px; background:#1f1f23; margin:4px 0; }
  `;
  document.head.appendChild(el);
}

interface CommandItem {
  id: string;
  label: string;
  sub?: string;
  group: string;
  icon: string;
  action: () => void;
  kbd?: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-dashboard',  label: 'Go to Dashboard',      group: 'Navigate', icon: '⊞', action: () => { navigate('/dashboard'); close(); } },
    { id: 'nav-events',     label: 'Go to Events',         group: 'Navigate', icon: '⚡', action: () => { navigate('/events'); close(); } },
    { id: 'nav-risk',       label: 'Go to Risk Alerts',    group: 'Navigate', icon: '🛡', action: () => { navigate('/risk'); close(); } },
    { id: 'nav-gdpr',       label: 'Go to GDPR Rights',    group: 'Navigate', icon: '⚖', action: () => { navigate('/gdpr'); close(); } },
    { id: 'nav-ai-chat',    label: 'Open AI Chat',         group: 'Navigate', icon: '🤖', action: () => { navigate('/ai-chat'); close(); }, kbd: '⌘ /' },
    { id: 'nav-webhooks',   label: 'Go to Webhooks',       group: 'Navigate', icon: '↗', action: () => { navigate('/webhooks'); close(); } },
    { id: 'nav-queue',      label: 'Go to Queue Monitor',  group: 'Navigate', icon: '⏳', action: () => { navigate('/queue'); close(); } },
    { id: 'nav-settings',   label: 'Go to Settings',       group: 'Navigate', icon: '⚙', action: () => { navigate('/settings'); close(); } },
    // Actions
    {
      id: 'action-analysis',
      label: 'Run AI Risk Analysis Now',
      sub: 'Triggers immediate AI analysis for all tenants',
      group: 'Actions',
      icon: '▶',
      action: async () => {
        close();
        toast.info('Running AI risk analysis…');
        try {
          const token = localStorage.getItem('dev_token') || (import.meta as any).env?.VITE_DEV_TOKEN || '';
          await devApi.triggerRiskAnalysis(token);
          toast.success('Risk analysis complete — check Risk Alerts');
        } catch {
          toast.error('Analysis failed — check Dev token in settings');
        }
      },
    },
    {
      id: 'action-verify',
      label: 'Verify Hash Chain Integrity',
      sub: 'SHA-256 chain verification via AI Chat',
      group: 'Actions',
      icon: '🔗',
      action: () => { navigate('/ai-chat'); close(); setTimeout(() => window.dispatchEvent(new CustomEvent('dg-slash-cmd', { detail: '/verify ' })), 300); },
    },
    {
      id: 'action-report',
      label: 'Generate Compliance Report',
      sub: '30-day compliance summary via AI Chat',
      group: 'Actions',
      icon: '📋',
      action: () => { navigate('/ai-chat'); close(); setTimeout(() => window.dispatchEvent(new CustomEvent('dg-slash-cmd', { detail: '/report ' })), 300); },
    },
    {
      id: 'action-compare',
      label: 'Compare Week-over-Week',
      sub: 'Privacy posture comparison via AI Chat',
      group: 'Actions',
      icon: '📊',
      action: () => { navigate('/ai-chat'); close(); setTimeout(() => window.dispatchEvent(new CustomEvent('dg-slash-cmd', { detail: '/compare ' })), 300); },
    },
  ];

  const groups = [...new Set(commands.map(c => c.group))];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(v => !v);
    }
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div cmdk-overlay="" onClick={close}>
      <div onClick={e => e.stopPropagation()}>
        <Command cmdk-root="" label="Command palette" shouldFilter>
          <Command.Input cmdk-input="" placeholder="Search pages, events, actions…" autoFocus />
          <Command.List cmdk-list="">
            <Command.Empty cmdk-empty="">No results found.</Command.Empty>
            {groups.map(group => (
              <Command.Group key={group} heading={group} cmdk-group="">
                {commands.filter(c => c.group === group).map(cmd => (
                  <Command.Item key={cmd.id} value={`${cmd.label} ${cmd.sub ?? ''}`} onSelect={cmd.action} cmdk-item="">
                    <span style={{ fontSize: 15, flexShrink: 0, width: 22, textAlign: 'center' }}>{cmd.icon}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{cmd.label}</span>
                      {cmd.sub && <span style={{ fontSize: 11, color: '#71717a' }}>{cmd.sub}</span>}
                    </span>
                    {cmd.kbd && <kbd style={{ padding: '2px 6px', background: '#1f1f23', border: '1px solid #27272a', borderRadius: 5, fontSize: 10, color: '#a1a1aa', fontFamily: 'monospace' }}>{cmd.kbd}</kbd>}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div style={{ padding: '8px 14px', borderTop: '1px solid #1f1f23', display: 'flex', gap: 14, fontSize: 10.5, color: '#52525b' }}>
            {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([k, l]) => (
              <span key={k} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <kbd style={{ padding: '1px 5px', background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 9, color: '#a1a1aa', fontFamily: 'monospace' }}>{k}</kbd> {l}
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>⌘K to toggle</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
