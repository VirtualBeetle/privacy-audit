import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiProviderSettingDocument = AiProviderSetting & Document;

export type AiProvider = 'claude' | 'gemini' | 'openai';

@Schema({ timestamps: true, collection: 'ai_provider_settings' })
export class AiProviderSetting {
  @Prop({ required: true, enum: ['claude', 'gemini', 'openai'] })
  provider: AiProvider;

  /** Human-readable label, e.g. "Claude Opus (primary)" */
  @Prop({ required: true })
  label: string;

  /** Exact model identifier, e.g. "claude-opus-4-6", "gemini-1.5-pro", "gpt-4o" */
  @Prop({ required: true })
  model: string;

  /** AES-256-GCM encrypted API key — use encryption.util to read/write */
  @Prop({ required: true })
  encryptedApiKey: string;

  /** Only one provider can be active at a time */
  @Prop({ default: false })
  isActive: boolean;

  /** Who last updated this record */
  @Prop({ default: 'system' })
  updatedBy: string;
}

export const AiProviderSettingSchema =
  SchemaFactory.createForClass(AiProviderSetting);
