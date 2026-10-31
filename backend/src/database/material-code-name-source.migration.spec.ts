import { MaterialCodeNameSourceUnique1793000000000 } from './migrations/1793000000000-MaterialCodeNameSourceUnique';

describe('migration: material code + name + source uniqueness', () => {
  it('replaces the code+name index with the code+name+source index', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await new MaterialCodeNameSourceUnique1793000000000().up({ query } as any);

    expect(query.mock.calls[0][1]).toEqual(['materials', 'UQ_materials_material_code_name']);
    expect(query.mock.calls[1][0]).toContain('DROP INDEX `UQ_materials_material_code_name`');
    expect(query.mock.calls[2][1]).toEqual(['materials', 'UQ_materials_material_code_name_source']);
    expect(query.mock.calls[3][0]).toContain('CREATE UNIQUE INDEX `UQ_materials_material_code_name_source`');
    expect(query.mock.calls[3][0]).toContain('(`material_code`, `name`, `source`)');
  });

  it('can be reverted', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await new MaterialCodeNameSourceUnique1793000000000().down({ query } as any);

    expect(query.mock.calls[1][0]).toContain('DROP INDEX `UQ_materials_material_code_name_source`');
    expect(query.mock.calls[2][1]).toEqual(['materials', 'UQ_materials_material_code_name']);
  });
});
