import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('breach_reports')
export class BreachReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'tenant_user_id' })
  tenantUserId: string;

  @Column()
  description: string;

  /** Severity: 'low' | 'medium' | 'high' | 'critical' */
  @Column({ default: 'high' })
  severity: string;

  /** GDPR Art.33 requires notification within 72 hours */
  @Column({ name: 'notify_deadline' })
  notifyDeadline: Date;

  /** null = pending, true = notified, false = expired */
  @Column({ name: 'regulator_notified', default: false })
  regulatorNotified: boolean;

  @Column({ name: 'notified_at', nullable: true })
  notifiedAt: Date | null;

  @CreateDateColumn({ name: 'reported_at' })
  reportedAt: Date;
}
