/**
 * Currency symbols / common names that users type instead of the 3-letter ISO code.
 * Everything is stored as the ISO code, so totals keep grouping by one code per currency.
 * "$" means USD, "£" GBP, "¥" JPY, "kr" is left out (ambiguous: SEK / NOK / DKK).
 */
const ALIASES: Record<string, string> = {
  '$': 'USD', 'US$': 'USD', 'USD$': 'USD', '$US': 'USD', 'دولار': 'USD',
  '€': 'EUR', 'يورو': 'EUR',
  '£': 'GBP', 'جنيه استرليني': 'GBP',
  '₺': 'TRY', 'TL': 'TRY', 'ليرة تركية': 'TRY',
  'ل.س': 'SYP', 'ل.س.': 'SYP', 'ليرة سورية': 'SYP', 'S£': 'SYP', '£S': 'SYP', 'LS': 'SYP',
  'ل.ل': 'LBP', 'L.L': 'LBP', 'LL': 'LBP', 'ل.ل.': 'LBP',
  'د.إ': 'AED', 'د.ا': 'AED', 'درهم': 'AED', 'Dh': 'AED', 'DH': 'AED',
  'ر.س': 'SAR', 'ريال سعودي': 'SAR',
  'ر.ق': 'QAR', 'ريال قطري': 'QAR',
  'ر.ع': 'OMR', 'ريال عماني': 'OMR',
  'د.ك': 'KWD', 'دينار كويتي': 'KWD',
  'د.ب': 'BHD', 'دينار بحريني': 'BHD',
  'د.أ': 'JOD', 'دينار أردني': 'JOD',
  'د.ع': 'IQD', 'دينار عراقي': 'IQD',
  'ج.م': 'EGP', 'E£': 'EGP', 'جنيه مصري': 'EGP', 'LE': 'EGP',
  '¥': 'JPY', '円': 'JPY', 'CN¥': 'CNY', '元': 'CNY', 'RMB': 'CNY',
  '₹': 'INR', '₽': 'RUB', '₩': 'KRW', '₪': 'ILS', 'Fr.': 'CHF',
};

const LOOKUP = new Map(Object.entries(ALIASES).map(([k, v]) => [k.toLowerCase(), v]));

/** "$" -> "USD", " usd " -> "USD", "ل.س" -> "SYP". Unknown text is returned trimmed + upper-cased so validation can reject it. */
export function normalizeCurrency(input: string): string {
  const v = input.trim().replace(/\s+/g, ' ');
  return LOOKUP.get(v.toLowerCase()) ?? v.toUpperCase();
}

/** A normalised value is a valid currency when it is a 3-letter code. */
export const isCurrency = (input: string) => /^[A-Z]{3}$/.test(normalizeCurrency(input));
