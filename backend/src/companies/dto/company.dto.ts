import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimOptional } from '../../common/decorators/validators';

export class CreateCompanyDto {
  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(190)
  nameAr: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(190)
  nameEn?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(255)
  addressAr?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(255)
  addressEn?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(60)
  phone?: string;

  @IsOptional() @TrimOptional() @IsEmail() @MaxLength(150)
  email?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  website?: string;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
