import { ArgumentsHost, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService, stableStringify } from './audit.service';

const KEY = 'k'.repeat(40);

/** Just enough of a repository for AuditService: save / verify / export / purge. */
function fakeRepo() {
  const rows: any[] = [];
  let nextId = 1;
  const repo: any = {
    rows,
    create: (o: any) => ({ ...o }),
    save: async (o: any) => { rows.push({ ...o, id: nextId++ }); },
    query: jest.fn(async (_sql: string, [cutoff, batch]: [Date, number]) => {
      const old = rows.filter((r) => r.createdAt < cutoff).slice(0, batch);
      old.forEach((r) => rows.splice(rows.indexOf(r), 1));
      return { affectedRows: old.length };
    }),
    createQueryBuilder: () => {
      let lastId = 0;
      const qb: any = {
        where: (_s: string, p: { lastId: number }) => { lastId = p.lastId; return qb; },
        andWhere: () => qb,
        orderBy: () => qb,
        addOrderBy: () => qb,
        take: () => qb,
        getMany: async () => rows.filter((r) => r.id > lastId).sort((a, b) => a.id - b.id),
      };
      return qb;
    },
  };
  return repo;
}

const entry = (over: Record<string, unknown> = {}) => ({
  userId: 1, userName: 'Admin', userRole: 'admin', action: 'update', entity: 'customers', entityId: '5', entityLabel: 'Acme',
  method: 'PATCH', path: '/api/customers/5', ip: '1.2.3.4', details: { before: { name: 'a' }, after: { name: 'b' } }, ...over,
});

describe('audit log: time, signature, verification', () => {
  const OLD = process.env.AUDIT_SIGNING_KEY;
  afterEach(() => { process.env.AUDIT_SIGNING_KEY = OLD; if (OLD === undefined) delete process.env.AUDIT_SIGNING_KEY; });

  it('sets the time itself (UTC) and signs the row when a key is configured', async () => {
    process.env.AUDIT_SIGNING_KEY = KEY;
    const repo = fakeRepo();
    const before = Date.now();
    await new AuditService(repo).record(entry());
    expect(repo.rows[0].createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(repo.rows[0].signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('signs nothing without a key, and says so when verifying', async () => {
    delete process.env.AUDIT_SIGNING_KEY;
    const repo = fakeRepo();
    const svc = new AuditService(repo);
    await svc.record(entry());
    expect(repo.rows[0].signature).toBeNull();
    expect(await svc.verify()).toMatchObject({ configured: false, total: 1, unsigned: 1, invalid: 0 });
  });

  it('verify passes untouched rows (even when the database reorders JSON keys) and flags an edited row', async () => {
    process.env.AUDIT_SIGNING_KEY = KEY;
    const repo = fakeRepo();
    const svc = new AuditService(repo);
    await svc.record(entry({ entityId: '1' }));
    await svc.record(entry({ entityId: '2' }));
    repo.rows[0].details = { after: repo.rows[0].details.after, before: repo.rows[0].details.before }; // MySQL JSON may reorder keys
    expect(await svc.verify()).toMatchObject({ configured: true, total: 2, valid: 2, invalid: 0 });
    repo.rows[1].details = { before: { name: 'a' }, after: { name: 'HACKED' } }; // edited in phpMyAdmin
    const result = await svc.verify();
    expect(result).toMatchObject({ valid: 1, invalid: 1, invalidIds: [2] });
  });

  it('rows written before signing was on count as unsigned, not as tampered', async () => {
    delete process.env.AUDIT_SIGNING_KEY;
    const repo = fakeRepo();
    const svc = new AuditService(repo);
    await svc.record(entry());
    process.env.AUDIT_SIGNING_KEY = KEY;
    expect(await svc.verify()).toMatchObject({ total: 1, unsigned: 1, invalid: 0 });
  });

  it('stableStringify ignores key order', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } })).toBe(stableStringify({ a: { c: [3, { y: 2, z: 1 }], d: 2 }, b: 1 }));
  });
});

describe('audit log: export and retention', () => {
  it('exports a CSV with a BOM, quoted commas, and no live spreadsheet formulas', async () => {
    delete process.env.AUDIT_SIGNING_KEY;
    const repo = fakeRepo();
    const svc = new AuditService(repo);
    await svc.record(entry({ userName: '=HYPERLINK("http://evil")', entityLabel: 'Ali, Co "Ltd"' }));
    const csv = await svc.exportCsv({ page: 1, limit: 20 } as any);
    expect(csv.startsWith('\uFEFFid,time_utc,user,role,action')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`); // formula neutralised and quoted
    expect(csv).toContain('"Ali, Co ""Ltd"""');
  });

  it('retention removes only rows older than the cutoff, in batches', async () => {
    const repo = fakeRepo();
    const day = 24 * 3600 * 1000;
    for (let i = 0; i < 2500; i++) repo.rows.push({ id: i + 1, createdAt: new Date(Date.now() - 400 * day) });
    repo.rows.push({ id: 9999, createdAt: new Date() });
    const removed = await new AuditService(repo).purgeOlderThan(365);
    expect(removed).toBe(2500);
    expect(repo.rows.map((r: any) => r.id)).toEqual([9999]);
    expect(repo.query).toHaveBeenCalledTimes(3); // 1000 + 1000 + 500
  });
});

describe('audit log: reads and denials', () => {
  function interceptorSetup() {
    const record = jest.fn();
    const dataSource: any = { entityMetadatas: [], query: jest.fn(async () => [{ n: 'QT-2026-0007' }]) };
    const interceptor = new AuditInterceptor({ record } as unknown as AuditService, dataSource);
    const get = async (path: string, query: Record<string, string> = {}, userId = 1) => {
      const req: any = { method: 'GET', path, query, ip: '::1', headers: {}, user: { id: userId, fullName: 'Admin', role: 'admin' } };
      const ctx = { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
      await lastValueFrom(interceptor.intercept(ctx, { handle: () => of('x') }));
      await new Promise((r) => setImmediate(r));
    };
    return { record, get };
  }

  it('logs printing and PDF export of a quotation, with the quotation number', async () => {
    const { record, get } = interceptorSetup();
    await get('/api/quotations/7/print', { lang: 'ar' });
    await get('/api/quotations/7/print', { lang: 'en', inline: 'true', includeCost: 'true' });
    await get('/api/quotations/7/pdf', { lang: 'ar' });
    expect(record.mock.calls.map(([e]) => [e.action, e.entityLabel, e.details.includeCost])).toEqual([
      ['print', 'QT-2026-0007', false], ['export_pdf', 'QT-2026-0007', true], ['export_pdf', 'QT-2026-0007', false],
    ]);
  });

  it('does not log ordinary reads', async () => {
    const { record, get } = interceptorSetup();
    await get('/api/quotations'); await get('/api/quotations/7'); await get('/api/customers');
    expect(record).not.toHaveBeenCalled();
  });

  it('logs opening the audit log once per 10 minutes per user, first page only, and every export', async () => {
    const { record, get } = interceptorSetup();
    await get('/api/audit-log', { q: 'ali' });
    await get('/api/audit-log', { q: 'alim' }); // filter changed: same visit
    await get('/api/audit-log', { page: '2' });
    await get('/api/audit-log', {}, 2); // another user
    await get('/api/audit-log/export', { action: 'delete' });
    expect(record.mock.calls.map(([e]) => [e.action, e.userId])).toEqual([['view', 1], ['view', 2], ['export', 1]]);
    expect(record.mock.calls[0][0].details).toEqual({ q: 'ali' });
  });

  describe('exception filter', () => {
    const run = (exception: unknown, path = '/api/audit-log', user: unknown = { id: 4, fullName: 'Sam', role: 'employee' }) => {
      const record = jest.fn();
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const req: any = { method: 'GET', path, ip: '::1', headers: {}, user };
      const host = { switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }) } as unknown as ArgumentsHost;
      new AllExceptionsFilter({ record } as unknown as AuditService).catch(exception, host);
      return { record, res };
    };

    it('logs a denied request with who, what and the code, and still answers 403', () => {
      const { record, res } = run(new ForbiddenException({ code: 'FORBIDDEN', message: 'no' }));
      expect(res.status).toHaveBeenCalledWith(403);
      expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'denied', entity: 'audit', userId: 4, userName: 'Sam', details: { request: 'GET /api/audit-log', code: 'FORBIDDEN', status: 403 } }));
    });

    it('logs failed password changes and resets', () => {
      const a = run(new HttpException({ code: 'WRONG_CURRENT_PASSWORD', message: 'x' }, 400), '/api/auth/change-password');
      const b = run(new HttpException({ code: 'INVALID_RESET_TOKEN', message: 'x' }, 400), '/api/auth/reset-password', undefined);
      expect(a.record.mock.calls[0][0].action).toBe('change_password_failed');
      expect(b.record.mock.calls[0][0].action).toBe('reset_password_failed');
    });

    it('does not double-log a failed sign-in, and ignores ordinary errors', () => {
      expect(run(new ForbiddenException({ code: 'ACCOUNT_NOT_ACTIVATED', message: 'x' }), '/api/auth/login', undefined).record).not.toHaveBeenCalled();
      expect(run(new NotFoundException()).record).not.toHaveBeenCalled();
    });

    it('works without an audit service (as in the upload test)', () => {
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const host = { switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ path: '/x' }) }) } as unknown as ArgumentsHost;
      expect(() => new AllExceptionsFilter().catch(new ForbiddenException(), host)).not.toThrow();
    });
  });
});
