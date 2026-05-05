import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteOutlineIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import KeyIcon from '@mui/icons-material/Key';
import { devApi } from '../api/client';

type AiProvider = 'gemini' | 'claude' | 'openai';

interface ProviderRecord {
  _id: string;
  provider: AiProvider;
  label: string;
  model: string;
  isActive: boolean;
  updatedBy: string;
  createdAt: string;
}

const PROVIDER_META: Record<AiProvider, { name: string; color: string; bg: string; models: string[] }> = {
  gemini: {
    name: 'Google Gemini',
    color: '#0369a1',
    bg: '#e0f2fe',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  },
  claude: {
    name: 'Anthropic Claude',
    color: '#7c3aed',
    bg: '#ede9fe',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
  },
  openai: {
    name: 'OpenAI',
    color: '#15803d',
    bg: '#dcfce7',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
};

export default function AISettings() {
  const [devToken, setDevToken] = useState(() => localStorage.getItem('dev_token') ?? '');
  const [tokenSaved, setTokenSaved] = useState(!!localStorage.getItem('dev_token'));
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [activeInfo, setActiveInfo] = useState<{ active: boolean; provider?: string; model?: string; label?: string; fallback?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Add form state
  const [newProvider, setNewProvider] = useState<AiProvider>('gemini');
  const [newLabel, setNewLabel] = useState('');
  const [newModel, setNewModel] = useState(PROVIDER_META.gemini.models[0]);
  const [newApiKey, setNewApiKey] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    if (!tokenSaved) return;
    setLoading(true);
    setError('');
    try {
      const [list, active] = await Promise.all([
        devApi.listAiProviders(devToken),
        devApi.getActiveAiProvider(devToken),
      ]);
      setProviders(list);
      setActiveInfo(active);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load providers — check dev token');
    } finally {
      setLoading(false);
    }
  }, [tokenSaved, devToken]);

  useEffect(() => { load(); }, [load]);

  const saveToken = () => {
    localStorage.setItem('dev_token', devToken);
    setTokenSaved(true);
  };

  const handleActivate = async (id: string) => {
    setActivating(id);
    try {
      await devApi.activateAiProvider(devToken, id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to activate');
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await devApi.deleteAiProvider(devToken, id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !newApiKey.trim()) {
      setAddError('Label and API key are required');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      await devApi.addAiProvider(devToken, { provider: newProvider, label: newLabel, model: newModel, apiKey: newApiKey });
      setShowAddForm(false);
      setNewLabel('');
      setNewApiKey('');
      setNewProvider('gemini');
      setNewModel(PROVIDER_META.gemini.models[0]);
      await load();
    } catch (e: any) {
      setAddError(e?.response?.data?.message ?? 'Failed to add provider');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: 3, py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <PsychologyIcon sx={{ color: '#6366f1', fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            AI Provider Settings
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Manage which AI model powers risk analysis and chat — stored securely in MongoDB, switchable at any time.
          </Typography>
        </Box>
      </Box>

      {/* Dev token gate */}
      {!tokenSaved && (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <KeyIcon sx={{ color: '#6366f1', fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Enter Dev Token</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
            Set <code>DEV_TOKEN</code> in your Render audit-backend env. Enter the same value here.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              type="password"
              placeholder="dev token"
              value={devToken}
              onChange={(e) => setDevToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveToken()}
              sx={{ flex: 1 }}
            />
            <Button variant="contained" onClick={saveToken} disabled={!devToken.trim()}
              sx={{ textTransform: 'none', fontWeight: 700, background: '#6366f1', '&:hover': { background: '#4f46e5' } }}>
              Unlock
            </Button>
          </Box>
        </Paper>
      )}

      {tokenSaved && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button size="small" variant="text" sx={{ textTransform: 'none', color: '#94a3b8', fontSize: '0.72rem' }}
            onClick={() => { localStorage.removeItem('dev_token'); setTokenSaved(false); setDevToken(''); setProviders([]); setActiveInfo(null); }}>
            Clear token
          </Button>
        </Box>
      )}

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Active provider banner */}
      {activeInfo && (
        <Paper elevation={0} sx={{
          border: `2px solid ${activeInfo.active ? '#86efac' : '#e2e8f0'}`,
          borderRadius: 3, p: 2.5, mb: 3,
          background: activeInfo.active ? '#f0fdf4' : '#f8fafc',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircleIcon sx={{ color: activeInfo.active ? '#16a34a' : '#94a3b8', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                {activeInfo.active
                  ? `Active: ${activeInfo.label ?? activeInfo.provider} — ${activeInfo.model}`
                  : 'No DB provider active'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {activeInfo.active
                  ? `All AI calls (risk analysis, chat) are routed to ${PROVIDER_META[activeInfo.provider as AiProvider]?.name ?? activeInfo.provider}.`
                  : activeInfo.fallback ?? 'AI features will use env var fallback or fail.'}
              </Typography>
            </Box>
            {activeInfo.active && activeInfo.provider && (
              <Chip
                label={PROVIDER_META[activeInfo.provider as AiProvider]?.name ?? activeInfo.provider}
                size="small"
                sx={{
                  background: PROVIDER_META[activeInfo.provider as AiProvider]?.bg,
                  color: PROVIDER_META[activeInfo.provider as AiProvider]?.color,
                  fontWeight: 700,
                }}
              />
            )}
          </Box>
        </Paper>
      )}

      {/* Provider list */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Configured Providers {providers.length > 0 && `(${providers.length})`}
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddForm((v) => !v)}
            sx={{ textTransform: 'none', fontWeight: 700, background: '#6366f1', '&:hover': { background: '#4f46e5' } }}
          >
            Add Provider
          </Button>
        </Box>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>}

        {!loading && providers.length === 0 && (
          <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>
            No providers configured yet. Add one below.
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {providers.map((p) => {
            const meta = PROVIDER_META[p.provider];
            return (
              <Box key={p._id} sx={{
                display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2,
                border: `1px solid ${p.isActive ? '#86efac' : '#e2e8f0'}`,
                background: p.isActive ? '#f0fdf4' : '#fafafa',
              }}>
                {/* Active indicator */}
                {p.isActive
                  ? <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 20, flexShrink: 0 }} />
                  : <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1', fontSize: 20, flexShrink: 0 }} />
                }

                {/* Provider info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {p.label}
                    </Typography>
                    <Chip
                      label={meta?.name ?? p.provider}
                      size="small"
                      sx={{ background: meta?.bg, color: meta?.color, fontWeight: 700, fontSize: '0.65rem' }}
                    />
                    {p.isActive && (
                      <Chip label="ACTIVE" size="small" sx={{ background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: '0.62rem' }} />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                    {p.model}
                  </Typography>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  {!p.isActive && (
                    <Tooltip title="Make this the active provider for all AI calls">
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={activating === p._id}
                        onClick={() => handleActivate(p._id)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#6366f1', color: '#6366f1', fontSize: '0.72rem' }}
                      >
                        {activating === p._id ? <CircularProgress size={14} /> : 'Activate'}
                      </Button>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete this provider">
                    <Button
                      size="small"
                      variant="text"
                      disabled={deleting === p._id}
                      onClick={() => handleDelete(p._id)}
                      sx={{ color: '#ef4444', minWidth: 36 }}
                    >
                      {deleting === p._id ? <CircularProgress size={14} /> : <DeleteOutlineIcon fontSize="small" />}
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Add provider form */}
        {showAddForm && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Add New Provider</Typography>
            {addError && <Alert severity="error" sx={{ mb: 1.5 }}>{addError}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Provider</InputLabel>
                  <Select
                    value={newProvider}
                    label="Provider"
                    onChange={(e) => {
                      const p = e.target.value as AiProvider;
                      setNewProvider(p);
                      setNewModel(PROVIDER_META[p].models[0]);
                    }}
                  >
                    <MenuItem value="gemini">Google Gemini (free tier available)</MenuItem>
                    <MenuItem value="claude">Anthropic Claude</MenuItem>
                    <MenuItem value="openai">OpenAI</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select value={newModel} label="Model" onChange={(e) => setNewModel(e.target.value)}>
                    {PROVIDER_META[newProvider].models.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <TextField
                size="small"
                label="Label (e.g. Gemini Flash — demo)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                label="API Key"
                type="password"
                placeholder={newProvider === 'gemini' ? 'AIza...' : newProvider === 'claude' ? 'sk-ant-...' : 'sk-...'}
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                fullWidth
                helperText={
                  newProvider === 'gemini'
                    ? 'Get a free key at aistudio.google.com → Get API key'
                    : newProvider === 'claude'
                    ? 'Get key at console.anthropic.com'
                    : 'Get key at platform.openai.com'
                }
              />
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="contained"
                  disabled={adding}
                  onClick={handleAdd}
                  sx={{ textTransform: 'none', fontWeight: 700, background: '#6366f1', '&:hover': { background: '#4f46e5' } }}
                >
                  {adding ? <CircularProgress size={16} color="inherit" /> : 'Add & Save'}
                </Button>
                <Button variant="text" onClick={() => { setShowAddForm(false); setAddError(''); }}
                  sx={{ textTransform: 'none', color: '#64748b' }}>
                  Cancel
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Paper>

      {/* How it works */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3, background: '#f8fafc' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>How it works</Typography>
        <Box component="ol" sx={{ pl: 2, m: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[
            'Add one or more providers with their API keys — keys are AES-256-GCM encrypted before storing in MongoDB.',
            'Click "Activate" on the provider you want to use. All others are automatically deactivated.',
            'Every AI call (risk analysis cron, AI chat) reads the active provider from DB — no redeploy needed.',
            'If no DB provider is active, the service falls back to GEMINI_API_KEY or ANTHROPIC_API_KEY env vars.',
          ].map((step, i) => (
            <Typography key={i} component="li" variant="caption" sx={{ color: '#475569' }}>
              {step}
            </Typography>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
