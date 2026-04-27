import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventStreamService } from './event-stream.service';
import { AuditEvent } from './audit-event.entity';
import { Tenant } from '../tenants/tenant.entity';
import { DataMinimisationViolation } from '../data-minimisation/data-minimisation-violation.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AuditEventProcessor } from '../queue/audit-event.processor';
import { AUDIT_EVENTS_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditEvent, Tenant, DataMinimisationViolation]),
    TenantsModule,
    BullModule.registerQueue({ name: AUDIT_EVENTS_QUEUE }),
  ],
  controllers: [EventsController],
  providers: [EventsService, ApiKeyGuard, AuditEventProcessor, EventStreamService],
  exports: [EventsService, EventStreamService],
})
export class EventsModule {}
