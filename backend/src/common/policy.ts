import { AuthUser } from './auth-user';
import { RoleCode } from './enums';

type Actor = Pick<AuthUser, 'id' | 'role'>;

/** Technical manager and general manager: full access to everything in the system. */
export const isTopTier = (role: RoleCode) => role === RoleCode.TECHNICAL_MANAGER || role === RoleCode.GENERAL_MANAGER;

/** Only technical/general managers can edit any quotation. Everyone else may edit only their own. */
export const canEditQuotation = (user: Actor, createdById: number | null) =>
  isTopTier(user.role) || createdById === user.id;

/** Locked quotations (the locked ones) are invisible to employees. */
export const canSeeLocked = (role: RoleCode) => role !== RoleCode.EMPLOYEE;

/**
 * Technical and general managers are equals: neither can deactivate or otherwise change the
 * other's account (or any other top-tier account). Everyone else can be managed by them.
 * (Role changes have their own, wider rule: see canChangeRoleOf.)
 */
export const canManageAccount = (actor: Actor, target: { id: number; role: RoleCode }) =>
  isTopTier(actor.role) && (!isTopTier(target.role) || target.id === actor.id);

/** Only the technical manager can hand out the technical_manager role. Any other role: general manager too. */
export const canAssignRole = (actor: Actor, newRole: RoleCode) =>
  newRole === RoleCode.TECHNICAL_MANAGER ? actor.role === RoleCode.TECHNICAL_MANAGER : isTopTier(actor.role);

/**
 * Whose role can be changed: any manager / employee (by a top-tier user), and the general manager's role
 * (by the technical manager only). A technical manager's role is never changed by anyone.
 */
export const canChangeRoleOf = (actor: Actor, target: { id: number; role: RoleCode }) => {
  if (!isTopTier(actor.role) || target.id === actor.id) return false;
  if (!isTopTier(target.role)) return true;
  return actor.role === RoleCode.TECHNICAL_MANAGER && target.role === RoleCode.GENERAL_MANAGER;
};
