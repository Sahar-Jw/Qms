import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMaterialDto } from '../materials/dto/material.dto';
import { normalizeCurrency } from './currency';

describe('currency symbols', () => {
  it.each([
    ['$', 'USD'], ['€', 'EUR'], ['£', 'GBP'], ['₺', 'TRY'], ['ل.س', 'SYP'], ['د.إ', 'AED'], [' usd ', 'USD'], ['eur', 'EUR'], ['dh', 'AED'],
  ])('%s -> %s', (input, code) => expect(normalizeCurrency(input)).toBe(code));

  it('leaves unknown text for validation to reject', () => {
    expect(normalizeCurrency('abcd')).toBe('ABCD');
  });
});

describe('material DTO: link, selling price and symbols', () => {
  const base = {
    materialCode: 'M1', name: 'Pipe', source: 'x', stockQuantity: '1', unitPrice: '2', unit: 'm', currency: '$',
    countryOfOrigin: 'TR', modelNumber: 'a', catalogueNumber: 'b',
  };
  const check = (extra: Record<string, unknown>) => {
    const dto = plainToInstance(CreateMaterialDto, { ...base, ...extra });
    return { dto, errors: validateSync(dto, { whitelist: true }) };
  };

  it('turns $ into USD for currency and sellingCurrency', () => {
    const { dto, errors } = check({ sellingPrice: '10.5', sellingCurrency: '€', link: 'https://example.com/p?id=1' });
    expect(errors).toHaveLength(0);
    expect(dto.currency).toBe('USD');
    expect(dto.sellingCurrency).toBe('EUR');
  });

  it('selling price, currency and link are optional', () => {
    expect(check({}).errors).toHaveLength(0);
    expect(check({ sellingPrice: null, sellingCurrency: null, link: null }).errors).toHaveLength(0);
  });

  it.each(['javascript:alert(1)', 'ftp://example.com', 'data:text/html,hi'])('rejects the link %s', (link) => {
    expect(check({ link }).errors.map((e) => e.property)).toContain('link');
  });

  it('rejects a bad selling price / currency', () => {
    const props = check({ sellingPrice: '-1', sellingCurrency: 'nope!' }).errors.map((e) => e.property);
    expect(props).toEqual(expect.arrayContaining(['sellingPrice', 'sellingCurrency']));
  });
});
