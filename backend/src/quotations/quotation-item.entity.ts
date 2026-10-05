import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Material } from '../materials/material.entity';
import { Quotation } from './quotation.entity';
import { QuotationItemAmount } from './quotation-item-amount.entity';

@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Quotation, (q) => q.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;
  @Column({ type: 'int' })
  quotationId: number;

  @ManyToOne(() => Material, { nullable: true })
  @JoinColumn({ name: 'material_id' })
  material: Material | null;
  @Column({ type: 'int', nullable: true })
  materialId: number | null;

  /** Snapshots: later edits to the material never change an existing quotation. */
  @Column({ type: 'varchar', length: 60 })
  materialCode: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  materialNameAr: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true })
  materialNameEn: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true })
  unit: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  unitPrice: string;
  @Column({ type: 'varchar', length: 3 })
  priceCurrency: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  unitCost: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true })
  costCurrency: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  shippingCost: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true })
  shippingCurrency: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  customsCost: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true })
  customsCurrency: string | null;

  /** Stored only (no formula yet). */
  @Column({ type: 'decimal', precision: 7, scale: 4, nullable: true })
  commissionPercentage: string | null;

  /** Internal notes - never printed. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => QuotationItemAmount, (a) => a.item)
  amounts: QuotationItemAmount[];
}
