import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataMinimisationViolation } from './data-minimisation-violation.entity';

@Injectable()
export class DataMinimisationService {
  constructor(
    @InjectRepository(DataMinimisationViolation)
    private readonly violationsRepo: Repository<DataMinimisationViolation>,
  ) {}

  async getViolationsForUser(
    tenantId: string,
    tenantUserId: string,
    limit = 20,
  ): Promise<DataMinimisationViolation[]> {
    return this.violationsRepo.find({
      where: { tenantId, tenantUserId },
      order: { detectedAt: 'DESC' },
      take: limit,
    });
  }

  async getViolationsForTenants(
    pairs: Array<{ tenantId: string; tenantUserId: string }>,
    limit = 20,
  ): Promise<DataMinimisationViolation[]> {
    if (pairs.length === 0) return [];

    const qb = this.violationsRepo.createQueryBuilder('v');
    pairs.forEach((p, i) => {
      const clause = `(v.tenant_id = :t${i} AND v.tenant_user_id = :u${i})`;
      if (i === 0) {
        qb.where(clause, { [`t${i}`]: p.tenantId, [`u${i}`]: p.tenantUserId });
      } else {
        qb.orWhere(clause, { [`t${i}`]: p.tenantId, [`u${i}`]: p.tenantUserId });
      }
    });

    return qb.orderBy('v.detected_at', 'DESC').take(limit).getMany();
  }
}
