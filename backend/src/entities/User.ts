import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { UserRole } from '@matjari/shared';
import { Store } from './Store';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'citext', unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 16, default: 'merchant' })
  role: UserRole;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  /** SHA-256 of the reset token; the raw token only ever lives in the email. */
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  resetToken: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  resetTokenExpiresAt: Date | null;

  @OneToOne(() => Store, (store) => store.owner)
  store?: Store | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
