import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiChatSessionDocument = AiChatSession & Document;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Schema({ timestamps: true, collection: 'ai_chat_sessions' })
export class AiChatSession {
  /** Either tenantUserId (dashboard_session) or dashboardUserId (google_session) */
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ['dashboard_session', 'google_session'] })
  sessionType: string;

  /** Which tenant's events were used as context */
  @Prop()
  tenantId?: string;

  /** Which AI provider answered (recorded for transparency) */
  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  aiModel: string;

  @Prop({
    type: [
      {
        role: String,
        content: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  messages: ChatMessage[];

  /** Short auto-generated title from the first user message */
  @Prop({ default: 'New conversation' })
  title: string;
}

export const AiChatSessionSchema = SchemaFactory.createForClass(AiChatSession);
