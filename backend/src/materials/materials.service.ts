import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { StatusSearchPaginationDto, paginated } from '../common/dto/pagination.dto';
import { uploadsRoot } from '../config/uploads';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { Material, MaterialCatalogFile } from './material.entity';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(@InjectRepository(Material) private readonly repo: Repository<Material>) {}

  async list(q: StatusSearchPaginationDto) {
    const qb = this.repo.createQueryBuilder('m');
    if (q.q) {
      qb.andWhere(
        '(m.materialCode LIKE :s OR m.name LIKE :s OR m.source LIKE :s OR m.modelNumber LIKE :s OR m.catalogueNumber LIKE :s OR m.countryOfOrigin LIKE :s OR m.unit LIKE :s)',
        { s: `%${q.q}%` },
      );
    }
    const status = q.status ?? 'active';
    if (status !== 'all') qb.andWhere('m.isActive = :a', { a: status === 'active' });
    const [rows, total] = await qb.orderBy('m.materialCode', 'ASC').skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return paginated(rows, total, q.page, q.limit);
  }

  async get(id: number) {
    const m = await this.repo.findOneBy({ id });
    if (!m) throw new NotFoundException({ code: 'MATERIAL_NOT_FOUND', message: 'Material not found' });
    return m;
  }

  create(dto: CreateMaterialDto, userId: number) {
    return this.repo.save(this.repo.create({ ...dto, createdById: userId, updatedById: userId })); // duplicate code -> 409 via exception filter
  }

  async update(id: number, dto: UpdateMaterialDto, userId: number) {
    const m = await this.get(id);
    Object.assign(m, dto, { updatedById: userId });
    return this.repo.save(m);
  }

  async setImage(id: number, file: Express.Multer.File | undefined, userId: number) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Image file is required (field name: file)' });
    const m = await this.get(id);
    const old = m.img;
    m.img = `materials/${file.filename}`;
    m.updatedById = userId;
    const saved = await this.repo.save(m);
    if (old && /^materials\/[\w.-]+$/.test(old)) await this.removeStoredFile(old);
    return saved;
  }

  async removeImage(id: number, userId: number) {
    const m = await this.get(id);
    const old = m.img;
    m.img = null;
    m.updatedById = userId;
    const saved = await this.repo.save(m);
    if (old && /^materials\/[\w.-]+$/.test(old)) await this.removeStoredFile(old);
    return saved;
  }

  async addCatalogFiles(id: number, files: Express.Multer.File[] | undefined, userId: number) {
    if (!files?.length) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'At least one catalog file is required (field name: files)' });
    const m = await this.get(id);
    const current = m.catalog ?? [];
    if (current.length + files.length > 10) {
      await Promise.all(files.map((file) => this.removeStoredFile(`materials/${file.filename}`)));
      throw new BadRequestException({ code: 'CATALOG_LIMIT_EXCEEDED', message: 'A material can have at most 10 catalog files' });
    }

    const additions: MaterialCatalogFile[] = files.map((file) => ({
      id: path.parse(file.filename).name.replace(/^catalog-/, ''),
      name: path.basename(file.originalname).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255),
      path: `materials/${file.filename}`,
      mimeType: file.mimetype,
    }));
    m.catalog = [...current, ...additions];
    m.updatedById = userId;
    try {
      return await this.repo.save(m);
    } catch (error) {
      await Promise.all(additions.map((file) => this.removeStoredFile(file.path)));
      throw error;
    }
  }

  async removeCatalogFile(id: number, fileId: string, userId: number) {
    if (!/^[a-f0-9]{32}$/.test(fileId)) throw new BadRequestException({ code: 'INVALID_CATALOG_FILE', message: 'Invalid catalog file id' });
    const m = await this.get(id);
    const removed = (m.catalog ?? []).find((file) => file.id === fileId);
    if (!removed) throw new NotFoundException({ code: 'CATALOG_FILE_NOT_FOUND', message: 'Catalog file not found' });
    m.catalog = (m.catalog ?? []).filter((file) => file.id !== fileId);
    m.updatedById = userId;
    const saved = await this.repo.save(m);
    if (/^materials\/catalog-[a-f0-9]{32}\.(png|jpg|webp|pdf|docx)$/.test(removed.path)) await this.removeStoredFile(removed.path);
    return saved;
  }

  private async removeStoredFile(relativePath: string) {
    try {
      await fs.promises.unlink(path.join(uploadsRoot(), relativePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Could not remove uploaded material file ${relativePath}: ${(error as Error).message}`);
      }
    }
  }

  async setActive(id: number, isActive: boolean, userId: number) {
    const m = await this.get(id);
    m.isActive = isActive;
    m.updatedById = userId;
    return this.repo.save(m);
  }
}
