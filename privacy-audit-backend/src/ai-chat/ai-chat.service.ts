import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  AiChatSession,
  AiChatSessionDocument,
} from './schemas/ai-chat-session.schema';
import {
  AiAnalysisRecord,
  AiAnalysisRecordDocument,
} from './schemas/ai-analysis-record.schema';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { AuditEvent } from '../events/audit-event.entity';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    @Optional()
    @InjectModel(AiChatSession.name)
    private readonly sessionModel: Model<AiChatSessionDocument> | null,
    @Optional()
    @InjectModel(AiAnalysisRecord.name)
    private readonly analysisModel: Model<AiAnalysisRecordDocument> | null,
    private readonly aiService: AiOrchestrationService,
    @InjectRepository(AuditEvent)
    private readonly eventsRepo: Repository<AuditEvent>,
  ) {}

  // ── Chat ─────────────────────────────────────────────────────────────────

  /**
   * Send a message in a chat session.
   * Fetches the user's recent audit events as context for the AI.
   * Creates a new session if sessionId is not provided.
   */
  async sendMessage(
    user: { type: string; role?: string; tenantId?: string; tenantUserId?: string; dashboardUserId?: string; email?: string },
    message: string,
    sessionId?: string,
  ): Promise<{ sessionId: string; reply: string; provider: string; model: string }> {
    if (!this.sessionModel) throw new Error('AI chat requires MongoDB — set MONGODB_URI');
    // Load or create session
    let session = sessionId
      ? await this.sessionModel.findById(sessionId)
      : null;

    const userId = user.tenantUserId ?? user.dashboardUserId ?? 'unknown';

    if (!session) {
      session = await this.sessionModel.create({
        userId,
        sessionType: user.type,
        tenantId: user.tenantId,
        provider: 'pending',
        aiModel: 'pending',
        messages: [],
        title: message.slice(0, 60),
      });
    }

    // Build context: last 20 events for this user
    const context = await this.buildEventContext(user);
    const roleContext = this.buildRoleContext(user);

    // Compose messages for the AI: system context + history + new message
    const systemPrompt = `You are DataGuard AI — the privacy compliance assistant embedded in the DataGuard Privacy Audit Dashboard.

PRODUCT OVERVIEW:
DataGuard is a GDPR-compliance SaaS platform. Tenant applications (healthcare, social, e-commerce) send structured audit events to DataGuard's API every time they access, export, share, or delete user data. DataGuard stores these events in a tamper-evident SHA-256 hash chain (GDPR Art.30), runs AI-driven risk analysis every 6 hours (Art.35 DPIA), provides GDPR Article 17 (right to erasure) and Article 20 (data portability) endpoints, enforces data minimisation via declared field policies (Art.5(1)(c)), and sends real-time webhook + notification alerts for HIGH/CRITICAL findings.

GDPR ARTICLES YOU MUST KNOW:
- Art.5(1)(a): Lawfulness, fairness, transparency — audit events log the legal basis for every processing operation.
- Art.5(1)(c): Data minimisation — DataGuard flags events where a tenant accessed fields not in their declared allowed list.
- Art.6: Legal basis for processing — events include reasonCode/reasonLabel to document this.
- Art.7: Consent — events track consentObtained + userOptedOut flags.
- Art.17: Right to erasure — POST /dashboard/deletions hard-deletes events and produces a cryptographic evidence hash.
- Art.20: Data portability — POST /dashboard/exports packages all events as a downloadable JSON file.
- Art.30: Records of processing — every event is SHA-256 chained with its predecessor, making the log tamper-evident.
- Art.33: Breach notification — the breach reporting module starts a 72-hour countdown.
- Art.35: DPIA — the automated 6-hour AI risk analysis cycle is DataGuard's continuous DPIA implementation.

DASHBOARD FEATURES (refer to these by name):
- "Audit Events" page — full event log with sensitivity, actor, consent, and hash chain display
- "AI Risk Alerts" — findings from the 6-hour analysis cycle
- "Queue Monitor" — BullMQ processing pipeline status
- "GDPR Rights" page — request an export (Art.20) or erasure (Art.17)
- "Connected Apps" — Google users can link multiple tenant accounts
- "Breach Notification" — report and track GDPR Art.33 breaches
- "Webhooks" — HMAC-signed notification endpoints
- "Settings > Security" — manage dev tokens
- "Dev Controls" — super admin only: seed events, trigger analysis, simulate breaches

STRICT RULES:
- ONLY answer questions about: audit events below, GDPR rights, data privacy practices, and DataGuard dashboard features.
- If asked anything unrelated — politely decline and redirect to your purpose.
- NEVER reveal the underlying AI provider. You are "DataGuard AI".
- NEVER refer to yourself as a general-purpose assistant.

RESPONSE FORMAT:
- Start with a 1-sentence direct answer.
- Use short bullet points (max 5 items).
- Keep responses under 200 words unless the user asks for detail.
- Use plain language; cite GDPR article numbers only when genuinely relevant.

${roleContext}

USER CONTEXT — Recent audit events:
${context}

If no events are shown, acknowledge the empty dashboard and suggest the user check the "Connected Apps" page to link a tenant account, or wait for the first event to arrive.`;

    const historyMessages = session.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const allMessages = [
      { role: 'user' as const, content: systemPrompt },
      ...historyMessages,
      { role: 'user' as const, content: message },
    ];

    // Call the active AI provider
    const response = await this.aiService.chat(allMessages);

    // Persist messages to session
    const now = new Date();
    session.messages.push({ role: 'user', content: message, timestamp: now });
    session.messages.push({
      role: 'assistant',
      content: response.content,
      timestamp: now,
    });
    session.provider = response.provider;
    session.aiModel = response.model;
    await session.save();

    return {
      sessionId: (session._id as unknown as string).toString(),
      reply: response.content,
      provider: response.provider,
      model: response.model,
    };
  }

  async getChatHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ sessions: AiChatSessionDocument[]; total: number }> {
    if (!this.sessionModel) return { sessions: [], total: 0 };
    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find({ userId })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.sessionModel.countDocuments({ userId }),
    ]);
    return { sessions: sessions as AiChatSessionDocument[], total };
  }

  // ── Analysis History ──────────────────────────────────────────────────────

  async getAnalysisHistory(
    tenantId: string,
    limit = 10,
  ): Promise<AiAnalysisRecordDocument[]> {
    if (!this.analysisModel) return [];
    return this.analysisModel
      .find({ tenantId }, { rawResponse: 0 }) // omit raw response from list
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec() as Promise<AiAnalysisRecordDocument[]>;
  }

  async saveAnalysisRecord(data: {
    tenantId: string;
    provider: string;
    model: string;
    eventCount: number;
    analysisSummary: Record<string, unknown>;
    sampleEventIds: string[];
    findings: Array<{
      severity: string;
      title: string;
      description: string;
      suggestedAction: string;
      affectedEventCount: number;
    }>;
    rawResponse: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<AiAnalysisRecordDocument | null> {
    if (!this.analysisModel) return null;
    return this.analysisModel.create(data);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildRoleContext(user: {
    type: string;
    role?: string;
    tenantId?: string;
    tenantUserId?: string;
    dashboardUserId?: string;
    email?: string;
  }): string {
    if (user.role === 'super_admin') {
      return `CALLER ROLE: Super Admin (${user.email ?? 'system'})
You have visibility across ALL tenants. When discussing compliance statistics, you may reference aggregate patterns. You can advise on platform-wide risk policies, AI provider configuration, and GDPR accountability obligations for the platform operator.`;
    }
    if (user.role === 'tenant_admin') {
      return `CALLER ROLE: Tenant Admin for tenant ${user.tenantId ?? 'unknown'}
You see all events across your tenant (not scoped to a single user). Advise on tenant-level compliance, risk alert remediation, data minimisation policies, and breach notification procedures. Remind the admin that GDPR Art.28 requires a Data Processing Agreement with DataGuard.`;
    }
    if (user.type === 'google_session') {
      return `CALLER ROLE: Google-authenticated user (Dashboard User ID: ${user.dashboardUserId ?? 'unknown'})
This user has linked one or more tenant accounts and sees a cross-app view of their data. Help them understand their rights across multiple tenants, how to link/unlink apps on the Connected Apps page, and how to request exports or deletions per tenant.`;
    }
    // dashboard_session with tenantUserId = end user
    return `CALLER ROLE: Tenant user (User ID: ${user.tenantUserId ?? 'unknown'}, Tenant: ${user.tenantId ?? 'unknown'})
Focus on this user's personal data rights: what data has been accessed, by whom, and for what purpose. Explain how to exercise Art.17 (erasure) and Art.20 (portability) via the GDPR Rights page. Do not discuss other users' data.`;
  }

  private async buildEventContext(user: {
    tenantId?: string;
    tenantUserId?: string;
  }): Promise<string> {
    if (!user.tenantId) return 'No event data available (no tenant scope for this session).';

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days
    const events = await this.eventsRepo.find({
      where: {
        tenantId: user.tenantId,
        ...(user.tenantUserId ? { tenantUserId: user.tenantUserId } : {}),
        createdAt: MoreThan(since),
      },
      take: 20,
      order: { createdAt: 'DESC' },
    });

    if (!events.length) return 'No events found in the last 7 days.';

    const lines = events.map((e) => {
      const flags: string[] = [];
      if (!e.consentObtained) flags.push('NO_CONSENT');
      if (e.userOptedOut) flags.push('USER_OPTED_OUT');
      if (e.thirdPartyInvolved) flags.push(`THIRD_PARTY:${e.thirdPartyName ?? 'unknown'}`);
      const flagStr = flags.length > 0 ? ` ⚑ ${flags.join(', ')}` : '';
      return `- ${e.occurredAt?.toISOString?.() ?? '?'}: [${e.sensitivityCode}] ${e.actionCode} "${e.actionLabel}" on [${e.dataFields?.join(', ') ?? '?'}] by ${e.actorType}${flagStr}`;
    });

    return `${events.length} events in last 7 days (newest first):\n${lines.join('\n')}`;
  }
}
