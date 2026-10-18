import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { CurrencyCode, DecimalString, OptionalLink, TrimOptional } from '../../common/decorators/validators';

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

  /** Optional. Send null (or "" on create) to leave it empty. */
  @IsOptional() @DecimalString()
  sellingPrice?: string | null;

  /** ISO code or a symbol such as $ (converted to its code). Required when sellingPrice is set. */
  @IsOptional() @CurrencyCode()
  sellingCurrency?: string | null;

  /** Product / Drive file page shown (clickable) on the printed quotation. https:// is added when missing. */
  @IsOptional() @OptionalLink() @IsString() @MaxLength(500)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'link must be a valid http(s) URL' })
  link?: string | null;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(100)
  countryOfOrigin: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(100)
  modelNumber: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(100)
  catalogueNumber: string;
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
