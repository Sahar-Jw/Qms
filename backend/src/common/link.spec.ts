import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMaterialDto } from '../materials/dto/material.dto';
import { normalizeLink } from './link';

describe('material link', () => {
  it.each([
    ['drive.google.com/file/d/abc/view?usp=sharing', 'https://drive.google.com/file/d/abc/view?usp=sharing'],
    ['  www.example.com/p ', 'https://www.example.com/p'],
    ['https://drive.google.com/open?id=1', 'https://drive.google.com/open?id=1'],
    ['http://example.com', 'http://example.com'],
  ])('%s', (input, out) => expect(normalizeLink(input)).toBe(out));

  const base = { materialCode: 'M1', name: 'Pipe', source: 'x', stockQuantity: '1', unitPrice: '2', unit: 'm', currency: 'USD', countryOfOrigin: 'TR', modelNumber: 'a', catalogueNumber: 'b' };
  const run = (link: string) => { const dto = plainToInstance(CreateMaterialDto, { ...base, link }); return { dto, errors: validateSync(dto) }; };

  it('accepts a Drive link typed without https://', () => {
    const { dto, errors } = run('drive.google.com/file/d/abc/view');
    expect(errors).toHaveLength(0);
    expect(dto.link).toBe('https://drive.google.com/file/d/abc/view');
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com/a', 'not a link'])('still rejects %s', (link) => {
    expect(run(link).errors.map((e) => e.property)).toContain('link');
  });
});
