import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  if (entry.ip) info.ip = entry.ip;
  info.request = `${entry.method} ${entry.path}`.slice(0, 255);
  return info;
}

@Injectable()
export class AuditService {
  private readonly log = new Logger(AuditService.name);
  private readonly recent = new Map<string, number>();

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  /** Never throws: a problem writing the log must not break the request that was just served. */
  async record(entry: AuditEntry): Promise<void> {
    if (this.isDuplicate(entry)) return;
    try {
      await this.repo.save(
        this.repo.create({
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
          details: ensureDetails(entry),
        }),
      );
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

  async list(q: ListAuditDto): Promise<Paginated<AuditLog>> {
    const qb = this.repo.createQueryBuilder('a');
    if (q.q) qb.andWhere('(a.userName LIKE :s OR a.entityLabel LIKE :s OR a.entityId LIKE :s)', { s: `%${q.q}%` });
    if (q.action) qb.andWhere('a.action = :action', { action: q.action });
    if (q.entity) qb.andWhere('a.entity = :entity', { entity: q.entity });
    if (q.userId) qb.andWhere('a.userId = :uid', { uid: q.userId });
    if (q.from) qb.andWhere('a.createdAt >= :from', { from: new Date(`${q.from}T00:00:00.000Z`) });
    if (q.to) qb.andWhere('a.createdAt <= :to', { to: new Date(`${q.to}T23:59:59.999Z`) });
    const [rows, total] = await qb
      .orderBy('a.createdAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return paginated(rows, total, q.page, q.limit);
  }
}
