import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

/**
 * Money / quantity as a decimal STRING (never a float): up to 14 integer digits, up to 4 decimals.
 * Accepts JSON numbers or strings; "" / null become undefined.
 */
export function DecimalString(opts: { positive?: boolean } = {}) {
  const re = opts.positive ? /^(?!0+(\.0+)?$)\d{1,14}(\.\d{1,4})?$/ : /^\d{1,14}(\.\d{1,4})?$/;
  return applyDecorators(
    Transform(({ value }) => (value === null ? null : value === undefined || value === '' ? undefined : String(value).trim())),
    Matches(re, { message: opts.positive ? '$property must be a positive decimal (max 4 places)' : '$property must be a non-negative decimal (max 4 places)' }),
  );
}

/** ISO-4217-like currency code, normalised to upper case (USD, EUR, SYP, TRY...). */
export function CurrencyCode() {
  return applyDecorators(
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
    Matches(/^[A-Z]{3}$/, { message: '$property must be a 3-letter currency code' }),
  );
}

/** YYYY-MM-DD */
export function DateOnly() {
  return Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '$property must be YYYY-MM-DD' });
}

/** Trim strings and turn "" into undefined. */
export function TrimOptional() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    return v === '' ? undefined : v;
  });
}
