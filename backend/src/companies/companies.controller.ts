import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { SetActiveDto, StatusSearchPaginationDto } from '../common/dto/pagination.dto';
import { RoleCode } from '../common/enums';
import { uploadsRoot } from '../config/uploads';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

const ALLOWED: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const imageUpload = (folder: string, maxBytes: number) =>
  FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(uploadsRoot(), folder);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => cb(null, randomBytes(16).toString('hex') + ALLOWED[file.mimetype]),
    }),
    limits: { fileSize: maxBytes },
    // SVG is deliberately not allowed (script injection risk).
    fileFilter: (_req, file, cb) =>
      ALLOWED[file.mimetype] ? cb(null, true) : cb(new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Only PNG, JPEG or WEBP images are allowed' }), false),
  });

const logoUpload = imageUpload('logos', 1024 * 1024); // 1 MB
const letterheadUpload = imageUpload('letterheads', 3 * 1024 * 1024); // 3 MB: wide banner images

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list(@Query() q: StatusSearchPaginationDto) {
    return this.companies.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.companies.get(id);
  }

  @Post()
  @MinRole(RoleCode.MANAGER)
  create(@Body() dto: CreateCompanyDto, @CurrentUser() me: AuthUser) {
    return this.companies.create(dto, me.id);
  }

  @Patch(':id')
  @MinRole(RoleCode.MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto, @CurrentUser() me: AuthUser) {
    return this.companies.update(id, dto, me.id);
  }

  @Patch(':id/active')
  @MinRole(RoleCode.MANAGER)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto, @CurrentUser() me: AuthUser) {
    return this.companies.setActive(id, dto.isActive, me.id);
  }

  @Post(':id/logo')
  @MinRole(RoleCode.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(logoUpload)
  uploadLogo(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() me: AuthUser) {
    return this.companies.setLogo(id, file, me.id);
  }

  /** Header image of the printed quotation (same in Arabic and English). */
  @Post(':id/header-image')
  @MinRole(RoleCode.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(letterheadUpload)
  uploadHeaderImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() me: AuthUser) {
    return this.companies.setLetterheadImage(id, 'header', file, me.id);
  }

  @Delete(':id/header-image')
  @MinRole(RoleCode.MANAGER)
  removeHeaderImage(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    return this.companies.removeLetterheadImage(id, 'header', me.id);
  }

  /** Footer image of the printed quotation (same in Arabic and English). */
  @Post(':id/footer-image')
  @MinRole(RoleCode.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(letterheadUpload)
  uploadFooterImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() me: AuthUser) {
    return this.companies.setLetterheadImage(id, 'footer', file, me.id);
  }

  @Delete(':id/footer-image')
  @MinRole(RoleCode.MANAGER)
  removeFooterImage(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    return this.companies.removeLetterheadImage(id, 'footer', me.id);
  }
}
