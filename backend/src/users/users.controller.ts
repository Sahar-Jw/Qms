import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { RoleCode } from '../common/enums';
import { ListUsersDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

/** There is no "create user" endpoint on purpose: users register themselves, the general manager only activates. */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Any authenticated user: active users for the "responsible person" dropdown. */
  @Get('lookup')
  lookup() {
    return this.users.lookup();
  }

  @Get()
  @MinRole(RoleCode.GENERAL_MANAGER)
  list(@Query() q: ListUsersDto) {
    return this.users.list(q);
  }

  @Get(':id')
  @MinRole(RoleCode.GENERAL_MANAGER)
  get(@Param('id', ParseIntPipe) id: number) {
    return this.users.get(id);
  }

  @Patch(':id')
  @MinRole(RoleCode.GENERAL_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() me: AuthUser) {
    return this.users.update(id, dto, me);
  }

  @Patch(':id/activate')
  @MinRole(RoleCode.GENERAL_MANAGER)
  activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    return this.users.setActive(id, true, me);
  }

  @Patch(':id/deactivate')
  @MinRole(RoleCode.GENERAL_MANAGER)
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    return this.users.setActive(id, false, me);
  }
}
