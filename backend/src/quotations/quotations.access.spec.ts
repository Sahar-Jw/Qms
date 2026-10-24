import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { RoleCode } from '../common/enums';
import { RolesGuard } from '../common/guards/roles.guard';
import { MailService } from '../mail/mail.service';
import { PdfService } from '../pdf/pdf.service';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

describe('quotations: deleting cancelled quotations', () => {
  let app: INestApplication;
  let base: string;
  const service = { delete: jest.fn().mockResolvedValue({ id: 1, quotationNumber: 'Q-001' }) };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [
        { provide: QuotationsService, useValue: service },
        { provide: PdfService, useValue: {} },
        { provide: MailService, useValue: {} },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
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

  const remove = (role?: RoleCode) =>
    fetch(`${base}/api/quotations/1`, {
      method: 'DELETE',
      headers: role ? { 'x-role': role } : {},
    });

  it.each([RoleCode.MANAGER, RoleCode.GENERAL_MANAGER, RoleCode.TECHNICAL_MANAGER])('%s can reach the delete action', async (role) => {
    expect((await remove(role)).status).toBe(200);
    expect(service.delete).toHaveBeenCalledWith(1, expect.objectContaining({ role }));
  });

  it('employees cannot delete quotations', async () => {
    expect((await remove(RoleCode.EMPLOYEE)).status).toBe(403);
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('denies requests without a role', async () => {
    expect((await remove()).status).toBe(403);
    expect(service.delete).not.toHaveBeenCalled();
  });
});
