import { BadRequestException, CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor, PayloadTooLargeException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import multer, { diskStorage, MulterError } from 'multer';
import * as path from 'path';
import { Observable } from 'rxjs';
import { uploadsRoot } from '../config/uploads';
import { CATALOG_FILES_MAX } from '../settings/catalog-limits';
import { SettingsService } from '../settings/settings.service';

export const CATALOG_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

/**
 * Receives the catalog files of a material (field `files`).
 *
 * Nest's FilesInterceptor fixes its size limit when the app starts. The limit here is a setting managers change at any time
 * (Settings > Files), so it is read from the database on every upload and the change applies at once, without a restart.
 * It only decides about the files being uploaded now - files already in a catalog are never looked at again.
 */
@Injectable()
export class CatalogUploadInterceptor implements NestInterceptor {
  constructor(private readonly settings: SettingsService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const { maxFileSizeMb, maxFileSizeBytes } = await this.settings.getCatalog();
    const upload = multer({
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(uploadsRoot(), 'materials');
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => cb(null, `catalog-${randomBytes(16).toString('hex')}${CATALOG_TYPES[file.mimetype]}`),
      }),
      limits: { fileSize: maxFileSizeBytes, files: CATALOG_FILES_MAX },
      fileFilter: (_req, file, cb) => {
        const extension = CATALOG_TYPES[file.mimetype];
        const suppliedExtension = path.extname(file.originalname).toLowerCase();
        const validExtension = extension === '.jpg' ? ['.jpg', '.jpeg'].includes(suppliedExtension) : suppliedExtension === extension;
        return extension && validExtension
          ? cb(null, true)
          : cb(new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Catalog files must be PNG, JPEG, WEBP, PDF or DOCX' }));
      },
    }).array('files', CATALOG_FILES_MAX);

    const http = context.switchToHttp();
    await new Promise<void>((resolve, reject) => {
      upload(http.getRequest(), http.getResponse(), (error: unknown) => (error ? reject(this.translate(error, maxFileSizeMb)) : resolve()));
    });
    return next.handle();
  }

  private translate(error: unknown, maxFileSizeMb: number): Error {
    if (error instanceof HttpException) return error;
    if (error instanceof MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return new PayloadTooLargeException({
          code: 'CATALOG_FILE_TOO_LARGE',
          message: `A catalog file can be at most ${maxFileSizeMb} MB`,
          maxFileSizeMb,
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
        return new BadRequestException({ code: 'CATALOG_LIMIT_EXCEEDED', message: `A material can have at most ${CATALOG_FILES_MAX} catalog files` });
      }
      return new BadRequestException(error.message);
    }
    return error instanceof Error ? error : new BadRequestException('Upload failed');
  }
}
