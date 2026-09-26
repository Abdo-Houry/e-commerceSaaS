import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { PaymentMethod, PlanId } from '@matjari/shared';
import { bigintToNumber } from './transformers';
import { Store } from './Store';
import { User } from './User';

/** One manual activation recorded by an admin: who, how much, how long, until when. */
@Entity('subscription_payments')
@Index('IDX_subscription_payments_store_created', ['storeId', 'createdAt'])
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store?: Store;

  @Column({ type: 'uuid', nullable: true })
  adminId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'adminId' })
  admin?: User | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  planId: PlanId | null;

  @Column({ type: 'int' })
  months: number;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 20 })
  method: PaymentMethod | 'other';

  @Column({ type: 'varchar', length: 300, nullable: true })
  note: string | null;

  /** The subscription end date this payment produced. */
  @Column({ type: 'timestamptz' })
  periodEnd: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
