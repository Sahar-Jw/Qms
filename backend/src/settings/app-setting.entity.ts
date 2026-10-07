import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Site-wide settings (the same for every user), stored as key -> JSON value. Today: the colour theme. */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'json' })
  value: unknown;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedById: number | null;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
