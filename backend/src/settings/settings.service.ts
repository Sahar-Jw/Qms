import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { uploadsRoot } from '../config/uploads';
import { AppSetting } from './app-setting.entity';
import { BRAND_SETTING_KEY, BrandSettings, DEFAULT_THEME, normalizeBrand, normalizeTheme, THEME_SETTING_KEY, ThemeColors } from './theme';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(AppSetting) private readonly appSettings: Repository<AppSetting>,
  ) {}

  /** The site-wide colour theme (every user sees the same one). */
  async getTheme(): Promise<{ colors: ThemeColors }> {
    const row = await this.appSettings.findOneBy({ key: THEME_SETTING_KEY });
    return { colors: normalizeTheme(row?.value) };
  }

  async setTheme(colors: ThemeColors, userId: number) {
    const value = normalizeTheme(colors);
    await this.appSettings.save({ key: THEME_SETTING_KEY, value, updatedById: userId });
    return { colors: value };
  }

  async getBrand(): Promise<BrandSettings> {
    const row = await this.appSettings.findOneBy({ key: BRAND_SETTING_KEY });
    return normalizeBrand(row?.value);
  }

  async setBrand(dto: Partial<BrandSettings>, userId: number): Promise<BrandSettings> {
    const current = await this.getBrand();
    const next = normalizeBrand({ ...current, ...dto });
    await this.appSettings.save({ key: BRAND_SETTING_KEY, value: next, updatedById: userId });
    return next;
  }

  async setBrandAsset(kind: 'logo' | 'icon', file: Express.Multer.File | undefined, userId: number): Promise<BrandSettings> {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Image file is required (field name: file)' });
    const current = await this.getBrand();
    const old = kind === 'logo' ? current.logo : current.icon;
    const stored = `branding/${file.filename}`;
    const next = { ...current, [kind]: stored } as BrandSettings;
    await this.appSettings.save({ key: BRAND_SETTING_KEY, value: next, updatedById: userId });
    if (old) fs.promises.unlink(path.join(uploadsRoot(), old)).catch(() => undefined);
    return next;
  }

  async removeBrandAsset(kind: 'logo' | 'icon', userId: number): Promise<BrandSettings> {
    const current = await this.getBrand();
    const old = kind === 'logo' ? current.logo : current.icon;
    const next = { ...current, [kind]: null } as BrandSettings;
    await this.appSettings.save({ key: BRAND_SETTING_KEY, value: next, updatedById: userId });
    if (old) fs.promises.unlink(path.join(uploadsRoot(), old)).catch(() => undefined);
    return next;
  }

  /** Back to the built-in colours. */
  async resetTheme() {
    await this.appSettings.delete({ key: THEME_SETTING_KEY });
    return { colors: { ...DEFAULT_THEME } };
  }

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
