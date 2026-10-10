import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrencyCode, DecimalString, TrimOptional } from '../../common/decorators/validators';

export class CreateMaterialDto {
  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(60)
  materialCode: string;

  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(150)
  source: string;

  @IsNotEmpty() @DecimalString()
  stockQuantity: string;

  @IsNotEmpty() @DecimalString()
  unitPrice: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(30)
  unit: string;

  @IsNotEmpty() @CurrencyCode()
  currency: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(100)
  countryOfOrigin: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(100)
  modelNumber: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(100)
  catalogueNumber: string;
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
