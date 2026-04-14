import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Tenant } from './tenant.entity';
import { User, UserRole } from '../users/user.entity';
import { AuditEvent } from '../events/audit-event.entity';
import { RegisterTenantDto } from './dto/register-tenant.dto';

export { RegisterTenantDto };

// API keys are high-entropy random strings (256 bits). SHA-256 is appropriate
// here — unlike passwords, API keys do not benefit from bcrypt's intentional
// slowness because an attacker who obtains the hash still cannot reverse a
// 32-byte random key in feasible time.
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(AuditEvent)
    private eventsRepository: Repository<AuditEvent>,
  ) {}

  async register(dto: RegisterTenantDto) {
    const existing = await this.tenantsRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Tenant with this email already exists');
    }

    // Generate a plaintext API key — shown to the tenant once, never stored.
    const plaintextApiKey = `pak_${randomUUID().replace(/-/g, '')}`;

    const tenant = new Tenant();
    tenant.name = dto.name;
    tenant.email = dto.email;
    tenant.apiKeyHash = hashApiKey(plaintextApiKey);
    tenant.retentionDays = 90;
    tenant.isActive = true;

    const savedTenant = await this.tenantsRepository.save(tenant);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const adminUser = new User();
    adminUser.email = dto.email;
    adminUser.passwordHash = passwordHash;
    adminUser.tenantId = savedTenant.id;
    adminUser.role = UserRole.TENANT_ADMIN;
    adminUser.isActive = true;

    await this.usersRepository.save(adminUser);

    const dashboardUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/dashboard`;
    const apiBaseUrl = `${process.env.API_URL ?? 'http://localhost:8080'}/api`;

    return {
      tenant: {
        id: savedTenant.id,
        name: savedTenant.name,
        email: savedTenant.email,
        // Plaintext key returned once. After this point only the hash is stored.
        apiKey: plaintextApiKey,
        retentionDays: savedTenant.retentionDays,
        createdAt: savedTenant.createdAt,
      },
      dashboardUrl,
      quickstart: {
        sendEvent: `curl -X POST ${apiBaseUrl}/events \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${plaintextApiKey}" \\
  -d '{"event_id":"evt-001","tenant_user_id":"user-123","action":{"code":"READ","label":"Read profile"},"data_fields":["email","name"],"reason":{"code":"SERVICE","label":"Service operation"},"actor":{"type":"user","label":"End user"},"sensitivity":{"code":"LOW","label":"Low"},"occurred_at":"${new Date().toISOString()}"}'`,
        loginDashboard: `# 1. Login to get a JWT:
curl -X POST ${apiBaseUrl}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"${savedTenant.email}","password":"<your-password>"}'

# 2. Visit your dashboard:
${dashboardUrl}`,
      },
      message:
        'Tenant registered successfully. Save your API key — it will not be shown again.',
    };
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantsRepository.findOne({ where: { id } });
  }

  async getOnboardingStatus(tenantId: string) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const eventCount = await this.eventsRepository.count({ where: { tenantId } });
    const firstEvent = eventCount > 0
      ? await this.eventsRepository.findOne({
          where: { tenantId },
          order: { occurredAt: 'ASC' },
        })
      : null;

    return {
      tenantId,
      tenantName: tenant.name,
      hasEvents: eventCount > 0,
      eventCount,
      firstEventAt: firstEvent?.occurredAt ?? null,
      dashboardReady: eventCount > 0,
      dashboardUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/dashboard`,
    };
  }

  // Used by ApiKeyGuard: hash the incoming key and look up in one DB query.
  async findByApiKeyHash(apiKey: string): Promise<Tenant | null> {
    const hash = hashApiKey(apiKey);
    return this.tenantsRepository.findOne({
      where: { apiKeyHash: hash, isActive: true },
    });
  }
}
