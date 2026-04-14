import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ConsentsService } from './consents.service';
import { DashboardAnyGuard } from '../common/guards/dashboard.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

/**
 * ConsentsController — GDPR Article 7 consent management
 *
 * POST /api/consents           — set or update consent for a data type
 * GET  /api/consents/:userId   — get all consent records for a user
 */
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  /**
   * POST /api/consents
   * Body: { tenantUserId, dataType, granted }
   * Auth: dashboard session (JWT)
   */
  @Post()
  @UseGuards(DashboardAnyGuard)
  async setConsent(
    @CurrentUser() user: any,
    @Body() body: { tenantUserId: string; dataType: string; granted: boolean },
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
    const consent = await this.consentsService.setConsent(
      user.tenantId,
      body.tenantUserId,
      body.dataType,
      body.granted,
      ipAddress,
    );
    return {
      message: `Consent ${consent.granted ? 'granted' : 'revoked'} for ${consent.dataType}`,
      consent,
    };
  }

  /**
   * GET /api/consents/:userId
   * Returns all consent records for a user, with defaults for known data types.
   */
  @Get(':userId')
  @UseGuards(DashboardAnyGuard)
  getUserConsents(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.consentsService.getUserConsents(user.tenantId, userId);
  }
}
