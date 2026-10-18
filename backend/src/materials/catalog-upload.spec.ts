import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { normalizeCatalog } from '../settings/catalog-limits';
import { SettingsService } from '../settings/settings.service';
import { CatalogUploadInterceptor } from './catalog-upload.interceptor';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

const MB = 1024 * 1024;

describe('catalog size setting: normalize', () => {
  it('uses 10 MB when nothing valid is saved', () => {
    for (const raw of [undefined, null, {}, { maxFileSizeMb: 'abc' }, { maxFileSizeMb: 0 }, { maxFileSizeMb: 51 }, { maxFileSizeMb: 2.5 }, { maxFileSizeMb: -3 }]) {
      expect(normalizeCatalog(raw)).toEqual({ maxFileSizeMb: 10, maxFileSizeBytes: 10 * MB });
    }
  });

  it('accepts whole megabytes from 1 to 50 and gives the same size in bytes', () => {
    expect(normalizeCatalog({ maxFileSizeMb: 1 })).toEqual({ maxFileSizeMb: 1, maxFileSizeBytes: MB });
    expect(normalizeCatalog({ maxFileSizeMb: 25 })).toEqual({ maxFileSizeMb: 25, maxFileSizeBytes: 25 * MB });
    expect(normalizeCatalog({ maxFileSizeMb: 50 }).maxFileSizeMb).toBe(50);
    expect(normalizeCatalog({ maxFileSizeMb: '7' }).maxFileSizeMb).toBe(7);
  });
});

/** Real multer, real interceptor and service, fake repository / settings: files really land in <uploads>/materials. */
describe('materials: catalog upload follows the size set in Settings > Files', () => {
  let app: INestApplication;
  let base: string;
  let dir: string;
  const prevDir = process.env.UPLOADS_DIR;
  const oldFile = { id: 'a'.repeat(32), name: 'big-old.pdf', path: `materials/catalog-${'a'.repeat(32)}.pdf`, mimeType: 'application/pdf' };
  let row: Record<string, unknown>;
  let limitMb = 10;
  const repo = { findOneBy: jest.fn(async () => row), save: jest.fn(async (m: unknown) => m) };
  const settings = { getCatalog: jest.fn(async () => normalizeCatalog({ maxFileSizeMb: limitMb })) };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qms-catalog-'));
    process.env.UPLOADS_DIR = dir;
    const mod = await Test.createTestingModule({
      controllers: [MaterialsController],
      providers: [MaterialsService, CatalogUploadInterceptor, { provide: SettingsService, useValue: settings }, { provide: 'MaterialRepository', useValue: repo }],
    })
      .useMocker((token) => (String(token).includes('Repository') ? repo : undefined))
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AllExceptionsFilter());
    app.use((req: any, _res: unknown, next: () => void) => { req.user = { id: 7 }; next(); });
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', 'localhost');
  });
  afterAll(async () => {
    await app.close();
    if (prevDir === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = prevDir;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  beforeEach(() => {
    repo.save.mockClear();
    row = { id: 3, catalog: [{ ...oldFile }], updatedById: null };
    limitMb = 10;
    fs.rmSync(path.join(dir, 'materials'), { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'materials'), { recursive: true });
    fs.writeFileSync(path.join(dir, oldFile.path), Buffer.alloc(8 * MB)); // an old file bigger than any limit used below
  });

  const send = (bytes: Buffer, name = 'sheet.pdf', type = 'application/pdf') => {
    const fd = new FormData();
    fd.append('files', new Blob([bytes], { type }), name);
    return fetch(`${base}/api/materials/3/catalog`, { method: 'POST', body: fd });
  };
  const stored = () => fs.readdirSync(path.join(dir, 'materials')).filter((f) => f !== path.basename(oldFile.path));

  it('keeps a file that fits the limit', async () => {
    const res = await send(Buffer.alloc(2 * MB));
    expect(res.status).toBe(201);
    expect(stored()).toHaveLength(1);
  });

  it('refuses a file over the saved limit with a clear code and the limit, and leaves nothing on disk', async () => {
    limitMb = 1;
    const res = await send(Buffer.alloc(1 * MB + 1024));
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ code: 'CATALOG_FILE_TOO_LARGE', maxFileSizeMb: 1 });
    expect(stored()).toHaveLength(0);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('a new size applies to the very next upload (no restart): the same file is refused, then accepted', async () => {
    const file = Buffer.alloc(3 * MB);
    limitMb = 2;
    expect((await send(file)).status).toBe(413);
    limitMb = 5;
    expect((await send(file)).status).toBe(201);
  });

  it('lowering the limit never touches files that are already in the catalog', async () => {
    limitMb = 1; // the old file is 8 MB
    const res = await send(Buffer.alloc(100 * 1024), 'small.pdf');
    expect(res.status).toBe(201);
    const saved = (await res.json()) as { catalog: { id: string; name: string }[] };
    expect(saved.catalog.map((f) => f.name)).toEqual(['big-old.pdf', 'small.pdf']); // the old entry is still there, in front of the new one
    expect(fs.statSync(path.join(dir, oldFile.path)).size).toBe(8 * MB); // and its file is exactly as it was
  });

  it('still refuses other file types', async () => {
    const res = await send(Buffer.from('<svg/>'), 'x.svg', 'image/svg+xml');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('INVALID_FILE_TYPE');
  });
});
