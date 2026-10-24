import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditBase } from '../common/entities/audit-base';

export interface MaterialCatalogFile {
  id: string;
  name: string;
  path: string;
  mimeType: string;
}

@Index('UQ_materials_material_code_name', ['materialCode', 'name'], { unique: true })
@Entity('materials')
export class Material extends AuditBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60 })
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

  /** Price the material is sold at (optional). New quotation lines start from it when it is set. */
  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  sellingPrice: string | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  sellingCurrency: string | null;

  /** Product web page (http/https), printed on quotations. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  countryOfOrigin: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  img: string | null;

  @Column({ type: 'json', nullable: true })
  catalog: MaterialCatalogFile[] | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  catalogueNumber: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
