import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { StatusSearchPaginationDto, paginated } from '../common/dto/pagination.dto';
import { uploadsRoot } from '../config/uploads';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { Material } from './material.entity';

@Injectable()
export class MaterialsService {
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
    const old = m.catalogue;
    m.catalogue = `materials/${file.filename}`;
    m.updatedById = userId;
    const saved = await this.repo.save(m);
    if (old && /^materials\//.test(old)) fs.promises.unlink(path.join(uploadsRoot(), old)).catch(() => undefined);
    return saved;
  }

  async removeImage(id: number, userId: number) {
    const m = await this.get(id);
    const old = m.catalogue;
    m.catalogue = null;
    m.updatedById = userId;
    const saved = await this.repo.save(m);
    if (old && /^materials\//.test(old)) fs.promises.unlink(path.join(uploadsRoot(), old)).catch(() => undefined);
    return saved;
  }

  async setActive(id: number, isActive: boolean, userId: number) {
    const m = await this.get(id);
    m.isActive = isActive;
    m.updatedById = userId;
    return this.repo.save(m);
  }
}
