import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsOptional, Max, Min } from 'class-validator';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TrimOptional } from '../common/decorators/validators';
import { CustomersService } from '../customers/customers.service';
import { MaterialsService } from '../materials/materials.service';
import { QuotationsService } from '../quotations/quotations.service';

class GlobalSearchDto {
  @TrimOptional() @IsString() @IsNotEmpty()
  q: string;

  /** Max rows per type. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit: number = 10;
}

/** One box that searches quotations, customers and materials together (SRS: full search). */
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly quotations: QuotationsService,
    private readonly customers: CustomersService,
    private readonly materials: MaterialsService,
  ) {}

  @Get()
  async search(@Query() dto: GlobalSearchDto, @CurrentUser() me: AuthUser) {
    const base = { q: dto.q, page: 1, limit: dto.limit };
    const [quotations, customers, materials] = await Promise.all([
      this.quotations.list({ ...base }, me),
      this.customers.list({ ...base, status: 'all' }),
      this.materials.list({ ...base, status: 'all' }),
    ]);
    return { quotations, customers, materials };
  }
}
