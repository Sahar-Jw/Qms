import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { from, mergeMap, Observable, tap } from 'rxjs';
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

const CHANGE_ACTIONS = new Set(['update', 'activate', 'deactivate', 'status_change']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Records every successful create / update / delete / sign-in in the audit log, plus failed sign-ins.
 * Reads (GET) are never logged. Registered globally, so new endpoints are covered automatically.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly log = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditService, private readonly dataSource: DataSource) {}

  private async snapshot(resource: string, id: string): Promise<Record<string, unknown> | null> {
    const normalizedResource = resource.toLowerCase();
    const singularResource = normalizedResource.endsWith('ies')
      ? `${normalizedResource.slice(0, -3)}y`
      : normalizedResource.endsWith('s') ? normalizedResource.slice(0, -1) : normalizedResource;
    const metadata = this.dataSource.entityMetadatas.find((item) => {
      const entityName = item.name.toLowerCase();
      return item.tableName.toLowerCase() === normalizedResource ||
        entityName === normalizedResource ||
        entityName === singularResource ||
        `${entityName}s` === normalizedResource;
    });
    if (!metadata?.primaryColumns.some((column) => column.propertyName === 'id')) return null;

    const repository = this.dataSource.getRepository(metadata.target as EntityTarget<ObjectLiteral>);
    return repository.createQueryBuilder('record')
      .where('record.id = :id', { id: Number(id) })
      .getOne();
  }

  private detailsFor(
    action: string,
    body: unknown,
    before: Record<string, unknown> | null,
    response: unknown,
  ): Record<string, unknown> | null {
    const submitted = isRecord(body) ? body : null;
    if (!submitted) return sanitizeDetails(body);

    if (CHANGE_ACTIONS.has(action)) {
      if (!before) return sanitizeDetails(submitted);

      const fields = Object.keys(submitted);
      if (!fields.length && (action === 'activate' || action === 'deactivate')) {
        const activeField = 'isActive' in before ? 'isActive' : 'active' in before ? 'active' : null;
        if (activeField) {
          return {
            before: sanitizeDetails({ [activeField]: before[activeField] }),
            after: { [activeField]: action === 'activate' },
          };
        }
      }

      const previous = Object.fromEntries(fields.map((field) => [field, before[field]]));
      const responseRecord = isRecord(response) ? response : null;
      const current = Object.fromEntries(fields.map((field) => [
        field,
        responseRecord && Object.hasOwn(responseRecord, field) ? responseRecord[field] : submitted[field],
      ]));
      return {
        before: sanitizeDetails(previous),
        after: sanitizeDetails(current),
      };
    }

    return sanitizeDetails(submitted);
  }

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

    const needsSnapshot = hasId && CHANGE_ACTIONS.has(action);
    const before = needsSnapshot
      ? this.snapshot(resource, segs[1]).catch((error: unknown) => {
          this.log.error(`Could not capture previous audit state for ${resource}#${segs[1]}: ${(error as Error).message}`);
          return null;
        })
      : Promise.resolve(null);

    return from(before).pipe(
      mergeMap((previous) => next.handle().pipe(
        tap({
          next: (res) => {
            const loggedIn = isLogin ? (res as any)?.user : undefined; // no req.user yet on the sign-in request
            const who = req.user ?? (loggedIn ? { id: loggedIn.id, fullName: loggedIn.fullName, role: loggedIn.role } : undefined);
            const role = (who as any)?.role;
            void this.audit.record({
              ...base,
              action,
              details: this.detailsFor(action, req.body, previous, res),
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
      )),
    );
  }
}
