import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { DashboardAnyGuard } from '../common/guards/dashboard.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

/**
 * WebhooksController — HMAC-signed webhook delivery
 *
 * POST   /api/webhooks         — register a webhook endpoint
 * GET    /api/webhooks         — list active webhooks (secrets hidden)
 * DELETE /api/webhooks/:id     — deactivate a webhook
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /api/webhooks
   * Body: { url, triggerOn? }
   * triggerOn: 'ALL_RISK' (default) | 'HIGH_RISK' | 'CRITICAL_RISK'
   */
  @Post()
  @UseGuards(DashboardAnyGuard)
  @HttpCode(HttpStatus.CREATED)
  register(
    @CurrentUser() user: any,
    @Body() body: { url: string; triggerOn?: string },
  ) {
    return this.webhooksService.register(user.tenantId, body.url, body.triggerOn);
  }

  @Get()
  @UseGuards(DashboardAnyGuard)
  list(@CurrentUser() user: any) {
    return this.webhooksService.list(user.tenantId);
  }

  @Delete(':id')
  @UseGuards(DashboardAnyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    await this.webhooksService.delete(user.tenantId, id);
  }
}
