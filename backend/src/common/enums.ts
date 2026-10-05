/** Four roles only (SRS boss notes). Higher rank inherits everything below it. */
export enum RoleCode {
  TECHNICAL_MANAGER = 'technical_manager', // المدير التقني: technical / system permissions, seeded, activates the first general manager
  GENERAL_MANAGER = 'general_manager', // المدير العام: users (activate/deactivate/edit/roles), companies, settings, everything operational
  MANAGER = 'manager', // المدير: operational, NOT tied to a company/branch
  EMPLOYEE = 'employee', // الموظف: NOT tied to a company/branch
}

export const ROLE_RANK: Record<RoleCode, number> = {
  [RoleCode.TECHNICAL_MANAGER]: 4,
  [RoleCode.GENERAL_MANAGER]: 3,
  [RoleCode.MANAGER]: 2,
  [RoleCode.EMPLOYEE]: 1,
};

export enum QuotationStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  EXPIRED = 'expired',
  LOCKED = 'locked', // read-only; invisible to employees
  INVOICED = 'invoiced', // converted to invoice: read-only, terminal
}

export type Lang = 'ar' | 'en';
