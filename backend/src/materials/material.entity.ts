import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditBase } from '../common/entities/audit-base';

@Entity('materials')
export class Material extends AuditBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  materialCode: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  source: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 })
  stockQuantity: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  unitPrice: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  unit: string | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  countryOfOrigin: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  catalogue: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  catalogueNumber: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
