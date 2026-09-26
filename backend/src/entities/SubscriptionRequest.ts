import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { PaymentMethod, PlanId, RequestStatus } from '@matjari/shared';
import { bigintToNumber } from './transformers';
import { Store } from './Store';
import { User } from './User';

/** A merchant's "I paid" submission. An admin approves it (activating the plan) or rejects it. */
@Entity('subscription_requests')
@Index('IDX_subscription_requests_status_created', ['status', 'createdAt'])
@Index('IDX_subscription_requests_store', ['storeId', 'createdAt'])
export class SubscriptionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store?: Store;

  @Column({ type: 'varchar', length: 20 })
  planId: PlanId;

  /** Frozen from the plan at request time. */
  @Column({ type: 'int' })
  months: number;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 20 })
  method: PaymentMethod;

  /** Transaction id, sender name, wallet address… whatever helps the admin match the payment. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  receiptUrl: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: RequestStatus;

  @Column({ type: 'varchar', length: 300, nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy?: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
