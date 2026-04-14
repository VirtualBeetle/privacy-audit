import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BreachReport } from './breach-report.entity';

const GDPR_DEADLINE_HOURS = 72;

@Injectable()
export class BreachService {
  constructor(
    @InjectRepository(BreachReport)
    private readonly breachRepo: Repository<BreachReport>,
  ) {}

  async reportBreach(
    tenantId: string,
    tenantUserId: string,
    description: string,
    severity = 'high',
  ): Promise<BreachReport & { hoursRemaining: number; deadlineExceeded: boolean }> {
    const reportedAt = new Date();
    const notifyDeadline = new Date(reportedAt.getTime() + GDPR_DEADLINE_HOURS * 60 * 60 * 1000);

    const report = await this.breachRepo.save(
      this.breachRepo.create({ tenantId, tenantUserId, description, severity, notifyDeadline }),
    );

    return this.withCountdown(report);
  }

  async listBreaches(tenantId: string, tenantUserId: string) {
    const reports = await this.breachRepo.find({
      where: { tenantId, tenantUserId },
      order: { reportedAt: 'DESC' },
    });
    return reports.map((r) => this.withCountdown(r));
  }

  async notifyRegulator(
    tenantId: string,
    tenantUserId: string,
    breachId: string,
  ) {
    const report = await this.breachRepo.findOne({
      where: { id: breachId, tenantId, tenantUserId },
    });
    if (!report) throw new NotFoundException('Breach report not found');

    report.regulatorNotified = true;
    report.notifiedAt = new Date();
    await this.breachRepo.save(report);

    return { message: 'Regulator notification recorded (simulated).', ...this.withCountdown(report) };
  }

  private withCountdown(report: BreachReport) {
    const hoursRemaining = Math.max(
      0,
      Math.floor((report.notifyDeadline.getTime() - Date.now()) / (60 * 60 * 1000)),
    );
    return { ...report, hoursRemaining, deadlineExceeded: hoursRemaining === 0 && !report.regulatorNotified };
  }
}
