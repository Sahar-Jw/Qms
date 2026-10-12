import { MaterialCatalogAndCompanyTax1792000000000 } from './migrations/1792000000000-MaterialCatalogAndCompanyTax';

const fakeRunner = (existing: string[]) => {
  const columns = new Set(existing);
  const statements: string[] = [];
  return {
    columns,
    statements,
    query: jest.fn(async (sql: string, params?: string[]) => {
      if (sql.startsWith('SELECT')) return columns.has(`${params![0]}.${params![1]}`) ? [{ 1: 1 }] : [];
      statements.push(sql);
      const table = sql.includes('TABLE `materials`') ? 'materials' : 'companies';
      const change = sql.match(/CHANGE `(\w+)` `(\w+)`/);
      if (change) {
        columns.delete(`${table}.${change[1]}`);
        columns.add(`${table}.${change[2]}`);
      }
      const add = sql.match(/ADD `(\w+)`/);
      if (add) columns.add(`${table}.${add[1]}`);
      return [];
    }),
  };
};

describe('migration: material catalog and company tax settings', () => {
  it('renames the existing material picture column and adds catalog and tax settings', async () => {
    const runner = fakeRunner(['materials.catalogue']);
    await new MaterialCatalogAndCompanyTax1792000000000().up(runner as any);

    expect(runner.columns).toEqual(new Set([
      'materials.img',
      'materials.catalog',
      'companies.tax_enabled',
      'companies.tax_percentage',
    ]));
    expect(runner.statements[0]).toContain('CHANGE `catalogue` `img`');
  });

  it('does not repeat the changes after the migration has already run manually', async () => {
    const runner = fakeRunner(['materials.img', 'materials.catalog', 'companies.tax_enabled', 'companies.tax_percentage']);
    await new MaterialCatalogAndCompanyTax1792000000000().up(runner as any);
    expect(runner.statements).toEqual([]);
  });
});
