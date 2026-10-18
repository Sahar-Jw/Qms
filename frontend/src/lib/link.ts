/**
 * A link typed by a user: "drive.google.com/file/d/x/view" gets "https://" in front.
 * Links that already have a scheme are left alone (so validation can reject javascript:, data:, ftp: ...).
 */
export function normalizeLink(input: string): string {
  const v = input.trim();
  if (v === '') return v;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) || /^(javascript|data|vbscript|file|about|blob|mailto|tel|sms):/i.test(v)) return v;
  return `https://${v.replace(/^\/+/, '')}`;
}
