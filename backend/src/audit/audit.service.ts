import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginated, Paginated } from '../common/dto/pagination.dto';
import { AuditLog } from './audit-log.entity';
import { ListAuditDto } from './dto/audit.dto';

export type AuditEntry = Pick<AuditLog, 'action' | 'entity' | 'method' | 'path'> &
  Partial<Pick<AuditLog, 'userId' | 'userName' | 'userRole' | 'entityId' | 'entityLabel' | 'ip' | 'details'>>;

const SENSITIVE = /pass(word)?|token|secret|otp/i;
const MAX_DETAILS_CHARS = 6000;

/** Copy of the request body that is safe to store: secrets removed, size capped. */
export function sanitizeDetails(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const clean = (v: unknown, depth: number): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (depth > 4) return '[…]';
    if (Array.isArray(v)) return v.slice(0, 100).map((x) => clean(x, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = SENSITIVE.test(k) ? '[hidden]' : clean(val, depth + 1);
    return out;
  };
  const cleaned = clean(body, 0) as Record<string, unknown>;
  if (!Object.keys(cleaned).length) return null;
  return JSON.stringify(cleaned).length > MAX_DETAILS_CHARS ? { truncated: true, fields: Object.keys(cleaned) } : cleaned;
}

@Injectable()
export class AuditService {
  private readonly log = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  /** Never throws: a problem writing the log must not break the request that was just served. */
  async record(entry: AuditEntry): Promise<void> {
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
          details: entry.details ?? null,
        }),
      );
    } catch (e) {
      this.log.error(`Could not write audit log: ${(e as Error).message}`);
    }
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
