import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { RoleCode } from '../common/enums';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

const BODY = {
  name: 'Acme', address: 'Damascus', phone: '+963 11 000', email: 'info@acme.test', website: 'acme.test',
};

describe('companies: who can add, edit and switch companies', () => {
  let app: INestApplication;
  let base: string;
  const service = {
    list: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    get: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    setActive: jest.fn().mockResolvedValue({ id: 1 }),
    setLogo: jest.fn().mockResolvedValue({ id: 1 }),
    setLetterheadImage: jest.fn().mockResolvedValue({ id: 1 }),
    removeLetterheadImage: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [{ provide: CompaniesService, useValue: service }, { provide: APP_GUARD, useClass: RolesGuard }],
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
  beforeEach(() => jest.clearAllMocks());

  const call = (method: string, path: string, role?: RoleCode, body?: unknown) =>
    fetch(`${base}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(role ? { 'x-role': role } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const ALLOWED = [RoleCode.MANAGER, RoleCode.GENERAL_MANAGER, RoleCode.TECHNICAL_MANAGER];

  it.each(ALLOWED)('%s can add a company', async (role) => {
    expect((await call('POST', '/companies', role, BODY)).status).toBe(201);
    expect(service.create).toHaveBeenCalledTimes(1);
  });

  it.each(ALLOWED)('%s can edit a company', async (role) => {
    expect((await call('PATCH', '/companies/1', role, { name: 'New', address: 'Aleppo' })).status).toBe(200);
    expect(service.update).toHaveBeenCalledTimes(1);
  });

  it.each(ALLOWED)('%s can deactivate / activate a company', async (role) => {
    expect((await call('PATCH', '/companies/1/active', role, { isActive: false })).status).toBe(200);
    expect((await call('PATCH', '/companies/1/active', role, { isActive: true })).status).toBe(200);
    expect(service.setActive).toHaveBeenCalledTimes(2);
  });

  it.each(ALLOWED)('%s can upload a logo (route is reachable)', async (role) => {
    const fd = new FormData();
    fd.append('note', 'no file on purpose');
    const res = await fetch(`${base}/api/companies/1/logo`, { method: 'POST', headers: { 'x-role': role }, body: fd });
    expect(res.status).toBe(201); // the (mocked) service is reached; it is the service that asks for the file
    expect(service.setLogo).toHaveBeenCalledTimes(1);
  });

  it.each(ALLOWED.flatMap((r) => [[r, 'header'], [r, 'footer']] as const))('%s can upload and remove the %s image', async (role, kind) => {
    const fd = new FormData();
    fd.append('note', 'no file on purpose');
    const up = await fetch(`${base}/api/companies/1/${kind}-image`, { method: 'POST', headers: { 'x-role': role }, body: fd });
    expect(up.status).toBe(201);
    expect(service.setLetterheadImage).toHaveBeenCalledWith(1, kind, undefined, 7);
    expect((await call('DELETE', `/companies/1/${kind}-image`, role)).status).toBe(200);
    expect(service.removeLetterheadImage).toHaveBeenCalledWith(1, kind, 7);
  });

  it('employee can read companies but cannot add, edit, switch or upload', async () => {
    expect((await call('GET', '/companies', RoleCode.EMPLOYEE)).status).toBe(200);
    expect((await call('POST', '/companies', RoleCode.EMPLOYEE, BODY)).status).toBe(403);
    expect((await call('PATCH', '/companies/1', RoleCode.EMPLOYEE, { name: 'x' })).status).toBe(403);
    expect((await call('PATCH', '/companies/1/active', RoleCode.EMPLOYEE, { isActive: false })).status).toBe(403);
    const fd = new FormData();
    fd.append('note', 'x');
    expect((await fetch(`${base}/api/companies/1/logo`, { method: 'POST', headers: { 'x-role': RoleCode.EMPLOYEE }, body: fd })).status).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.setActive).not.toHaveBeenCalled();
    expect(service.setLogo).not.toHaveBeenCalled();
    for (const kind of ['header', 'footer']) {
      const f = new FormData();
      f.append('note', 'x');
      expect((await fetch(`${base}/api/companies/1/${kind}-image`, { method: 'POST', headers: { 'x-role': RoleCode.EMPLOYEE }, body: f })).status).toBe(403);
      expect((await call('DELETE', `/companies/1/${kind}-image`, RoleCode.EMPLOYEE)).status).toBe(403);
    }
    expect(service.setLetterheadImage).not.toHaveBeenCalled();
    expect(service.removeLetterheadImage).not.toHaveBeenCalled();
  });
});
