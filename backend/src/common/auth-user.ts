import { RoleCode } from './enums';

/** Shape attached to req.user by the JWT strategy. */
export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: RoleCode;
}
