import { CalcService } from './calc.service';

describe('CalcService (SRS section 13 examples)', () => {
  const calc = new CalcService();
  const byCur = (r: ReturnType<CalcService['calcItem']>, c: string) => r.amounts.find((a) => a.currency === c)!;

  it('value = qty x price', () => {
    const r = calc.calcItem({ quantity: '5', unitPrice: '100', priceCurrency: 'USD' });
    expect(byCur(r, 'USD').value).toBe('500.0000');
    expect(byCur(r, 'USD').required).toBe('500.0000');
  });

  it('required = value + customs + shipping, cost kept apart', () => {
    const r = calc.calcItem({
      quantity: '2', unitPrice: '100', priceCurrency: 'USD',
      unitCost: '60', costCurrency: 'USD',
      shippingCost: '20', shippingCurrency: 'USD',
      customsCost: '30', customsCurrency: 'USD',
    });
    const usd = byCur(r, 'USD');
    expect(usd.value).toBe('200.0000');
    expect(usd.cost).toBe('120.0000');
    expect(usd.required).toBe('250.0000'); // 200 + 20 + 30, cost NOT included
  });

  it('never mixes currencies inside one item', () => {
    const r = calc.calcItem({
      quantity: '1', unitPrice: '500', priceCurrency: 'USD',
      shippingCost: '300', shippingCurrency: 'EUR',
    });
    expect(byCur(r, 'USD').required).toBe('500.0000');
    expect(byCur(r, 'EUR').required).toBe('300.0000');
    expect(r.amounts).toHaveLength(2);
  });

  it('aggregates per currency: 500 USD + 300 EUR + 200 USD = USD 700 / EUR 300', () => {
    const a = calc.calcItem({ quantity: '1', unitPrice: '500', priceCurrency: 'USD' });
    const b = calc.calcItem({ quantity: '1', unitPrice: '300', priceCurrency: 'EUR' });
    const c = calc.calcItem({ quantity: '1', unitPrice: '200', priceCurrency: 'USD' });
    const total = calc.aggregate([a.amounts, b.amounts, c.amounts]);
    expect(total.find((t) => t.currency === 'USD')!.required).toBe('700.0000');
    expect(total.find((t) => t.currency === 'EUR')!.required).toBe('300.0000');
  });

  it('has no floating point drift', () => {
    const r = calc.calcItem({ quantity: '3', unitPrice: '0.1', priceCurrency: 'USD', shippingCost: '0.2', shippingCurrency: 'USD' });
    expect(byCur(r, 'USD').required).toBe('0.5000');
  });

  it('requires a currency when an amount is given', () => {
    expect(() => calc.calcItem({ quantity: '1', unitPrice: '1', priceCurrency: 'USD', shippingCost: '5' })).toThrow();
  });
});
