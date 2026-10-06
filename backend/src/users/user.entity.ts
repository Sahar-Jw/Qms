import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Role } from '../roles/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 190, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @ManyToOne(() => Role, { eager: true, nullable: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  /** Profile picture, relative to the uploads dir (e.g. avatars/<hex>.png). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string | null;

  /** Settings: the company every quotation made by this user is issued from (no per-quotation choice). */
  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'issuing_company_id' })
  issuingCompany: Company | null;
  @Column({ type: 'int', nullable: true })
  issuingCompanyId: number | null;

  /** Self-registered accounts start inactive until an admin activates them. */
  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  failedAttempts: number;

  @Column({ type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
