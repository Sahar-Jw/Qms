import { AuditLogDetailsRequired1792600000000 } from './migrations/1792600000000-AuditLogDetailsRequired';

describe('migration: audit log details are required', () => {
  it('fills empty rows first and only then forbids NULL', async () => {
    const query = jest.fn(async () => []);
    await new AuditLogDetailsRequired1792600000000().up({ query } as any);

    const [fill, tighten] = query.mock.calls.map((c) => (c as unknown as [string])[0]);
    expect(fill).toContain('UPDATE `audit_logs`');
    expect(fill).toContain('`details` IS NULL'); // rows that already have details are never rewritten
    expect(tighten).toContain('MODIFY `details` json NOT NULL');
  });

  it('can be undone', async () => {
    const query = jest.fn(async () => []);
    await new AuditLogDetailsRequired1792600000000().down({ query } as any);
    expect((query.mock.calls[0] as unknown as [string])[0]).toContain('MODIFY `details` json NULL');
  });
});
