import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { paginated, Paginated } from '../common/dto/pagination.dto';
import { AuditLog } from './audit-log.entity';
import { ListAuditDto } from './dto/audit.dto';

export type AuditEntry = Pick<AuditLog, 'action' | 'entity' | 'method' | 'path'> &
  Partial<Pick<AuditLog, 'userId' | 'userName' | 'userRole' | 'entityId' | 'entityLabel' | 'ip'>> & {
    /** May be empty: the service then fills in what it knows about the request, so a row is never stored without details. */
    details?: Record<string, unknown> | null;
    /** Browser / client of the request (only used to fill in details when nothing else was captured). */
    userAgent?: string | null;
  };

const SENSITIVE = /pass(word)?|token|secret|otp/i;
/** A row's details may be long (a quotation with many lines), but never unbounded. */
const MAX_DETAILS_CHARS = 30000;
const MAX_STRING_CHARS = 500;
/** The same user doing the exact same thing to the same record inside this window is one event (double click, retry). */
const DUPLICATE_WINDOW_MS = 5000;

const sizeOf = (value: unknown) => JSON.stringify(value).length;

/**
 * Copy of the request body that is safe to store: secrets removed, uploaded file data replaced by a marker, long text
 * shortened and the whole thing kept under MAX_DETAILS_CHARS. It shrinks the content step by step instead of throwing it
 * all away, so a big save (a quotation with many lines) still shows what was saved.
 */
export function sanitizeDetails(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const build = (maxArray: number, maxString: number) => {
    const clean = (v: unknown, depth: number): unknown => {
      if (typeof v === 'string') {
        if (/^data:[a-z]+\/[\w.+-]+;base64,/i.test(v)) return '[file data]';
        return v.length > maxString ? `${v.slice(0, maxString)}…` : v;
      }
      if (v === null || typeof v !== 'object') return v;
      if (depth > 4) return '[…]';
      if (Array.isArray(v)) {
        const kept = v.slice(0, maxArray).map((x) => clean(x, depth + 1));
        return v.length > maxArray ? [...kept, `… +${v.length - maxArray}`] : kept;
      }
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = SENSITIVE.test(k) ? '[hidden]' : clean(val, depth + 1);
      return out;
    };
    return clean(body, 0) as Record<string, unknown>;
  };
  let cleaned = build(500, MAX_STRING_CHARS);
  if (!Object.keys(cleaned).length) return null;
  for (const [maxArray, maxString] of [[100, 200], [40, 100], [15, 60]] as const) {
    if (sizeOf(cleaned) <= MAX_DETAILS_CHARS) break;
    cleaned = build(maxArray, maxString);
  }
  return sizeOf(cleaned) > MAX_DETAILS_CHARS ? { truncated: true, fields: Object.keys(cleaned) } : cleaned;
}

/** Details that are never empty: what the entry has, else what is known about the request itself. */
export function ensureDetails(entry: AuditEntry): Record<string, unknown> {
  if (entry.details && typeof entry.details === 'object' && Object.keys(entry.details).length) return entry.details;
  const info: Record<string, unknown> = {};
  if (entry.entityLabel) info.record = entry.entityLabel;
  if (entry.entityId) info.recordId = entry.entityId;
  if (entry.userAgent) info.userAgent = entry.userAgent.slice(0, 200);
  info.request = `${entry.method} ${entry.path}`.slice(0, 255);
  return info;
}

/** JSON with sorted keys: MySQL's JSON column may store object keys in another order, the signature must not care. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value as object).filter((k) => (value as Record<string, unknown>)[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

/** The part of a row the signature covers. */
type Signable = Pick<AuditLog, 'userId' | 'userName' | 'userRole' | 'action' | 'entity' | 'entityId' | 'entityLabel' | 'method' | 'path' | 'ip' | 'details' | 'createdAt'>;

/** Signing key: AUDIT_SIGNING_KEY (at least 32 characters). Without it nothing is signed. Read per call so a restart is the only step to change it. */
const signingKey = () => {
  const k = process.env.AUDIT_SIGNING_KEY ?? '';
  return k.length >= 32 ? k : null;
};

/** Spreadsheet programs run cells that start with = + - @ as formulas: such text is prefixed so an exported name can never execute. */
const csvCell = (v: unknown): string => {
  let t = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

const EXPORT_LIMIT = 10_000;
const PURGE_BATCH = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface AuditVerifyResult {
  /** false when AUDIT_SIGNING_KEY is not set on the server */
  configured: boolean;
  total: number;
  valid: number;
  /** rows written before signing was turned on (or while it was off) */
  unsigned: number;
  /** rows whose content no longer matches their signature */
  invalid: number;
  invalidIds: number[];
}

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AuditService.name);
  private readonly recent = new Map<string, number>();
  private purgeTimer?: NodeJS.Timeout;
  private purgeStart?: NodeJS.Timeout;

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  // ---------------------------------------------------------------- retention

  /** AUDIT_RETENTION_DAYS (30 or more) turns on a daily purge of older rows. Not set = nothing is ever deleted. */
  onModuleInit() {
    const days = Number(process.env.AUDIT_RETENTION_DAYS ?? '');
    if (!Number.isInteger(days) || days < 30) return;
    this.purgeStart = setTimeout(() => void this.purgeOlderThan(days), 60_000);
    this.purgeTimer = setInterval(() => void this.purgeOlderThan(days), DAY_MS);
    this.purgeStart.unref();
    this.purgeTimer.unref();
    this.log.log(`Audit log retention: rows older than ${days} days are removed once a day`);
  }

  onModuleDestroy() {
    if (this.purgeStart) clearTimeout(this.purgeStart);
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  /** Deletes in small batches so a big backlog never locks the table. Returns how many rows were removed. */
  async purgeOlderThan(days: number, now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - days * DAY_MS);
    let removed = 0;
    try {
      for (;;) {
        const result = await this.repo.query('DELETE FROM audit_logs WHERE created_at < ? ORDER BY id LIMIT ?', [cutoff, PURGE_BATCH]);
        const n: number = result?.affectedRows ?? 0;
        removed += n;
        if (n < PURGE_BATCH) break;
      }
      if (removed) this.log.log(`Audit log retention removed ${removed} rows older than ${days} days`);
    } catch (e) {
      this.log.error(`Audit log retention failed: ${(e as Error).message}`);
    }
    return removed;
  }

  // ---------------------------------------------------------------- signing

  sign(row: Signable): string | null {
    const key = signingKey();
    if (!key) return null;
    const body = stableStringify([
      row.userId, row.userName, row.userRole, row.action, row.entity, row.entityId, row.entityLabel,
      row.method, row.path, row.ip, row.details, row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    ]);
    return createHmac('sha256', key).update(body).digest('hex');
  }

  /** Checks every stored row against its signature (editing a row directly in the database is the thing this catches). */
  async verify(): Promise<AuditVerifyResult> {
    const out: AuditVerifyResult = { configured: !!signingKey(), total: 0, valid: 0, unsigned: 0, invalid: 0, invalidIds: [] };
    let lastId = 0;
    for (;;) {
      const rows = await this.repo.createQueryBuilder('a').where('a.id > :lastId', { lastId }).orderBy('a.id', 'ASC').take(1000).getMany();
      if (!rows.length) break;
      for (const row of rows) {
        out.total++;
        if (!row.signature) { out.unsigned++; continue; }
        const expected = this.sign(row);
        const same = expected !== null && expected.length === row.signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(row.signature));
        if (same) out.valid++;
        else { out.invalid++; if (out.invalidIds.length < 20) out.invalidIds.push(row.id); }
      }
      lastId = rows[rows.length - 1].id;
    }
    return out;
  }

  // ---------------------------------------------------------------- writing

  /** Never throws: a problem writing the log must not break the request that was just served. */
  async record(entry: AuditEntry): Promise<void> {
    if (this.isDuplicate(entry)) return;
    try {
      const row = this.repo.create({
        userId: entry.userId ?? null,
        userName: entry.userName?.slice(0, 190) ?? null,
        userRole: entry.userRole ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId?.slice(0, 40) ?? null,
        entityLabel: entry.entityLabel?.slice(0, 190) ?? null,
        method: entry.method,
        path: entry.path.slice(0, 255),
        ip: entry.ip?.slice(0, 64) ?? null,
        details: JSON.parse(JSON.stringify(ensureDetails(entry))), // exactly what the JSON column will hold
        createdAt: new Date(), // the application clock (UTC), see the entity
      });
      row.signature = this.sign(row);
      await this.repo.save(row);
    } catch (e) {
      this.log.error(`Could not write audit log: ${(e as Error).message}`);
    }
  }

  private isDuplicate(entry: AuditEntry): boolean {
    const now = Date.now();
    const key = JSON.stringify([entry.userId ?? entry.userName ?? null, entry.action, entry.entity, entry.entityId ?? null, entry.path, entry.details ?? null]);
    const last = this.recent.get(key);
    this.recent.set(key, now);
    if (this.recent.size > 500) for (const [k, at] of this.recent) if (now - at > DUPLICATE_WINDOW_MS) this.recent.delete(k);
    return last !== undefined && now - last < DUPLICATE_WINDOW_MS;
  }

  // ---------------------------------------------------------------- reading

  private filtered(q: ListAuditDto): SelectQueryBuilder<AuditLog> {
    const qb = this.repo.createQueryBuilder('a');
    if (q.q) qb.andWhere('(a.userName LIKE :s OR a.entityLabel LIKE :s OR a.entityId LIKE :s)', { s: `%${q.q}%` });
    if (q.action) qb.andWhere('a.action = :action', { action: q.action });
    if (q.entity) qb.andWhere('a.entity = :entity', { entity: q.entity });
    if (q.userId) qb.andWhere('a.userId = :uid', { uid: q.userId });
    if (q.from) qb.andWhere('a.createdAt >= :from', { from: new Date(`${q.from}T00:00:00.000Z`) });
    if (q.to) qb.andWhere('a.createdAt <= :to', { to: new Date(`${q.to}T23:59:59.999Z`) });
    return qb;
  }

  async list(q: ListAuditDto): Promise<Paginated<AuditLog>> {
    const [rows, total] = await this.filtered(q)
      .orderBy('a.createdAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return paginated(rows, total, q.page, q.limit);
  }

  /** The people who appear in the log (for the user filter), including accounts that were renamed since. */
  async users(): Promise<{ id: number; name: string }[]> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('a.userId', 'id')
      .addSelect('MAX(a.userName)', 'name')
      .where('a.userId IS NOT NULL')
      .groupBy('a.userId')
      .orderBy('name', 'ASC')
      .getRawMany<{ id: number | string; name: string | null }>();
    return rows.map((r) => ({ id: Number(r.id), name: r.name ?? `#${r.id}` }));
  }

  /** CSV of the filtered log (newest first, at most EXPORT_LIMIT rows). A BOM first, so Excel reads Arabic correctly. */
  async exportCsv(q: ListAuditDto): Promise<string> {
    const rows = await this.filtered(q).orderBy('a.createdAt', 'DESC').addOrderBy('a.id', 'DESC').take(EXPORT_LIMIT).getMany();
    const head = ['id', 'time_utc', 'user', 'role', 'action', 'record_type', 'record_id', 'record', 'ip', 'method', 'path', 'details'];
    const lines = rows.map((r) => [
      r.id, r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt, r.userName, r.userRole, r.action, r.entity, r.entityId, r.entityLabel,
      r.ip, r.method, r.path, JSON.stringify(r.details ?? {}),
    ].map(csvCell).join(','));
    return `\uFEFF${[head.join(','), ...lines].join('\r\n')}\r\n`;
  }
}
