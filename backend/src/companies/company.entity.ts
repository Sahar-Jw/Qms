import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditBase } from '../common/entities/audit-base';

/** An issuing company (the letterhead on the quotation). Directories (customers/materials) are shared across all companies. */
@Entity('companies')
export class Company extends AuditBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 190 })
  nameAr: string;

  @Column({ type: 'varchar', length: 190, nullable: true })
  nameEn: string | null;

  /** Relative path under UPLOADS_DIR, e.g. logos/abc123.png */
  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressAr: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressEn: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  website: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
