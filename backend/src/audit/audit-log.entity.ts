import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One row per state-changing action (create / update / activate / login ...).
 * The user's name and role are copied into the row so the log stays readable if the account changes later.
 */
@Entity('audit_logs')
@Index('IDX_audit_logs_created_at', ['createdAt'])
@Index('IDX_audit_logs_user_id', ['userId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  /** Full name (or the typed e-mail for a failed sign-in) at the time of the action. */
  @Column({ type: 'varchar', length: 190, nullable: true })
  userName: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  userRole: string | null;

  /** create | update | activate | deactivate | status_change | duplicate | login | login_failed | logout ... */
  @Column({ type: 'varchar', length: 40 })
  action: string;

  /** quotations | customers | materials | companies | users | settings | theme | auth */
  @Column({ type: 'varchar', length: 60 })
  entity: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  entityId: string | null;

  /** Human readable name of the record (quotation number, customer name ...), when the response has one. */
  @Column({ type: 'varchar', length: 190, nullable: true })
  entityLabel: string | null;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  /** The submitted fields, with passwords / tokens removed. */
  @Column({ type: 'json', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;
}
