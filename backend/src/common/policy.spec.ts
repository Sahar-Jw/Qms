import { RoleCode as R } from './enums';
import { canAssignRole, canChangeRoleOf, canEditQuotation, canManageAccount, canSeeLocked, isTopTier } from './policy';

const u = (id: number, role: R) => ({ id, role });

describe('policy', () => {
  it('top tier = technical + general manager', () => {
    expect(isTopTier(R.TECHNICAL_MANAGER)).toBe(true);
    expect(isTopTier(R.GENERAL_MANAGER)).toBe(true);
    expect(isTopTier(R.MANAGER)).toBe(false);
  });

  it('top tier edits any quotation; every non-top-tier user edits only their own', () => {
    expect(canEditQuotation(u(1, R.TECHNICAL_MANAGER), 9)).toBe(true);
    expect(canEditQuotation(u(2, R.GENERAL_MANAGER), 9)).toBe(true);
    expect(canEditQuotation(u(3, R.MANAGER), 9)).toBe(false);
    expect(canEditQuotation(u(3, R.MANAGER), 3)).toBe(true);
    expect(canEditQuotation(u(4, R.EMPLOYEE), 9)).toBe(false);
    expect(canEditQuotation(u(4, R.EMPLOYEE), 4)).toBe(true);
  });

  it('employees do not see locked quotations', () => {
    expect(canSeeLocked(R.EMPLOYEE)).toBe(false);
    expect(canSeeLocked(R.MANAGER)).toBe(true);
  });

  it('technical and general managers cannot manage each other, but can manage everyone else', () => {
    expect(canManageAccount(u(1, R.TECHNICAL_MANAGER), { id: 2, role: R.GENERAL_MANAGER })).toBe(false);
    expect(canManageAccount(u(2, R.GENERAL_MANAGER), { id: 1, role: R.TECHNICAL_MANAGER })).toBe(false);
    expect(canManageAccount(u(1, R.TECHNICAL_MANAGER), { id: 5, role: R.TECHNICAL_MANAGER })).toBe(false);
    expect(canManageAccount(u(1, R.TECHNICAL_MANAGER), { id: 3, role: R.MANAGER })).toBe(true);
    expect(canManageAccount(u(2, R.GENERAL_MANAGER), { id: 4, role: R.EMPLOYEE })).toBe(true);
    expect(canManageAccount(u(3, R.MANAGER), { id: 4, role: R.EMPLOYEE })).toBe(false);
  });

  it('only the technical manager can assign the technical_manager role', () => {
    expect(canAssignRole(u(1, R.TECHNICAL_MANAGER), R.TECHNICAL_MANAGER)).toBe(true);
    expect(canAssignRole(u(2, R.GENERAL_MANAGER), R.TECHNICAL_MANAGER)).toBe(false);
    expect(canAssignRole(u(2, R.GENERAL_MANAGER), R.GENERAL_MANAGER)).toBe(true);
    expect(canAssignRole(u(2, R.GENERAL_MANAGER), R.MANAGER)).toBe(true);
    expect(canAssignRole(u(1, R.TECHNICAL_MANAGER), R.EMPLOYEE)).toBe(true);
    expect(canAssignRole(u(3, R.MANAGER), R.EMPLOYEE)).toBe(false);
  });

  it('the technical manager can change the general manager role; nobody changes a technical manager role', () => {
    expect(canChangeRoleOf(u(1, R.TECHNICAL_MANAGER), { id: 2, role: R.GENERAL_MANAGER })).toBe(true);
    expect(canChangeRoleOf(u(2, R.GENERAL_MANAGER), { id: 1, role: R.TECHNICAL_MANAGER })).toBe(false);
    expect(canChangeRoleOf(u(1, R.TECHNICAL_MANAGER), { id: 5, role: R.TECHNICAL_MANAGER })).toBe(false);
    expect(canChangeRoleOf(u(2, R.GENERAL_MANAGER), { id: 6, role: R.GENERAL_MANAGER })).toBe(false);
    expect(canChangeRoleOf(u(2, R.GENERAL_MANAGER), { id: 3, role: R.MANAGER })).toBe(true);
    expect(canChangeRoleOf(u(1, R.TECHNICAL_MANAGER), { id: 1, role: R.TECHNICAL_MANAGER })).toBe(false);
    expect(canChangeRoleOf(u(3, R.MANAGER), { id: 4, role: R.EMPLOYEE })).toBe(false);
  });
});
