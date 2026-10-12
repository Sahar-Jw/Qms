import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { TrimOptional } from '../../common/decorators/validators';

export class CreateCompanyDto {
  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(190)
  name: string;

  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(255)
  address: string;

  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(60)
  phone: string;

  @TrimOptional() @IsEmail() @IsNotEmpty() @MaxLength(150)
  email: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  website?: string;

  @IsOptional() @IsBoolean()
  taxEnabled?: boolean;

  @IsOptional() @Matches(/^(?:100(?:\.0{1,4})?|(?:\d{1,2})(?:\.\d{1,4})?)$/)
  taxPercentage?: string;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
