import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BreachService } from './breach.service';
import { DashboardAnyGuard } from '../common/guards/dashboard.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

/**
 * BreachController — GDPR Article 33 breach notification simulation
 *
 * POST /api/dashboard/breach-report      — report a data breach, starts 72h countdown
 * GET  /api/dashboard/breach-report      — list breach reports for user
 * POST /api/dashboard/breach-report/:id/notify — simulate notifying the regulator
 */
@Controller('dashboard/breach-report')
export class BreachController {
  constructor(private readonly breachService: BreachService) {}

  @Post()
  @UseGuards(DashboardAnyGuard)
  @HttpCode(HttpStatus.CREATED)
  reportBreach(
    @CurrentUser() user: any,
    @Body() body: { description: string; severity?: string },
  ) {
    return this.breachService.reportBreach(
      user.tenantId,
      user.tenantUserId,
      body.description ?? 'Unspecified data breach',
      body.severity ?? 'high',
    );
  }

  @Get()
  @UseGuards(DashboardAnyGuard)
  listBreaches(@CurrentUser() user: any) {
    return this.breachService.listBreaches(user.tenantId, user.tenantUserId);
  }

  @Post(':id/notify')
  @UseGuards(DashboardAnyGuard)
  notifyRegulator(@CurrentUser() user: any, @Param('id') id: string) {
    return this.breachService.notifyRegulator(user.tenantId, user.tenantUserId, id);
  }
}
