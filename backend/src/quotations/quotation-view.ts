import { CurrencyAmounts } from '../calc/calc.types';
import { QuotationStatus } from '../common/enums';

export interface ItemView {
  id: number;
  materialId: number | null;
  materialCode: string;
  materialNameAr: string | null;
  materialNameEn: string | null;
  unit: string | null;
  sortOrder: number;
  quantity: string;
  unitPrice: string;
  priceCurrency: string;
  unitCost: string | null;
  costCurrency: string | null;
  shippingCost: string | null;
  shippingCurrency: string | null;
  customsCost: string | null;
  customsCurrency: string | null;
  commissionPercentage: string | null;
  notes: string | null; // internal - never printed
  amounts: CurrencyAmounts[];
}

export interface QuotationView {
  id: number;
  quotationNumber: string;
  quotationDate: string;
  status: QuotationStatus;
  company: {
    id: number; nameAr: string; nameEn: string | null; logo: string | null;
    addressAr: string | null; addressEn: string | null; phone: string | null; email: string | null; website: string | null;
  };
  customer: {
    id: number; companyNameAr: string | null; companyNameEn: string | null;
    contactPersonName: string | null; contactPersonPhone: string | null; phone: string | null; email: string | null; country: string | null;
  };
  responsibleUser: { id: number; fullName: string } | null;
  customerPaymentMethod: string | null;
  bankName: string | null;
  validity: string | null;
  deliveryTime: string | null;
  paymentMethod: string | null;
  paymentLocation: string | null;
  deliveryMethod: string | null;
  taxPercentage: string | null; // stored only, not used in totals
  notes: string | null; // internal - never printed
  items: ItemView[];
  totals: CurrencyAmounts[];
  /** The quotation's creator. Managers and employees can edit only their own. */
  createdById: number | null;
  /** Whether THIS user can edit it right now (status + ownership). */
  editable: boolean;
  readOnlyReason: 'status' | 'not_owner' | null;
  /** Statuses the CURRENT user may move this quotation to. */
  allowedStatuses: QuotationStatus[];
  createdAt: Date;
  updatedAt: Date;
}
