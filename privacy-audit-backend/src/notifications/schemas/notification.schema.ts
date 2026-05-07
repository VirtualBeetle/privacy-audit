import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  /** Who should receive this notification */
  @Prop({ required: true, enum: ['super_admin', 'tenant_admin', 'tenant_user', 'google_user'] })
  recipientType: string;

  /** Null = broadcast to all admins; set to scope to one tenant */
  @Prop({ default: null })
  tenantId: string | null;

  /** Set to scope to a specific tenant end-user */
  @Prop({ default: null })
  tenantUserId: string | null;

  @Prop({ required: true, enum: ['risk_alert', 'gdpr_request', 'breach', 'system'] })
  type: string;

  @Prop({ default: null, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', null] })
  severity: string | null;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false, index: true })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipientType: 1, tenantId: 1, read: 1 });
