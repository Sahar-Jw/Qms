import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TrimOptional } from '../../common/decorators/validators';

export class ListAuditDto extends PaginationDto {
  /** Searches the user's name, the record's name and the record's id. */
  @IsOptional() @TrimOptional() @IsString()
  q?: string;

  @IsOptional() @IsString() @Matches(/^[a-z_]{1,40}$/)
  action?: string;

  @IsOptional() @IsString() @Matches(/^[a-z_]{1,60}$/)
  entity?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  userId?: number;

  /** YYYY-MM-DD */
  @IsOptional() @IsDateString({ strict: true })
  from?: string;

  @IsOptional() @IsDateString({ strict: true })
  to?: string;
}
