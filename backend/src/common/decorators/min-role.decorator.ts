import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '../enums';

export const MIN_ROLE_KEY = 'minRole';
/** Require at least this role (admin > manager > employee). */
export const MinRole = (role: RoleCode) => SetMetadata(MIN_ROLE_KEY, role);
