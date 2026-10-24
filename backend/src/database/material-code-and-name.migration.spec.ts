import { MaterialCodeAndNameUnique1792900000000 } from './migrations/1792900000000-MaterialCodeAndNameUnique';

describe('migration: material code and name uniqueness', () => {
  it('replaces code-only uniqueness with the composite unique index', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await new MaterialCodeAndNameUnique1792900000000().up({ query } as any);

    expect(query.mock.calls[0][1]).toEqual(['materials', 'IDX_180eec59d9027e95b2467ec66f']);
    expect(query.mock.calls[1][0]).toContain('DROP INDEX');
    expect(query.mock.calls[2][1]).toEqual(['materials', 'UQ_materials_material_code_name']);
    expect(query.mock.calls[3][0]).toContain('CREATE UNIQUE INDEX `UQ_materials_material_code_name`');
    expect(query.mock.calls[3][0]).toContain('(`material_code`, `name`)');
  });

  it('can be reverted', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await new MaterialCodeAndNameUnique1792900000000().down({ query } as any);

    expect(query.mock.calls[1][0]).toContain('DROP INDEX `UQ_materials_material_code_name`');
    expect(query.mock.calls[2][1]).toEqual(['materials', 'IDX_180eec59d9027e95b2467ec66f']);
    expect(query.mock.calls[3][0]).toContain('CREATE UNIQUE INDEX `IDX_180eec59d9027e95b2467ec66f`');
    expect(query.mock.calls[3][0]).toContain('(`material_code`)');
  });
});
