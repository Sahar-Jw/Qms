import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** created/updated timestamps + who did it (audit fields on every business table). */
export abstract class AuditBase {
  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdById: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedById: number | null;
}
