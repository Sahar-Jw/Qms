export type RoleCode = 'technical_manager' | 'general_manager' | 'manager' | 'employee';
export const ROLE_RANK: Record<RoleCode, number> = { technical_manager: 4, general_manager: 3, manager: 2, employee: 1 };
export const hasRole = (role: RoleCode | undefined, min: RoleCode) => !!role && ROLE_RANK[role] >= ROLE_RANK[min];
/** Technical + general manager: full access, and they cannot change each other's accounts. */
export const isTopTier = (role: RoleCode | undefined) => role === 'technical_manager' || role === 'general_manager';
/** Employees never see locked quotations. */
export const canSeeLocked = (role: RoleCode | undefined) => role !== 'employee';

export type QStatus = 'draft' | 'issued' | 'expired' | 'locked' | 'invoiced';
export const STATUSES: QStatus[] = ['draft', 'issued', 'expired', 'locked', 'invoiced'];

export interface Paginated<T> { data: T[]; total: number; page: number; limit: number }

export interface User {
  id: number; fullName: string; email: string; phone: string | null; role: RoleCode;
  isActive: boolean; lastLoginAt: string | null; createdAt: string;
}

export interface Company {
  id: number; nameAr: string; nameEn: string | null; logo: string | null;
  addressAr: string | null; addressEn: string | null; phone: string | null; email: string | null; website: string | null;
  isActive: boolean;
}
export interface PickCompany { id: number; nameAr: string; nameEn: string | null; logo: string | null }
export interface Settings { issuingCompany: (PickCompany & { isActive: boolean }) | null; issuingCompanyIsAutomatic: boolean }

export interface Customer {
  id: number; companyNameAr: string | null; companyNameEn: string | null; email: string | null; phone: string | null;
  country: string | null; website: string | null; managerName: string | null; contactPersonName: string | null;
  contactPersonPhone: string | null; businessNature: string | null; notes: string | null; isActive: boolean;
}

export interface Material {
  id: number; materialCode: string; nameAr: string | null; nameEn: string | null; source: string | null;
  stockQuantity: string; unitPrice: string; unit: string | null; currency: string | null; countryOfOrigin: string | null;
  catalogue: string | null; modelNumber: string | null; catalogueNumber: string | null; isActive: boolean;
}

export interface Amounts { currency: string; value: string; cost: string; shipping: string; customs: string; required: string }

export interface ItemView {
  id: number; materialId: number | null; materialCode: string; materialNameAr: string | null; materialNameEn: string | null;
  unit: string | null; sortOrder: number; quantity: string; unitPrice: string; priceCurrency: string;
  unitCost: string | null; costCurrency: string | null; shippingCost: string | null; shippingCurrency: string | null;
  customsCost: string | null; customsCurrency: string | null; commissionPercentage: string | null; notes: string | null;
  amounts: Amounts[];
}

export interface QuotationListItem {
  id: number; quotationNumber: string; quotationDate: string; status: QStatus;
  company: { id: number; nameAr: string; nameEn: string | null };
  customer: { id: number; companyNameAr: string | null; companyNameEn: string | null };
  responsibleUser: { id: number; fullName: string } | null;
  totals: { currency: string; value: string; required: string }[];
}

export interface QuotationView {
  id: number; quotationNumber: string; quotationDate: string; status: QStatus;
  company: Company;
  customer: { id: number; companyNameAr: string | null; companyNameEn: string | null; contactPersonName: string | null; contactPersonPhone: string | null; phone: string | null; email: string | null; country: string | null };
  responsibleUser: { id: number; fullName: string } | null;
  customerPaymentMethod: string | null;
  bankName: string | null; validity: string | null; deliveryTime: string | null; paymentMethod: string | null;
  paymentLocation: string | null; deliveryMethod: string | null; taxPercentage: string | null; notes: string | null;
  items: ItemView[]; totals: Amounts[]; createdById: number | null; editable: boolean; readOnlyReason: 'status' | 'not_owner' | null; allowedStatuses: QStatus[];
  createdAt: string; updatedAt: string;
}
