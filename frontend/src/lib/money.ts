import Decimal from 'decimal.js';
import type { Amounts } from './types';

/** Same rules as the backend (per currency, never mixed): value = qty x price, required = value + customs + shipping, cost apart. */
export interface ItemInput {
  quantity: string; unitPrice: string; priceCurrency: string;
  unitCost?: string; costCurrency?: string;
  shippingCost?: string; shippingCurrency?: string;
  customsCost?: string; customsCurrency?: string;
}

type Slot = Record<'value' | 'cost' | 'shipping' | 'customs', Decimal>;
const blank = (): Slot => ({ value: new Decimal(0), cost: new Decimal(0), shipping: new Decimal(0), customs: new Decimal(0) });
const has = (v?: string) => v !== undefined && v.trim() !== '';
const cur = (c?: string) => (c ?? '').trim().toUpperCase();
const out = (c: string, s: Slot): Amounts => ({
  currency: c, value: s.value.toFixed(4), cost: s.cost.toFixed(4), shipping: s.shipping.toFixed(4), customs: s.customs.toFixed(4),
  required: s.value.plus(s.customs).plus(s.shipping).toFixed(4),
});

/** Throws on invalid numbers - callers wrap it (live preview while typing). */
export function calcItem(i: ItemInput): Amounts[] {
  const slots = new Map<string, Slot>();
  const slot = (c: string) => { let s = slots.get(c); if (!s) { s = blank(); slots.set(c, s); } return s; };
  const qty = new Decimal(i.quantity);
  const pc = cur(i.priceCurrency) || 'USD';
  slot(pc).value = qty.times(has(i.unitPrice) ? i.unitPrice : '0');
  if (has(i.unitCost)) slot(cur(i.costCurrency) || pc).cost = qty.times(i.unitCost!);
  if (has(i.shippingCost)) { const s = slot(cur(i.shippingCurrency) || pc); s.shipping = s.shipping.plus(i.shippingCost!); }
  if (has(i.customsCost)) { const s = slot(cur(i.customsCurrency) || pc); s.customs = s.customs.plus(i.customsCost!); }
  return [...slots.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([c, s]) => out(c, s));
}

export function aggregate(lists: Amounts[][]): Amounts[] {
  const acc = new Map<string, Slot>();
  for (const l of lists) for (const a of l) {
    let s = acc.get(a.currency);
    if (!s) { s = blank(); acc.set(a.currency, s); }
    s.value = s.value.plus(a.value); s.cost = s.cost.plus(a.cost); s.shipping = s.shipping.plus(a.shipping); s.customs = s.customs.plus(a.customs);
  }
  return [...acc.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([c, s]) => out(c, s));
}

/** Western digits everywhere (976876). */
export function fmt(v: string | number | null | undefined, maxDigits = 4): string {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: maxDigits }).format(n);
}

/** "12.5000" -> "12.5", "100.0000" -> "100" (for editable inputs). */
export function trimDec(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  return v.includes('.') ? v.replace(/0+$/, '').replace(/\.$/, '') : v;
}

export const isZero = (v: string) => Number(v) === 0;
