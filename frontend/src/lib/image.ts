/**
 * Makes a picture lighter for upload WITHOUT changing its size (width x height never changes).
 *  - PNG: re-encoded losslessly.
 *  - JPEG: re-encoded at 95% quality (visually identical).
 *  - WEBP, small files, or anything that would not get at least ~15% smaller: sent exactly as chosen.
 */
export async function optimizeImage(file: File): Promise<File> {
  if (file.size < 300 * 1024 || file.type === 'image/webp') return file;
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bmp.close(); return file; }
    const png = file.type === 'image/png';
    if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } // JPEG has no transparency
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, png ? 'image/png' : 'image/jpeg', png ? undefined : 0.95));
    if (!blob || blob.size > file.size * 0.85) return file;
    return new File([blob], file.name.replace(/\.\w+$/, png ? '.png' : '.jpg'), { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export const fmtSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
