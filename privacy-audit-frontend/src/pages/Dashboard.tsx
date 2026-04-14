import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StatsBar from '../components/StatsBar/StatsBar';
import SensitivityChart from '../components/SensitivityChart/SensitivityChart';
import DataFieldsChart from '../components/DataFieldsChart/DataFieldsChart';
import EventFeed from '../components/EventFeed/EventFeed';
import AIChatButton from '../components/AIChatButton/AIChatButton';
import TenantTabs from '../components/TenantTabs/TenantTabs';
import { dashboardApi } from '../api/client';
import type { AuditEvent, TenantFilter } from '../types';

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

interface RiskAlert {
  id: string;
  severity: string;
  title: string;
  description: string;
  suggestedAction: string;
  affectedEventCount: number;
  analysedAt: string;
}

export default function Dashboard() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TenantFilter>('all');

  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ id: string; status: string } | null>(null);

  // Deletion state
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ id: string; status: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsData, alertsData] = await Promise.all([
        dashboardApi.getEvents(),
        dashboardApi.getRiskAlerts(),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setRiskAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch {
      setError('Failed to load your privacy data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Tenant tab filtering ─────────────────────────────────────────────────
  const tenantIds = [...new Set(events.map((e) => e.tenantId))];
  const tenantSlugMap: Record<string, string> = {};
  events.forEach((e) => {
    const slug = e.tenantId?.includes('health') ? 'health' : 'social';
    tenantSlugMap[e.tenantId] = slug;
  });

  const filtered =
    tab === 'all'
      ? events
      : events.filter((e) => tenantSlugMap[e.tenantId] === tab);

  const counts = {
    all: events.length,
    health: events.filter((e) => tenantSlugMap[e.tenantId] === 'health').length,
    social: events.filter((e) => tenantSlugMap[e.tenantId] === 'social').length,
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await dashboardApi.requestExport();
      setExportStatus({ id: res.requestId, status: res.status });

      // Poll for completion
      const poll = setInterval(async () => {
        const status = await dashboardApi.getExportStatus(res.requestId);
        setExportStatus({ id: res.requestId, status: status.status });
        if (status.status === 'completed') {
          clearInterval(poll);
          // Trigger download
          const a = document.createElement('a');
          a.href = `/api/dashboard/exports/${res.requestId}/download`;
          a.download = `privacy-export-${res.requestId}.json`;
          a.click();
        }
        if (status.status === 'failed') clearInterval(poll);
      }, 2000);
    } catch {
      setExportStatus(null);
    } finally {
      setExportLoading(false);
    }
  };

  // ── Deletion ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteConfirm(false);
    setDeleteLoading(true);
    try {
      const res = await dashboardApi.requestDeletion();
      setDeleteStatus({ id: res.requestId, status: res.status });

      const poll = setInterval(async () => {
        const status = await dashboardApi.getDeletionStatus(res.requestId);
        setDeleteStatus({ id: res.requestId, status: status.status });
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(poll);
          if (status.status === 'completed') {
            setEvents([]);
            setRiskAlerts([]);
          }
        }
      }, 2000);
    } catch {
      setDeleteStatus(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={44} thickness={4} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #f1f5f9 100%)',
      }}
    >
      <TenantTabs value={tab} onChange={setTab} counts={counts} />

      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Page title */}
        <Box className="anim-fade-up delay-0" sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.15 }}
          >
            Your{' '}
            <span className="gradient-text">Privacy</span>{' '}
            Overview
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>
            A complete record of how your personal data has been accessed across all connected apps.
          </Typography>
        </Box>

        {/* Stats */}
        <Box className="anim-fade-up delay-1" sx={{ mb: 4 }}>
          <StatsBar events={filtered} />
        </Box>

        {/* Charts */}
        <Box
          className="anim-fade-up delay-2"
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}
        >
          <SensitivityChart events={filtered} />
          <DataFieldsChart events={filtered} />
        </Box>

        {/* AI Risk Alerts */}
        {riskAlerts.length > 0 && (
          <Box className="anim-fade-up delay-3" sx={{ mb: 4 }}>
            <Paper
              elevation={0}
              sx={{ borderRadius: 3, border: '1px solid #fee2e2', background: '#fff7f7', p: 3 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <WarningAmberIcon sx={{ color: '#ef4444', fontSize: 22 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  AI Privacy Risk Alerts
                </Typography>
                <Chip
                  label={riskAlerts.length}
                  size="small"
                  sx={{ background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.72rem' }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {riskAlerts.map((alert) => (
                  <Box
                    key={alert.id}
                    sx={{
                      borderLeft: `4px solid ${SEVERITY_COLOR[alert.severity] ?? '#94a3b8'}`,
                      pl: 2,
                      py: 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={alert.severity}
                        size="small"
                        sx={{
                          background: SEVERITY_COLOR[alert.severity] ?? '#94a3b8',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          height: 20,
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {alert.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#475569', mb: 0.5 }}>
                      {alert.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Suggested: {alert.suggestedAction}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Event feed */}
        <Box className="anim-fade-up delay-3" sx={{ mb: 4 }}>
          <EventFeed events={filtered} />
        </Box>

        {/* GDPR Controls */}
        <Box className="anim-fade-up delay-4">
          <Paper
            elevation={0}
            sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
              Your GDPR Rights
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Exercise your rights under the General Data Protection Regulation.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>

              {/* Article 20 — Export */}
              <Box sx={{ flex: 1, p: 2.5, borderRadius: 2, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Article 20 — Data Portability
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                  Download a copy of all your privacy audit records in JSON format.
                </Typography>
                {exportStatus && (
                  <Alert
                    severity={exportStatus.status === 'failed' ? 'error' : exportStatus.status === 'completed' ? 'success' : 'info'}
                    sx={{ mb: 1.5, py: 0.5, borderRadius: 1.5 }}
                  >
                    Export: {exportStatus.status}
                  </Alert>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={exportLoading ? <CircularProgress size={14} /> : <DownloadIcon />}
                  onClick={handleExport}
                  disabled={exportLoading || exportStatus?.status === 'processing'}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Export my data
                </Button>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

              {/* Article 17 — Deletion */}
              <Box sx={{ flex: 1, p: 2.5, borderRadius: 2, background: '#fef2f2', border: '1px solid #fee2e2' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#dc2626' }}>
                  Article 17 — Right to Erasure
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                  Permanently delete all your privacy audit data. This action cannot be undone.
                </Typography>
                {deleteStatus && (
                  <Alert
                    severity={deleteStatus.status === 'failed' ? 'error' : deleteStatus.status === 'completed' ? 'success' : 'warning'}
                    sx={{ mb: 1.5, py: 0.5, borderRadius: 1.5 }}
                  >
                    Deletion: {deleteStatus.status}
                  </Alert>
                )}
                {!deleteConfirm ? (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteForeverIcon />}
                    onClick={() => setDeleteConfirm(true)}
                    disabled={deleteLoading || deleteStatus?.status === 'processing'}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Request erasure
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="error"
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Confirm delete
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setDeleteConfirm(false)}
                      sx={{ textTransform: 'none', color: '#64748b' }}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        </Box>

      </Box>

      <AIChatButton />
    </Box>
  );
}
