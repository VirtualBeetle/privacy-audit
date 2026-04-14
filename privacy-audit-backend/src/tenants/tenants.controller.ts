import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { TenantsService, RegisterTenantDto } from './tenants.service';

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
}
