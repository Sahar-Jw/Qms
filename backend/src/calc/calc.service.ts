import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CurrencyAmounts, ItemCalcInput, ItemCalcResult } from './calc.types';

/**
 * The ONLY place money math happens (SRS section 13):
 *   value    = quantity x unit price                (in the price currency)
 *   cost     = quantity x unit cost                 (kept apart from "required")
 *   required = value + customs + shipping           (per currency)
 * Currencies are never added together or converted.
 * decimal.js avoids floating point errors (0.1 + 0.2).
 */
@Injectable()
export class CalcService {
  private static readonly SCALE = 4;

  calcItem(input: ItemCalcInput): ItemCalcResult {
    const slots = new Map<string, Record<'value' | 'cost' | 'shipping' | 'customs', Decimal>>();
    const slot = (cur: string) => {
      let s = slots.get(cur);
      if (!s) {
        s = { value: new Decimal(0), cost: new Decimal(0), shipping: new Decimal(0), customs: new Decimal(0) };
        slots.set(cur, s);
      }
      return s;
    };

    const qty = new Decimal(input.quantity);
    slot(input.priceCurrency).value = qty.times(input.unitPrice);

    if (this.has(input.unitCost)) {
      slot(this.need(input.costCurrency, 'costCurrency')).cost = qty.times(input.unitCost as string);
    }
    if (this.has(input.shippingCost)) {
      const s = slot(this.need(input.shippingCurrency, 'shippingCurrency'));
      s.shipping = s.shipping.plus(input.shippingCost as string);
    }
    if (this.has(input.customsCost)) {
      const s = slot(this.need(input.customsCurrency, 'customsCurrency'));
      s.customs = s.customs.plus(input.customsCost as string);
    }

    const amounts = [...slots.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, s]) => this.toAmounts(currency, s.value, s.cost, s.shipping, s.customs));
    return { amounts };
  }

  /** Sum amounts per currency across items (quotation totals). */
  aggregate(lists: Array<Array<Omit<CurrencyAmounts, never>>>): CurrencyAmounts[] {
    const acc = new Map<string, Record<'value' | 'cost' | 'shipping' | 'customs', Decimal>>();
    for (const list of lists) {
      for (const a of list) {
        let s = acc.get(a.currency);
        if (!s) {
          s = { value: new Decimal(0), cost: new Decimal(0), shipping: new Decimal(0), customs: new Decimal(0) };
          acc.set(a.currency, s);
        }
        s.value = s.value.plus(a.value);
        s.cost = s.cost.plus(a.cost);
        s.shipping = s.shipping.plus(a.shipping);
        s.customs = s.customs.plus(a.customs);
      }
    }
    return [...acc.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, s]) => this.toAmounts(currency, s.value, s.cost, s.shipping, s.customs));
  }

  private toAmounts(currency: string, value: Decimal, cost: Decimal, shipping: Decimal, customs: Decimal): CurrencyAmounts {
    const f = (d: Decimal) => d.toFixed(CalcService.SCALE);
    return {
      currency,
      value: f(value),
      cost: f(cost),
      shipping: f(shipping),
      customs: f(customs),
      required: f(value.plus(customs).plus(shipping)),
    };
  }

  private has(v: string | null | undefined): boolean {
    return v !== undefined && v !== null && v !== '';
  }

  private need(cur: string | null | undefined, field: string): string {
    if (!cur) throw new Error(`${field} is required when an amount is provided`);
    return cur;
  }
}
