import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimOptional } from '../../common/decorators/validators';

export type CustomerPhoneNumbers = string[];

export class CreateCustomerDto {
  @TrimOptional() @IsNotEmpty() @IsString() @MaxLength(190)
  companyName: string;

  @TrimOptional() @IsNotEmpty() @IsEmail() @MaxLength(150)
  email: string;

  @TrimOptional() @IsNotEmpty() @IsString() @MaxLength(60)
  phone: CustomerPhoneNumbers;

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
