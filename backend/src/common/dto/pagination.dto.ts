import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TrimOptional } from '../decorators/validators';

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;
}

export class SearchPaginationDto extends PaginationDto {
  @IsOptional() @TrimOptional() @IsString()
  q?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function paginated<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  return { data, total, page, limit };
}

export class StatusSearchPaginationDto extends SearchPaginationDto {
  /** Default: active only. */
  @IsOptional() @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all';
}

export class SetActiveDto {
  @IsBoolean()
  isActive: boolean;
}
