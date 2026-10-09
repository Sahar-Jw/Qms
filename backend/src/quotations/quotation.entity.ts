import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditBase } from '../common/entities/audit-base';
import { QuotationStatus } from '../common/enums';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { QuotationItem } from './quotation-item.entity';

@Entity('quotations')
export class Quotation extends AuditBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  quotationNumber: string;

  @Index()
  @Column({ type: 'date' })
  quotationDate: string; // YYYY-MM-DD

  @Index()
  @Column({ type: 'varchar', length: 20, default: QuotationStatus.DRAFT })
  status: QuotationStatus;

  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company: Company;
  @Column({ type: 'int' })
  companyId: number;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
  @Column({ type: 'int' })
  customerId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;
  @Column({ type: 'int', nullable: true })
  responsibleUserId: number | null;

  /** How the customer will pay - free text, typed by the user in the language of his choice. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  customerPaymentMethod: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  bankName: string | null;

  /** Offer validity, YYYY-MM-DD. */
  @Column({ type: 'date', nullable: true })
  validity: string | null;

  /** Delivery date, YYYY-MM-DD. */
  @Column({ type: 'date', nullable: true })
  deliveryTime: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  paymentLocation: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  deliveryMethod: string | null;

  /** Quotation-level tax % (0-100), required. Stored only - NOT used in any formula until the SRS defines it. */
  @Column({ type: 'decimal', precision: 7, scale: 4, default: 0 })
  taxPercentage: string;

  /** Internal notes - never printed. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => QuotationItem, (i) => i.quotation)
  items: QuotationItem[];
}
