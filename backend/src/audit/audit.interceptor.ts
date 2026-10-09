import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { from, mergeMap, Observable, tap } from 'rxjs';
import { AuthUser } from '../common/auth-user';
import { AppSetting } from '../settings/app-setting.entity';
import { BRAND_SETTING_KEY, normalizeBrand, normalizeTheme, THEME_SETTING_KEY } from '../settings/theme';
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

const LABEL_FIELDS = ['quotationNumber', 'companyName', 'fullName', 'name', 'materialCode', 'email', 'websiteName', 'key'] as const;
const pickLabel = (res: any): string | null => {
  const src = res?.user ?? res;
  if (!src || typeof src !== 'object') return null;
  for (const f of LABEL_FIELDS) if (typeof src[f] === 'string' && src[f]) return src[f];
  return null;
};

const CHANGE_ACTIONS = new Set(['update', 'activate', 'deactivate', 'status_change']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Uploads / removals of a single image: they carry no JSON body, so the log would otherwise stay empty. */
type AssetField = 'logo' | 'icon' | 'avatar';
const assetFieldOf = (resource: string, segs: string[]): AssetField | null => {
  if (resource === 'settings' && segs[1] === 'brand' && (segs[2] === 'logo' || segs[2] === 'icon')) return segs[2];
  if (resource === 'auth' && segs[1] === 'avatar') return 'avatar';
  return null;
};

/** Bookkeeping columns that say nothing useful about a deleted record. */
const SNAPSHOT_SKIP = new Set(['id', 'createdAt', 'updatedAt', 'createdById', 'updatedById']);
/** Dates and the like become plain JSON values, so they survive sanitizing. */
const jsonSafe = (value: unknown): unknown => (value === undefined ? null : JSON.parse(JSON.stringify(value)));
const sameValue = (a: unknown, b: unknown) => JSON.stringify(jsonSafe(a)) === JSON.stringify(jsonSafe(b));

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

  private async brandValue(): Promise<Record<string, unknown>> {
    const row = await this.dataSource.getRepository(AppSetting).findOneBy({ key: BRAND_SETTING_KEY });
    return { ...normalizeBrand(row?.value) };
  }

  private async themeValue(): Promise<Record<string, unknown>> {
    const row = await this.dataSource.getRepository(AppSetting).findOneBy({ key: THEME_SETTING_KEY });
    return { colors: normalizeTheme(row?.value) };
  }

  private detailsFor(
    action: string,
    body: unknown,
    before: Record<string, unknown> | null,
    response: unknown,
    assetField: AssetField | null = null,
  ): Record<string, unknown> | null {
    if (assetField) {
      const next = isRecord(response) && typeof response[assetField] === 'string' ? response[assetField] : null;
      return { before: { [assetField]: before?.[assetField] ?? null }, after: { [assetField]: next } };
    }

    if (action === 'delete' && before) {
      const removed = Object.fromEntries(Object.entries(before).filter(([key]) => !SNAPSHOT_SKIP.has(key)));
      const clean = sanitizeDetails(jsonSafe(removed));
      return clean ? { before: clean } : null;
    }

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

      const responseRecord = isRecord(response) ? response : null;
      const valueAfter = (field: string) =>
        responseRecord && Object.hasOwn(responseRecord, field) ? responseRecord[field] : submitted[field];
      // Forms send every field on save: list only what really changed (all of them if nothing did).
      const changed = fields.filter((field) => !sameValue(before[field], valueAfter(field)));
      const shown = changed.length ? changed : fields;
      const previous = Object.fromEntries(shown.map((field) => [field, jsonSafe(before[field])]));
      const current = Object.fromEntries(shown.map((field) => [field, valueAfter(field)]));
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
    const assetField = assetFieldOf(resource, segs);
    if (assetField) action = 'update'; // uploading or removing an image edits the profile / the branding

    const base = {
      entity,
      method: req.method,
      path: req.path,
      ip: req.ip ?? null,
      details: sanitizeDetails(req.body),
    };

    // What to read *before* the request runs, so the log can show old -> new.
    const myId = req.user?.id;
    let loadBefore: (() => Promise<Record<string, unknown> | null>) | null = null;
    if (assetField === 'avatar' || (resource === 'auth' && sub === 'profile')) {
      if (myId != null) loadBefore = () => this.snapshot('users', String(myId));
    } else if (assetField || (resource === 'settings' && sub === 'brand')) {
      loadBefore = () => this.brandValue();
    } else if (entity === 'theme' && action === 'update') {
      loadBefore = () => this.themeValue();
    } else if (resource === 'settings' && !sub && req.method === 'PATCH') {
      if (myId != null) loadBefore = () => this.snapshot('users', String(myId)); // the issuing company
    } else if (hasId && (CHANGE_ACTIONS.has(action) || action === 'delete')) {
      loadBefore = () => this.snapshot(resource, segs[1]);
    }
    const before = loadBefore
      ? loadBefore().catch((error: unknown) => {
          this.log.error(`Could not capture previous audit state for ${resource}${hasId ? `#${segs[1]}` : ''}: ${(error as Error).message}`);
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
              details: this.detailsFor(action, req.body, previous, res, assetField),
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
