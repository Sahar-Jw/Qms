import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import Decimal from 'decimal.js';
import { Repository } from 'typeorm';
import { StatusSearchPaginationDto, paginated } from '../common/dto/pagination.dto';
import { uploadsRoot } from '../config/uploads';
import { Company } from './company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(@InjectRepository(Company) private readonly repo: Repository<Company>) {}

  async list(q: StatusSearchPaginationDto) {
    const qb = this.repo.createQueryBuilder('c');
    if (q.q) qb.andWhere('(c.name LIKE :s OR c.address LIKE :s)', { s: `%${q.q}%` });
    const status = q.status ?? 'active';
    if (status !== 'all') qb.andWhere('c.isActive = :a', { a: status === 'active' });
    const [rows, total] = await qb.orderBy('c.name', 'ASC').skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return paginated(rows, total, q.page, q.limit);
  }

  async get(id: number) {
    const c = await this.repo.findOneBy({ id });
    if (!c) throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'Company not found' });
    return c;
  }

  create(dto: CreateCompanyDto, userId: number) {
    this.assertTax(dto.taxEnabled ?? false, dto.taxPercentage);
    return this.repo.save(this.repo.create({
      ...dto,
      taxEnabled: dto.taxEnabled ?? false,
      taxPercentage: dto.taxPercentage ?? null,
      createdById: userId,
      updatedById: userId,
    }));
  }

  async update(id: number, dto: UpdateCompanyDto, userId: number) {
    const c = await this.get(id);
    const taxEnabled = dto.taxEnabled ?? c.taxEnabled;
    const taxPercentage = dto.taxPercentage ?? c.taxPercentage;
    this.assertTax(taxEnabled, taxPercentage);
    Object.assign(c, dto, { updatedById: userId });
    c.taxEnabled = taxEnabled;
    c.taxPercentage = taxPercentage;
    return this.repo.save(c);
  }

  private assertTax(enabled: boolean, percentage: string | null | undefined) {
    if (!enabled) return;
    if (percentage == null) {
      throw new BadRequestException({ code: 'INVALID_PERCENTAGE', message: 'Tax percentage must be between 0 and 100 when tax is enabled' });
    }
    const tax = new Decimal(percentage);
    if (!tax.isFinite() || tax.lt(0) || tax.gt(100)) {
      throw new BadRequestException({ code: 'INVALID_PERCENTAGE', message: 'Tax percentage must be between 0 and 100 when tax is enabled' });
    }
  }

  async setActive(id: number, isActive: boolean, userId: number) {
    const c = await this.get(id);
    c.isActive = isActive;
    c.updatedById = userId;
    return this.repo.save(c);
  }

  /** Header / footer image of the printed quotation: the new file replaces (and deletes) the old one. */
  async setLetterheadImage(id: number, kind: 'header' | 'footer', file: Express.Multer.File | undefined, userId: number) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Image file is required (field name: file)' });
    const c = await this.get(id);
    const field = kind === 'header' ? 'headerImage' : 'footerImage';
    const old = c[field];
    c[field] = `letterheads/${file.filename}`;
    c.updatedById = userId;
    await this.repo.save(c);
    if (old) fs.promises.unlink(path.join(uploadsRoot(), old)).catch(() => undefined);
    return c;
  }

  async removeLetterheadImage(id: number, kind: 'header' | 'footer', userId: number) {
    const c = await this.get(id);
    const field = kind === 'header' ? 'headerImage' : 'footerImage';
    const old = c[field];
    c[field] = null;
    c.updatedById = userId;
    await this.repo.save(c);
    if (old) fs.promises.unlink(path.join(uploadsRoot(), old)).catch(() => undefined);
    return c;
  }

  async setLogo(id: number, file: Express.Multer.File | undefined, userId: number) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Logo file is required (field name: file)' });
    const c = await this.get(id);
    const old = c.logo;
    c.logo = `logos/${file.filename}`;
    c.updatedById = userId;
    await this.repo.save(c);
    if (old) fs.promises.unlink(path.join(uploadsRoot(), old)).catch(() => undefined);
    return c;
  }
}
