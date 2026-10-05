import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimOptional } from '../../common/decorators/validators';

export class CreateCustomerDto {
  @IsOptional() @TrimOptional() @IsString() @MaxLength(190)
  companyNameAr?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(190)
  companyNameEn?: string;

  @IsOptional() @TrimOptional() @IsEmail() @MaxLength(150)
  email?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(60)
  phone?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(100)
  country?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  website?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  managerName?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  contactPersonName?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(60)
  contactPersonPhone?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(190)
  businessNature?: string;

  @IsOptional() @TrimOptional() @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
