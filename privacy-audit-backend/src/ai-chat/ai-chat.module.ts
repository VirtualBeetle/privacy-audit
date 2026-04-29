import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AiChatSession,
  AiChatSessionSchema,
} from './schemas/ai-chat-session.schema';
import {
  AiAnalysisRecord,
  AiAnalysisRecordSchema,
} from './schemas/ai-analysis-record.schema';
import { AiChatService } from './ai-chat.service';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { AuditEvent } from '../events/audit-event.entity';

const mongooseFeature = process.env.MONGODB_URI
  ? [MongooseModule.forFeature([
      { name: AiChatSession.name, schema: AiChatSessionSchema },
      { name: AiAnalysisRecord.name, schema: AiAnalysisRecordSchema },
    ])]
  : [];

@Module({
  imports: [
    ...mongooseFeature,
    TypeOrmModule.forFeature([AuditEvent]),
    AiOrchestrationModule,
  ],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiChatModule {}
