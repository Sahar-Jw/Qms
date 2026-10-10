import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import { uploadsRoot } from '../config/uploads';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { SetActiveDto, StatusSearchPaginationDto } from '../common/dto/pagination.dto';
import { RoleCode } from '../common/enums';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { MaterialsService } from './materials.service';

const ALLOWED: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const imageUpload = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(uploadsRoot(), 'materials');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, randomBytes(16).toString('hex') + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  // SVG is deliberately not allowed (script injection risk).
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Only PNG, JPEG or WEBP images are allowed' }), false),
});

@ApiTags('materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get()
  list(@Query() q: StatusSearchPaginationDto) {
    return this.materials.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.materials.get(id);
  }

  @Post()
  create(@Body() dto: CreateMaterialDto, @CurrentUser() me: AuthUser) {
    return this.materials.create(dto, me.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaterialDto, @CurrentUser() me: AuthUser) {
    return this.materials.update(id, dto, me.id);
  }

  @Post(':id/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(imageUpload)
  uploadImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() me: AuthUser) {
    return this.materials.setImage(id, file, me.id);
  }

  @Delete(':id/image')
  removeImage(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    return this.materials.removeImage(id, me.id);
  }

  @Patch(':id/active')
  @MinRole(RoleCode.MANAGER)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto, @CurrentUser() me: AuthUser) {
    return this.materials.setActive(id, dto.isActive, me.id);
  }
}
