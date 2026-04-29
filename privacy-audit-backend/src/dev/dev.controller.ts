import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { AiProvider } from '../ai-orchestration/schemas/ai-provider-setting.schema';
import { RiskService } from '../risk/risk.service';
import { RetentionService } from '../retention/retention.service';
import { EmailService } from '../email/email.service';
import { AuditEvent } from '../events/audit-event.entity';
import { Tenant } from '../tenants/tenant.entity';
import { hashApiKey } from '../tenants/tenants.service';
import { AUDIT_EVENTS_QUEUE } from '../queue/queue.constants';

/**
 * DevController
 *
 * Endpoints for demo day and development operations.
 * All routes require the x-dev-token header matching DEV_TOKEN env var.
 *
 * AI Provider management (Phase 9):
 *   GET/POST /dev/ai-providers, PUT /dev/ai-providers/:id/activate, DELETE /dev/ai-providers/:id
 *
 * Manual triggers (Phase 11):
 *   POST /dev/trigger-risk-analysis  — run risk analysis immediately
 *   POST /dev/trigger-retention      — run retention purge immediately
 *   POST /dev/trigger-weekly-digest  — send weekly digest emails now
 *   POST /dev/seed-events            — inject 20 demo events for a tenant
 *   GET  /dev/queue-status           — BullMQ queue stats
 */
@Controller('dev')
export class DevController {
  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiOrchestrationService,
    private readonly riskService: RiskService,
    private readonly retentionService: RetentionService,
    private readonly emailService: EmailService,
    @InjectQueue(AUDIT_EVENTS_QUEUE) private readonly auditQueue: Queue,
    @InjectRepository(AuditEvent) private readonly eventsRepo: Repository<AuditEvent>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  private guard(token: string | undefined): void {
    const expected = this.configService.get<string>('DEV_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid or missing x-dev-token header');
    }
  }

  // ── AI Provider Management ────────────────────────────────────────────────

  /**
   * GET /api/dev/ai-providers
   * List all configured AI providers (API keys are never returned).
   */
  @Get('ai-providers')
  async listProviders(@Headers('x-dev-token') token: string) {
    this.guard(token);
    return this.aiService.listProviders();
  }

  /**
   * POST /api/dev/ai-providers
   * Add a new AI provider.
   *
   * Body: { provider, label, model, apiKey }
   * Providers: "claude" | "gemini" | "openai"
   * Claude models:  "claude-opus-4-6" | "claude-sonnet-4-6"
   * Gemini models:  "gemini-1.5-pro" | "gemini-1.5-flash"
   * OpenAI models:  "gpt-4o"
   */
  @Post('ai-providers')
  @HttpCode(HttpStatus.CREATED)
  async addProvider(
    @Headers('x-dev-token') token: string,
    @Body()
    body: {
      provider: AiProvider;
      label: string;
      model: string;
      apiKey: string;
    },
  ) {
    this.guard(token);
    const doc = await this.aiService.addProvider({ ...body, updatedBy: 'dev' });
    return {
      message: 'Provider added. Use PUT /dev/ai-providers/:id/activate to make it active.',
      id: (doc._id as unknown as string).toString(),
      provider: doc.provider,
      model: doc.model,
      label: doc.label,
    };
  }

  /**
   * PUT /api/dev/ai-providers/:id/activate
   * Switch the active AI provider. Deactivates all others.
   */
  @Put('ai-providers/:id/activate')
  async activateProvider(
    @Headers('x-dev-token') token: string,
    @Param('id') id: string,
  ) {
    this.guard(token);
    await this.aiService.activateProvider(id, 'dev');
    return { message: `Provider ${id} is now active.` };
  }

  /**
   * DELETE /api/dev/ai-providers/:id
   * Remove a provider record.
   */
  @Delete('ai-providers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProvider(
    @Headers('x-dev-token') token: string,
    @Param('id') id: string,
  ) {
    this.guard(token);
    await this.aiService.deleteProvider(id);
  }

  /**
   * GET /api/dev/ai-providers/active
   * Show which provider is currently active.
   */
  @Get('ai-providers/active')
  async getActive(@Headers('x-dev-token') token: string) {
    this.guard(token);
    const active = await this.aiService.getActiveProvider();
    if (!active) {
      const envKey = process.env.ANTHROPIC_API_KEY;
      return {
        active: false,
        fallback: envKey
          ? 'Using ANTHROPIC_API_KEY env var (claude-opus-4-6)'
          : 'No provider configured — AI features will fail',
      };
    }
    return {
      active: true,
      provider: active.provider,
      model: active.model,
      label: active.label,
    };
  }

  // ── Manual Triggers ───────────────────────────────────────────────────────

  /**
   * POST /api/dev/trigger-risk-analysis
   * Runs full risk analysis immediately across all active tenants.
   * Returns { tenants, alerts } summary.
   */
  @Post('trigger-risk-analysis')
  async triggerRiskAnalysis(@Headers('x-dev-token') token: string) {
    this.guard(token);
    const result = await this.riskService.runRiskAnalysis();
    return { message: 'Risk analysis complete.', ...result };
  }

  /**
   * POST /api/dev/trigger-retention
   * Runs retention purge immediately (normally runs nightly at 02:00 UTC).
   * Deletes events past their retentionDays threshold.
   */
  @Post('trigger-retention')
  async triggerRetention(@Headers('x-dev-token') token: string) {
    this.guard(token);
    await this.retentionService.purgeExpiredEvents();
    return { message: 'Retention purge executed.' };
  }

  /**
   * POST /api/dev/trigger-weekly-digest
   * Sends the weekly email digest to all tenant admins immediately.
   * Useful for demo: shows email flow live.
   */
  @Post('trigger-weekly-digest')
  async triggerWeeklyDigest(@Headers('x-dev-token') token: string) {
    this.guard(token);
    await this.riskService.sendWeeklyDigests();
    return { message: 'Weekly digest emails dispatched.' };
  }

  /**
   * POST /api/dev/seed-events
   * Injects 20 realistic sample audit events for a tenant.
   * Body: { tenantId: string, tenantUserId?: string }
   *
   * Events include: data reads/writes, third-party shares, sensitive fields,
   * no-consent cases — good variety for demo purposes.
   */
  @Post('seed-events')
  async seedEvents(
    @Headers('x-dev-token') token: string,
    @Body() body: { tenantId: string; tenantUserId?: string },
  ) {
    this.guard(token);
    if (!body.tenantId) {
      return { error: 'tenantId is required' };
    }

    const userId = body.tenantUserId ?? 'demo-user-001';
    const now = new Date();

    const ACTIONS = ['READ', 'WRITE', 'DELETE', 'EXPORT', 'SHARE', 'LOGIN', 'PROFILE_UPDATE'];
    const SENSITIVITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const ACTOR_TYPES = ['user', 'service', 'third_party', 'admin'];
    const DATA_FIELD_SETS = [
      ['email', 'name'],
      ['location', 'ip_address'],
      ['medical_history', 'prescriptions'],
      ['payment_info', 'card_last4'],
      ['biometric_data'],
      ['browsing_history', 'search_queries'],
      ['posts', 'messages'],
      ['age', 'gender', 'ethnicity'],
    ];

    const events = Array.from({ length: 20 }, (_, i) => {
      const occurredAt = new Date(now.getTime() - i * 3 * 60 * 60 * 1000); // spread over 60 hours
      const sensitivity = SENSITIVITIES[Math.floor(Math.random() * SENSITIVITIES.length)];
      const actorType = ACTOR_TYPES[Math.floor(Math.random() * ACTOR_TYPES.length)];
      const isSensitive = ['HIGH', 'CRITICAL'].includes(sensitivity);

      return this.eventsRepo.create({
        tenantId: body.tenantId,
        tenantUserId: userId,
        actionCode: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
        sensitivityCode: sensitivity,
        actorType,
        dataFields: DATA_FIELD_SETS[Math.floor(Math.random() * DATA_FIELD_SETS.length)],
        thirdPartyInvolved: actorType === 'third_party' || Math.random() < 0.25,
        consentObtained: isSensitive ? Math.random() < 0.5 : true,
        userOptedOut: isSensitive && Math.random() < 0.2,
        occurredAt,
        retentionDays: 90,
      });
    });

    await this.eventsRepo.save(events);
    return {
      message: `Seeded 20 sample events for tenant ${body.tenantId}`,
      tenantId: body.tenantId,
      tenantUserId: userId,
      count: events.length,
    };
  }

  /**
   * GET /api/dev/queue-status
   * Returns BullMQ queue depth and job counts for the audit-events queue.
   */
  @Get('queue-status')
  async queueStatus(@Headers('x-dev-token') token: string) {
    this.guard(token);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.auditQueue.getWaitingCount(),
      this.auditQueue.getActiveCount(),
      this.auditQueue.getCompletedCount(),
      this.auditQueue.getFailedCount(),
      this.auditQueue.getDelayedCount(),
    ]);
    return {
      queue: AUDIT_EVENTS_QUEUE,
      waiting,
      active,
      completed,
      failed,
      delayed,
      health: failed > 10 ? 'degraded' : 'ok',
    };
  }

  // ── Tenant Management ─────────────────────────────────────────────────────

  /**
   * GET /api/dev/tenants
   * List all registered tenants (id, name, email). Use this to get tenant IDs
   * before calling reset-key.
   */
  @Get('tenants')
  async listTenants(@Headers('x-dev-token') token: string) {
    this.guard(token);
    const tenants = await this.tenantsRepo.find({
      select: ['id', 'name', 'email', 'isActive', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
    return { tenants };
  }

  /**
   * POST /api/dev/tenants/:id/reset-key
   * Generate a brand-new API key for an existing tenant.
   * The new plaintext key is returned once — save it immediately.
   * Use this when the original key was lost (e.g. after duplicate registration).
   */
  @Post('tenants/:id/reset-key')
  async resetTenantKey(
    @Headers('x-dev-token') token: string,
    @Param('id') id: string,
  ) {
    this.guard(token);
    const tenant = await this.tenantsRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);

    const newKey = `pak_${randomUUID().replace(/-/g, '')}`;
    tenant.apiKeyHash = hashApiKey(newKey);
    await this.tenantsRepo.save(tenant);

    return {
      message: 'API key reset. Save this key — it will not be shown again.',
      tenantId: tenant.id,
      tenantName: tenant.name,
      apiKey: newKey,
    };
  }
}
