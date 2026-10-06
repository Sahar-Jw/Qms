import { ConfigService } from '@nestjs/config';

/** Stay signed in for 30 days by default; every page load (GET /auth/me) renews the session. */
export const DEFAULT_SESSION_HOURS = 720;

export function sessionHours(config: ConfigService): number {
  return Number(config.get('JWT_EXPIRES_HOURS')) || DEFAULT_SESSION_HOURS;
}
