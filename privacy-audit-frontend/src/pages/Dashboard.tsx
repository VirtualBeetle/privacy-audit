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
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MobileStepper from '@mui/material/MobileStepper';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PsychologyIcon from '@mui/icons-material/Psychology';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
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

interface AnalysisFinding {
  severity: string;
  title: string;
  description: string;
  suggestedAction: string;
  affectedEventCount: number;
}

interface AnalysisRecord {
  _id: string;
  provider: string;
  aiModel: string;
  eventCount: number;
  findings: AnalysisFinding[];
  createdAt: string;
  periodStart: string;
  periodEnd: string;
}

interface BreachReport {
  id: string;
  description: string;
  severity: string;
  reportedAt: string;
  notifyDeadline: string;
  regulatorNotified: boolean;
  hoursRemaining: number;
  deadlineExceeded: boolean;
}

interface PrivacyScore {
  score: number;
  grade: string;
  breakdown: Record<string, number>;
  totalEvents: number;
}

export default function Dashboard() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([]);
  const [privacyScore, setPrivacyScore] = useState<PrivacyScore | null>(null);
  const [breachReports, setBreachReports] = useState<BreachReport[]>([]);
  const [breachInput, setBreachInput] = useState('');
  const [breachLoading, setBreachLoading] = useState(false);
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
      const [eventsData, alertsData, analysisData, scoreData, breachData] = await Promise.all([
        dashboardApi.getEvents(),
        dashboardApi.getRiskAlerts(),
        dashboardApi.getAnalysisHistory().catch(() => []),
        dashboardApi.getPrivacyScore().catch(() => null),
        dashboardApi.getBreachReports().catch(() => []),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setRiskAlerts(Array.isArray(alertsData) ? alertsData : []);
      setAnalysisHistory(Array.isArray(analysisData) ? analysisData : []);
      setPrivacyScore(scoreData);
      setBreachReports(Array.isArray(breachData) ? breachData : []);
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

  // ── Breach report ────────────────────────────────────────────────────────
  const handleReportBreach = async () => {
    if (!breachInput.trim()) return;
    setBreachLoading(true);
    try {
      const report = await dashboardApi.reportBreach(breachInput.trim());
      setBreachReports((prev) => [report, ...prev]);
      setBreachInput('');
    } catch { /* silently handle */ }
    finally { setBreachLoading(false); }
  };

  const handleNotifyRegulator = async (id: string) => {
    try {
      const updated = await dashboardApi.notifyRegulator(id);
      setBreachReports((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
    } catch { /* silently handle */ }
  };

  // ── Demo Tour ────────────────────────────────────────────────────────────
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const TOUR_STEPS = [
    {
      emoji: '📊',
      title: 'Stats Overview',
      description:
        'The cards at the top show at a glance: how many events were logged, how many involved sensitive data, third-party sharing, and consent rate. These numbers update live as your tenants send events.',
    },
    {
      emoji: '🥧',
      title: 'Sensitivity & Data Field Charts',
      description:
        'The donut chart breaks your events by sensitivity level (LOW → CRITICAL). The bar chart shows which personal data fields (email, location, biometrics…) are accessed most — useful for identifying data minimisation opportunities.',
    },
    {
      emoji: '🚨',
      title: 'AI Privacy Risk Alerts',
      description:
        'Every 6 hours Claude analyses your latest events and flags patterns that may indicate GDPR violations — missing consent, excessive third-party sharing, unusual data access. HIGH and CRITICAL alerts also trigger an email notification.',
    },
    {
      emoji: '📋',
      title: 'Audit Event Feed',
      description:
        'A tamper-evident chronological log of every data access event sent by your tenant apps. Each event has a SHA-256 hash chained to the previous one — any modification breaks the chain, proving integrity.',
    },
    {
      emoji: '🤖',
      title: 'AI Chat Assistant',
      description:
        'Click the purple chat button (bottom-right) to ask questions about your privacy data. The AI has full context of your recent events and risk alerts. Sessions are saved so you can continue conversations later.',
    },
    {
      emoji: '⚖️',
      title: 'GDPR Rights',
      description:
        'At the bottom you can exercise Article 20 (Data Portability — download a JSON export) and Article 17 (Right to Erasure — permanently delete all your records). Deletion generates a cryptographic evidence hash for compliance.',
    },
  ];

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

        {/* Privacy Health Score */}
        {privacyScore && (
          <Box className="anim-fade-up delay-1" sx={{ mb: 4 }}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                {/* Score circle */}
                <Box sx={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={privacyScore.score >= 75 ? '#22c55e' : privacyScore.score >= 50 ? '#eab308' : '#ef4444'}
                      strokeWidth="3.5"
                      strokeDasharray={`${privacyScore.score} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1, color: '#0f172a' }}>
                      {privacyScore.score}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>/ 100</Typography>
                  </Box>
                </Box>
                {/* Score details */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      Privacy Health Score
                    </Typography>
                    <Chip
                      label={`Grade ${privacyScore.grade}`}
                      size="small"
                      sx={{
                        background: privacyScore.score >= 75 ? '#dcfce7' : privacyScore.score >= 50 ? '#fef9c3' : '#fee2e2',
                        color: privacyScore.score >= 75 ? '#15803d' : privacyScore.score >= 50 ? '#a16207' : '#b91c1c',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
                    Based on {privacyScore.totalEvents} events analysed across consent, opt-out, third-party sharing, and sensitivity.
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(privacyScore.breakdown).map(([key, pts]) => (
                      <Chip
                        key={key}
                        label={`${key.replace(/([A-Z])/g, ' $1').trim()}: ${pts}pts`}
                        size="small"
                        sx={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>
                {/* Download PDF button */}
                <Tooltip title="Download GDPR Art.30 compliance report (PDF)">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    href="/api/dashboard/compliance-report/download"
                    target="_blank"
                    sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    PDF Report
                  </Button>
                </Tooltip>
              </Box>
            </Paper>
          </Box>
        )}

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

        {/* Breach Notification (GDPR Art.33) */}
        <Box className="anim-fade-up delay-3" sx={{ mb: 4 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #fde68a', background: '#fffbeb', p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Breach Notification (GDPR Art.33)
              </Typography>
              <Chip label="72h Simulation" size="small" sx={{ background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: '0.68rem' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Simulate reporting a data breach. GDPR Article 33 requires notifying the supervisory authority within 72 hours.
            </Typography>
            {/* Active breach banners */}
            {breachReports.filter((r) => !r.regulatorNotified).map((r) => (
              <Box
                key={r.id}
                sx={{
                  mb: 1.5,
                  p: 2,
                  borderRadius: 2,
                  background: r.deadlineExceeded ? '#fee2e2' : r.hoursRemaining < 12 ? '#fff7ed' : '#f0fdf4',
                  border: `1px solid ${r.deadlineExceeded ? '#fca5a5' : r.hoursRemaining < 12 ? '#fed7aa' : '#bbf7d0'}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', mb: 0.3 }}>
                      {r.description}
                    </Typography>
                    {r.deadlineExceeded ? (
                      <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                        DEADLINE EXCEEDED — notification overdue!
                      </Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: r.hoursRemaining < 12 ? '#c2410c' : '#15803d', fontWeight: 600 }}>
                        {r.hoursRemaining}h remaining to notify regulator
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleNotifyRegulator(r.id)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      background: '#0f172a',
                      '&:hover': { background: '#1e293b' },
                    }}
                  >
                    Notify Regulator
                  </Button>
                </Box>
              </Box>
            ))}
            {breachReports.filter((r) => r.regulatorNotified).map((r) => (
              <Box key={r.id} sx={{ mb: 1, p: 1.5, borderRadius: 2, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600 }}>
                  ✓ {r.description} — Regulator notified
                </Typography>
              </Box>
            ))}
            {/* New breach form */}
            <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
              <TextField
                placeholder="Describe the data breach…"
                value={breachInput}
                onChange={(e) => setBreachInput(e.target.value)}
                size="small"
                fullWidth
                sx={{ background: '#fff', borderRadius: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleReportBreach}
                disabled={breachLoading || !breachInput.trim()}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: '#f59e0b',
                  '&:hover': { background: '#d97706' },
                }}
              >
                {breachLoading ? <CircularProgress size={16} color="inherit" /> : 'Report Breach'}
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* Event feed */}
        <Box className="anim-fade-up delay-3" sx={{ mb: 4 }}>
          <EventFeed events={filtered} />
        </Box>

        {/* AI Analysis History */}
        {analysisHistory.length > 0 && (
          <Box className="anim-fade-up delay-4" sx={{ mb: 4 }}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <PsychologyIcon sx={{ color: '#6366f1', fontSize: 22 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  AI Analysis History
                </Typography>
                <Chip
                  label={analysisHistory.length}
                  size="small"
                  sx={{ background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.72rem' }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {analysisHistory.map((record) => (
                  <Accordion
                    key={record._id}
                    elevation={0}
                    sx={{ border: '1px solid #e2e8f0', borderRadius: '12px !important', '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                          {new Date(record.createdAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        <Chip label={record.provider} size="small" sx={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem', height: 20 }} />
                        <Chip label={record.aiModel} size="small" sx={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem', height: 20 }} />
                        <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto' }}>
                          {record.eventCount} events analysed · {record.findings?.length ?? 0} findings
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      {record.findings?.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {record.findings.map((f, i) => (
                            <Box
                              key={i}
                              sx={{ borderLeft: `4px solid ${SEVERITY_COLOR[f.severity] ?? '#94a3b8'}`, pl: 2, py: 0.5 }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Chip
                                  label={f.severity}
                                  size="small"
                                  sx={{ background: SEVERITY_COLOR[f.severity] ?? '#94a3b8', color: '#fff', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>{f.title}</Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: '#475569', mb: 0.5 }}>{f.description}</Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>Suggested: {f.suggestedAction}</Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>No findings for this analysis run.</Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Paper>
          </Box>
        )}

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

      {/* ── Demo Tour FAB ────────────────────────────────────────────────── */}
      <Tooltip title="Take a guided tour" placement="left">
        <Box
          onClick={() => { setTourStep(0); setTourOpen(true); }}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#fff',
            border: '2px solid #6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.25)',
            '&:hover': { background: '#f5f3ff' },
            zIndex: 1200,
          }}
        >
          <HelpOutlineIcon sx={{ color: '#6366f1', fontSize: 22 }} />
        </Box>
      </Tooltip>

      {/* ── Demo Tour Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 0, fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '1.4rem' }}>{TOUR_STEPS[tourStep].emoji}</span>
            {TOUR_STEPS[tourStep].title}
          </Box>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
            Step {tourStep + 1} of {TOUR_STEPS.length}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
            {TOUR_STEPS[tourStep].description}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', px: 3, pb: 2, pt: 0 }}>
          <MobileStepper
            variant="dots"
            steps={TOUR_STEPS.length}
            position="static"
            activeStep={tourStep}
            sx={{ width: '100%', background: 'transparent', p: 0, mb: 1.5 }}
            nextButton={
              tourStep < TOUR_STEPS.length - 1 ? (
                <Button
                  size="small"
                  onClick={() => setTourStep((s) => s + 1)}
                  endIcon={<KeyboardArrowRightIcon />}
                  sx={{ fontWeight: 600, textTransform: 'none' }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  size="small"
                  onClick={() => setTourOpen(false)}
                  sx={{ fontWeight: 700, textTransform: 'none', color: '#6366f1' }}
                >
                  Done
                </Button>
              )
            }
            backButton={
              <Button
                size="small"
                onClick={() => setTourStep((s) => s - 1)}
                disabled={tourStep === 0}
                startIcon={<KeyboardArrowLeftIcon />}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Back
              </Button>
            }
          />
        </DialogActions>
      </Dialog>
    </Box>
  );
}
