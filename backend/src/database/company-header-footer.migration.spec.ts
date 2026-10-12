import { CompanyHeaderFooter1791900000000 } from './migrations/1791900000000-CompanyHeaderFooter';

/** A tiny fake MySQL: remembers which companies columns exist and what ALTERs ran. */
const fakeRunner = (existing: string[]) => {
  const cols = new Set(existing);
  const run: string[] = [];
  return {
    cols, run,
    query: jest.fn(async (sql: string, params?: string[]) => {
      if (sql.startsWith('SELECT')) return cols.has(params![1]) ? [{ 1: 1 }] : [];
      run.push(sql);
      const add = sql.match(/ADD `(\w+)`/); if (add) cols.add(add[1]);
      const drop = sql.match(/DROP COLUMN `(\w+)`/); if (drop) cols.delete(drop[1]);
      return [];
    }),
  };
};

describe('migration: company header / footer images', () => {
  const m = new CompanyHeaderFooter1791900000000();

  it('adds the two image columns to a database that has neither', async () => {
    const r = fakeRunner(['name']);
    await m.up(r as any);
    expect([...r.cols].sort()).toEqual(['footer_image', 'header_image', 'name']);
    expect(r.run.every((s) => s.includes('varchar(255) NULL'))).toBe(true);
  });

  it('is safe to run twice, and after the SQL script was run by hand', async () => {
    const r = fakeRunner(['name', 'header_image', 'footer_image']);
    await m.up(r as any);
    expect(r.run).toEqual([]);
  });

  it('removes the old text columns of the earlier version and adds the image ones', async () => {
    const r = fakeRunner(['name', 'header', 'footer']);
    await m.up(r as any);
    expect([...r.cols].sort()).toEqual(['footer_image', 'header_image', 'name']);
  });

  it('down removes only the image columns', async () => {
    const r = fakeRunner(['name', 'header_image', 'footer_image']);
    await m.down(r as any);
    expect([...r.cols]).toEqual(['name']);
  });
});
