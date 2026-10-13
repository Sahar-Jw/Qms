import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RoleCode } from '../common/enums';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** Real multer, real service, fake repository: the image really lands in <uploads>/letterheads. */
describe('companies: uploading header / footer images', () => {
  let app: INestApplication;
  let base: string;
  let dir: string;
  const prevDir = process.env.UPLOADS_DIR;
  const row: Record<string, unknown> = { id: 1, name: 'Acme', headerImage: null, footerImage: null };
  const repo = { findOneBy: jest.fn(async () => row), save: jest.fn(async (c: unknown) => c) };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qms-uploads-'));
    process.env.UPLOADS_DIR = dir;
    const mod = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [CompaniesService, { provide: 'CompanyRepository', useValue: repo }, { provide: APP_GUARD, useClass: RolesGuard }],
    })
      .useMocker((token) => (String(token).includes('Repository') ? repo : undefined))
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req: any, _res: unknown, next: () => void) => {
      req.user = { id: 7, email: 'u@x.test', fullName: 'T', role: req.headers['x-role'] };
      next();
    });
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', 'localhost');
  });
  afterAll(async () => {
    await app.close();
    if (prevDir === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = prevDir;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const send = (kind: string, bytes: Buffer, type: string, name = 'banner.png') => {
    const fd = new FormData();
    fd.append('file', new Blob([bytes], { type }), name);
    return fetch(`${base}/api/companies/1/${kind}-image`, { method: 'POST', headers: { 'x-role': RoleCode.TECHNICAL_MANAGER }, body: fd });
  };

  it.each(['header', 'footer'])('saves a PNG as the %s image under letterheads/', async (kind) => {
    const res = await send(kind, PNG, 'image/png');
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, string>;
    const rel = body[`${kind}Image`] as string;
    expect(rel).toMatch(/^letterheads\/[0-9a-f]{32}\.png$/);
    expect(fs.readFileSync(path.join(dir, rel)).equals(PNG)).toBe(true);
  });

  it('refuses a non-image file', async () => {
    const res = await send('header', Buffer.from('<script>alert(1)</script>'), 'image/svg+xml', 'x.svg');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('INVALID_FILE_TYPE');
  });

  it('refuses a file over 3 MB', async () => {
    const res = await send('footer', Buffer.alloc(3 * 1024 * 1024 + 10), 'image/png');
    expect(res.status).toBe(413);
  });
});
