import axios from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach session token to every request if present.
// Does NOT overwrite an Authorization header already set in the request config
// (e.g. linkAccountWith passes a specific dashboard_session token).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the stale token so the user is redirected to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('session_token');
      localStorage.removeItem('session_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── Dashboard API helpers ──────────────────────────────────────────────────

export const dashboardApi = {
  /** Exchange a 15-min handshake token for an 8-hour session JWT. */
  exchangeToken: (token: string) =>
    api.post('/dashboard/session', { token }).then((r) => r.data),

  /** Fetch audit events for the authenticated user. */
  getEvents: () =>
    api.get('/dashboard/events').then((r) => r.data),

  /** Fetch AI risk alerts. */
  getRiskAlerts: () =>
    api.get('/dashboard/risk-alerts').then((r) => r.data),

  /** Request a GDPR Article 20 data export. */
  requestExport: () =>
    api.post('/dashboard/exports').then((r) => r.data),

  /** Poll export status. */
  getExportStatus: (id: string) =>
    api.get(`/dashboard/exports/${id}`).then((r) => r.data),

  /** Request a GDPR Article 17 account deletion. */
  requestDeletion: () =>
    api.post('/dashboard/deletions').then((r) => r.data),

  /** Poll deletion status. */
  getDeletionStatus: (id: string) =>
    api.get(`/dashboard/deletions/${id}`).then((r) => r.data),

  /**
   * Link a tenant account to a Google account.
   * Call with dashboardSessionToken as the auth token (overrides localStorage) and
   * the googleSessionToken in the body. This is used when the user already has a
   * google_session and arrives via a tenant app handshake redirect.
   */
  linkAccountWith: (dashboardSessionToken: string, googleSessionToken: string) =>
    api.post(
      '/dashboard/link-account',
      { googleSessionToken },
      { headers: { Authorization: `Bearer ${dashboardSessionToken}` } },
    ).then((r) => r.data),

  /** Get all linked tenant accounts (google_session only). */
  getLinkedAccounts: () =>
    api.get('/dashboard/linked-accounts').then((r) => r.data),

  /** Unlink a tenant account (google_session only). */
  unlinkAccount: (tenantId: string, tenantUserId: string) =>
    api.delete(`/dashboard/linked-accounts/${tenantId}`, { data: { tenantUserId } }).then((r) => r.data),

  /** Send a message in the AI chat. Creates a new session if sessionId is omitted. */
  aiChat: (message: string, sessionId?: string) =>
    api.post('/dashboard/ai-chat', { message, sessionId }).then((r) => r.data),

  /** Get paginated AI chat session history. */
  getChatHistory: (page = 1, limit = 20) =>
    api.get('/dashboard/ai-chat/history', { params: { page, limit } }).then((r) => r.data),

  /** Get AI risk analysis history (tenant analysis records from MongoDB). */
  getAnalysisHistory: () =>
    api.get('/dashboard/ai-analysis').then((r) => r.data),

  /** Get Privacy Health Score (0-100) for the authenticated user. */
  getPrivacyScore: () =>
    api.get('/dashboard/privacy-score').then((r) => r.data),

  /** Get all breach reports for the authenticated user. */
  getBreachReports: () =>
    api.get('/dashboard/breach-report').then((r) => r.data),

  /** Report a data breach — starts the 72h GDPR Art.33 countdown. */
  reportBreach: (description: string, severity?: string) =>
    api.post('/dashboard/breach-report', { description, severity }).then((r) => r.data),

  /** Simulate notifying the regulator. */
  notifyRegulator: (id: string) =>
    api.post(`/dashboard/breach-report/${id}/notify`).then((r) => r.data),

  /** Get consent records for a user. */
  getConsents: (userId: string) =>
    api.get(`/consents/${userId}`).then((r) => r.data),

  /** Set consent for a data type. */
  setConsent: (tenantUserId: string, dataType: string, granted: boolean) =>
    api.post('/consents', { tenantUserId, dataType, granted }).then((r) => r.data),

  /** List active webhooks. */
  getWebhooks: () =>
    api.get('/webhooks').then((r) => r.data),

  /** Register a new webhook. */
  addWebhook: (url: string, triggerOn?: string) =>
    api.post('/webhooks', { url, triggerOn }).then((r) => r.data),

  /** Delete a webhook. */
  deleteWebhook: (id: string) =>
    api.delete(`/webhooks/${id}`),

  /**
   * GDPR Article 5(1)(c) — Data Minimisation Violations.
   * Returns events where the tenant accessed a data field not in their declared allowed list.
   */
  getViolations: () =>
    api.get('/dashboard/violations').then((r) => r.data),

  /** Download GDPR Art.30 PDF compliance report via blob URL (works cross-origin). */
  downloadPdfReport: async () => {
    const res = await api.get('/dashboard/compliance-report/download', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance-report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },

  /** Download a completed export as a JSON file via blob URL (works cross-origin). */
  downloadExport: async (requestId: string) => {
    const res = await api.get(`/dashboard/exports/${requestId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacy-export-${requestId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },

  /** Admin: get all exports + deletions across visible tenants. */
  getGdprRequests: () =>
    api.get('/dashboard/gdpr/requests').then((r) => r.data as {
      exports: { id: string; tenantId: string; tenantUserId: string; status: string; eventCount: number | null; requestedAt: string; completedAt: string | null }[];
      deletions: { id: string; tenantId: string; tenantUserId: string; status: string; requestedAt: string; completedAt: string | null }[];
    }),

  /**
   * GDPR Article 30 — Tamper-Evident Hash Chain Verification.
   * Walks the entire audit log and recomputes every SHA-256 hash.
   * Returns { valid, eventCount, latestHash, brokenAtEventId? }.
   */
  verifyChainIntegrity: () =>
    api.get('/dashboard/chain-integrity').then((r) => r.data),

  /**
   * Returns the SSE stream URL for real-time event push.
   * EventSource cannot send Authorization headers so we pass the token as a query param.
   */
  getStreamUrl: () => {
    const token = localStorage.getItem('session_token') ?? '';
    return `${BASE_URL}/api/dashboard/events/stream?token=${encodeURIComponent(token)}`;
  },
};

// ─── Onboarding API helpers ─────────────────────────────────────────────────

// ─── Dev / Admin API helpers ────────────────────────────────────────────────

const devHeaders = (token: string) => ({ 'x-dev-token': token });

export const devApi = {
  listAiProviders: (token: string) =>
    api.get('/dev/ai-providers', { headers: devHeaders(token) }).then((r) => r.data),

  getActiveAiProvider: (token: string) =>
    api.get('/dev/ai-providers/active', { headers: devHeaders(token) }).then((r) => r.data),

  addAiProvider: (token: string, body: { provider: string; label: string; model: string; apiKey: string }) =>
    api.post('/dev/ai-providers', body, { headers: devHeaders(token) }).then((r) => r.data),

  activateAiProvider: (token: string, id: string) =>
    api.put(`/dev/ai-providers/${id}/activate`, {}, { headers: devHeaders(token) }).then((r) => r.data),

  deleteAiProvider: (token: string, id: string) =>
    api.delete(`/dev/ai-providers/${id}`, { headers: devHeaders(token) }),

  triggerRiskAnalysis: (token: string) =>
    api.post('/dev/trigger-risk-analysis', {}, { headers: devHeaders(token) }).then((r) => r.data),
};

// ─── Notifications API helpers ──────────────────────────────────────────────

export const notificationsApi = {
  getAll: () =>
    api.get('/notifications').then((r) => r.data),

  getUnreadCount: () =>
    api.get('/notifications/unread-count').then((r) => r.data as { count: number }),

  markRead: (id: string) =>
    api.put(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.put('/notifications/read-all').then((r) => r.data),
};

// ─── Tenants API helpers ────────────────────────────────────────────────────

export const tenantsApi = {
  /** Active tenants (id + name) for Google user link picker. */
  listAvailable: () =>
    api.get('/tenants/available').then((r) => r.data as { id: string; name: string }[]),

  /** All tenants with event counts — super admin only. */
  listAll: () =>
    api.get('/tenants/all').then((r) => r.data as {
      id: string; name: string; email: string; isActive: boolean;
      retentionDays: number; createdAt: string; eventCount: number;
    }[]),
};

// ─── Onboarding API helpers ─────────────────────────────────────────────────

export const onboardApi = {
  /** Register a new tenant and get enriched onboarding payload. */
  register: (name: string, email: string, password: string) =>
    api.post('/tenants/register', { name, email, password }).then((r) => r.data),

  /** Poll onboarding status — hasEvents, eventCount, firstEventAt, dashboardReady. */
  getStatus: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/onboarding-status`).then((r) => r.data),
};
