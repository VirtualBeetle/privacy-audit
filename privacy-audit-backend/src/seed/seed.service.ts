import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { hashApiKey } from '../tenants/tenants.service';

/**
 * Fixed demo tenant UUIDs and API keys — match docker-compose defaults.
 * These are seeded once on first boot and are idempotent.
 */
const DEMO_TENANTS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'HealthTrack',
    email: 'admin@healthdemo.internal',
    apiKey: 'health-tenant-api-key',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'ConnectSocial',
    email: 'admin@socialdemo.internal',
    apiKey: 'social-tenant-api-key',
  },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

  async onApplicationBootstrap() {
    for (const demo of DEMO_TENANTS) {
      const existing = await this.tenantsRepository.findOne({
        where: { id: demo.id },
      });

      if (existing) {
        this.logger.log(`Demo tenant already exists: ${demo.name}`);
        continue;
      }

      const tenant = this.tenantsRepository.create({
        id: demo.id,
        name: demo.name,
        email: demo.email,
        apiKeyHash: hashApiKey(demo.apiKey),
        retentionDays: 90,
        isActive: true,
      });

      await this.tenantsRepository.save(tenant);
      this.logger.log(`Seeded demo tenant: ${demo.name} (id=${demo.id})`);
    }
  }
}
