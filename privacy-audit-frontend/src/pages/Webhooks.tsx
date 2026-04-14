import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { dashboardApi } from '../api/client';

interface Webhook {
  id: string;
  url: string;
  triggerOn: string;
  createdAt: string;
}

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [url, setUrl] = useState('');
  const [triggerOn, setTriggerOn] = useState('ALL_RISK');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setFetchLoading(true);
    try {
      const data = await dashboardApi.getWebhooks();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch { setWebhooks([]); }
    finally { setFetchLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!url.trim()) return;
    setError('');
    setLoading(true);
    setNewSecret(null);
    try {
      const result = await dashboardApi.addWebhook(url.trim(), triggerOn);
      setNewSecret(result.signingSecret);
      setUrl('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to register webhook.');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await dashboardApi.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch { /* silently handle */ }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, md: 4 }, py: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
        Webhook Management
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
        Register endpoints to receive HMAC-signed POST notifications when HIGH or CRITICAL risk alerts are detected.
        Verify the <code>X-Signature-256</code> header using your signing secret.
      </Typography>

      {/* Add webhook form */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Register a new webhook</Typography>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
        {newSecret && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }}>
            <Box>
              Webhook registered! Store your signing secret — it will not be shown again:
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                  {newSecret}
                </code>
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(newSecret)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Endpoint URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 240 }}
            placeholder="https://your-server.com/webhook"
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Trigger on</InputLabel>
            <Select value={triggerOn} onChange={(e) => setTriggerOn(e.target.value)} label="Trigger on">
              <MenuItem value="ALL_RISK">All risk alerts</MenuItem>
              <MenuItem value="HIGH_RISK">HIGH + CRITICAL</MenuItem>
              <MenuItem value="CRITICAL_RISK">CRITICAL only</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={loading || !url.trim()}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Register
          </Button>
        </Box>
      </Paper>

      {/* Webhook list */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
          Active webhooks {!fetchLoading && `(${webhooks.length})`}
        </Typography>
        {fetchLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : webhooks.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>
            No webhooks registered yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {webhooks.map((w) => (
              <Box
                key={w.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.url}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip label={w.triggerOn.replace('_', ' ')} size="small" sx={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.65rem', height: 18 }} />
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {new Date(w.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Delete webhook">
                  <IconButton size="small" color="error" onClick={() => handleDelete(w.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
