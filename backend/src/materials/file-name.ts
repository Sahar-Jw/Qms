/**
 * Browsers send a file's name as UTF-8, but multer / busboy read it as latin1, so an Arabic name such as "كتالوج.pdf" arrives as
 * mojibake ("ÙƒØªØ§Ù„ÙˆØ¬.pdf") and was stored (and printed) like that. This turns such a name back into the real text.
 * Names that are already correct (plain ASCII, or real Arabic) are returned untouched, so it is safe to call on every name,
 * including the ones saved earlier.
 */
export function repairUploadedName(name: string): string {
  if (!name) return name;
  // Real latin1-misread UTF-8 only uses characters up to U+00FF; anything above means the name is already proper text.
  if (/[^\u0000-\u00ff]/.test(name) || !/[\u0080-\u00ff]/.test(name)) return name;
  const fixed = Buffer.from(name, 'latin1').toString('utf8');
  return fixed.includes('\ufffd') ? name : fixed;
}
