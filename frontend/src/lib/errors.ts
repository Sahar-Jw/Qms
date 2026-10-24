import { toast } from 'sonner';
import { ApiError, NetworkError } from './api';

type T = (key: string, vars?: Record<string, string | number>) => string;
type Has = (k: string) => boolean;

const isArabic = () => typeof document !== 'undefined' && document.documentElement.lang === 'ar';

/** "validity" -> "Validity", "items.0.unitPrice" -> "Item 1 › Unit price" (the label of each field comes from the audit field names). */
export function fieldLabel(path: string, t: T, has: Has): string {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .filter((part, i, all) => !(part === 'items' && /^\d+$/.test(all[i + 1] ?? ''))) // "items.0" is just "Item 1"
    .map((part) => {
      if (/^\d+$/.test(part)) return `${isArabic() ? 'البند' : 'Item'} ${Number(part) + 1}`;
      if (has(`audit.fields.${part}`)) return t(`audit.fields.${part}`);
      const spaced = part.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
      return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    })
    .join(' › ');
}

/** What the server's validator says (English) -> the same in Arabic. Anything not listed stays as the server wrote it. */
const AR_RULES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/must be an email/, () => 'بريد إلكتروني غير صالح'],
  [/should not be empty/, () => 'مطلوب'],
  [/must be a string/, () => 'يجب أن يكون نصاً'],
  [/must be an integer number/, () => 'يجب أن يكون عدداً صحيحاً'],
  [/must be a positive number/, () => 'يجب أن يكون رقماً أكبر من الصفر'],
  [/must be a number/, () => 'يجب أن يكون رقماً'],
  [/must not be less than (\S+)/, (m) => `يجب ألا يقل عن ${m[1]}`],
  [/must not be greater than (\S+)/, (m) => `يجب ألا يزيد عن ${m[1]}`],
  [/must be longer than or equal to (\d+) characters/, (m) => `يجب ألا يقل عن ${m[1]} أحرف`],
  [/must be shorter than or equal to (\d+) characters/, (m) => `يجب ألا يزيد عن ${m[1]} حرفاً`],
  [/must be one of the following values/, () => 'قيمة غير مسموحة'],
  [/must be a valid ISO 8601|must be YYYY-MM-DD|must be a Date/, () => 'تاريخ غير صالح (السنة-الشهر-اليوم)'],
  [/must be a boolean/, () => 'يجب أن يكون نعم أو لا'],
  [/must contain at least (\d+) elements/, (m) => `أضف ${m[1]} عنصراً على الأقل`],
  [/must contain no more than (\d+) elements/, (m) => `لا يمكن إضافة أكثر من ${m[1]} عنصراً`],
  [/must be an array/, () => 'قائمة غير صالحة'],
  [/must be a (?:non-negative|positive) decimal/, () => 'يجب أن يكون رقماً بحد أقصى 4 خانات عشرية'],
  [/3-letter currency code/, () => 'عملة غير صالحة (مثل USD أو $)'],
  [/valid http\(s\) URL/, () => 'رابط غير صالح (يبدأ بـ http أو https)'],
  [/must be 8-72 characters and contain letters and digits/, () => 'يجب أن تكون 8 إلى 72 حرفاً وتحتوي على أحرف وأرقام'],
  [/must be a colour like (#\w+)/, (m) => `يجب أن يكون لوناً مثل ${m[1]}`],
  [/must look like section\.name/, () => 'يجب أن يكون بالشكل: القسم.الاسم'],
];

/** One line of a validation error ("items.0.quantity must be a positive number") in the user's language, with a readable field name. */
export function localizeDetail(detail: string, t: T, has: Has): string {
  const unexpected = /^property (\S+) should not exist$/.exec(detail);
  if (unexpected) return `${fieldLabel(unexpected[1], t, has)}: ${isArabic() ? 'حقل غير متوقع' : 'unexpected field'}`;
  const m = /^([A-Za-z_][\w.[\]]*) (.+)$/.exec(detail);
  if (!m) return detail;
  const label = fieldLabel(m[1], t, has);
  if (!isArabic()) return `${label}: ${m[2]}`;
  for (const [re, ar] of AR_RULES) {
    const hit = re.exec(m[2]);
    if (hit) return `${label}: ${ar(hit)}`;
  }
  return `${label}: ${m[2]}`;
}

/** A leftover {placeholder} (a number the server did not send) must never reach the screen. */
const tidy = (s: string) => s.replace(/\s*[([]\{\w+\}[)\]]/g, '').replace(/\s*\{\w+\}/g, '').replace(/\s*\(\s*\)/g, '').replace(/\s+:/g, ':').trim();

function apiMessage(e: ApiError, t: T, has: Has): string {
  // numbers / text the server adds to an error (e.g. maxFileSizeMb, materialCode, minutes) can be used in the message as {maxFileSizeMb}
  const vars: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(e.extra ?? {})) if (typeof v === 'string' || typeof v === 'number') vars[k] = v;
  // names of fields and statuses are shown in the user's language
  if (typeof vars.field === 'string' && vars.field) vars.field = fieldLabel(vars.field, t, has);
  for (const k of ['status', 'from', 'to'] as const) {
    const v = vars[k];
    if (typeof v === 'string' && has(`status.${v}`)) vars[k] = t(`status.${v}`);
  }

  const byStatus = e.status >= 500 ? 'INTERNAL_SERVER_ERROR' : '';
  let text: string;
  if (has(`err.${e.code}`)) text = tidy(t(`err.${e.code}`, vars));
  else if (e.message && !/^HTTP \d+$/.test(e.message) && e.status < 500) text = e.message;
  else if (byStatus && has(`err.${byStatus}`)) text = t(`err.${byStatus}`);
  else text = e.message || t('err.INTERNAL_ERROR');

  // a validation error must say WHICH fields (the general sentence alone is not enough)
  if (e.details?.length) {
    const lines = e.details.map((d) => localizeDetail(d, t, has));
    const shown = lines.slice(0, 4).join(' · ');
    const more = lines.length > 4 ? ` (+${lines.length - 4})` : '';
    return e.code === 'VALIDATION_FAILED' ? `${text}: ${shown}${more}` : `${shown}${more}`;
  }
  return text;
}

/** Localised message for any error: an API error (by its `code`), a network failure, or a plain Error that carries a `code` (the PDF builder). Never empty. */
export function errorMessage(e: unknown, t: T, has: Has): string {
  if (e instanceof ApiError) return apiMessage(e, t, has);
  if (e instanceof NetworkError) return t('err.NETWORK');
  const code = (e as { code?: unknown })?.code;
  if (typeof code === 'string' && has(`err.${code}`)) return t(`err.${code}`);
  // A bug in the page itself (not the network): keep the details in the console.
  console.error(e);
  return (e as Error)?.message || t('err.INTERNAL_ERROR');
}

export function toastError(e: unknown, t: T, has: Has) {
  toast.error(errorMessage(e, t, has));
}
