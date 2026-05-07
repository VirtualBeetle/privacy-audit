import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'api_key_hash', unique: true })
  apiKeyHash: string;

  @Column({ name: 'retention_days', default: 90 })
  retentionDays: number;

  @Column({ default: true })
  isActive: boolean;

  /**
   * GDPR Article 5(1)(c) — Data Minimisation.
   * Exhaustive list of data field names this tenant is permitted to process.
   * Any event that includes a field not in this list is flagged as a violation.
   * Null means no policy configured — no violations will be raised.
   */
  @Column({ name: 'allowed_data_fields', type: 'jsonb', nullable: true })
  allowedDataFields: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
