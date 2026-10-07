import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuthUser } from '../common/auth-user';
import { AuditService, sanitizeDetails } from './audit.service';

const METHOD_ACTION: Record<string, string> = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

/** Last path segment -> a clearer action name than create / update. */
const SUB_ACTION: Record<string, string> = {
  login: 'login',
  logout: 'logout',
  register: 'register',
  activate: 'activate',
  deactivate: 'deactivate',
  status: 'status_change',
  duplicate: 'duplicate',
  'change-password': 'change_password',
  'forgot-password': 'forgot_password',
  'reset-password': 'reset_password',
  avatar: 'update', // POST uploads, DELETE removes: both are an update of the profile
  logo: 'update',
  profile: 'update',
  active: 'update',
};

const LABEL_FIELDS = ['quotationNumber', 'companyName', 'fullName', 'name', 'materialCode', 'email', 'key'] as const;
const pickLabel = (res: any): string | null => {
  const src = res?.user ?? res;
  if (!src || typeof src !== 'object') return null;
  for (const f of LABEL_FIELDS) if (typeof src[f] === 'string' && src[f]) return src[f];
  return null;
};

/**
 * Records every successful create / update / delete / sign-in in the audit log, plus failed sign-ins.
 * Reads (GET) are never logged. Registered globally, so new endpoints are covered automatically.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!(req.method in METHOD_ACTION)) return next.handle();

    // /api/quotations/12/status?x=1  ->  ['quotations', '12', 'status']
    const segs = req.path.replace(/^\/api\//, '').split('/').filter(Boolean);
    const resource = segs[0] ?? 'unknown';
    const hasId = segs[1] !== undefined && /^\d+$/.test(segs[1]);
    const sub = hasId ? segs[2] : segs[1];
    const isLogin = resource === 'auth' && sub === 'login';

    let entity = resource;
    let action = (sub && SUB_ACTION[sub]) || METHOD_ACTION[req.method];
    if (resource === 'settings' && sub === 'theme') {
      entity = 'theme';
      action = req.method === 'DELETE' ? 'reset' : 'update';
    }

    const base = {
      entity,
      method: req.method,
      path: req.path,
      ip: req.ip ?? null,
      details: sanitizeDetails(req.body),
    };

    return next.handle().pipe(
      tap({
        next: (res) => {
          const loggedIn = isLogin ? (res as any)?.user : undefined; // no req.user yet on the sign-in request
          const who = req.user ?? (loggedIn ? { id: loggedIn.id, fullName: loggedIn.fullName, role: loggedIn.role } : undefined);
          const role = (who as any)?.role;
          void this.audit.record({
            ...base,
            action,
            userId: who?.id ?? null,
            userName: (who as any)?.fullName ?? null,
            userRole: typeof role === 'string' ? role : role?.code ?? null,
            entityId: hasId ? segs[1] : res && typeof res === 'object' && (res as any).id != null ? String((res as any).id) : null,
            entityLabel: pickLabel(res),
          });
        },
        error: () => {
          // Wrong password / locked / inactive account: worth keeping. Other failures changed nothing.
          if (!isLogin) return;
          const email = (req.body as any)?.email;
          void this.audit.record({ ...base, action: 'login_failed', userName: typeof email === 'string' ? email : null });
        },
      }),
    );
  }
}
