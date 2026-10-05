import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
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

const logoUpload = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(uploadsRoot(), 'logos');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, randomBytes(16).toString('hex') + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 1024 * 1024 }, // 1 MB
  // SVG is deliberately not allowed (script injection risk).
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Only PNG, JPEG or WEBP images are allowed' }), false),
});

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
  @MinRole(RoleCode.GENERAL_MANAGER)
  create(@Body() dto: CreateCompanyDto, @CurrentUser() me: AuthUser) {
    return this.companies.create(dto, me.id);
  }

  @Patch(':id')
  @MinRole(RoleCode.GENERAL_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto, @CurrentUser() me: AuthUser) {
    return this.companies.update(id, dto, me.id);
  }

  @Patch(':id/active')
  @MinRole(RoleCode.GENERAL_MANAGER)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto, @CurrentUser() me: AuthUser) {
    return this.companies.setActive(id, dto.isActive, me.id);
  }

  @Post(':id/logo')
  @MinRole(RoleCode.GENERAL_MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(logoUpload)
  uploadLogo(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() me: AuthUser) {
    return this.companies.setLogo(id, file, me.id);
  }
}
