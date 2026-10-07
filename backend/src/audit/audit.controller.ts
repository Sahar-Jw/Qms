import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MinRole } from '../common/decorators/min-role.decorator';
import { RoleCode } from '../common/enums';
import { AuditService } from './audit.service';
import { ListAuditDto } from './dto/audit.dto';

/** Managers and above only: employees get 403. */
@ApiTags('audit')
@Controller('audit-log')
@MinRole(RoleCode.MANAGER)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() q: ListAuditDto) {
    return this.audit.list(q);
  }
}
