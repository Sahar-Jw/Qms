import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrencyCode, DecimalString, TrimOptional } from '../../common/decorators/validators';

export class CreateMaterialDto {
  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(60)
  materialCode: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(255)
  nameAr?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(255)
  nameEn?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  source?: string;

  @IsOptional() @DecimalString()
  stockQuantity?: string;

  @IsOptional() @DecimalString()
  unitPrice?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(30)
  unit?: string;

  @IsOptional() @CurrencyCode()
  currency?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(100)
  countryOfOrigin?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(150)
  catalogue?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(100)
  modelNumber?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(100)
  catalogueNumber?: string;
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
