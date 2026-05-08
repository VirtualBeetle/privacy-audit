import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
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

  /**
   * GET /api/verify/:hash — PUBLIC route (no auth needed)
   * Verifies a GDPR consent receipt by SHA-256 hash.
   * Hash = sha256(tenantUserId:dataType:granted:updatedAt.toISOString())
   */
  @Get('verify/:hash')
  async verifyReceipt(@Param('hash') hash: string) {
    const record = await this.consentsService.findByReceiptHash(hash);
    if (!record) throw new NotFoundException('Receipt not found or hash is invalid');
    return {
      hash,
      action: record.granted ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
      dataType: record.dataType,
      userId: record.tenantUserId,
      tenantId: record.tenantId,
      timestamp: record.updatedAt,
      granted: record.granted,
    };
  }
}
