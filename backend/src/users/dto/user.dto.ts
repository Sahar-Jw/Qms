import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RoleCode } from '../../common/enums';
import { SearchPaginationDto } from '../../common/dto/pagination.dto';
import { TrimOptional } from '../../common/decorators/validators';

export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const PASSWORD_MSG = 'password must be 8-72 characters and contain letters and digits';

/** Accounts are created by the users themselves (POST /auth/register). Nobody creates accounts for others
 *  and nobody can see or change another user's password (SRS UC-02). */
export class UpdateUserDto {
  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  fullName?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(40)
  phone?: string;

  @IsOptional() @IsEnum(RoleCode)
  roleCode?: RoleCode;
}

export class ListUsersDto extends SearchPaginationDto {
  @IsOptional() @IsIn(['active', 'inactive', 'pending', 'all'])
  status?: 'active' | 'inactive' | 'pending' | 'all';

  @IsOptional() @IsEnum(RoleCode)
  roleCode?: RoleCode;
}
