import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { SetActiveDto, StatusSearchPaginationDto } from '../common/dto/pagination.dto';
import { RoleCode } from '../common/enums';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query() q: StatusSearchPaginationDto) {
    return this.customers.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.customers.get(id);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() me: AuthUser) {
    return this.customers.create(dto, me.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto, @CurrentUser() me: AuthUser) {
    return this.customers.update(id, dto, me.id);
  }

  @Patch(':id/active')
  @MinRole(RoleCode.MANAGER)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto, @CurrentUser() me: AuthUser) {
    return this.customers.setActive(id, dto.isActive, me.id);
  }
}
