import { AuthUser } from './auth-user';
import { RoleCode } from './enums';

type Actor = Pick<AuthUser, 'id' | 'role'>;

/** Technical manager and general manager: full access to everything in the system. */
export const isTopTier = (role: RoleCode) => role === RoleCode.TECHNICAL_MANAGER || role === RoleCode.GENERAL_MANAGER;

/** Roles that may edit only the quotations they created themselves. */
const OWN_QUOTATIONS_ONLY: RoleCode[] = [RoleCode.MANAGER, RoleCode.EMPLOYEE];

export const canEditQuotation = (user: Actor, createdById: number | null) =>
  !OWN_QUOTATIONS_ONLY.includes(user.role) || createdById === user.id;

/** Locked quotations (the locked ones) are invisible to employees. */
export const canSeeLocked = (role: RoleCode) => role !== RoleCode.EMPLOYEE;

/**
 * Technical and general managers are equals: neither can deactivate, demote or otherwise change the
 * other's account (or any other top-tier account). Everyone else can be managed by them.
 */
export const canManageAccount = (actor: Actor, target: { id: number; role: RoleCode }) =>
  isTopTier(actor.role) && (!isTopTier(target.role) || target.id === actor.id);
