import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { SetActiveDto, StatusSearchPaginationDto } from '../common/dto/pagination.dto';
import { RoleCode } from '../common/enums';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { MaterialsService } from './materials.service';

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

  @Patch(':id/active')
  @MinRole(RoleCode.MANAGER)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto, @CurrentUser() me: AuthUser) {
    return this.materials.setActive(id, dto.isActive, me.id);
  }
}
