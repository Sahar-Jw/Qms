import type { Request } from 'express';
import type { AuthUser } from '../common/auth-user';

/** Who / what / where of one request, in the shape of an audit row (shared by the interceptor and the exception filter). */
export function requestInfo(req: Request & { user?: AuthUser }) {
  // /api/quotations/12/print?x=1  ->  ['quotations', '12', 'print']
  const segs = req.path.replace(/^\/api\//, '').split('/').filter(Boolean);
  const hasId = segs[1] !== undefined && /^\d+$/.test(segs[1]);
  const role = (req.user as any)?.role;
  return {
    segs,
    entity: segs[0] === 'audit-log' ? 'audit' : segs[0] ?? 'unknown', // the filter only accepts [a-z_] record types
    entityId: hasId ? segs[1] : null,
    method: req.method,
    path: req.path,
    ip: req.ip ?? null,
    userId: req.user?.id ?? null,
    userName: ((req.user as any)?.fullName as string | undefined) ?? null,
    userRole: typeof role === 'string' ? role : role?.code ?? null,
    userAgent: (req.headers?.['user-agent'] as string | undefined) ?? null,
  };
}
