import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AiProviderSetting,
  AiProviderSettingSchema,
} from './schemas/ai-provider-setting.schema';
import { AiOrchestrationService } from './ai-orchestration.service';

const mongooseFeature = process.env.MONGODB_URI
  ? [MongooseModule.forFeature([{ name: AiProviderSetting.name, schema: AiProviderSettingSchema }])]
  : [];

@Module({
  imports: [...mongooseFeature],
  providers: [AiOrchestrationService],
  exports: [AiOrchestrationService],
})
export class AiOrchestrationModule {}
