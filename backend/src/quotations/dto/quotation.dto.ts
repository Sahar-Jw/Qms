import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateIf, ValidateNested,
} from 'class-validator';
import { CurrencyCode, DateOnly, DecimalString, TrimOptional } from '../../common/decorators/validators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { QuotationStatus } from '../../common/enums';

/**
 * One line of a quotation. The payload is the FULL state of the line:
 * omitted optional fields are cleared (cost fields are the exception for Employees - see service).
 * Money/quantity are decimal strings (numbers are accepted and converted).
 */
export class QuotationItemDto {
  /** Present = update this existing line, absent = new line. Existing lines missing from the payload are removed. */
  @IsOptional() @IsInt()
  id?: number;

  @IsInt()
  materialId: number;

  @DecimalString({ positive: true })
  quantity: string;

  /** Defaults to the material's price / currency when omitted on a new line. */
  @IsNotEmpty() @DecimalString()
  unitPrice: string;

  @IsNotEmpty() @CurrencyCode()
  priceCurrency: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(30)
  unit: string;

  /** Manager / Admin only (ignored for Employees). */
  @IsOptional() @DecimalString()
  unitCost?: string;

  @ValidateIf((o) => o.unitCost !== undefined && o.unitCost !== null) @CurrencyCode()
  costCurrency?: string;

  @IsNotEmpty() @DecimalString()
  shippingCost: string;

  @IsNotEmpty() @ValidateIf((o) => o.shippingCost !== undefined && o.shippingCost !== null) @CurrencyCode()
  shippingCurrency: string;

  @IsNotEmpty() @DecimalString()
  customsCost: string;

  @IsNotEmpty() @ValidateIf((o) => o.customsCost !== undefined && o.customsCost !== null) @CurrencyCode()
  customsCurrency: string;

  /** Stored only (0-100). */
  @IsNotEmpty() @DecimalString()
  commissionPercentage: string;

  /** Internal note, never printed. */
  @IsOptional() @TrimOptional() @IsString()
  notes?: string;
}

export class CreateQuotationDto {
  /** Optional: if sent it must be the company chosen in the user's settings (the server uses the settings anyway). */
 @IsNotEmpty() @IsInt()
  companyId: number;

  @IsInt()
  customerId: number;

  /** The creator is always responsible for a new quotation. */
  @IsOptional() @IsInt()
  responsibleUserId: number;

  /** Free text: how the customer will pay (any language). Send "" or null to clear. */
  @IsNotEmpty() @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value)) @IsString() @MaxLength(100)
  customerPaymentMethod: string | null;

  /** YYYY-MM-DD, defaults to today. */
  @IsNotEmpty() @DateOnly()
  quotationDate: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(150)
  bankName: string;

  @IsNotEmpty() @DateOnly() @TrimOptional()
  validity: string;

  @IsOptional() @DateOnly() @TrimOptional()
  deliveryTime: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(150)
  paymentMethod: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(150)
  paymentLocation: string;

  @IsNotEmpty() @TrimOptional() @IsString() @MaxLength(150)
  deliveryMethod: string;

  /** Tax percentage (0-100). Required on a new quotation. */
  @IsNotEmpty() @DecimalString()
  taxPercentage: string;

  /** Internal note, never printed. */
  @IsOptional() @TrimOptional() @IsString()
  notes?: string;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500)
  @ValidateNested({ each: true }) @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}

/** Partial: only the provided header fields change. If `items` is sent it replaces the full item list (diffed by id). */
export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {}

export class ChangeStatusDto {
  @IsEnum(QuotationStatus)
  status: QuotationStatus;
}

export class ListQuotationsDto extends PaginationDto {
  /** Quotation number or customer name. */
  @IsOptional() @TrimOptional() @IsString()
  q?: string;

  @IsOptional() @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  /** true = locked quotations only, false = everything except locked (the name `archived` is kept for compatibility). */
  @IsOptional() @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value)) @IsBoolean()
  archived?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  companyId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  customerId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  responsibleUserId?: number;

  @IsOptional() @DateOnly()
  from?: string;

  @IsOptional() @DateOnly()
  to?: string;
}

export class PrintQueryDto {
  @IsOptional() @IsIn(['ar', 'en'])
  lang: 'ar' | 'en' = 'ar';

  /** Print cost lines (Manager / Admin only). */
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  includeCost?: boolean;

  /** HTML print page only: open the browser print dialog automatically. */
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true || value === '1') @IsBoolean()
  autoprint?: boolean;
}

/** Full copy of an existing quotation (new number, today's date, draft, issued from the company in the user's settings). Optionally switch customer. */
export class DuplicateQuotationDto {
  @IsOptional() @IsInt()
  customerId?: number;
}
