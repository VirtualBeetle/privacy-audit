import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  /** Target URL to POST to */
  @Column()
  url: string;

  /** HMAC-SHA256 secret for signing payloads */
  @Column({ name: 'signing_secret' })
  signingSecret: string;

  /** Which events to fire on: 'HIGH_RISK' | 'CRITICAL_RISK' | 'ALL_RISK' */
  @Column({ name: 'trigger_on', default: 'ALL_RISK' })
  triggerOn: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
