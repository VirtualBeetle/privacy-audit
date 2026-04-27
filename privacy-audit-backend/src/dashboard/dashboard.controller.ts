import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { ExportsService } from '../exports/exports.service';
import { DeletionsService } from '../deletions/deletions.service';
import { RiskService } from '../risk/risk.service';
import { DashboardUsersService } from '../dashboard-users/dashboard-users.service';
import { AiChatService } from '../ai-chat/ai-chat.service';
import { DataMinimisationService } from '../data-minimisation/data-minimisation.service';
import { EventStreamService } from '../events/event-stream.service';
import { CreateDashboardTokenDto } from './dto/create-dashboard-token.dto';
import { ExchangeTokenDto } from './dto/exchange-token.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DashboardGuard, DashboardAnyGuard } from '../common/guards/dashboard.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly exportsService: ExportsService,
    private readonly deletionsService: DeletionsService,
    private readonly riskService: RiskService,
    private readonly dashboardUsersService: DashboardUsersService,
    private readonly aiChatService: AiChatService,
    private readonly dataMinimisationService: DataMinimisationService,
    private readonly eventStreamService: EventStreamService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Auth ──────────────────────────────────────────────────────────────────

  @Post('token')
  @UseGuards(ApiKeyGuard)
  issueToken(@CurrentUser() user: any, @Body() dto: CreateDashboardTokenDto) {
    return this.dashboardService.issueToken(user.tenantId, dto);
  }

  @Post('session')
  exchangeToken(@Body() dto: ExchangeTokenDto) {
    return this.dashboardService.exchangeToken(dto);
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  @Get('events')
  @UseGuards(DashboardAnyGuard)
  getEvents(@CurrentUser() user: any) {
    return this.dashboardService.getEvents(user);
  }

  // ─── Real-Time SSE Stream ─────────────────────────────────────────────────

  /**
   * GET /api/dashboard/events/stream?token=<jwt>
   *
   * Server-Sent Events endpoint. The browser cannot send an Authorization
   * header via EventSource, so we accept the session JWT as a query param.
   * Emits a JSON payload whenever a new audit event is processed for this user.
   *
   * Payload shape: { tenantId, tenantUserId, event, violation? }
   */
  @Sse('events/stream')
  async streamEvents(
    @Query('token') token: string,
  ): Promise<Observable<{ data: string }>> {
    if (!token) {
      throw new UnauthorizedException('token query param is required for SSE');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired session token');
    }

    if (payload.type === 'dashboard_session') {
      return this.eventStreamService.streamFor(payload.tenantId, payload.tenantUserId);
    }

    if (payload.type === 'google_session') {
      const linked = await this.dashboardUsersService.getLinkedAccounts(
        payload.dashboardUserId,
      );
      const pairs = linked.map((l) => ({
        tenantId: l.tenantId,
        tenantUserId: l.tenantUserId,
      }));
      return this.eventStreamService.streamForMany(pairs);
    }

    throw new UnauthorizedException('Unsupported token type for SSE');
  }

  // ─── Account Linking ───────────────────────────────────────────────────────

  @Post('link-account')
  @UseGuards(DashboardGuard)
  linkAccount(
    @CurrentUser() user: any,
    @Body() body: { googleSessionToken: string },
  ) {
    return this.dashboardService.linkAccount(user, body.googleSessionToken);
  }

  @Get('linked-accounts')
  @UseGuards(DashboardAnyGuard)
  async getLinkedAccounts(@CurrentUser() user: any) {
    if (user.type !== 'google_session') {
      return { linkedAccounts: [] };
    }
    const accounts = await this.dashboardUsersService.getLinkedAccounts(
      user.dashboardUserId,
    );
    return { linkedAccounts: accounts };
  }

  // ─── Exports (GDPR Article 20) ─────────────────────────────────────────────

  @Post('exports')
  @UseGuards(DashboardGuard)
  requestExport(@CurrentUser() user: any, @Res() res: Response) {
    return this.exportsService
      .requestExport(user.tenantId, user.tenantUserId)
      .then((result) => res.status(HttpStatus.ACCEPTED).json(result));
  }

  @Get('exports/:id')
  @UseGuards(DashboardGuard)
  getExportStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.exportsService.getStatus(id, user.tenantId, user.tenantUserId);
  }

  @Get('exports/:id/download')
  @UseGuards(DashboardGuard)
  async downloadExport(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.exportsService.downloadExport(
      id,
      user.tenantId,
      user.tenantUserId,
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="privacy-export-${id}.json"`,
    );
    return res.status(HttpStatus.OK).json(data);
  }

  // ─── Deletions (GDPR Article 17) ──────────────────────────────────────────

  @Post('deletions')
  @UseGuards(DashboardGuard)
  requestDeletion(@CurrentUser() user: any, @Res() res: Response) {
    return this.deletionsService
      .requestDeletion(user.tenantId, user.tenantUserId)
      .then((result) => res.status(HttpStatus.ACCEPTED).json(result));
  }

  @Get('deletions/:id')
  @UseGuards(DashboardGuard)
  getDeletionStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deletionsService.getStatus(id, user.tenantId, user.tenantUserId);
  }

  // ─── AI Chat ──────────────────────────────────────────────────────────────

  @Post('ai-chat')
  @UseGuards(DashboardAnyGuard)
  async aiChat(
    @CurrentUser() user: any,
    @Body() body: { message: string; sessionId?: string },
  ) {
    return this.aiChatService.sendMessage(user, body.message, body.sessionId);
  }

  @Get('ai-chat/history')
  @UseGuards(DashboardAnyGuard)
  async getChatHistory(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = user.tenantUserId ?? user.dashboardUserId ?? 'unknown';
    return this.aiChatService.getChatHistory(
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('ai-analysis')
  @UseGuards(DashboardGuard)
  async getAnalysisHistory(@CurrentUser() user: any) {
    return this.aiChatService.getAnalysisHistory(user.tenantId, 10);
  }

  // ─── Privacy Health Score ──────────────────────────────────────────────────

  @Get('privacy-score')
  @UseGuards(DashboardAnyGuard)
  getPrivacyScore(@CurrentUser() user: any) {
    return this.dashboardService.computePrivacyScore(user);
  }

  // ─── PDF Compliance Report ─────────────────────────────────────────────────

  @Get('compliance-report/download')
  @UseGuards(DashboardGuard)
  async downloadComplianceReport(
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.dashboardService.generateCompliancePdf(user);
    (res as any).setHeader('Content-Type', 'application/pdf');
    (res as any).setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    (res as any).status(HttpStatus.OK).end(buffer);
  }

  // ─── AI Risk Alerts ────────────────────────────────────────────────────────

  @Get('risk-alerts')
  @UseGuards(DashboardAnyGuard)
  async getRiskAlerts(@CurrentUser() user: any) {
    let linkedTenantIds: string[] = [];

    if (user.type === 'google_session') {
      const linked = await this.dashboardUsersService.getLinkedAccounts(
        user.dashboardUserId,
      );
      linkedTenantIds = linked.map((l) => l.tenantId);
    }

    return this.riskService.getAlertsForUser(user, linkedTenantIds);
  }

  // ─── Data Minimisation Violations (GDPR Article 5(1)(c)) ─────────────────

  /**
   * GET /api/dashboard/violations
   *
   * Returns data minimisation violations detected for the authenticated user.
   * A violation occurs when a tenant app accessed a data field not declared
   * in its allowedDataFields policy — proving GDPR Article 5(1)(c) enforcement.
   */
  @Get('violations')
  @UseGuards(DashboardAnyGuard)
  async getViolations(@CurrentUser() user: any) {
    if (user.type === 'dashboard_session') {
      return this.dataMinimisationService.getViolationsForUser(
        user.tenantId,
        user.tenantUserId,
      );
    }

    const linked = await this.dashboardUsersService.getLinkedAccounts(
      user.dashboardUserId,
    );
    const pairs = linked.map((l) => ({
      tenantId: l.tenantId,
      tenantUserId: l.tenantUserId,
    }));
    return this.dataMinimisationService.getViolationsForTenants(pairs);
  }

  // ─── Hash Chain Integrity (GDPR Article 30) ────────────────────────────────

  /**
   * GET /api/dashboard/chain-integrity
   *
   * Verifies the SHA-256 hash chain for the user's audit log.
   * Any modification to a stored event breaks the chain, proving tamper-evidence.
   * Demonstrates GDPR Article 30 accountability in real time.
   */
  @Get('chain-integrity')
  @UseGuards(DashboardAnyGuard)
  verifyChainIntegrity(@CurrentUser() user: any) {
    return this.dashboardService.verifyUserChain(user);
  }

}
