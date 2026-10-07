const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(date: string | null | undefined): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const expiry = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(expiry)) return null;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((expiry - today) / DAY_MS);
}
