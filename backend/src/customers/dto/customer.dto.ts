import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimOptional } from '../../common/decorators/validators';

export class CreateCustomerDto {
  @TrimOptional() @IsNotEmpty() @IsString() @MaxLength(190)
  companyName: string;

  @TrimOptional() @IsNotEmpty() @IsEmail() @MaxLength(150)
  email: string;

  /** One or more phone numbers. */
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== '') : value))
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(60, { each: true })
  phone: string[];

  @TrimOptional() @IsNotEmpty() @IsString() @MaxLength(100)
  country: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  website?: string;

  @TrimOptional() @IsNotEmpty() @IsString() @MaxLength(150)
  managerName: string;

  @TrimOptional() @IsNotEmpty() @IsString() @MaxLength(190)
  businessNature: string;

  @IsOptional() @TrimOptional() @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
