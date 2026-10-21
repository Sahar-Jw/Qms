import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { from, mergeMap, Observable, tap } from 'rxjs';
import { AuthUser } from '../common/auth-user';
import { AppSetting } from '../settings/app-setting.entity';
import { BRAND_SETTING_KEY, normalizeBrand, normalizeTheme, THEME_SETTING_KEY } from '../settings/theme';
import { AuditService, sanitizeDetails } from './audit.service';
import { requestInfo } from './request-info';

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
  'header-image': 'update', // POST uploads, DELETE removes
  'footer-image': 'update',
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
type AssetField = 'logo' | 'icon' | 'avatar' | 'headerImage' | 'footerImage';
const COMPANY_ASSET: Record<string, AssetField> = { logo: 'logo', 'header-image': 'headerImage', 'footer-image': 'footerImage' };
const assetFieldOf = (resource: string, segs: string[]): AssetField | null => {
  if (resource === 'settings' && segs[1] === 'brand' && (segs[2] === 'logo' || segs[2] === 'icon')) return segs[2];
  if (resource === 'auth' && segs[1] === 'avatar') return 'avatar';
  if (resource === 'companies' && /^\d+$/.test(segs[1] ?? '') && segs[2] && COMPANY_ASSET[segs[2]]) return COMPANY_ASSET[segs[2]];
  return null;
};

/** Returned by detailsFor when a save changed nothing: no log row is written for it. */
const NOTHING_CHANGED = Symbol('nothing-changed');
/** Actions whose body is only credentials / noise: the row itself says everything worth knowing. */
const NO_DETAILS = new Set(['login', 'login_failed', 'logout', 'change_password', 'reset_password']);

/** Bookkeeping columns that say nothing useful about a deleted record. */
const SNAPSHOT_SKIP = new Set(['id', 'createdAt', 'updatedAt', 'createdById', 'updatedById']);
/** Dates and the like become plain JSON values, so they survive sanitizing. */
const jsonSafe = (value: unknown): unknown => (value === undefined ? null : JSON.parse(JSON.stringify(value)));
/**
 * Values as they are compared: "" and null are the same (a cleared field), and decimal strings equal the numbers they spell
 * ('10.0000' = 10), because the database returns decimals as strings while forms send numbers. Without this every save of
 * a priced record was logged as "changed" even when nothing was.
 */
const normalize = (value: unknown): unknown => {
  if (value === '' || value === undefined) return null;
  if (typeof value === 'string' && /^-?(0|[1-9]\d*)(\.\d+)?$/.test(value.trim())) return Number(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  return value;
};
const sameValue = (a: unknown, b: unknown) => JSON.stringify(normalize(jsonSafe(a))) === JSON.stringify(normalize(jsonSafe(b)));

/** Quotation lines: columns that are not part of what the user edits. */
const LINE_SKIP = new Set(['id', 'quotationId', 'quotation', 'material', 'amounts', 'sortOrder']);

/**
 * Compares the saved lines of a quotation with the lines that were just submitted. Keys are positions in the NEW list
 * (`items[2]` = the 2nd line, as printed); lines that no longer exist are `removedItems[<old position>]`. A changed line lists
 * only the fields that changed (plus its material code, for context); a new line lists what it was created with.
 */
function diffLines(beforeLines: Record<string, unknown>[], submitted: unknown[], response: unknown) {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const printed = isRecord(response) && Array.isArray(response.items) ? (response.items as Record<string, unknown>[]) : [];
  const byId = new Map(beforeLines.map((line, index) => [Number(line.id), { line, index }]));
  const kept = new Set<number>();

  submitted.forEach((raw, index) => {
    if (!isRecord(raw)) return;
    const key = `items[${index + 1}]`;
    const old = raw.id != null ? byId.get(Number(raw.id)) : undefined;
    const code = old?.line.materialCode ?? printed[index]?.materialCode ?? raw.materialCode ?? (raw.materialId != null ? `#${raw.materialId}` : null);
    if (!old) {
      after[key] = { materialCode: code, ...Object.fromEntries(Object.entries(raw).filter(([k, v]) => !LINE_SKIP.has(k) && v !== null && v !== '' && v !== undefined)) };
      return;
    }
    kept.add(old.index);
    const changedKeys = Object.keys(raw).filter((k) => !LINE_SKIP.has(k) && k in old.line && !sameValue(old.line[k], raw[k]));
    if (!changedKeys.length) return;
    before[key] = { materialCode: code, ...Object.fromEntries(changedKeys.map((k) => [k, jsonSafe(old.line[k])])) };
    after[key] = { materialCode: code, ...Object.fromEntries(changedKeys.map((k) => [k, raw[k]])) };
  });

  beforeLines.forEach((line, index) => {
    if (kept.has(index)) return;
    before[`removedItems[${index + 1}]`] = Object.fromEntries(
      Object.entries(line).filter(([k, v]) => !LINE_SKIP.has(k) && v !== null && v !== '' && v !== undefined),
    );
  });
  return { before, after };
}

/**
 * Records every successful create / update / delete / sign-in in the audit log, plus failed sign-ins.
 * Ordinary reads (GET) are not logged; the sensitive ones are: printing / exporting a quotation as PDF, opening the audit log
 * and exporting it. Denied requests (403) are logged by the exception filter. Registered globally, so new endpoints are covered
 * automatically.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly log = new Logger(AuditInterceptor.name);
  /** user id -> when opening the audit log was last recorded (once per 10 minutes, or every filter change would add a row) */
  private readonly lastAuditView = new Map<number, number>();

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
    const query = repository.createQueryBuilder('record').where('record.id = :id', { id: Number(id) });
    // A quotation is its lines too: without them an edit of the lines could not be shown as old -> new.
    if (normalizedResource === 'quotations' && metadata.relations.some((relation) => relation.propertyName === 'items')) {
      query.leftJoinAndSelect('record.items', 'items').addOrderBy('items.sortOrder', 'ASC').addOrderBy('items.id', 'ASC');
    }
    return query.getOne();
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
  ): Record<string, unknown> | null | typeof NOTHING_CHANGED {
    if (NO_DETAILS.has(action)) return null;
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

      const lines = Array.isArray(submitted.items) && Array.isArray(before.items)
        ? diffLines(before.items as Record<string, unknown>[], submitted.items, response)
        : null;
      const fields = Object.keys(submitted).filter((field) => !(lines && field === 'items'));
      if (!fields.length && !lines && (action === 'activate' || action === 'deactivate')) {
        const activeField = 'isActive' in before ? 'isActive' : 'active' in before ? 'active' : null;
        if (activeField) {
          const target = action === 'activate';
          if (before[activeField] === target) return NOTHING_CHANGED;
          return { before: sanitizeDetails({ [activeField]: before[activeField] }), after: { [activeField]: target } };
        }
      }

      const responseRecord = isRecord(response) ? response : null;
      const valueAfter = (field: string) =>
        responseRecord && Object.hasOwn(responseRecord, field) ? responseRecord[field] : submitted[field];
      // Forms send every field on save: list only what really changed. Fields that are not columns of the
      // record (nested lists such as quotation items) cannot be compared, so they are kept as "after" only.
      const columns = fields.filter((field) => field in before);
      const nested = fields.filter((field) => !(field in before));
      const changed = columns.filter((field) => !sameValue(before[field], valueAfter(field)));
      const shown = [...changed, ...nested];
      const lineChanged = !!lines && (Object.keys(lines.before).length > 0 || Object.keys(lines.after).length > 0);
      if (!shown.length && !lineChanged) return NOTHING_CHANGED; // saved without touching anything: not worth a log row
      return {
        before: sanitizeDetails({ ...Object.fromEntries(changed.map((field) => [field, jsonSafe(before[field])])), ...lines?.before }) ?? {},
        after: sanitizeDetails({ ...Object.fromEntries(shown.map((field) => [field, valueAfter(field)])), ...lines?.after }) ?? {},
      };
    }

    return sanitizeDetails(submitted);
  }

  /** The reads worth a log row (see the class comment). Everything else passes straight through. */
  private interceptRead(req: Request & { user?: AuthUser }, next: CallHandler): Observable<unknown> {
    if (req.method !== 'GET') return next.handle();
    const { segs } = requestInfo(req);
    const [resource, second, third] = segs;
    const q = req.query as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
    const filters = Object.fromEntries(
      ['q', 'action', 'entity', 'userId', 'from', 'to'].map((k) => [k, text(q[k])]).filter(([, v]) => v !== undefined),
    );

    let event: { action: string; entity: string; entityId: string | null; details: Record<string, unknown> } | null = null;
    if (resource === 'quotations' && /^\d+$/.test(second ?? '') && (third === 'print' || third === 'pdf')) {
      // the browser builds its PDF from the print page with ?inline=true: that is a PDF export too
      const exported = third === 'pdf' || q.inline === 'true';
      event = { action: exported ? 'export_pdf' : 'print', entity: 'quotations', entityId: second, details: { lang: text(q.lang) ?? 'ar', includeCost: q.includeCost === 'true' } };
    } else if (resource === 'audit-log' && !second) {
      const uid = req.user?.id;
      const now = Date.now();
      if (uid == null || Number(q.page ?? 1) > 1 || now - (this.lastAuditView.get(uid) ?? 0) < 600_000) return next.handle();
      this.lastAuditView.set(uid, now);
      event = { action: 'view', entity: 'audit', entityId: null, details: filters };
    } else if (resource === 'audit-log' && second === 'export') {
      event = { action: 'export', entity: 'audit', entityId: null, details: filters };
    }
    if (!event) return next.handle();
    const found = event;
    return next.handle().pipe(tap({ next: () => void this.recordRead(req, found) }));
  }

  private async recordRead(req: Request & { user?: AuthUser }, event: { action: string; entity: string; entityId: string | null; details: Record<string, unknown> }) {
    try {
      const info = requestInfo(req);
      let entityLabel: string | null = null;
      if (event.entity === 'quotations' && event.entityId) {
        const rows: { n: string }[] = await this.dataSource.query('SELECT quotation_number AS n FROM quotations WHERE id = ? LIMIT 1', [event.entityId]);
        entityLabel = rows[0]?.n ?? null;
      }
      await this.audit.record({
        userId: info.userId, userName: info.userName, userRole: info.userRole,
        action: event.action, entity: event.entity, entityId: event.entityId, entityLabel,
        method: info.method, path: info.path, ip: info.ip, details: event.details,
      });
    } catch (e) {
      this.log.error(`Could not log ${event.action}: ${(e as Error).message}`);
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!(req.method in METHOD_ACTION)) return this.interceptRead(req, next);

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
      action = 'update';
    }
    const assetField = assetFieldOf(resource, segs);
    if (assetField) action = 'update'; // uploading or removing an image edits the profile / the branding

    const base = {
      entity,
      method: req.method,
      path: req.path,
      ip: req.ip ?? null,
    };

    // What to read *before* the request runs, so the log can show old -> new.
    const myId = req.user?.id;
    let loadBefore: (() => Promise<Record<string, unknown> | null>) | null = null;
    if (assetField === 'avatar' || (resource === 'auth' && sub === 'profile')) {
      if (myId != null) loadBefore = () => this.snapshot('users', String(myId));
    } else if (resource === 'companies' && assetField) {
      loadBefore = () => this.snapshot('companies', segs[1]); // logo / header / footer of one company
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
            let details = this.detailsFor(action, req.body, previous, res, assetField);
            if (details === NOTHING_CHANGED) return;
            if (action === 'duplicate') {
              // the request body is empty (or just a customer): say what was copied and what it became
              details = { ...(details ?? {}), copiedFromId: hasId ? Number(segs[1]) : null, newRecord: pickLabel(res) };
            }
            void this.audit.record({
              ...base,
              action,
              details,
              userId: who?.id ?? null,
              userName: (who as any)?.fullName ?? null,
              userRole: typeof role === 'string' ? role : role?.code ?? null,
              entityId: hasId ? segs[1] : res && typeof res === 'object' && (res as any).id != null ? String((res as any).id) : null,
              entityLabel: pickLabel(res),
              userAgent: (req.headers?.['user-agent'] as string | undefined) ?? null,
            });
          },
          error: () => {
            // Wrong password / locked / inactive account: worth keeping. Other failures changed nothing.
            if (!isLogin) return;
            const email = (req.body as any)?.email;
            void this.audit.record({
              ...base, action: 'login_failed', userName: typeof email === 'string' ? email : null,
              userAgent: (req.headers?.['user-agent'] as string | undefined) ?? null,
            });
          },
        }),
      )),
    );
  }
}
