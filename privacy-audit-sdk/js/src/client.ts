/**
 * Privacy Audit SDK — TypeScript/JavaScript client for the Privacy Audit Service.
 *
 * @example
 * ```ts
 * import { AuditClient } from 'privacy-audit-sdk';
 *
 * const client = new AuditClient({
 *   baseUrl: 'https://audit.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * // Fire-and-forget
 * client.sendAsync({
 *   eventId: crypto.randomUUID(),
 *   tenantUserId: 'user-123',
 *   occurredAt: new Date().toISOString(),
 *   action: { code: 'READ', label: 'Patient profile read' },
 *   reason: { code: 'TREATMENT', label: 'Clinical care' },
 *   actor: { type: 'EMPLOYEE', label: 'Dr. Mitchell' },
 *   dataFields: ['full_name', 'dob', 'blood_type'],
 *   sensitivity: { code: 'HIGH' },
 * });
 * ```
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditAction {
  code: string;
  label?: string;
}

export interface AuditReason {
  code: string;
  label?: string;
}

export interface AuditActor {
  type: string;
  label?: string;
  identifier?: string | null;
}

export interface AuditSensitivity {
  code: string;
}

export interface AuditEventPayload {
  eventId: string;
  tenantUserId: string;
  occurredAt: string; // ISO 8601
  action: AuditAction;
  reason: AuditReason;
  actor: AuditActor;
  dataFields: string[];
  sensitivity: AuditSensitivity;
  thirdPartyInvolved?: boolean;
  thirdPartyName?: string | null;
  retentionDays?: number;
  region?: string;
  consentObtained?: boolean;
  userOptedOut?: boolean;
  meta?: Record<string, unknown>;
}

export interface DashboardTokenResponse {
  token: string;
  expiresIn: string;
  redirectUrl: string;
}

export interface AuditClientOptions {
  baseUrl: string;
  apiKey: string;
  /** Request timeout in milliseconds (default: 10 000). */
  timeoutMs?: number;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class AuditClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor({ baseUrl, apiKey, timeoutMs = 10_000 }: AuditClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };
    this.timeoutMs = timeoutMs;
  }

  /**
   * Send an audit event synchronously.
   * Resolves on HTTP 202 or 409 (duplicate, ignored).
   * Rejects on other non-2xx responses.
   */
  async send(event: AuditEventPayload): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/events`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(event),
        signal: controller.signal,
      });

      // 409 = duplicate eventId — idempotent, safe to ignore
      if (res.status === 409) return;

      if (!res.ok) {
        throw new Error(`Privacy Audit: unexpected status ${res.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fire-and-forget version of `send`. Errors are silently discarded.
   * Use this pattern to ensure audit failures never block primary responses.
   */
  sendAsync(event: AuditEventPayload): void {
    this.send(event).catch(() => {/* intentionally swallowed */});
  }

  /**
   * Request a short-lived handshake token for a user.
   * Embed the `redirectUrl` in the "View my privacy" link in the tenant app.
   */
  async issueUserToken(tenantUserId: string): Promise<DashboardTokenResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/dashboard/token`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ tenantUserId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Privacy Audit: issue token failed with status ${res.status}`);
      }

      return res.json() as Promise<DashboardTokenResponse>;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ─── Convenience factory ──────────────────────────────────────────────────────

export function createAuditClient(options: AuditClientOptions): AuditClient {
  return new AuditClient(options);
}
