import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { QuotationItem } from './quotation-item.entity';

/** Per-currency amounts of one item. Currencies are NEVER summed together or converted. */
@Entity('quotation_item_amounts')
@Unique(['itemId', 'currency'])
export class QuotationItemAmount {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QuotationItem, (i) => i.amounts, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: QuotationItem;
  @Column({ type: 'int' })
  itemId: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  value: string; // qty * price

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  cost: string; // qty * unit cost (kept apart from "required")

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  shipping: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  customs: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  required: string; // value + customs + shipping
}
