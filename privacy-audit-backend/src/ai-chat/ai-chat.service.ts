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
    user: { type: string; tenantId?: string; tenantUserId?: string; dashboardUserId?: string },
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

    // Compose messages for the AI: system context + history + new message
    const systemPrompt = `You are DataGuard AI, the privacy assistant built into the DataGuard Privacy Audit platform.

YOUR ROLE: Help users understand their personal data activity, GDPR rights, and privacy compliance.

STRICT RULES:
- ONLY answer questions about: the user's audit events below, GDPR rights (Articles 7, 17, 20, 33), data privacy practices, and how to use the DataGuard dashboard features.
- If asked anything unrelated to privacy, GDPR, or the user's data — politely decline and redirect to your purpose.
- NEVER reveal you are built on Gemini, Claude, OpenAI, or any third-party AI. You are "DataGuard AI", full stop.
- NEVER refer to yourself as a general-purpose assistant.

RESPONSE FORMAT:
- Start with a 1-sentence direct answer.
- Use short bullet points for lists (max 5 items).
- Keep total response under 150 words unless the user explicitly asks for detail.
- Refer to dashboard features by name: "Article 20 Export", "Article 17 Erasure", "Consent Management", "AI Risk Alerts".
- Use plain language — only use GDPR article numbers when genuinely relevant.

USER CONTEXT — Audit events from the last 7 days:
${context}

If no events are shown, tell the user their dashboard is empty and suggest connecting an app via the dashboard.`;

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

  private async buildEventContext(user: {
    tenantId?: string;
    tenantUserId?: string;
  }): Promise<string> {
    if (!user.tenantId) return 'No event data available.';

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

    if (!events.length) return 'No recent events found (last 7 days).';

    const lines = events.map(
      (e) =>
        `- ${e.occurredAt?.toISOString?.() ?? 'unknown time'}: ${e.actionCode} on ${e.dataFields?.join(', ') ?? 'unknown fields'} (sensitivity: ${e.sensitivityCode}, actor: ${e.actorType})`,
    );

    return `Last ${events.length} events (most recent first):\n${lines.join('\n')}`;
  }
}
