import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusSearchPaginationDto, paginated } from '../common/dto/pagination.dto';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { Material } from './material.entity';

@Injectable()
export class MaterialsService {
  constructor(@InjectRepository(Material) private readonly repo: Repository<Material>) {}

  async list(q: StatusSearchPaginationDto) {
    const qb = this.repo.createQueryBuilder('m');
    if (q.q) {
      qb.andWhere(
        '(m.materialCode LIKE :s OR m.nameAr LIKE :s OR m.nameEn LIKE :s OR m.source LIKE :s OR m.catalogue LIKE :s OR m.modelNumber LIKE :s OR m.catalogueNumber LIKE :s OR m.countryOfOrigin LIKE :s OR m.unit LIKE :s)',
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

  private assertHasName(m: { nameAr?: string | null; nameEn?: string | null }) {
    if (!m.nameAr && !m.nameEn) {
      throw new BadRequestException({ code: 'MATERIAL_NAME_REQUIRED', message: 'Provide the material name in Arabic or in the foreign language' });
    }
  }

  create(dto: CreateMaterialDto, userId: number) {
    this.assertHasName(dto);
    return this.repo.save(this.repo.create({ ...dto, createdById: userId, updatedById: userId })); // duplicate code -> 409 via exception filter
  }

  async update(id: number, dto: UpdateMaterialDto, userId: number) {
    const m = await this.get(id);
    Object.assign(m, dto, { updatedById: userId });
    this.assertHasName(m);
    return this.repo.save(m);
  }

  async setActive(id: number, isActive: boolean, userId: number) {
    const m = await this.get(id);
    m.isActive = isActive;
    m.updatedById = userId;
    return this.repo.save(m);
  }
}
