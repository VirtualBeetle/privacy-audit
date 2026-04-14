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
};
