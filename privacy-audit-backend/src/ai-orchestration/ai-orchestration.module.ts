import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AiProviderSetting,
  AiProviderSettingSchema,
} from './schemas/ai-provider-setting.schema';
import { AiOrchestrationService } from './ai-orchestration.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiProviderSetting.name, schema: AiProviderSettingSchema },
    ]),
  ],
  providers: [AiOrchestrationService],
  exports: [AiOrchestrationService],
})
export class AiOrchestrationModule {}
