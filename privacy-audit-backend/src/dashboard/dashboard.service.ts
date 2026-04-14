import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as any;
import { AuditEvent } from '../events/audit-event.entity';
import { DashboardUsersService } from '../dashboard-users/dashboard-users.service';
import { CreateDashboardTokenDto } from './dto/create-dashboard-token.dto';
import { ExchangeTokenDto } from './dto/exchange-token.dto';

const DASHBOARD_TOKEN_TYPE = 'dashboard_token';
const DASHBOARD_SESSION_TYPE = 'dashboard_session';

@Injectable()
export class DashboardService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(AuditEvent)
    private readonly eventsRepository: Repository<AuditEvent>,
    private readonly dashboardUsersService: DashboardUsersService,
  ) {}

  // ─── Auth ─────────────────────────────────────────────────────────────────

  /**
   * issueToken — called by tenant apps (API key auth).
   * Returns a 15-minute handshake JWT the user exchanges for a session.
   */
  issueToken(
    tenantId: string,
    dto: CreateDashboardTokenDto,
  ): { token: string; expiresIn: string; redirectUrl: string } {
    const token = this.jwtService.sign(
      { type: DASHBOARD_TOKEN_TYPE, tenantId, tenantUserId: dto.tenantUserId },
      { expiresIn: '15m' },
    );

    const baseUrl =
      this.configService.get<string>('DASHBOARD_BASE_URL') ?? 'http://localhost:3000';

    return {
      token,
      expiresIn: '15 minutes',
      redirectUrl: `${baseUrl}/auth/redirect?token=${token}`,
    };
  }

  /**
   * exchangeToken — called by the dashboard frontend (/auth/redirect page).
   * Validates the handshake token and issues an 8-hour session JWT.
   */
  exchangeToken(dto: ExchangeTokenDto): {
    sessionToken: string;
    tenantId: string;
    tenantUserId: string;
    expiresIn: string;
  } {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new UnauthorizedException('Dashboard token is invalid or expired');
    }

    if (payload.type !== DASHBOARD_TOKEN_TYPE) {
      throw new UnauthorizedException('Token type mismatch');
    }

    const sessionToken = this.jwtService.sign(
      { type: DASHBOARD_SESSION_TYPE, tenantId: payload.tenantId, tenantUserId: payload.tenantUserId },
      { expiresIn: '8h' },
    );

    return {
      sessionToken,
      tenantId: payload.tenantId,
      tenantUserId: payload.tenantUserId,
      expiresIn: '8 hours',
    };
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  /**
   * getEvents — returns audit events for the authenticated dashboard user.
   *
   * dashboard_session: events scoped to the user's (tenantId, tenantUserId).
   * google_session: events across all linked tenant accounts.
   */
  async getEvents(user: {
    type: string;
    tenantId?: string;
    tenantUserId?: string;
    dashboardUserId?: string;
  }): Promise<AuditEvent[]> {
    if (user.type === 'dashboard_session') {
      return this.eventsRepository
        .createQueryBuilder('event')
        .where('event.tenant_id = :tenantId', { tenantId: user.tenantId })
        .andWhere('event.tenant_user_id = :tenantUserId', { tenantUserId: user.tenantUserId })
        .orderBy('event.occurred_at', 'DESC')
        .getMany();
    }

    // google_session: aggregate across all linked tenant accounts
    const linked = await this.dashboardUsersService.getLinkedAccounts(
      user.dashboardUserId!,
    );

    if (linked.length === 0) return [];

    const conditions = linked
      .map((_, i) => `(event.tenant_id = :t${i} AND event.tenant_user_id = :u${i})`)
      .join(' OR ');

    const params = Object.fromEntries(
      linked.flatMap((l, i) => [
        [`t${i}`, l.tenantId],
        [`u${i}`, l.tenantUserId],
      ]),
    );

    return this.eventsRepository
      .createQueryBuilder('event')
      .where(conditions, params)
      .orderBy('event.occurred_at', 'DESC')
      .getMany();
  }

  // ─── Privacy Health Score ─────────────────────────────────────────────────

  /**
   * computePrivacyScore — 0-100 score per tenant user.
   *
   * Scoring breakdown (total 100 pts):
   *   consent_rate        30 pts — % events where consent_obtained = true
   *   no_opt_out_rate     20 pts — % events where user_opted_out = false
   *   low_third_party     20 pts — inversely proportional to third-party sharing ratio
   *   low_sensitive       20 pts — inversely proportional to HIGH+CRITICAL event ratio
   *   low_critical        10 pts — inversely proportional to CRITICAL-only ratio
   */
  async computePrivacyScore(user: {
    type: string;
    tenantId?: string;
    tenantUserId?: string;
    dashboardUserId?: string;
  }): Promise<{
    score: number;
    grade: string;
    breakdown: Record<string, number>;
    totalEvents: number;
  }> {
    const events = await this.getEvents(user);

    if (events.length === 0) {
      return {
        score: 100,
        grade: 'A',
        breakdown: { consentRate: 30, noOptOutRate: 20, lowThirdParty: 20, lowSensitive: 20, lowCritical: 10 },
        totalEvents: 0,
      };
    }

    const total = events.length;
    const withConsent    = events.filter((e) => e.consentObtained).length;
    const withOptOut     = events.filter((e) => e.userOptedOut).length;
    const withThirdParty = events.filter((e) => e.thirdPartyInvolved).length;
    const withHighPlus   = events.filter((e) => ['HIGH', 'CRITICAL'].includes(e.sensitivityCode)).length;
    const withCritical   = events.filter((e) => e.sensitivityCode === 'CRITICAL').length;

    const consentRate        = Math.round((withConsent / total) * 30);
    const noOptOutRate       = Math.round(((total - withOptOut) / total) * 20);
    const lowThirdParty      = Math.round(((total - withThirdParty) / total) * 20);
    const lowSensitive       = Math.round(((total - withHighPlus) / total) * 20);
    const lowCritical        = Math.round(((total - withCritical) / total) * 10);

    const score = consentRate + noOptOutRate + lowThirdParty + lowSensitive + lowCritical;

    const grade =
      score >= 90 ? 'A' :
      score >= 75 ? 'B' :
      score >= 60 ? 'C' :
      score >= 45 ? 'D' : 'F';

    return {
      score,
      grade,
      breakdown: { consentRate, noOptOutRate, lowThirdParty, lowSensitive, lowCritical },
      totalEvents: total,
    };
  }

  // ─── PDF Compliance Report ────────────────────────────────────────────────

  /**
   * generateCompliancePdf — GDPR Article 30 record of processing.
   * Returns a Buffer containing the PDF and a suggested filename.
   */
  async generateCompliancePdf(user: {
    type: string;
    tenantId?: string;
    tenantUserId?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    const events = await this.getEvents(user);
    const tenantId = user.tenantId ?? 'unknown';
    const userId = user.tenantUserId ?? 'unknown';
    const now = new Date();
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), filename: `compliance-report-${tenantId}-${now.toISOString().slice(0, 10)}.pdf` }));
      doc.on('error', reject);

      // ── Cover ──
      doc.fontSize(22).font('Helvetica-Bold').text('Privacy Audit — Compliance Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor('#64748b')
        .text(`GDPR Article 30 — Record of Processing Activities`, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).text(`Generated: ${fmt(now)}   |   Tenant: ${tenantId}   |   User: ${userId}`, { align: 'center' });
      doc.moveDown(1.5);

      // ── Section helper ──
      const section = (title: string) => {
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text(title);
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
        doc.moveDown(0.4);
      };
      const row = (label: string, value: string) => {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text(`${label}:`, { continued: true });
        doc.font('Helvetica').fillColor('#0f172a').text(`  ${value}`);
        doc.moveDown(0.2);
      };

      // ── Summary ──
      section('1. Event Summary');
      row('Total audit events', String(events.length));
      row('Report period', events.length > 0 ? `${fmt(events[events.length - 1].occurredAt)} — ${fmt(events[0].occurredAt)}` : 'No events');

      const withConsent = events.filter((e) => e.consentObtained).length;
      const withThirdParty = events.filter((e) => e.thirdPartyInvolved).length;
      const criticalEvents = events.filter((e) => e.sensitivityCode === 'CRITICAL').length;

      row('Events with consent', `${withConsent} / ${events.length} (${events.length ? Math.round(withConsent / events.length * 100) : 100}%)`);
      row('Third-party involved', `${withThirdParty} events`);
      row('Critical sensitivity', `${criticalEvents} events`);
      doc.moveDown(0.8);

      // ── Retention policy ──
      section('2. Retention Policy');
      const retentionDays = events[0]?.retentionDays ?? 90;
      row('Default retention period', `${retentionDays} days`);
      row('Policy basis', 'GDPR Article 5(1)(e) — storage limitation');
      row('Enforcement', 'Automated nightly cron job purges expired events');
      doc.moveDown(0.8);

      // ── Hash chain integrity ──
      section('3. Audit Log Integrity (Tamper-Evident Chain)');
      doc.fontSize(10).font('Helvetica').fillColor('#475569')
        .text('Each event is SHA-256 hashed with the previous event\'s hash, forming a tamper-evident chain. Any modification to a stored event invalidates all subsequent hashes.');
      doc.moveDown(0.4);
      if (events.length > 0) {
        row('First event hash', (events[events.length - 1]?.hash?.slice(0, 32) ?? 'N/A') + '…');
        row('Latest event hash', (events[0]?.hash?.slice(0, 32) ?? 'N/A') + '…');
        row('Chain integrity', 'Verifiable via GET /api/events/verify-chain');
      }
      doc.moveDown(0.8);

      // ── Recent events (up to 20) ──
      section('4. Recent Audit Events (last 20)');
      const recent = events.slice(0, 20);
      if (recent.length === 0) {
        doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('No events recorded.');
      } else {
        doc.fontSize(9).font('Helvetica');
        recent.forEach((e, i) => {
          if (doc.y > 720) { doc.addPage(); }
          doc.fillColor('#0f172a')
            .text(`${i + 1}. [${e.sensitivityCode}] ${e.actionCode} — ${e.dataFields?.join(', ') ?? ''}`, { continued: true })
            .fillColor('#94a3b8')
            .text(`   ${fmt(e.occurredAt)}`);
          doc.moveDown(0.15);
        });
      }
      doc.moveDown(0.8);

      // ── GDPR rights ──
      if (doc.y > 680) doc.addPage();
      section('5. GDPR Rights Mechanisms');
      row('Article 17 (Erasure)', 'Endpoint: POST /api/dashboard/deletions — async hard-delete with evidence hash');
      row('Article 20 (Portability)', 'Endpoint: POST /api/dashboard/exports — JSON export with 24h download window');
      row('Article 7 (Consent)', 'Endpoint: POST /api/consents — per-data-type consent management');
      row('Article 33 (Breach Notification)', 'Endpoint: POST /api/dashboard/breach-report — 72h countdown simulation');
      doc.moveDown(0.8);

      // ── Footer ──
      doc.fontSize(9).fillColor('#94a3b8').font('Helvetica-Oblique')
        .text(`This report was automatically generated by the Privacy Audit Service on ${fmt(now)}.`, { align: 'center' });

      doc.end();
    });
  }

  // ─── Account Linking ──────────────────────────────────────────────────────

  /**
   * linkAccount — links a tenant account (from a dashboard_session) to a
   * Google identity (from a google_session). The user calls this while they
   * have both tokens — e.g. after logging in via Google and also visiting from
   * a tenant "View my privacy" link.
   */
  async linkAccount(
    dashboardSessionUser: { tenantId: string; tenantUserId: string },
    googleSessionToken: string,
  ): Promise<{ linked: boolean; message: string }> {
    let googlePayload: any;
    try {
      googlePayload = this.jwtService.verify(googleSessionToken);
    } catch {
      throw new UnauthorizedException('Google session token is invalid or expired');
    }

    if (googlePayload.type !== 'google_session') {
      throw new BadRequestException('Provided token is not a google_session token');
    }

    const result = await this.dashboardUsersService.linkAccount(
      googlePayload.dashboardUserId,
      dashboardSessionUser.tenantId,
      dashboardSessionUser.tenantUserId,
    );

    return {
      linked: result.linked,
      message: result.linked
        ? 'Tenant account linked to your Google identity'
        : 'Account was already linked',
    };
  }
}
