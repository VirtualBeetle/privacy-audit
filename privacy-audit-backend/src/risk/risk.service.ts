import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { RiskAlert, RiskSeverity } from './risk-alert.entity';
import { AuditEvent } from '../events/audit-event.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { AiChatService } from '../ai-chat/ai-chat.service';
import { EmailService } from '../email/email.service';
import { WebhooksService } from '../webhooks/webhooks.service';

/**
 * RiskService
 *
 * Every 6 hours, fetches the last 24 hours of audit events for every active
 * tenant, builds a statistical summary, and sends it to the active AI provider
 * for privacy risk analysis. Parsed findings are stored as both:
 *   - RiskAlert (PostgreSQL) — for fast dashboard queries
 *   - AiAnalysisRecord (MongoDB) — full context + raw response for history UI
 *
 * Demonstrates GDPR Article 35 (DPIA) in automated continuous form.
 */
@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    @InjectRepository(RiskAlert)
    private readonly alertsRepo: Repository<RiskAlert>,
    @InjectRepository(AuditEvent)
    private readonly eventsRepo: Repository<AuditEvent>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly aiService: AiOrchestrationService,
    private readonly aiChatService: AiChatService,
    private readonly emailService: EmailService,
    private readonly webhooksService: WebhooksService,
  ) {}

  // ── Cron ────────────────────────────────────────────────────────────────────

  @Cron('0 */6 * * *')
  async runRiskAnalysis(): Promise<{ tenants: number; alerts: number }> {
    this.logger.log('Starting risk analysis cycle');

    const tenants = await this.tenantsRepo.find({ where: { isActive: true } });
    let totalAlerts = 0;

    for (const tenant of tenants) {
      const count = await this.analyseRisksForTenant(tenant.id).catch(
        (err: Error) => {
          this.logger.error(
            `Risk analysis failed for tenant ${tenant.id}: ${err.message}`,
          );
          return 0;
        },
      );
      totalAlerts += count;
    }

    this.logger.log(
      `Risk analysis complete — ${tenants.length} tenants, ${totalAlerts} new alerts`,
    );
    return { tenants: tenants.length, alerts: totalAlerts };
  }

  // ── Weekly digest cron ──────────────────────────────────────────────────────

  /** Runs every Monday at 09:00 UTC */
  @Cron('0 9 * * 1')
  async sendWeeklyDigests(): Promise<void> {
    this.logger.log('Starting weekly email digest run');
    const tenants = await this.tenantsRepo.find({ where: { isActive: true } });
    const periodEnd = new Date();
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const tenant of tenants) {
      await this.sendDigestForTenant(tenant.id, periodStart, periodEnd).catch(
        (err: Error) => this.logger.warn(`Digest failed for tenant ${tenant.id}: ${err.message}`),
      );
    }
  }

  async sendDigestForTenant(tenantId: string, periodStart: Date, periodEnd: Date): Promise<void> {
    const adminUser = await this.usersRepo.findOne({ where: { tenantId, role: 'admin' as any } });
    if (!adminUser?.email) return;

    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });

    const events = await this.eventsRepo.count({
      where: { tenantId, occurredAt: MoreThan(periodStart) },
    });

    const alerts = await this.alertsRepo.find({
      where: { tenantId },
      order: { analysedAt: 'DESC' },
      take: 5,
    });

    const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
    const highCount = alerts.filter((a) => a.severity === 'HIGH').length;

    const fmt = (d: Date) => d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });

    await this.emailService.sendWeeklyDigest({
      toEmail: adminUser.email,
      userName: adminUser.email.split('@')[0],
      tenantName: tenant?.name ?? tenantId,
      totalEvents: events,
      criticalCount,
      highCount,
      periodStart: fmt(periodStart),
      periodEnd: fmt(periodEnd),
      topFindings: alerts.map((a) => ({ severity: a.severity, title: a.title })),
    });
  }

  // ── Per-tenant analysis ──────────────────────────────────────────────────────

  async analyseRisksForTenant(tenantId: string): Promise<number> {
    const periodEnd = new Date();
    const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const events = await this.eventsRepo.find({
      where: { tenantId, occurredAt: MoreThan(periodStart) },
    });

    if (events.length === 0) {
      this.logger.debug(`No events in last 24h for tenant ${tenantId} — skipping`);
      return 0;
    }

    const actionBreakdown = countBy(events, 'actionCode');
    const sensitivityBreakdown = countBy(events, 'sensitivityCode');
    const actorBreakdown = countBy(events, 'actorType');
    const thirdPartyCount = events.filter((e) => e.thirdPartyInvolved).length;
    const noConsentCount = events.filter((e) => !e.consentObtained).length;
    const optedOutCount = events.filter((e) => e.userOptedOut).length;
    const criticalCount = events.filter(
      (e) => e.sensitivityCode === 'CRITICAL',
    ).length;

    const analysisSummary = {
      totalEvents: events.length,
      windowHours: 24,
      actionBreakdown,
      sensitivityBreakdown,
      actorBreakdown,
      thirdPartyCount,
      noConsentCount,
      optedOutCount,
      criticalCount,
    };

    const prompt = `You are a GDPR privacy compliance auditor reviewing audit events for a SaaS tenant.

The following statistics summarise data access events from the last 24 hours:
${JSON.stringify(analysisSummary, null, 2)}

Identify privacy risks, GDPR compliance gaps, or anomalies. For each finding return a JSON object with:
- "severity": one of "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
- "title": concise title, max 80 characters
- "description": explanation of the risk, max 300 characters
- "suggestedAction": recommended remediation step, max 200 characters
- "affectedEventCount": integer count of events contributing to this risk

Return ONLY a JSON array. If no risks are found, return [].`;

    let rawText = '[]';
    let provider = 'unknown';
    let model = 'unknown';

    try {
      const response = await this.aiService.analyse(prompt);
      rawText = response.content;
      provider = response.provider;
      model = response.model;
    } catch (err: any) {
      this.logger.warn(
        `AI analysis failed for tenant ${tenantId}: ${err.message}`,
      );
      return 0;
    }

    let alerts: any[];
    try {
      const cleaned = rawText
        .replace(/^```json?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();
      alerts = JSON.parse(cleaned);
    } catch {
      this.logger.warn(
        `Could not parse risk response for tenant ${tenantId}: ${rawText.slice(0, 200)}`,
      );
      return 0;
    }

    if (!Array.isArray(alerts) || alerts.length === 0) return 0;

    const VALID_SEVERITIES: RiskSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const now = new Date();
    let saved = 0;

    // Find the tenant admin for email notifications
    const adminUser = await this.usersRepo.findOne({
      where: { tenantId, role: 'tenant_admin' as any },
    });
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });

    for (const alert of alerts) {
      if (!VALID_SEVERITIES.includes(alert.severity)) continue;

      await this.alertsRepo.save(
        this.alertsRepo.create({
          tenantId,
          severity: alert.severity as RiskSeverity,
          title: String(alert.title ?? '').slice(0, 120),
          description: String(alert.description ?? '').slice(0, 500),
          suggestedAction: String(alert.suggestedAction ?? '').slice(0, 300),
          affectedEventCount: Number(alert.affectedEventCount) || 0,
          analysedAt: now,
        }),
      );
      saved++;

      // Fire webhooks for HIGH and CRITICAL alerts (non-blocking)
      if (['HIGH', 'CRITICAL'].includes(alert.severity)) {
        this.webhooksService.fireForAlert(tenantId, {
          id: String(saved),
          severity: alert.severity,
          title: String(alert.title ?? ''),
          description: String(alert.description ?? ''),
        }).catch((err: Error) =>
          this.logger.warn(`Webhook fire failed: ${err.message}`),
        );
      }

      // Send email for HIGH and CRITICAL alerts
      if (['HIGH', 'CRITICAL'].includes(alert.severity) && adminUser?.email) {
        this.emailService.sendRiskAlert({
          toEmail: adminUser.email,
          tenantName: tenant?.name ?? tenantId,
          severity: alert.severity,
          title: String(alert.title ?? ''),
          description: String(alert.description ?? ''),
          suggestedAction: String(alert.suggestedAction ?? ''),
          affectedEventCount: Number(alert.affectedEventCount) || 0,
        }).catch((err: Error) =>
          this.logger.warn(`Email send failed: ${err.message}`),
        );
      }
    }

    // Save full analysis to MongoDB for history UI
    await this.aiChatService
      .saveAnalysisRecord({
        tenantId,
        provider,
        model,
        eventCount: events.length,
        analysisSummary,
        sampleEventIds: events.slice(0, 10).map((e) => e.id),
        findings: alerts
          .filter((a) => VALID_SEVERITIES.includes(a.severity))
          .map((a) => ({
            severity: a.severity,
            title: String(a.title ?? ''),
            description: String(a.description ?? ''),
            suggestedAction: String(a.suggestedAction ?? ''),
            affectedEventCount: Number(a.affectedEventCount) || 0,
          })),
        rawResponse: rawText,
        periodStart,
        periodEnd,
      })
      .catch((err: Error) =>
        this.logger.warn(`Failed to save analysis record to MongoDB: ${err.message}`),
      );

    this.logger.log(`Stored ${saved} risk alert(s) for tenant ${tenantId} via ${provider}/${model}`);
    return saved;
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  async getAlertsForTenant(tenantId: string, limit = 20): Promise<RiskAlert[]> {
    return this.alertsRepo.find({
      where: { tenantId },
      order: { analysedAt: 'DESC', severity: 'DESC' },
      take: limit,
    });
  }

  async getAlertsForUser(
    user: { type: string; tenantId?: string; dashboardUserId?: string },
    linkedTenantIds: string[],
  ): Promise<RiskAlert[]> {
    const tenantIds =
      user.type === 'dashboard_session'
        ? [user.tenantId as string]
        : linkedTenantIds;

    if (tenantIds.length === 0) return [];

    return this.alertsRepo
      .createQueryBuilder('a')
      .where('a.tenant_id IN (:...tenantIds)', { tenantIds })
      .orderBy('a.analysed_at', 'DESC')
      .addOrderBy('a.severity', 'DESC')
      .take(20)
      .getMany();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = String(item[key] ?? 'UNKNOWN');
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
