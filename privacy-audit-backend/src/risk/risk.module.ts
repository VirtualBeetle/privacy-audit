import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskService } from './risk.service';
import { RiskAlert } from './risk-alert.entity';
import { AuditEvent } from '../events/audit-event.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { AiChatModule } from '../ai-chat/ai-chat.module';
import { EmailModule } from '../email/email.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiskAlert, AuditEvent, Tenant, User]),
    AiOrchestrationModule,
    AiChatModule,
    EmailModule,
    WebhooksModule,
  ],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
