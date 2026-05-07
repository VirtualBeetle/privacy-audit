import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { TenantsService, RegisterTenantDto } from './tenants.service';
import { DashboardAnyGuard } from '../common/guards/dashboard.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('register')
  register(@Body() dto: RegisterTenantDto) {
    return this.tenantsService.register(dto);
  }

  /**
   * GET /api/tenants/:id/onboarding-status
   * Returns onboarding progress: hasEvents, eventCount, firstEventAt, dashboardReady.
   * The wizard Step 2 polls this endpoint to confirm the first event has arrived.
   */
  @Get(':id/onboarding-status')
  getOnboardingStatus(@Param('id') id: string) {
    return this.tenantsService.getOnboardingStatus(id);
  }

  /**
   * GET /api/tenants/available
   * Public list of active tenants (id + name only) for the Google user link picker.
   * Requires any valid dashboard session (google_session or dashboard_session).
   */
  @Get('available')
  @UseGuards(DashboardAnyGuard)
  getAvailable() {
    return this.tenantsService.listAvailable();
  }

  /**
   * GET /api/tenants/all
   * Full tenant list with event counts — super admin only.
   * Returns 403 for non-super-admin callers.
   */
  @Get('all')
  @UseGuards(DashboardAnyGuard)
  getAll(@Req() req: any) {
    if (req.user?.role !== 'super_admin') {
      return { error: 'Forbidden', statusCode: 403 };
    }
    return this.tenantsService.listAll();
  }
}
