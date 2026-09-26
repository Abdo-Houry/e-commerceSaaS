import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { BusinessHours, SocialLinks, StoreFont, StoreTemplate } from '@matjari/shared';
import { bigintToNumber } from './transformers';
import { User } from './User';
import { Subscription } from './Subscription';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  ownerId: string;

  @OneToOne(() => User, (user) => user.store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  faviconUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bannerUrl: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  bannerTitle: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  bannerSubtitle: string | null;

  @Column({ type: 'varchar', length: 16, default: 'classic' })
  template: StoreTemplate;

  @Column({ type: 'varchar', length: 7, default: '#059669' })
  primaryColor: string;

  @Column({ type: 'varchar', length: 7, default: '#F59E0B' })
  secondaryColor: string;

  @Column({ type: 'varchar', length: 16, default: 'cairo' })
  font: StoreFont;

  /** E.164 digits only, no "+" and no leading zero. */
  @Column({ type: 'varchar', length: 15 })
  whatsappNumber: string;

  @Column({ type: 'varchar', length: 3, default: 'SYP' })
  currency: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  city: string | null;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  socialLinks: Partial<SocialLinks>;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  businessHours: Partial<BusinessHours>;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  minOrderAmount: number;

  /** Last issued order number; incremented under a row lock. */
  @Column({ type: 'int', default: 1000 })
  orderCounter: number;

  /** Merchant's own open/closed switch. */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Set by a platform admin; a suspended store can't operate regardless of subscription. */
  @Column({ type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  suspensionReason: string | null;

  @OneToOne(() => Subscription, (s) => s.store)
  subscription?: Subscription | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
