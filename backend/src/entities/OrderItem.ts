import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { bigintToNumber } from './transformers';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: Product | null;

  /** Frozen at order time — never join to Product to render an order. */
  @Column({ type: 'varchar', length: 120 })
  productName: string;

  /** Frozen at order time, integer minor units. */
  @Column({ type: 'bigint', transformer: bigintToNumber })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  selectedOptions: Record<string, string>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
