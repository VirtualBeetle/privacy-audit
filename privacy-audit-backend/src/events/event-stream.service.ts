import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuditEvent } from './audit-event.entity';

interface StreamPayload {
  tenantId: string;
  tenantUserId: string;
  event: Partial<AuditEvent>;
  violation?: {
    violatingFields: string[];
    allowedFields: string[];
    tenantName: string | null;
  } | null;
}

/**
 * EventStreamService
 *
 * Central RxJS Subject that broadcasts newly persisted audit events to any
 * active SSE subscriber. The processor calls emit() after each DB save; the
 * dashboard SSE endpoint subscribes and filters by the authenticated user's
 * tenantId / tenantUserId pairs.
 *
 * No persistence — only clients connected at the moment of emission receive
 * the event. Historical events are fetched via GET /api/dashboard/events.
 */
@Injectable()
export class EventStreamService {
  private readonly subject = new Subject<StreamPayload>();

  emit(
    tenantId: string,
    tenantUserId: string,
    event: Partial<AuditEvent>,
    violation?: StreamPayload['violation'],
  ): void {
    this.subject.next({ tenantId, tenantUserId, event, violation });
  }

  /** Returns an Observable filtered to the given (tenantId, tenantUserId) pair. */
  streamFor(
    tenantId: string,
    tenantUserId: string,
  ): Observable<{ data: string }> {
    return this.subject.pipe(
      filter(
        (p) => p.tenantId === tenantId && p.tenantUserId === tenantUserId,
      ),
      map((p) => ({ data: JSON.stringify(p) })),
    );
  }

  /** Returns an Observable filtered to any of the supplied pairs (google_session). */
  streamForMany(
    pairs: Array<{ tenantId: string; tenantUserId: string }>,
  ): Observable<{ data: string }> {
    return this.subject.pipe(
      filter((p) =>
        pairs.some(
          (pair) =>
            pair.tenantId === p.tenantId &&
            pair.tenantUserId === p.tenantUserId,
        ),
      ),
      map((p) => ({ data: JSON.stringify(p) })),
    );
  }
}
