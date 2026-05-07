import { Controller, Get, Put, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { DashboardAnyGuard } from '../common/guards/dashboard.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

@Controller('notifications')
@UseGuards(DashboardAnyGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  getAll(@CurrentUser() user: any) {
    return this.svc.getForUser(user);
  }

  @Get('unread-count')
  async getCount(@CurrentUser() user: any) {
    const count = await this.svc.getUnreadCount(user);
    return { count };
  }

  @Put(':id/read')
  async markOne(@Param('id') id: string) {
    await this.svc.markRead(id);
    return { ok: true };
  }

  @Put('read-all')
  async markAll(@CurrentUser() user: any) {
    await this.svc.markAllRead(user);
    return { ok: true };
  }
}
