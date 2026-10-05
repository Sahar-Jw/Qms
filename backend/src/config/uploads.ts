import * as path from 'path';

/** Absolute uploads directory (logos are stored under <root>/logos). */
export function uploadsRoot(): string {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
}
