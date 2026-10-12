import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MaterialsService } from './materials.service';

describe('materials: product picture and catalog files', () => {
  let dir: string;
  const previousUploadsDir = process.env.UPLOADS_DIR;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qms-materials-'));
    fs.mkdirSync(path.join(dir, 'materials'));
    process.env.UPLOADS_DIR = dir;
  });

  afterEach(() => {
    if (previousUploadsDir === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = previousUploadsDir;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const setup = (material: Record<string, unknown>) => {
    const repo = {
      findOneBy: jest.fn().mockResolvedValue(material),
      save: jest.fn(async (value) => value),
      create: jest.fn(),
    };
    return { service: new MaterialsService(repo as any), repo };
  };

  const uploaded = (filename: string, originalname: string, mimetype: string) =>
    ({ filename, originalname, mimetype }) as Express.Multer.File;

  it('adds catalog metadata and stores more than one upload in the JSON catalog column', async () => {
    const material = { id: 2, catalog: null, updatedById: null };
    const { service, repo } = setup(material);
    const filename = `catalog-${'a'.repeat(32)}.pdf`;
    fs.writeFileSync(path.join(dir, 'materials', filename), 'pdf');

    const saved = await service.addCatalogFiles(2, [uploaded(filename, '../vendor-list.pdf', 'application/pdf')], 7);

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(saved.catalog).toEqual([{
      id: 'a'.repeat(32),
      name: 'vendor-list.pdf',
      path: `materials/${filename}`,
      mimeType: 'application/pdf',
    }]);
    expect(saved.updatedById).toBe(7);
  });

  it('enforces the ten-file cap and removes rejected temporary uploads', async () => {
    const material = { id: 2, catalog: Array.from({ length: 10 }, (_, index) => ({ id: String(index) })) };
    const { service, repo } = setup(material);
    const filename = `catalog-${'b'.repeat(32)}.docx`;
    fs.writeFileSync(path.join(dir, 'materials', filename), 'docx');

    await expect(service.addCatalogFiles(2, [uploaded(filename, 'manual.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')], 7))
      .rejects.toMatchObject({ response: { code: 'CATALOG_LIMIT_EXCEEDED' } });

    expect(fs.existsSync(path.join(dir, 'materials', filename))).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('removes a selected catalog file from storage and the material', async () => {
    const filename = `catalog-${'c'.repeat(32)}.jpg`;
    fs.writeFileSync(path.join(dir, 'materials', filename), 'image');
    const material = {
      id: 2,
      catalog: [{ id: 'c'.repeat(32), name: 'photo.jpg', path: `materials/${filename}`, mimeType: 'image/jpeg' }],
    };
    const { service } = setup(material);

    const saved = await service.removeCatalogFile(2, 'c'.repeat(32), 7);

    expect(saved.catalog).toEqual([]);
    expect(fs.existsSync(path.join(dir, 'materials', filename))).toBe(false);
  });
});
