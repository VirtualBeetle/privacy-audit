import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('consents')
@Index(['tenantId', 'tenantUserId', 'dataType'], { unique: true })
export class Consent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'tenant_user_id' })
  tenantUserId: string;

  /** Data category e.g. "email", "location", "medical_history" */
  @Column({ name: 'data_type' })
  dataType: string;

  @Column({ default: true })
  granted: boolean;

  /** GDPR Article 7 — version of the consent form the user agreed to */
  @Column({ name: 'consent_version', default: '1.0' })
  consentVersion: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
