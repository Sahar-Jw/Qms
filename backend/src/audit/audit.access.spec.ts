import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { lastValueFrom, of } from 'rxjs';
import { RoleCode } from '../common/enums';
import { RolesGuard } from '../common/guards/roles.guard';
import { SettingsController } from '../settings/settings.controller';
import { SettingsService } from '../settings/settings.service';
import { DEFAULT_THEME, normalizeTheme } from '../settings/theme';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService, sanitizeDetails } from './audit.service';

const NEW_COLORS = { ink: '#111111', cocoa: '#222222', clay: '#333333', stone: '#444444', sand: '#FAFAFA' };

describe('settings tabs: who can use what', () => {
  let app: INestApplication;
  let base: string;
  const record = jest.fn();
  const audit = { record, list: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }) };
  const settings = {
    pickList: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({}),
    setIssuingCompany: jest.fn().mockResolvedValue({}),
    getTheme: jest.fn().mockResolvedValue({ colors: DEFAULT_THEME }),
    setTheme: jest.fn().mockImplementation(async (colors) => ({ colors })),
    resetTheme: jest.fn().mockResolvedValue({ colors: DEFAULT_THEME }),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AuditController, SettingsController],
      providers: [
        { provide: AuditService, useValue: audit },
        { provide: SettingsService, useValue: settings },
        { provide: DataSource, useValue: { entityMetadatas: [], getRepository: jest.fn() } },
        AuditInterceptor,
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    // stands in for the JWT guard: the role comes from a header
    app.use((req: any, _res: unknown, next: () => void) => {
      const role = req.headers['x-role'];
      if (role) req.user = { id: 7, email: 'u@x.test', fullName: 'Test User', role };
      next();
    });
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', 'localhost');
  });
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks()); // forget calls, keep the canned answers

  const call = (method: string, path: string, role?: RoleCode, body?: unknown) =>
    fetch(`${base}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(role ? { 'x-role': role } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const OTHER_THREE = [RoleCode.MANAGER, RoleCode.GENERAL_MANAGER, RoleCode.TECHNICAL_MANAGER];

  it.each(OTHER_THREE)('audit log: %s can read it', async (role) => {
    expect((await call('GET', '/audit-log', role)).status).toBe(200);
  });

  it('audit log: employee is refused', async () => {
    const res = await call('GET', '/audit-log', RoleCode.EMPLOYEE);
    expect(res.status).toBe(403);
    expect(audit.list).not.toHaveBeenCalled();
  });

  it.each(OTHER_THREE)('theme: %s can change and reset it', async (role) => {
    expect((await call('PATCH', '/settings/theme', role, { colors: NEW_COLORS })).status).toBe(200);
    expect((await call('DELETE', '/settings/theme', role)).status).toBe(200);
  });

  it('theme: employee cannot change or reset it', async () => {
    expect((await call('PATCH', '/settings/theme', RoleCode.EMPLOYEE, { colors: NEW_COLORS })).status).toBe(403);
    expect((await call('DELETE', '/settings/theme', RoleCode.EMPLOYEE)).status).toBe(403);
    expect(settings.setTheme).not.toHaveBeenCalled();
    expect(settings.resetTheme).not.toHaveBeenCalled();
  });

  it('employee still gets what every user needs: the colours, and the company picker', async () => {
    expect((await call('GET', '/settings/theme', RoleCode.EMPLOYEE)).status).toBe(200);
    expect((await call('GET', '/settings/companies', RoleCode.EMPLOYEE)).status).toBe(200);
    expect((await call('PATCH', '/settings', RoleCode.EMPLOYEE, { issuingCompanyId: 1 })).status).toBe(200);
  });

  it.each([
    [{ colors: { ...NEW_COLORS, ink: 'red' } }],
    [{ colors: { ...NEW_COLORS, sand: '#FFF' } }],
    [{ colors: { ink: '#111111' } }],
    [{ colors: { ...NEW_COLORS, evil: '#000000' } }],
    [{}],
  ])('theme: invalid body %j is rejected with 400', async (body) => {
    expect((await call('PATCH', '/settings/theme', RoleCode.MANAGER, body)).status).toBe(400);
    expect(settings.setTheme).not.toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it('records a theme change in the audit log with who did it', async () => {
    await call('PATCH', '/settings/theme', RoleCode.GENERAL_MANAGER, { colors: NEW_COLORS });
    await new Promise((r) => setTimeout(r, 20));
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toMatchObject({
      action: 'update', entity: 'theme', method: 'PATCH', userId: 7, userName: 'Test User', userRole: RoleCode.GENERAL_MANAGER,
      details: { colors: NEW_COLORS },
    });
  });

  it('records a reset as "reset", and does not log reads or refused requests', async () => {
    await call('DELETE', '/settings/theme', RoleCode.MANAGER);
    await call('GET', '/settings/theme', RoleCode.MANAGER);
    await call('PATCH', '/settings/theme', RoleCode.EMPLOYEE, { colors: NEW_COLORS }); // 403
    await new Promise((r) => setTimeout(r, 20));
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toMatchObject({ action: 'reset', entity: 'theme' });
  });

  it('records the company choice', async () => {
    await call('PATCH', '/settings', RoleCode.EMPLOYEE, { issuingCompanyId: 3 });
    await new Promise((r) => setTimeout(r, 20));
    expect(record.mock.calls[0][0]).toMatchObject({ action: 'update', entity: 'settings', details: { issuingCompanyId: 3 } });
  });

  it('audit log query is validated', async () => {
    expect((await call('GET', '/audit-log?limit=5000', RoleCode.MANAGER)).status).toBe(400);
    expect((await call('GET', '/audit-log?from=notadate', RoleCode.MANAGER)).status).toBe(400);
    expect((await call('GET', '/audit-log?action=create&entity=quotations&page=2&from=2026-10-01', RoleCode.MANAGER)).status).toBe(200);
  });
});

describe('audit helpers', () => {
  it('hides passwords and tokens, at any depth', () => {
    expect(sanitizeDetails({ email: 'a@b.c', password: 'secret', nested: { newPassword: 'x', resetToken: 'y', keep: 1 } })).toEqual({
      email: 'a@b.c', password: '[hidden]', nested: { newPassword: '[hidden]', resetToken: '[hidden]', keep: 1 },
    });
  });

  it('keeps nothing for an empty body, and caps very large ones', () => {
    expect(sanitizeDetails({})).toBeNull();
    expect(sanitizeDetails(undefined)).toBeNull();
    const big = sanitizeDetails({ items: Array.from({ length: 100 }, (_, i) => ({ note: 'x'.repeat(200), i })) });
    expect(big).toEqual({ truncated: true, fields: ['items'] });
  });

  it('theme colours: bad or missing values fall back to the defaults', () => {
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME);
    expect(normalizeTheme({ ink: '#abcdef', cocoa: 'nope', sand: 5 })).toEqual({ ...DEFAULT_THEME, ink: '#ABCDEF' });
  });
});

describe('audit interceptor: uploads and deletes keep what changed', () => {
  const record = jest.fn();
  const brandRow = { value: { websiteName: 'Old', tagline: 'T', logo: 'branding/logo-old.png', icon: null } };
  const userRow = { id: 7, fullName: 'Boss', avatar: 'avatars/old.png', name: 'x', passwordHash: 'h', createdAt: new Date(), isActive: true };
  const dataSource = {
    entityMetadatas: [{ name: 'User', tableName: 'users', primaryColumns: [{ propertyName: 'id' }], target: 'User' }],
    getRepository: jest.fn((target: unknown) => (target === 'User'
      ? { createQueryBuilder: () => ({ where: () => ({ getOne: async () => userRow }) }) }
      : { findOneBy: async () => brandRow })),
  };
  const interceptor = new AuditInterceptor({ record } as unknown as AuditService, dataSource as unknown as DataSource);

  const run = async (method: string, path: string, response: unknown, body: unknown = {}) => {
    const req = { method, path, body, ip: '::1', user: { id: 7, fullName: 'Boss', role: 'manager' } };
    const ctx = { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req }) } as any;
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of(response) }));
    await new Promise((r) => setTimeout(r, 10));
    return record.mock.calls.at(-1)![0];
  };
  beforeEach(() => record.mockClear());

  it('brand icon upload: logged as an update of settings, with old and new file', async () => {
    const entry = await run('POST', '/api/settings/brand/icon', { websiteName: 'Old', tagline: 'T', logo: null, icon: 'branding/icon-new.png' });
    expect(entry).toMatchObject({
      action: 'update', entity: 'settings', entityLabel: 'Old',
      details: { before: { icon: null }, after: { icon: 'branding/icon-new.png' } },
    });
  });

  it('brand logo removal shows the removed file', async () => {
    const entry = await run('DELETE', '/api/settings/brand/logo', { websiteName: 'Old', logo: null, icon: null });
    expect(entry).toMatchObject({ action: 'update', details: { before: { logo: 'branding/logo-old.png' }, after: { logo: null } } });
  });

  it('avatar upload shows the old and new picture', async () => {
    const entry = await run('POST', '/api/auth/avatar', { fullName: 'Boss', avatar: 'avatars/new.png' });
    expect(entry).toMatchObject({ action: 'update', entity: 'auth', details: { before: { avatar: 'avatars/old.png' }, after: { avatar: 'avatars/new.png' } } });
  });

  it('brand save lists only the fields that changed', async () => {
    const body = { websiteName: 'New', tagline: 'T', logo: 'branding/logo-old.png', icon: null };
    const entry = await run('PATCH', '/api/settings/brand', body, body);
    expect(entry.details).toEqual({ before: { websiteName: 'Old' }, after: { websiteName: 'New' } });
  });

  it('delete keeps a copy of the removed record, without secrets or bookkeeping columns', async () => {
    const entry = await run('DELETE', '/api/users/7', { ok: true });
    expect(entry.action).toBe('delete');
    expect(entry.details.before).toMatchObject({ fullName: 'Boss', passwordHash: '[hidden]', isActive: true });
    expect(entry.details.before).not.toHaveProperty('id');
    expect(entry.details.before).not.toHaveProperty('createdAt');
  });
});
