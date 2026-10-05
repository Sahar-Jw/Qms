import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditBase } from '../common/entities/audit-base';

@Entity('customers')
export class Customer extends AuditBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 190, nullable: true })
  companyNameAr: string | null;

  @Index()
  @Column({ type: 'varchar', length: 190, nullable: true })
  companyNameEn: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  managerName: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contactPersonName: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  contactPersonPhone: string | null;

  @Column({ type: 'varchar', length: 190, nullable: true })
  businessNature: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
