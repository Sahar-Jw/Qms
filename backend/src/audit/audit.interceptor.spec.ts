import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

const company = { id: 3, name: 'Acme', phone: '123', logo: null, headerImage: null, footerImage: null };

function setup(before: Record<string, unknown> = company) {
  const record = jest.fn();
  const dataSource: any = {
    entityMetadatas: [{ name: 'Company', tableName: 'companies', primaryColumns: [{ propertyName: 'id' }], target: 'Company' }],
    getRepository: () => ({ createQueryBuilder: () => ({ where: () => ({ getOne: async () => before }) }) }),
  };
  const interceptor = new AuditInterceptor({ record } as unknown as AuditService, dataSource);
  const run = async (method: string, path: string, body: unknown, response: unknown) => {
    const req: any = { method, path, body, ip: '::1', user: { id: 1, fullName: 'Admin', role: 'admin' } };
    const ctx = { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of(response) }));
  };
  return { record, run };
}

describe('audit log content', () => {
  it('writes nothing when a form is saved without changing anything', async () => {
    const { record, run } = setup();
    await run('PATCH', '/api/companies/3', { name: 'Acme', phone: '123' }, { ...company });
    expect(record).not.toHaveBeenCalled();
  });

  it('lists only the fields that really changed', async () => {
    const { record, run } = setup();
    await run('PATCH', '/api/companies/3', { name: 'Acme 2', phone: '123' }, { ...company, name: 'Acme 2' });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0].details).toEqual({ before: { name: 'Acme' }, after: { name: 'Acme 2' } });
  });

  it.each([
    ['logo', 'logo', 'logos/a.png'],
    ['header-image', 'headerImage', 'letterheads/h.png'],
    ['footer-image', 'footerImage', 'letterheads/f.png'],
  ])('records a company %s upload as old -> new, not as an empty update', async (segment, field, file) => {
    const { record, run } = setup();
    await run('POST', `/api/companies/3/${segment}`, {}, { ...company, [field]: file });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toMatchObject({ action: 'update', entity: 'companies', entityId: '3', entityLabel: 'Acme' });
    expect(record.mock.calls[0][0].details).toEqual({ before: { [field]: null }, after: { [field]: file } });
  });

  it('keeps passwords and sign-in payloads out of the details', async () => {
    const { record, run } = setup();
    await run('POST', '/api/auth/change-password', { currentPassword: 'a', newPassword: 'b', confirmPassword: 'b' }, { ok: true });
    expect(record.mock.calls[0][0]).toMatchObject({ action: 'change_password', details: null });
  });
});

describe('AuditService duplicates', () => {
  it('stores one row for the same action repeated within seconds', async () => {
    const { AuditService: Service } = await import('./audit.service');
    const save = jest.fn();
    const service = new Service({ create: (x: unknown) => x, save } as any);
    const entry = { action: 'update', entity: 'companies', method: 'PATCH', path: '/api/companies/3', userId: 1, entityId: '3', details: { after: { name: 'x' } } };
    await service.record(entry);
    await service.record({ ...entry });
    await service.record({ ...entry, entityId: '4' });
    expect(save).toHaveBeenCalledTimes(2);
  });
});
