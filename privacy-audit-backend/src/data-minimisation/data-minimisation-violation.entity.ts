import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * DataMinimisationViolation
 *
 * GDPR Article 5(1)(c) — Data Minimisation.
 * Created whenever a tenant's audit event includes a data field that was not
 * declared in the tenant's allowedDataFields policy. Stored as evidence that
 * the violation was detected and can be reported to the supervisory authority.
 */
@Entity('data_minimisation_violations')
export class DataMinimisationViolation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'tenant_user_id' })
  tenantUserId: string;

  @Column({ name: 'event_id' })
  eventId: string;

  /** Fields in the event that are NOT in the tenant's allowedDataFields list. */
  @Column({ name: 'violating_fields', type: 'jsonb' })
  violatingFields: string[];

  /** Snapshot of the tenant's allowed fields at time of detection. */
  @Column({ name: 'allowed_fields', type: 'jsonb' })
  allowedFields: string[];

  @Column({ name: 'tenant_name', nullable: true })
  tenantName: string | null;

  @CreateDateColumn({ name: 'detected_at' })
  detectedAt: Date;
}
