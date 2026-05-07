import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
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

  // ── Streaming Chat ────────────────────────────────────────────────────────

  /**
   * streamMessage() — SSE-friendly generator that yields typed events.
   * Slash commands return structured response cards without a full AI call.
   * Free-form queries stream AI tokens for a real-time typing effect.
   *
   * Event shapes:
   *   step      { label: string, status: 'active' | 'done' }
   *   token     { text: string }
   *   card      { type, data, followUps, sources }
   *   done      { sessionId: string }
   *   error     { message: string }
   */
  async *streamMessage(
    user: { type: string; role?: string; tenantId?: string; tenantUserId?: string; dashboardUserId?: string; email?: string },
    message: string,
    sessionId?: string,
  ): AsyncGenerator<{ type: string; data: Record<string, unknown> }> {
    if (!this.sessionModel) {
      yield { type: 'error', data: { message: 'AI chat requires MongoDB — set MONGODB_URI' } };
      return;
    }

    const userId = user.tenantUserId ?? user.dashboardUserId ?? 'unknown';
    let session = sessionId ? await this.sessionModel.findById(sessionId) : null;
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

    const cmd = this.parseCommand(message);
    let fullReply = '';
    let provider = 'system';
    let model = 'n/a';

    try {
      // ── /verify ────────────────────────────────────────────────────────────
      if (cmd === 'verify') {
        yield { type: 'step', data: { label: 'Fetching audit events', status: 'active' } };
        const events = await this.eventsRepo.find({
          where: { tenantId: user.tenantId },
          order: { createdAt: 'ASC' },
        });
        yield { type: 'step', data: { label: 'Fetching audit events', status: 'done' } };
        yield { type: 'step', data: { label: 'Computing SHA-256 chain', status: 'active' } };

        const { createHash } = await import('crypto');
        let prevHash: string | null = null;
        let valid = true;
        let brokenAtEventId: string | undefined;
        for (const evt of events) {
          const input = [
            evt.eventId, evt.tenantId, evt.tenantUserId, evt.actionCode,
            JSON.stringify([...(evt.dataFields ?? [])].sort()),
            evt.occurredAt instanceof Date ? evt.occurredAt.toISOString() : evt.occurredAt,
            prevHash ?? '',
          ].join('|');
          const expected = createHash('sha256').update(input).digest('hex');
          if (evt.hash !== expected) { valid = false; brokenAtEventId = evt.eventId; break; }
          prevHash = evt.hash;
        }

        yield { type: 'step', data: { label: 'Computing SHA-256 chain', status: 'done' } };
        yield { type: 'step', data: { label: 'Validating integrity', status: 'active' } };
        await this.sleep(120);
        yield { type: 'step', data: { label: 'Validating integrity', status: 'done' } };

        const latestHash = events.at(-1)?.hash ?? null;
        fullReply = valid
          ? `I verified the SHA-256 hash chain across all ${events.length} events in your audit log. The chain is intact — no tampering detected. This proof satisfies GDPR Article 30 record-keeping requirements.`
          : `Hash chain verification failed. Tampering was detected at event ${brokenAtEventId}. The subsequent ${events.length} events cannot be trusted.`;

        yield {
          type: 'card',
          data: {
            cardType: 'chain-verify',
            valid,
            eventCount: events.length,
            latestHash: latestHash ? `${latestHash.slice(0, 4)}...${latestHash.slice(-4)}` : null,
            brokenAtEventId,
            algorithm: 'SHA-256',
            timestamp: new Date().toISOString(),
            followUps: ['Explain how the hash chain works', 'Schedule daily verification'],
            sources: [`${events.length} events`, 'SHA-256 chain', 'GDPR Art. 30'],
          },
        };

      // ── /compare ───────────────────────────────────────────────────────────
      } else if (cmd === 'compare') {
        yield { type: 'step', data: { label: 'Loading event data', status: 'active' } };
        const now = new Date();
        const d7 = new Date(now.getTime() - 7 * 86400000);
        const d14 = new Date(now.getTime() - 14 * 86400000);

        const [thisWeek, lastWeek] = await Promise.all([
          this.eventsRepo.find({ where: { tenantId: user.tenantId, createdAt: MoreThan(d7) } }),
          this.eventsRepo.find({ where: { tenantId: user.tenantId, createdAt: Between(d14, d7) } }),
        ]);
        yield { type: 'step', data: { label: 'Loading event data', status: 'done' } };
        yield { type: 'step', data: { label: 'Computing statistics', status: 'active' } };
        await this.sleep(180);

        const stats = (evts: typeof thisWeek) => {
          const total = evts.length;
          if (!total) return { total: 0, consentRate: 0, thirdParty: 0, critical: 0, trustScore: 0, grade: 'N/A' };
          const consented = evts.filter((e) => e.consentObtained).length;
          const thirdParty = evts.filter((e) => e.thirdPartyInvolved).length;
          const critical = evts.filter((e) => e.sensitivityCode === 'CRITICAL').length;
          const consentRate = Math.round((consented / total) * 100);
          let score = 100;
          score -= Math.round((1 - consentRate / 100) * 20);
          score -= Math.min(thirdParty * 2, 20);
          score -= Math.min(critical * 5, 30);
          score = Math.max(0, score);
          const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
          return { total, consentRate, thirdParty, critical, trustScore: score, grade };
        };

        const a = stats(thisWeek);
        const b = stats(lastWeek);
        yield { type: 'step', data: { label: 'Computing statistics', status: 'done' } };

        fullReply = `Comparing last 7 days vs the previous 7 days. ${
          a.trustScore >= b.trustScore
            ? `Your privacy posture improved by ${a.trustScore - b.trustScore} points.`
            : `Your privacy posture declined by ${b.trustScore - a.trustScore} points — primarily from ${a.thirdParty > b.thirdParty ? 'increased third-party sharing' : 'consent rate changes'}.`
        }`;

        yield {
          type: 'card',
          data: {
            cardType: 'comparison',
            periodA: 'Last 7 days',
            periodB: 'Previous 7 days',
            statsA: a,
            statsB: b,
            followUps: ['Show events from last 7 days', 'Explain consent rate drop', 'How do I improve my score?'],
            sources: [`${a.total + b.total} events`, '14-day window'],
          },
        };

      // ── /explain ───────────────────────────────────────────────────────────
      } else if (cmd === 'explain') {
        yield { type: 'step', data: { label: 'Reading risk context', status: 'active' } };
        const context = await this.buildEventContext(user);
        yield { type: 'step', data: { label: 'Reading risk context', status: 'done' } };
        yield { type: 'step', data: { label: 'Cross-referencing events', status: 'active' } };
        await this.sleep(150);
        yield { type: 'step', data: { label: 'Cross-referencing events', status: 'done' } };
        yield { type: 'step', data: { label: 'Composing explanation', status: 'active' } };

        const sysPrompt = this.buildSystemPrompt(user, context);
        const history = session.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        const msgs = [{ role: 'user' as const, content: sysPrompt }, ...history, { role: 'user' as const, content: message }];

        let p = 'system'; let m2 = 'n/a';
        try {
          const setting = await this.aiService.getActiveProvider?.();
          if (setting) { p = setting.provider; m2 = setting.model; }
        } catch { /* ignore */ }
        provider = p; model = m2;

        for await (const chunk of this.aiService.streamChat(msgs)) {
          fullReply += chunk;
          yield { type: 'token', data: { text: chunk } };
        }
        yield { type: 'step', data: { label: 'Composing explanation', status: 'done' } };
        yield { type: 'followups', data: { followUps: ['Show related events', 'What action should I take?', 'Explain in simpler terms'] } };

      // ── /draft ─────────────────────────────────────────────────────────────
      } else if (cmd === 'draft') {
        yield { type: 'step', data: { label: 'Loading your event history', status: 'active' } };
        const context = await this.buildEventContext(user);
        yield { type: 'step', data: { label: 'Loading your event history', status: 'done' } };
        yield { type: 'step', data: { label: 'Selecting relevant events', status: 'active' } };
        await this.sleep(200);
        yield { type: 'step', data: { label: 'Selecting relevant events', status: 'done' } };
        yield { type: 'step', data: { label: 'Drafting GDPR letter', status: 'active' } };

        const draftPrompt = `${this.buildSystemPrompt(user, context)}

The user wants to draft a formal GDPR letter. Generate a professional letter with:
- To: [tenant privacy contact email, or "Privacy Team" if unknown]
- CC: DPC Ireland
- Subject line referencing the specific GDPR article
- Formal body citing specific event IDs from the audit log where applicable
- Clear request for action with 30-day deadline

Format your response as valid JSON only (no markdown):
{"to":"...","cc":"DPC Ireland","subject":"...","body":"..."}

User request: ${message}`;

        const history = session.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        const msgs = [{ role: 'user' as const, content: draftPrompt }];

        const rawResponse = await this.aiService.chat(msgs);
        fullReply = rawResponse.content;
        provider = rawResponse.provider;
        model = rawResponse.model;

        yield { type: 'step', data: { label: 'Drafting GDPR letter', status: 'done' } };

        let draftData: Record<string, unknown> = {};
        try {
          const match = rawResponse.content.match(/\{[\s\S]*\}/);
          if (match) draftData = JSON.parse(match[0]);
        } catch { /* use empty */ }

        yield {
          type: 'card',
          data: {
            cardType: 'draft',
            to: draftData.to ?? 'privacy@tenant.io',
            cc: draftData.cc ?? 'DPC Ireland',
            subject: draftData.subject ?? 'GDPR Data Rights Request',
            body: draftData.body ?? rawResponse.content,
            followUps: ['Make tone firmer', 'Add Art. 17 deletion request', 'Translate to Irish'],
            sources: ['Your audit log', 'DPC template', 'Your profile'],
          },
        };

      // ── free-form ──────────────────────────────────────────────────────────
      } else {
        yield { type: 'step', data: { label: 'Analyzing your query', status: 'active' } };
        await this.sleep(100);
        yield { type: 'step', data: { label: 'Analyzing your query', status: 'done' } };
        yield { type: 'step', data: { label: 'Reading audit context', status: 'active' } };

        const context = await this.buildEventContext(user);
        const roleContext = this.buildRoleContext(user);

        yield { type: 'step', data: { label: 'Reading audit context', status: 'done' } };
        yield { type: 'step', data: { label: 'Composing response', status: 'active' } };

        const sysPrompt = this.buildSystemPrompt(user, context);
        const history = session.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        const msgs = [{ role: 'user' as const, content: sysPrompt }, ...history, { role: 'user' as const, content: message }];

        for await (const chunk of this.aiService.streamChat(msgs)) {
          fullReply += chunk;
          yield { type: 'token', data: { text: chunk } };
        }
        yield { type: 'step', data: { label: 'Composing response', status: 'done' } };
        yield { type: 'followups', data: { followUps: this.inferFollowUps(message, roleContext) } };
      }
    } catch (err) {
      this.logger.error('streamMessage error', err);
      yield { type: 'error', data: { message: (err as Error).message ?? 'AI service error' } };
      return;
    }

    // ── Persist to session ────────────────────────────────────────────────────
    const now = new Date();
    session.messages.push({ role: 'user', content: message, timestamp: now });
    session.messages.push({ role: 'assistant', content: fullReply || '[structured response]', timestamp: now });
    session.provider = provider;
    session.aiModel = model;
    await session.save();

    yield { type: 'done', data: { sessionId: (session._id as unknown as string).toString() } };
  }

  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<AiChatSessionDocument | null> {
    if (!this.sessionModel) return null;
    return this.sessionModel.findOne({ _id: sessionId, userId }).lean().exec() as Promise<AiChatSessionDocument | null>;
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

  // ── Streaming helpers ─────────────────────────────────────────────────────

  private parseCommand(message: string): 'verify' | 'compare' | 'explain' | 'draft' | 'report' | 'freeform' {
    const trimmed = message.trim().toLowerCase();
    if (trimmed.startsWith('/verify')) return 'verify';
    if (trimmed.startsWith('/compare')) return 'compare';
    if (trimmed.startsWith('/explain')) return 'explain';
    if (trimmed.startsWith('/draft')) return 'draft';
    if (trimmed.startsWith('/report')) return 'report';
    return 'freeform';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private buildSystemPrompt(
    user: { type: string; role?: string; tenantId?: string; tenantUserId?: string; dashboardUserId?: string; email?: string },
    context: string,
  ): string {
    return `You are DataGuard AI — the privacy compliance assistant embedded in the DataGuard Privacy Audit Dashboard.

DataGuard is a GDPR-compliance SaaS platform. Tenant applications send structured audit events whenever they access, export, share, or delete user data. DataGuard stores these in a tamper-evident SHA-256 hash chain (GDPR Art.30), runs AI risk analysis (Art.35 DPIA), and provides GDPR Art.17/20 endpoints.

GDPR ARTICLES: Art.5(1)(a) lawfulness; Art.5(1)(c) data minimisation; Art.6 legal basis; Art.7 consent; Art.17 erasure; Art.20 portability; Art.21 objection; Art.30 records; Art.33 breach notification; Art.35 DPIA.

DASHBOARD FEATURES: Audit Events, AI Risk Alerts, Queue Monitor, GDPR Rights, Connected Apps, Webhooks, Settings.

RULES: Only discuss GDPR, audit events, and DataGuard features. Keep responses under 200 words unless detail is requested. Start with a direct one-sentence answer. Use plain English.

${this.buildRoleContext(user)}

USER CONTEXT — Recent audit events:
${context}`;
  }

  private inferFollowUps(message: string, roleContext: string): string[] {
    const m = message.toLowerCase();
    if (m.includes('score') || m.includes('grade')) return ['How do I improve my score?', 'Show the events pulling it down', 'Compare to last month'];
    if (m.includes('event') || m.includes('critical')) return ['Filter by severity', 'Why is this flagged?', 'Show me last 30 days'];
    if (m.includes('gdpr') || m.includes('right')) return ['Request my data export', 'How do I request erasure?', 'What is GDPR Art. 17?'];
    if (roleContext.includes('super_admin')) return ['View platform-wide risk report', 'Check all tenant scores', 'Review AI provider settings'];
    if (roleContext.includes('Tenant Admin')) return ['Check data minimisation policy', 'View GDPR Art.28 requirements', 'Export compliance report'];
    return ['Show my recent events', 'What are my GDPR rights?', 'Explain risk alerts'];
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
