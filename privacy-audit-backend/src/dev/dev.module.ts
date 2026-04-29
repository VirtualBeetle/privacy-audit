import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DevController } from './dev.controller';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { RiskModule } from '../risk/risk.module';
import { RetentionModule } from '../retention/retention.module';
import { EmailModule } from '../email/email.module';
import { AuditEvent } from '../events/audit-event.entity';
import { Tenant } from '../tenants/tenant.entity';
import { AUDIT_EVENTS_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditEvent, Tenant]),
    BullModule.registerQueue({ name: AUDIT_EVENTS_QUEUE }),
    AiOrchestrationModule,
    RiskModule,
    RetentionModule,
    EmailModule,
  ],
  controllers: [DevController],
})
export class DevModule {}
