import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CompaniesService } from './companies.service';

describe('companies: header / footer images', () => {
  let dir: string;
  const prevDir = process.env.UPLOADS_DIR;
  const wait = () => new Promise((r) => setTimeout(r, 30));

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qms-uploads-'));
    fs.mkdirSync(path.join(dir, 'letterheads'));
    process.env.UPLOADS_DIR = dir;
  });
  afterEach(() => {
    if (prevDir === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = prevDir;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const make = (company: Record<string, unknown>) => {
    const repo = { findOneBy: jest.fn().mockResolvedValue(company), save: jest.fn(async (c) => c) };
    return { svc: new CompaniesService(repo as any), repo };
  };
  const file = (name: string) => ({ filename: name }) as Express.Multer.File;

  it('stores the new header image and deletes the old file', async () => {
    fs.writeFileSync(path.join(dir, 'letterheads', 'old.png'), 'x');
    const { svc } = make({ id: 1, headerImage: 'letterheads/old.png', footerImage: 'letterheads/keep.png' });
    const c = await svc.setLetterheadImage(1, 'header', file('new.png'), 9);
    await wait();
    expect(c).toMatchObject({ headerImage: 'letterheads/new.png', footerImage: 'letterheads/keep.png', updatedById: 9 });
    expect(fs.existsSync(path.join(dir, 'letterheads', 'old.png'))).toBe(false);
  });

  it('footer upload touches only the footer', async () => {
    const { svc } = make({ id: 1, headerImage: 'letterheads/h.png', footerImage: null });
    const c = await svc.setLetterheadImage(1, 'footer', file('f.png'), 9);
    expect(c).toMatchObject({ headerImage: 'letterheads/h.png', footerImage: 'letterheads/f.png' });
  });

  it('removing clears the column and deletes the file', async () => {
    fs.writeFileSync(path.join(dir, 'letterheads', 'f.png'), 'x');
    const { svc } = make({ id: 1, headerImage: null, footerImage: 'letterheads/f.png' });
    const c = await svc.removeLetterheadImage(1, 'footer', 9);
    await wait();
    expect(c.footerImage).toBeNull();
    expect(fs.existsSync(path.join(dir, 'letterheads', 'f.png'))).toBe(false);
  });

  it('asks for a file when none was sent', async () => {
    const { svc, repo } = make({ id: 1 });
    await expect(svc.setLetterheadImage(1, 'header', undefined, 9)).rejects.toMatchObject({ response: { code: 'FILE_REQUIRED' } });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('requires a valid configured percentage when tax is enabled', async () => {
    const { svc, repo } = make({});
    expect(() => svc.create({
      name: 'Acme', address: 'Damascus', phone: '1', email: 'a@example.test',
      taxEnabled: true, taxPercentage: '101',
    }, 9)).toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('stores company tax settings and clears the percentage when tax is disabled', async () => {
    const { svc } = make({ id: 1, taxEnabled: true, taxPercentage: '5.0000' });
    const enabled = await svc.update(1, { taxEnabled: true, taxPercentage: '8.5' }, 9);
    expect(enabled).toMatchObject({ taxEnabled: true, taxPercentage: '8.5' });
    const disabled = await svc.update(1, { taxEnabled: false }, 9);
    expect(disabled).toMatchObject({ taxEnabled: false, taxPercentage: '8.5' });
  });
});
