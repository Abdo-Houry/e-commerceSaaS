import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { PaymentMethod, PlanId } from '@matjari/shared';

/** Singleton row (id = 1) holding platform-wide settings edited from the admin panel. */
@Entity('platform_settings')
export class PlatformSettings {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  /** Currency of plan prices and subscription payments. */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** Price (integer minor units) and on/off switch per plan. */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  plans: Partial<Record<PlanId, { enabled: boolean; price: number }>>;

  @Column({ type: 'int', default: 14 })
  trialDays: number;

  @Column({ type: 'int', default: 3 })
  graceDays: number;

  @Column({ type: 'varchar', length: 15, default: '' })
  supportWhatsapp: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  paymentMethods: Partial<Record<PaymentMethod, { enabled: boolean; details: string }>>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
