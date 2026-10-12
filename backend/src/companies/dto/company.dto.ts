import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
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
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
