import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface RiskAlertEmailData {
  toEmail: string;
  tenantName: string;
  severity: string;
  title: string;
  description: string;
  suggestedAction: string;
  affectedEventCount: number;
}

export interface WeeklyDigestEmailData {
  toEmail: string;
  userName: string;
  tenantName: string;
  totalEvents: number;
  criticalCount: number;
  highCount: number;
  periodStart: string;
  periodEnd: string;
  topFindings: Array<{ severity: string; title: string }>;
}

/**
 * EmailService — sends HTML emails via nodemailer SMTP.
 * Supports Gmail SMTP, Mailtrap (dev), or SendGrid SMTP relay.
 *
 * Required env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
 * Optional: SMTP_SECURE (default: false for port 587 STARTTLS)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.initTransport();
  }

  private initTransport(): void {
    const host = this.config.get<string>('SMTP_HOST');
    const port = parseInt(this.config.get<string>('SMTP_PORT') ?? '587', 10);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — email sending is disabled. Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass },
    });

    this.logger.log(`Email transport initialized: ${host}:${port}`);
  }

  private get fromEmail(): string {
    return this.config.get<string>('FROM_EMAIL') ?? 'noreply@privacy-audit.io';
  }

  private isEnabled(): boolean {
    return this.transporter !== null;
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  private riskAlertHtml(data: RiskAlertEmailData): string {
    const severityColors: Record<string, string> = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#ca8a04',
      LOW: '#16a34a',
    };
    const color = severityColors[data.severity] ?? '#6b7280';

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:28px 32px;">
          <h1 style="color:#f8fafc;margin:0;font-size:20px;font-weight:700;">Privacy Audit Service</h1>
          <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">AI Risk Alert Notification</p>
        </td></tr>
        <!-- Severity Badge -->
        <tr><td style="padding:28px 32px 0;">
          <span style="display:inline-block;background:${color};color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">${data.severity}</span>
          <h2 style="color:#0f172a;margin:12px 0 4px;font-size:18px;">${data.title}</h2>
          <p style="color:#64748b;margin:0;font-size:13px;">Tenant: <strong>${data.tenantName}</strong> · ${data.affectedEventCount} affected event(s)</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:20px 32px;">
          <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">${data.description}</p>
          <div style="background:#f8fafc;border-left:4px solid ${color};border-radius:4px;padding:12px 16px;">
            <p style="color:#475569;font-size:13px;margin:0;"><strong>Suggested Action:</strong> ${data.suggestedAction}</p>
          </div>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:0 32px 28px;">
          <a href="#" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View Dashboard</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">Privacy Audit Service · GDPR Compliance Platform · You received this because you are a tenant administrator.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private weeklyDigestHtml(data: WeeklyDigestEmailData): string {
    const findingsHtml = data.topFindings.length > 0
      ? data.topFindings.map((f) => `<li style="margin-bottom:6px;font-size:13px;color:#334155;"><strong style="color:#dc2626;">[${f.severity}]</strong> ${f.title}</li>`).join('')
      : '<li style="font-size:13px;color:#64748b;">No significant findings this week.</li>';

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:28px 32px;">
          <h1 style="color:#f8fafc;margin:0;font-size:20px;font-weight:700;">Privacy Audit Service</h1>
          <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Weekly Privacy Digest — ${data.periodStart} to ${data.periodEnd}</p>
        </td></tr>
        <!-- Summary stats -->
        <tr><td style="padding:28px 32px 0;">
          <h2 style="color:#0f172a;margin:0 0 4px;font-size:17px;">Hi ${data.userName}, here's your weekly summary</h2>
          <p style="color:#64748b;margin:0 0 20px;font-size:13px;">Tenant: <strong>${data.tenantName}</strong></p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#f8fafc;border-radius:8px;padding:14px;text-align:center;width:30%;">
                <div style="font-size:28px;font-weight:800;color:#6366f1;">${data.totalEvents}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">Total Events</div>
              </td>
              <td style="width:5%;"></td>
              <td style="background:#fef2f2;border-radius:8px;padding:14px;text-align:center;width:30%;">
                <div style="font-size:28px;font-weight:800;color:#dc2626;">${data.criticalCount}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">Critical</div>
              </td>
              <td style="width:5%;"></td>
              <td style="background:#fff7ed;border-radius:8px;padding:14px;text-align:center;width:30%;">
                <div style="font-size:28px;font-weight:800;color:#ea580c;">${data.highCount}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">High Risk</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Findings -->
        <tr><td style="padding:20px 32px;">
          <h3 style="color:#0f172a;font-size:14px;margin:0 0 10px;">Top AI Findings This Week</h3>
          <ul style="margin:0;padding-left:18px;">${findingsHtml}</ul>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:0 32px 28px;">
          <a href="#" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View Full Dashboard</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">Privacy Audit Service · Weekly digest sent every Monday 09:00 UTC · To unsubscribe, update your notification preferences in the dashboard.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ── Send helpers ──────────────────────────────────────────────────────────

  async sendRiskAlert(data: RiskAlertEmailData): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.warn(`[EmailService] SMTP disabled — skipping risk alert email to ${data.toEmail}`);
      return;
    }
    try {
      await this.transporter!.sendMail({
        from: `"Privacy Audit Service" <${this.fromEmail}>`,
        to: data.toEmail,
        subject: `[${data.severity}] Privacy Risk Alert: ${data.title}`,
        html: this.riskAlertHtml(data),
      });
      this.logger.log(`Risk alert email sent to ${data.toEmail} (${data.severity}: ${data.title})`);
    } catch (err) {
      this.logger.error(`Failed to send risk alert email to ${data.toEmail}: ${(err as Error).message}`);
    }
  }

  async sendWeeklyDigest(data: WeeklyDigestEmailData): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.warn(`[EmailService] SMTP disabled — skipping weekly digest email to ${data.toEmail}`);
      return;
    }
    try {
      await this.transporter!.sendMail({
        from: `"Privacy Audit Service" <${this.fromEmail}>`,
        to: data.toEmail,
        subject: `Your Weekly Privacy Digest — ${data.periodStart}`,
        html: this.weeklyDigestHtml(data),
      });
      this.logger.log(`Weekly digest email sent to ${data.toEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send weekly digest email to ${data.toEmail}: ${(err as Error).message}`);
    }
  }
}
