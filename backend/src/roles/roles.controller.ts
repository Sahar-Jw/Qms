import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MinRole } from '../common/decorators/min-role.decorator';
import { RoleCode } from '../common/enums';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @MinRole(RoleCode.GENERAL_MANAGER)
  list() {
    return this.roles.findAll();
  }
}
