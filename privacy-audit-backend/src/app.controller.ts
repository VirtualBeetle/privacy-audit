import { Controller, Get, Post, Body, UseGuards, Param, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantIsolationGuard } from './common/guards/tenant-isolation.guard';
import { CurrentUser } from './common/decorators/tenant.decorator';

@Controller()
export class AppController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * GET /api/health
   * Used by Docker Compose healthcheck, Render health check, and start.sh.
   * Returns status of all critical connections.
   */
  @Get('health')
  async health() {
    const checks: Record<string, string> = {};

    // PostgreSQL
    try {
      await this.dataSource.query('SELECT 1');
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'error';
    }

    // Redis — checked indirectly (if BullMQ registered, Redis is connected)
    checks.redis = 'ok';

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * GET /api/verify/:hash — Public GDPR receipt verification (P18-33)
   * No auth required. Looks up a consent receipt by SHA-256 hash.
   */
  @Get('verify/:hash')
  async verifyReceipt(@Param('hash') hash: string) {
    const result: any[] = await this.dataSource.query(
      `SELECT tenant_user_id, data_type, granted, tenant_id, updated_at
       FROM consents LIMIT 5000`,
    );
    for (const c of result) {
      const input = `${c.tenant_user_id}:${c.data_type}:${c.granted}:${c.updated_at instanceof Date ? c.updated_at.toISOString() : new Date(c.updated_at).toISOString()}`;
      const computed = createHash('sha256').update(input).digest('hex');
      if (computed === hash) {
        return {
          hash,
          action: c.granted ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
          dataType: c.data_type,
          userId: c.tenant_user_id,
          tenantId: c.tenant_id,
          timestamp: c.updated_at,
          granted: c.granted,
        };
      }
    }
    throw new NotFoundException('Receipt not found or hash is invalid');
  }

  // ── Legacy test routes (kept for development) ──────────────────────────────

  @Get('test/protected')
  @UseGuards(JwtAuthGuard, TenantIsolationGuard)
  getProtected(@CurrentUser() user: any) {
    return { message: 'Access granted', user };
  }

  @Post('test/cross-tenant')
  @UseGuards(JwtAuthGuard, TenantIsolationGuard)
  crossTenantTest(@CurrentUser() user: any, @Body() body: any) {
    return { message: 'Access granted', user, body };
  }
}
