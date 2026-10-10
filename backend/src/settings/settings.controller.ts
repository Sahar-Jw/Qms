import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsObject, IsOptional, Matches, MaxLength, ValidateNested } from 'class-validator';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RoleCode } from '../common/enums';
import { uploadsRoot } from '../config/uploads';
import { SettingsService } from './settings.service';
import { HEX_COLOR } from './theme';

class UpdateSettingsDto {
  @IsInt()
  issuingCompanyId: number;
}

const HEX_MESSAGE = 'must be a colour like #A1B2C3';

class ThemeColorsDto {
  @Matches(HEX_COLOR, { message: `ink ${HEX_MESSAGE}` }) ink: string;
  @Matches(HEX_COLOR, { message: `cocoa ${HEX_MESSAGE}` }) cocoa: string;
  @Matches(HEX_COLOR, { message: `clay ${HEX_MESSAGE}` }) clay: string;
  @Matches(HEX_COLOR, { message: `stone ${HEX_MESSAGE}` }) stone: string;
  @Matches(HEX_COLOR, { message: `sand ${HEX_MESSAGE}` }) sand: string;
}

class UpdateThemeDto {
  @IsDefined() @IsObject() @ValidateNested() @Type(() => ThemeColorsDto)
  colors: ThemeColorsDto;
}

class UpdateBrandDto {
  @IsOptional() @MaxLength(120)
  websiteName?: string;

  /** Browser tab title. Empty string = fall back to the website name. */
  @IsOptional() @MaxLength(120)
  tabTitle?: string;

  @IsOptional() @MaxLength(200)
  tagline?: string;

  @IsOptional()
  logo?: string | null;

  @IsOptional()
  icon?: string | null;
}

const BRAND_MIME_TYPES: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const brandAssetUpload = (fieldName: 'logo' | 'icon') => FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(uploadsRoot(), 'branding');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, `${fieldName}-${randomBytes(12).toString('hex')}${BRAND_MIME_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    BRAND_MIME_TYPES[file.mimetype] ? cb(null, true) : cb(new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Only PNG, JPEG or WEBP images are allowed' }), false),
});

/** Per-user settings (the issuing company) and the site-wide colour theme. */
@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Any user: the companies available in the settings picker. */
  @Get('companies')
  companies() {
    return this.settings.pickList();
  }

  @Get()
  get(@CurrentUser() me: AuthUser) {
    return this.settings.get(me.id);
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() me: AuthUser) {
    return this.settings.setIssuingCompany(me.id, dto.issuingCompanyId);
  }

  /** Public: the landing and login pages show the site name and logo before anyone signs in. */
  @Public()
  @Get('brand')
  getBrand() {
    return this.settings.getBrand();
  }

  @Patch('brand')
  @MinRole(RoleCode.MANAGER)
  updateBrand(@Body() dto: UpdateBrandDto, @CurrentUser() me: AuthUser) {
    return this.settings.setBrand(dto, me.id);
  }

  @Post('brand/logo')
  @MinRole(RoleCode.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(brandAssetUpload('logo'))
  uploadBrandLogo(@UploadedFile() file: Express.Multer.File, @CurrentUser() me: AuthUser) {
    return this.settings.setBrandAsset('logo', file, me.id);
  }

  @Delete('brand/logo')
  @MinRole(RoleCode.MANAGER)
  removeBrandLogo(@CurrentUser() me: AuthUser) {
    return this.settings.removeBrandAsset('logo', me.id);
  }

  @Post('brand/icon')
  @MinRole(RoleCode.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(brandAssetUpload('icon'))
  uploadBrandIcon(@UploadedFile() file: Express.Multer.File, @CurrentUser() me: AuthUser) {
    return this.settings.setBrandAsset('icon', file, me.id);
  }

  @Delete('brand/icon')
  @MinRole(RoleCode.MANAGER)
  removeBrandIcon(@CurrentUser() me: AuthUser) {
    return this.settings.removeBrandAsset('icon', me.id);
  }

  /** Public: visitors (landing / login) see the site in the saved colours too, not only signed-in users. */
  @Public()
  @Get('theme')
  theme() {
    return this.settings.getTheme();
  }

  /** Manager and above. */
  @Patch('theme')
  @MinRole(RoleCode.MANAGER)
  updateTheme(@Body() dto: UpdateThemeDto, @CurrentUser() me: AuthUser) {
    return this.settings.setTheme(dto.colors, me.id);
  }

  /** Manager and above: back to the default colours. */
  @Delete('theme')
  @MinRole(RoleCode.MANAGER)
  resetTheme() {
    return this.settings.resetTheme();
  }
}
