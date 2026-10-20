import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService, ensureDetails, sanitizeDetails } from './audit.service';

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

describe('audit log details are never empty', () => {
  const lines = [
    { id: 11, materialCode: 'CBL-1', quantity: '10.0000', unit: 'm', sellingPrice: '15.7500', sellingCurrency: 'USD', sortOrder: 0 },
    { id: 12, materialCode: 'SW-2', quantity: '5.0000', unit: 'pcs', sellingPrice: '8.0000', sellingCurrency: 'USD', sortOrder: 1 },
  ];
  const quotation = { id: 7, quotationNumber: 'QT-7', status: 'draft', notes: null, items: lines };
  const quotationSetup = () => {
    const record = jest.fn();
    const dataSource: any = {
      entityMetadatas: [{ name: 'Quotation', tableName: 'quotations', primaryColumns: [{ propertyName: 'id' }], target: 'Quotation', relations: [{ propertyName: 'items' }] }],
      getRepository: () => {
        const qb: any = { where: () => qb, leftJoinAndSelect: () => qb, addOrderBy: () => qb, getOne: async () => quotation };
        return { createQueryBuilder: () => qb };
      },
    };
    const interceptor = new AuditInterceptor({ record } as unknown as AuditService, dataSource);
    const run = async (method: string, path: string, body: unknown, response: unknown) => {
      const req: any = { method, path, body, ip: '::1', headers: { 'user-agent': 'jest' }, user: { id: 1, fullName: 'Admin', role: 'admin' } };
      const ctx = { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
      await lastValueFrom(interceptor.intercept(ctx, { handle: () => of(response) }));
    };
    return { record, run };
  };

  it('a quotation edit shows which line changed, which was added and which was removed', async () => {
    const { record, run } = quotationSetup();
    const body = {
      items: [
        { id: 11, materialId: 1, quantity: '20', unit: 'm', sellingPrice: '15.75', sellingCurrency: 'USD' }, // quantity 10 -> 20
        { materialId: 3, quantity: '2', unit: 'pcs', sellingPrice: '4', sellingCurrency: 'USD' }, // new; line 12 is gone
      ],
    };
    await run('PATCH', '/api/quotations/7', body, { ...quotation, items: [{ materialCode: 'CBL-1' }, { materialCode: 'LMP-9' }] });
    const { details } = record.mock.calls[0][0];
    expect(details.before['items[1]']).toEqual({ materialCode: 'CBL-1', quantity: '10.0000' });
    expect(details.after['items[1]']).toEqual({ materialCode: 'CBL-1', quantity: '20' });
    expect(details.after['items[2]']).toMatchObject({ materialCode: 'LMP-9', quantity: '2' });
    expect(details.before['removedItems[2]']).toMatchObject({ materialCode: 'SW-2', quantity: '5.0000' });
  });

  it('does not call a decimal "changed" just because the database writes 10.0000 and the form sends 10', async () => {
    const { record, run } = quotationSetup();
    await run('PATCH', '/api/quotations/7', { items: [
      { id: 11, materialId: 1, quantity: '10', unit: 'm', sellingPrice: 15.75, sellingCurrency: 'USD' },
      { id: 12, materialId: 2, quantity: '5', unit: 'pcs', sellingPrice: '8', sellingCurrency: 'USD' },
    ] }, quotation);
    expect(record).not.toHaveBeenCalled();
  });

  it('a duplicate (empty body) says what was copied and what it became', async () => {
    const { record, run } = quotationSetup();
    await run('POST', '/api/quotations/7/duplicate', {}, { id: 9, quotationNumber: 'QT-9' });
    expect(record.mock.calls[0][0]).toMatchObject({ action: 'duplicate', details: { copiedFromId: 7, newRecord: 'QT-9' } });
  });

  it('keeps a big quotation readable instead of storing "truncated"', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ materialId: i, quantity: '1', unit: 'pcs', notes: 'x'.repeat(300) }));
    const clean = sanitizeDetails({ customerId: 1, items }) as any;
    expect(clean.truncated).toBeUndefined();
    expect(clean.items.length).toBeGreaterThan(10);
  });

  it('removes uploaded file data from the details', () => {
    expect((sanitizeDetails({ logo: 'data:image/png;base64,AAAA' }) as any).logo).toBe('[file data]');
  });

  it('the service fills in the request when an entry has nothing else to show', async () => {
    const save = jest.fn();
    const service = new AuditService({ create: (x: unknown) => x, save } as any);
    await service.record({ action: 'logout', entity: 'auth', method: 'POST', path: '/api/auth/logout', userId: 1, ip: '::1', userAgent: 'jest', details: null });
    const saved = save.mock.calls[0][0].details;
    expect(saved).toEqual({ userAgent: 'jest', ip: '::1', request: 'POST /api/auth/logout' });
    expect(ensureDetails({ action: 'x', entity: 'y', method: 'GET', path: '/p', details: {} })).toEqual({ request: 'GET /p' });
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
