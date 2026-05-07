import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { AuditEvent } from '../events/audit-event.entity';
import { Tenant } from '../tenants/tenant.entity';
import { DataMinimisationViolation } from '../data-minimisation/data-minimisation-violation.entity';
import { EventStreamService } from '../events/event-stream.service';
import { AUDIT_EVENTS_QUEUE } from './queue.constants';

function computeEventHash(event: Partial<AuditEvent>, prevHash: string | null): string {
  const input = [
    event.eventId,
    event.tenantId,
    event.tenantUserId,
    event.actionCode,
    JSON.stringify([...(event.dataFields ?? [])].sort()),
    event.occurredAt instanceof Date ? event.occurredAt.toISOString() : event.occurredAt,
    prevHash ?? '',
  ].join('|');
  return createHash('sha256').update(input).digest('hex');
}

/**
 * AuditEventProcessor
 *
 * Consumes jobs from the audit-events BullMQ queue. Each job holds the raw
 * validated event DTO plus the tenantId resolved by ApiKeyGuard.
 *
 * Processing steps:
 *   1. Idempotency check — discard if eventId already exists.
 *   2. Fetch the tenant's most recent event to continue the hash chain.
 *   3. Compute SHA-256 hash, persist to DB.
 *   4. GDPR Art.5(1)(c): check data fields against tenant's allowedDataFields.
 *      If any field is not permitted, save a DataMinimisationViolation record.
 *   5. Emit the new event (+ any violation) to EventStreamService for SSE push.
 */
@Processor(AUDIT_EVENTS_QUEUE)
export class AuditEventProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditEventProcessor.name);

  constructor(
    @InjectRepository(AuditEvent)
    private readonly eventsRepository: Repository<AuditEvent>,
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
    @InjectRepository(DataMinimisationViolation)
    private readonly violationsRepository: Repository<DataMinimisationViolation>,
    private readonly eventStreamService: EventStreamService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { tenantId, dto } = job.data;

    // ── 1. Idempotency ────────────────────────────────────────────────────────
    const existing = await this.eventsRepository.findOne({
      where: { eventId: dto.eventId },
    });
    if (existing) {
      this.logger.warn(`Duplicate eventId=${dto.eventId} — discarded`);
      return;
    }

    // ── 2. Hash chain ─────────────────────────────────────────────────────────
    const lastEvent = await this.eventsRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    const prevHash = lastEvent?.hash ?? null;

    // ── 3. Build + persist event ──────────────────────────────────────────────
    const event = new AuditEvent();
    event.tenantId = tenantId;
    event.tenantUserId = dto.tenantUserId;
    event.eventId = dto.eventId;
    event.actionCode = dto.action.code;
    event.actionLabel = dto.action.label;
    event.dataFields = dto.dataFields;
    event.reasonCode = dto.reason.code;
    event.reasonLabel = dto.reason.label;
    event.actorType = dto.actor.type;
    event.actorLabel = dto.actor.label;
    event.actorIdentifier = dto.actor.identifier ?? null;
    event.sensitivityCode = dto.sensitivity.code;
    event.thirdPartyInvolved = dto.thirdPartyInvolved ?? false;
    event.thirdPartyName = dto.thirdPartyName ?? null;
    event.retentionDays = dto.retentionDays ?? 90;
    event.region = dto.region ?? null;
    event.consentObtained = dto.consentObtained ?? false;
    event.userOptedOut = dto.userOptedOut ?? false;
    event.meta = dto.meta ?? null;
    event.occurredAt = new Date(dto.occurredAt);
    event.prevHash = prevHash;
    event.hash = computeEventHash(event, prevHash);

    const saved = await this.eventsRepository.save(event);
    this.logger.log(`Processed eventId=${dto.eventId} tenant=${tenantId}`);

    // ── 4. Data Minimisation check (GDPR Art.5(1)(c)) ────────────────────────
    let violation: { violatingFields: string[]; allowedFields: string[]; tenantName: string | null } | null = null;

    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });

    if (tenant?.allowedDataFields && tenant.allowedDataFields.length > 0) {
      const allowed = new Set(tenant.allowedDataFields.map((f) => f.toLowerCase()));
      const violating = (dto.dataFields as string[]).filter(
        (f) => !allowed.has(f.toLowerCase()),
      );

      if (violating.length > 0) {
        const record = this.violationsRepository.create({
          tenantId,
          tenantUserId: dto.tenantUserId,
          eventId: dto.eventId,
          violatingFields: violating,
          allowedFields: tenant.allowedDataFields,
          tenantName: tenant.name,
        });
        await this.violationsRepository.save(record);

        violation = {
          violatingFields: violating,
          allowedFields: tenant.allowedDataFields,
          tenantName: tenant.name,
        };

        this.logger.warn(
          `Data minimisation violation — tenant=${tenant.name} fields=${violating.join(',')}`,
        );
      }
    }

    // ── 5. SSE broadcast ──────────────────────────────────────────────────────
    this.eventStreamService.emit(tenantId, dto.tenantUserId, saved, violation);
  }
}
