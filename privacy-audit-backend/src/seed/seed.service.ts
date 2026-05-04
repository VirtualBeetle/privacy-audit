import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../tenants/tenant.entity';
import { User, UserRole } from '../users/user.entity';
import { hashApiKey } from '../tenants/tenants.service';

const DEMO_TENANTS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'HealthTrack',
    email: 'admin@healthdemo.internal',
    password: 'HealthDemo123!',
    apiKey: 'health-tenant-api-key',
    allowedDataFields: [
      'email',
      'name',
      'date_of_birth',
      'appointment_date',
      'medical_record',
      'insurance_details',
      'phone_number',
      'diagnosis',
      'prescription',
      'blood_type',
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'ConnectSocial',
    email: 'admin@socialdemo.internal',
    password: 'SocialDemo123!',
    apiKey: 'social-tenant-api-key',
    allowedDataFields: [
      'email',
      'username',
      'posts',
      'location',
      'friends_list',
      'profile_picture',
      'bio',
      'check_in',
    ],
  },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    for (const demo of DEMO_TENANTS) {
      const existing = await this.tenantsRepository.findOne({
        where: { id: demo.id },
      });

      if (existing) {
        await this.tenantsRepository.update(demo.id, {
          apiKeyHash: hashApiKey(demo.apiKey),
          allowedDataFields: demo.allowedDataFields,
        });
        this.logger.log(`Demo tenant synced: ${demo.name}`);
      } else {
        const tenant = this.tenantsRepository.create({
          id: demo.id,
          name: demo.name,
          email: demo.email,
          apiKeyHash: hashApiKey(demo.apiKey),
          retentionDays: 90,
          isActive: true,
          allowedDataFields: demo.allowedDataFields,
        });
        await this.tenantsRepository.save(tenant);
        this.logger.log(`Seeded demo tenant: ${demo.name} (id=${demo.id})`);
      }

      // Ensure admin user exists for this tenant (idempotent)
      const existingUser = await this.usersRepository.findOne({
        where: { email: demo.email },
      });
      if (!existingUser) {
        const passwordHash = await bcrypt.hash(demo.password, 10);
        const user = this.usersRepository.create({
          email: demo.email,
          passwordHash,
          tenantId: demo.id,
          role: UserRole.TENANT_ADMIN,
          isActive: true,
        });
        await this.usersRepository.save(user);
        this.logger.log(`Seeded admin user: ${demo.email}`);
      }
    }
  }
}
