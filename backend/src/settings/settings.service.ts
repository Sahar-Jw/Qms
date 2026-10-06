import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
  ) {}

  /** Active companies a user can pick in the settings (name + logo only). */
  async pickList() {
    const rows = await this.companies.find({ where: { isActive: true }, order: { name: 'ASC' } });
    return rows.map((c) => ({ id: c.id, name: c.name, logo: c.logo }));
  }

  async get(userId: number) {
    const u = await this.users.findOne({ where: { id: userId }, relations: { issuingCompany: true } });
    let company = u?.issuingCompany ?? null;
    let auto = false;
    if (!company) {
      const active = await this.companies.find({ where: { isActive: true }, take: 2 });
      if (active.length === 1) {
        company = active[0];
        auto = true; // the only company is used automatically
      }
    }
    return {
      issuingCompany: company
        ? { id: company.id, name: company.name, logo: company.logo, isActive: company.isActive }
        : null,
      issuingCompanyIsAutomatic: auto,
    };
  }

  /** Every quotation this user creates from now on is issued from this company. */
  async setIssuingCompany(userId: number, companyId: number) {
    const c = await this.companies.findOneBy({ id: companyId });
    if (!c) throw new BadRequestException({ code: 'COMPANY_NOT_FOUND', message: 'Company not found' });
    if (!c.isActive) throw new BadRequestException({ code: 'COMPANY_INACTIVE', message: 'Company is inactive' });
    await this.users.update({ id: userId }, { issuingCompanyId: companyId });
    return this.get(userId);
  }
}
