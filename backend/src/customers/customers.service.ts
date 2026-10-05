import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusSearchPaginationDto, paginated } from '../common/dto/pagination.dto';
import { Customer } from './customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private readonly repo: Repository<Customer>) {}

  async list(q: StatusSearchPaginationDto) {
    const qb = this.repo.createQueryBuilder('c');
    if (q.q) {
      qb.andWhere(
        '(c.companyNameAr LIKE :s OR c.companyNameEn LIKE :s OR c.country LIKE :s OR c.phone LIKE :s OR c.email LIKE :s OR c.website LIKE :s OR c.managerName LIKE :s OR c.contactPersonName LIKE :s OR c.contactPersonPhone LIKE :s OR c.businessNature LIKE :s OR c.notes LIKE :s)',
        { s: `%${q.q}%` },
      );
    }
    const status = q.status ?? 'active';
    if (status !== 'all') qb.andWhere('c.isActive = :a', { a: status === 'active' });
    const [rows, total] = await qb.orderBy('c.companyNameAr', 'ASC').addOrderBy('c.companyNameEn', 'ASC').skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return paginated(rows, total, q.page, q.limit);
  }

  async get(id: number) {
    const c = await this.repo.findOneBy({ id });
    if (!c) throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    return c;
  }

  private assertHasName(c: { companyNameAr?: string | null; companyNameEn?: string | null }) {
    if (!c.companyNameAr && !c.companyNameEn) {
      throw new BadRequestException({ code: 'CUSTOMER_NAME_REQUIRED', message: 'Provide the customer name in Arabic or in the foreign language' });
    }
  }

  create(dto: CreateCustomerDto, userId: number) {
    this.assertHasName(dto);
    return this.repo.save(this.repo.create({ ...dto, createdById: userId, updatedById: userId }));
  }

  async update(id: number, dto: UpdateCustomerDto, userId: number) {
    const c = await this.get(id);
    Object.assign(c, dto, { updatedById: userId });
    this.assertHasName(c);
    return this.repo.save(c);
  }

  /** Customers referenced by quotations are never deleted - they are deactivated. */
  async setActive(id: number, isActive: boolean, userId: number) {
    const c = await this.get(id);
    c.isActive = isActive;
    c.updatedById = userId;
    return this.repo.save(c);
  }
}
