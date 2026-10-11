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

  // Print letterhead: the same on the printed / downloaded quotation in every language. Both optional.
  @IsOptional() @TrimOptional() @IsString() @MaxLength(1000)
  header?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(1000)
  footer?: string;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
