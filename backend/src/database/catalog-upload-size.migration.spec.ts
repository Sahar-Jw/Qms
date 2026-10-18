import { CatalogUploadSizeSetting1792400000000 } from './migrations/1792400000000-CatalogUploadSizeSetting';

describe('migration: catalog upload size setting', () => {
  it('writes the 10 MB starting value without ever overwriting a saved one', async () => {
    const query = jest.fn(async () => []);
    await new CatalogUploadSizeSetting1792400000000().up({ query } as any);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql] = query.mock.calls[0] as unknown as [string];
    expect(sql).toContain("INSERT INTO `app_settings`");
    expect(sql).toContain('{"maxFileSizeMb":10}');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE `key` = `key`'); // an existing row is left exactly as it is
    expect(sql).not.toMatch(/ALTER|DROP|UPDATE `app_settings`/);
  });

  it('can be undone', async () => {
    const query = jest.fn(async () => []);
    await new CatalogUploadSizeSetting1792400000000().down({ query } as any);
    expect((query.mock.calls[0] as unknown as [string])[0]).toContain("DELETE FROM `app_settings` WHERE `key` = 'catalog'");
  });
});
