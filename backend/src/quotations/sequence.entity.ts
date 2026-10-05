import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Gap-free counters (quotation numbers are sequential across ALL companies). */
@Entity('sequences')
export class Sequence {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'int', default: 0 })
  value: number;
}
