import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consent } from './consent.entity';

const DEFAULT_DATA_TYPES = [
  'email',
  'name',
  'location',
  'medical_history',
  'payment_info',
  'biometric_data',
  'browsing_history',
];

@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(Consent)
    private readonly consentsRepo: Repository<Consent>,
  ) {}

  /**
   * Upsert consent for a specific data type.
   * GDPR Art.7 — consent must be freely given, specific, informed.
   */
  async setConsent(
    tenantId: string,
    tenantUserId: string,
    dataType: string,
    granted: boolean,
    ipAddress?: string,
  ): Promise<Consent> {
    const existing = await this.consentsRepo.findOne({
      where: { tenantId, tenantUserId, dataType },
    });

    if (existing) {
      existing.granted = granted;
      if (ipAddress) existing.ipAddress = ipAddress;
      return this.consentsRepo.save(existing);
    }

    const consent = this.consentsRepo.create({
      tenantId,
      tenantUserId,
      dataType,
      granted,
      ipAddress,
    });
    return this.consentsRepo.save(consent);
  }

  /**
   * Get all consent records for a user.
   * Returns a full list including defaults for data types not yet explicitly set.
   */
  async getUserConsents(tenantId: string, tenantUserId: string) {
    const records = await this.consentsRepo.find({ where: { tenantId, tenantUserId } });

    const map = new Map(records.map((r) => [r.dataType, r]));

    // Merge with defaults so UI always shows all categories
    const merged = DEFAULT_DATA_TYPES.map((dt) => {
      const record = map.get(dt);
      return record ?? {
        id: null,
        tenantId,
        tenantUserId,
        dataType: dt,
        granted: true,
        consentVersion: '1.0',
        createdAt: null,
        updatedAt: null,
      };
    });

    // Also include any custom types the tenant has explicitly set
    records.forEach((r) => {
      if (!DEFAULT_DATA_TYPES.includes(r.dataType)) {
        merged.push(r);
      }
    });

    return { tenantUserId, consents: merged };
  }
}
