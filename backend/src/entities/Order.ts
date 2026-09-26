import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { OrderStatus } from '@matjari/shared';
import { bigintToNumber } from './transformers';
import { DeliveryZone } from './DeliveryZone';
import { OrderItem } from './OrderItem';
import { Store } from './Store';

@Entity('orders')
@Unique('UQ_orders_store_number', ['storeId', 'orderNumber'])
@Index('IDX_orders_store_status_created', ['storeId', 'status', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store?: Store;

  @Column({ type: 'int' })
  orderNumber: number;

  @Column({ type: 'varchar', length: 80 })
  customerName: string;

  @Column({ type: 'varchar', length: 15 })
  customerPhone: string;

  @Column({ type: 'uuid', nullable: true })
  zoneId: string | null;

  @ManyToOne(() => DeliveryZone, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'zoneId' })
  zone?: DeliveryZone | null;

  /** Frozen at order time, so renaming a zone never rewrites history. */
  @Column({ type: 'varchar', length: 60 })
  zoneName: string;

  @Column({ type: 'varchar', length: 300 })
  customerAddress: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  subtotal: number;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  deliveryFee: number;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  total: number;

  @Column({ type: 'varchar', length: 16, default: 'new' })
  status: OrderStatus;

  @Column({ type: 'boolean', default: false })
  whatsappOpened: boolean;

  /** Guards against deducting stock twice for the same order. */
  @Column({ type: 'boolean', default: false })
  stockDeducted: boolean;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items?: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
