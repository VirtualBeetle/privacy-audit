import axios from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach session token to every request if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
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

  /** Link a Google account to the current dashboard_session. */
  linkAccount: (googleSessionToken: string) =>
    api.post('/dashboard/link-account', { googleSessionToken }).then((r) => r.data),

  /** Get all linked tenant accounts (google_session only). */
  getLinkedAccounts: () =>
    api.get('/dashboard/linked-accounts').then((r) => r.data),

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
