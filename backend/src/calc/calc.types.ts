export interface ItemCalcInput {
  quantity: string;
  unitPrice: string;
  priceCurrency: string;
  unitCost?: string | null;
  costCurrency?: string | null;
  shippingCost?: string | null;
  shippingCurrency?: string | null;
  customsCost?: string | null;
  customsCurrency?: string | null;
}

/** All amounts as fixed 4-decimal strings. */
export interface CurrencyAmounts {
  currency: string;
  value: string;
  cost: string;
  shipping: string;
  customs: string;
  required: string;
}

export interface ItemCalcResult {
  amounts: CurrencyAmounts[];
}
