import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

export interface CreateNotificationDto {
  recipientType: 'super_admin' | 'tenant_admin' | 'tenant_user' | 'google_user';
  tenantId?: string | null;
  tenantUserId?: string | null;
  type: 'risk_alert' | 'gdpr_request' | 'breach' | 'system';
  severity?: string | null;
  title: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Optional()
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument> | null,
  ) {}

  private get available(): boolean {
    return !!this.model;
  }

  async create(dto: CreateNotificationDto): Promise<void> {
    if (!this.available) return;
    try {
      await this.model!.create(dto);
    } catch (err) {
      this.logger.warn(`Failed to create notification: ${err}`);
    }
  }

  async getForUser(user: {
    type: string;
    role?: string;
    tenantId?: string;
    tenantUserId?: string;
    dashboardUserId?: string;
  }): Promise<NotificationDocument[]> {
    if (!this.available) return [];
    try {
      const query = this.buildQuery(user);
      return await this.model!
        .find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean<NotificationDocument[]>();
    } catch {
      return [];
    }
  }

  async getUnreadCount(user: {
    type: string;
    role?: string;
    tenantId?: string;
    tenantUserId?: string;
  }): Promise<number> {
    if (!this.available) return 0;
    try {
      const query = { ...this.buildQuery(user), read: false };
      return await this.model!.countDocuments(query);
    } catch {
      return 0;
    }
  }

  async markRead(id: string): Promise<void> {
    if (!this.available) return;
    await this.model!.findByIdAndUpdate(id, { read: true });
  }

  async markAllRead(user: {
    type: string;
    role?: string;
    tenantId?: string;
    tenantUserId?: string;
  }): Promise<void> {
    if (!this.available) return;
    const query = { ...this.buildQuery(user), read: false };
    await this.model!.updateMany(query, { read: true });
  }

  private buildQuery(user: {
    type: string;
    role?: string;
    tenantId?: string;
    tenantUserId?: string;
  }): Record<string, any> {
    if (user.role === 'super_admin') {
      return { recipientType: 'super_admin' };
    }
    if (user.role === 'tenant_admin') {
      return { recipientType: 'tenant_admin', tenantId: user.tenantId ?? null };
    }
    if (user.tenantUserId) {
      return {
        recipientType: 'tenant_user',
        tenantId: user.tenantId ?? null,
        tenantUserId: user.tenantUserId,
      };
    }
    return { recipientType: 'google_user' };
  }
}
