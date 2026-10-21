import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
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

  /** Everyone who appears in the log, for the user filter. */
  @Get('users')
  users() {
    return this.audit.users();
  }

  /** CSV of the filtered log (at most 10,000 rows). General manager and above: it is a copy of everything. */
  @Get('export')
  @MinRole(RoleCode.GENERAL_MANAGER)
  async export(@Query() q: ListAuditDto) {
    const csv = await this.audit.exportCsv(q);
    return new StreamableFile(Buffer.from(csv, 'utf8'), { type: 'text/csv; charset=utf-8', disposition: 'attachment; filename="audit-log.csv"' });
  }

  /** Checks every row against its signature: finds rows edited directly in the database. */
  @Get('verify')
  @MinRole(RoleCode.GENERAL_MANAGER)
  verify() {
    return this.audit.verify();
  }
}
