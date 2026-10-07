import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { CurrencyAmounts } from '../calc/calc.types';
import { Lang } from '../common/enums';
import { uploadsRoot } from '../config/uploads';
import { ItemView, QuotationView } from '../quotations/quotation-view';

export interface PrintOptions {
  lang: Lang;
  includeCost: boolean;
  autoPrint?: boolean;
}

const T = {
  ar: {
    title: 'عرض سعر', number: 'رقم العرض', date: 'التاريخ', to: 'السادة', attn: 'عناية', phone: 'هاتف', email: 'البريد',
    validity: 'مدة صلاحية العرض', deliveryTime: 'مدة التسليم', oneDayRemaining: 'متبقي يوم واحد', daysRemaining: 'متبقي {days} يوم', expired: 'منتهي الصلاحية', paymentMethod: 'طريقة الدفع', paymentLocation: 'مكان الدفع',
    deliveryMethod: 'طريقة التسليم', bank: 'المصرف', customerPayment: 'نظام الدفع', responsible: 'المسؤول',
    no: '#', code: 'الرمز', desc: 'البيان', qty: 'الكمية', unit: 'الوحدة', unitPrice: 'سعر الوحدة', value: 'القيمة',
    shipping: 'الشحن', customs: 'التخليص الجمركي', required: 'المطلوب', cost: 'التكلفة', totals: 'الإجماليات حسب العملة',
    currency: 'العملة', print: 'طباعة', page: 'صفحة',
  },
  en: {
    title: 'Quotation', number: 'Quotation No.', date: 'Date', to: 'To', attn: 'Attn', phone: 'Phone', email: 'Email',
    validity: 'Validity', deliveryTime: 'Delivery time', oneDayRemaining: '1 day remaining', daysRemaining: '{days} days remaining', expired: 'Expired', paymentMethod: 'Payment method', paymentLocation: 'Payment location',
    deliveryMethod: 'Delivery method', bank: 'Bank', customerPayment: 'Payment terms', responsible: 'Prepared by',
    no: '#', code: 'Code', desc: 'Description', qty: 'Qty', unit: 'Unit', unitPrice: 'Unit price', value: 'Value',
    shipping: 'Shipping', customs: 'Customs', required: 'Required', cost: 'Cost', totals: 'Totals by currency',
    currency: 'Currency', print: 'Print', page: 'Page',
  },
} as const;

const AR_RANGE = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';
const LATIN_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browserPromise?: Promise<import('puppeteer').Browser>;
  private fontCssCache?: string;

  constructor(private readonly config: ConfigService) {}

  // ------------------------------------------------------------------ public API

  /** Self-contained print-ready HTML (fonts + logo inlined). Works everywhere - open it and use the browser's "Save as PDF". */
  renderHtml(q: QuotationView, opts: PrintOptions): string {
    const t = T[opts.lang];
    const rtl = opts.lang === 'ar';
    const nf = this.numberFormatter(opts.lang);
    const money = (v: string, cur: string) => `${nf(v)} ${this.esc(cur)}`;
    const lines = (list: { v: string; c: string }[]) =>
      list.length ? list.map((x) => `<div class="m" dir="ltr">${money(x.v, x.c)}</div>`).join('') : '<span class="dim">—</span>';

    const pick = (amounts: CurrencyAmounts[], key: 'value' | 'shipping' | 'customs' | 'required' | 'cost', fallbackCur?: string) => {
      const nz = amounts.filter((a) => Number(a[key]) !== 0).map((a) => ({ v: a[key], c: a.currency }));
      if (!nz.length && fallbackCur) return [{ v: '0', c: fallbackCur }];
      return nz;
    };

    const name = (ar: string | null, en: string | null) => (rtl ? ar || en : en || ar) ?? '';
    const co = q.company;
    const cu = q.customer;
    const logo = this.logoDataUri(co.logo);
    const coName = co.name ?? '';
    const coAddr = co.address ?? '';

    const terms: [string, string | null | undefined][] = [
      [t.validity, q.validity],
      [t.deliveryTime, q.validity ? (() => {
        const expiry = Date.parse(`${q.validity}T00:00:00.000Z`);
        const now = new Date();
        const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const days = Math.floor((expiry - today) / (24 * 60 * 60 * 1000));
        return Number.isFinite(expiry)
          ? days < 0
            ? t.expired
            : days === 1
              ? t.oneDayRemaining
              : t.daysRemaining.replace('{days}', nf(String(days), 0))
          : null;
      })() : null],
      [t.paymentMethod, q.paymentMethod],
      [t.paymentLocation, q.paymentLocation],
      [t.deliveryMethod, q.deliveryMethod],
      [t.bank, q.bankName],
      [t.customerPayment, q.customerPaymentMethod],
      [t.responsible, q.responsibleUser?.fullName],
    ];
    const termsHtml = terms
      .filter(([, v]) => v)
      .map(([k, v]) => `<div class="term"><span class="k">${this.esc(k)}:</span> <bdi dir="auto">${this.esc(v!)}</bdi></div>`)
      .join('');

    const rows = q.items
      .map((i: ItemView, idx: number) => {
        const itemName = i.materialName ?? '';
        return `<tr>
          <td class="c">${nf(String(idx + 1), 0)}</td>
          <td dir="ltr" style="white-space:nowrap">${this.esc(i.materialCode)}</td>
          <td class="desc"><bdi dir="auto">${this.esc(itemName)}</bdi></td>
          <td class="n" dir="ltr">${nf(i.quantity)}</td>
          <td>${this.esc(i.unit ?? '')}</td>
          <td class="n" dir="ltr">${money(i.unitPrice, i.priceCurrency)}</td>
          <td class="n">${lines(pick(i.amounts, 'value', i.priceCurrency))}</td>
          <td class="n">${lines(pick(i.amounts, 'shipping'))}</td>
          <td class="n">${lines(pick(i.amounts, 'customs'))}</td>
          <td class="n b">${lines(pick(i.amounts, 'required', i.priceCurrency))}</td>
          ${opts.includeCost ? `<td class="n">${lines(pick(i.amounts, 'cost'))}</td>` : ''}
        </tr>`;
      })
      .join('');

    const totalsRows = q.totals
      .map(
        (tt) => `<tr>
          <td class="c b" dir="ltr">${this.esc(tt.currency)}</td>
          <td class="n" dir="ltr">${nf(tt.value)}</td>
          <td class="n" dir="ltr">${nf(tt.shipping)}</td>
          <td class="n" dir="ltr">${nf(tt.customs)}</td>
          <td class="n b" dir="ltr">${nf(tt.required)}</td>
          ${opts.includeCost ? `<td class="n" dir="ltr">${nf(tt.cost)}</td>` : ''}
        </tr>`,
      )
      .join('');

    const contact = [co.phone && `${t.phone}: ${co.phone}`, co.email, co.website].filter(Boolean).map((x) => `<bdi dir="ltr">${this.esc(String(x))}</bdi>`).join(' &nbsp;|&nbsp; ');
    const custName = cu.companyName ?? '';

    // NOTE: internal notes (quotation.notes / item.notes) are intentionally never rendered.
    return `<!doctype html>
<html lang="${opts.lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title>${this.esc(q.quotationNumber)}</title>
<style>
${this.fontCss()}
@page { size: A4; margin: 12mm 10mm 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Cairo', Tahoma, Arial, sans-serif; font-size: 11px; color: #111; margin: 0; line-height: 1.55; }
.head { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #1f3a5f; padding-bottom: 8px; margin-bottom: 10px; }
.head img { max-height: 70px; max-width: 150px; object-fit: contain; }
.head .co { flex: 1; }
.head .co .nm { font-size: 18px; font-weight: 700; color: #1f3a5f; }
.head .co .sub { color: #444; font-size: 10px; }
.title { text-align: center; font-size: 20px; font-weight: 700; margin: 6px 0 10px; }
.meta { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.box { border: 1px solid #c9d1dc; border-radius: 4px; padding: 6px 10px; flex: 1; }
.box .row { margin: 1px 0; }
.k { color: #555; }
.terms { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; border: 1px solid #c9d1dc; border-radius: 4px; padding: 6px 10px; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; }
th { background: #1f3a5f; color: #fff; font-weight: 600; padding: 5px 4px; border: 1px solid #1f3a5f; text-align: center; font-size: 10px; }
td { border: 1px solid #c9d1dc; padding: 4px; vertical-align: top; }
tr { page-break-inside: avoid; }
td.c { text-align: center; }
td.n { text-align: end; white-space: nowrap; }
td.desc { width: 28%; }
.b { font-weight: 700; }
.dim { color: #999; }
h3 { margin: 14px 0 4px; font-size: 12px; color: #1f3a5f; }
.totals { width: 62%; margin-inline-start: auto; }
.bar { text-align: center; margin: 10px 0; }
.bar button { font-family: inherit; padding: 6px 18px; font-size: 13px; cursor: pointer; }
@media print { .bar { display: none; } }
</style>
</head>
<body>
${opts.autoPrint ? '' : `<div class="bar"><button onclick="window.print()">${this.esc(t.print)}</button></div>`}
<div class="head">
  ${logo ? `<img src="${logo}" alt="">` : ''}
  <div class="co">
    <div class="nm">${this.esc(coName)}</div>
    <div class="sub"><bdi dir="auto">${this.esc(coAddr ?? '')}</bdi></div>
    <div class="sub">${contact}</div>
  </div>
</div>
<div class="title">${this.esc(t.title)}</div>
<div class="meta">
  <div class="box">
    <div class="row"><span class="k">${this.esc(t.to)}:</span> <b><bdi dir="auto">${this.esc(custName)}</bdi></b></div>
    ${cu.managerName ? `<div class="row"><span class="k">${this.esc(t.attn)}:</span> <bdi dir="auto">${this.esc(cu.managerName)}</bdi></div>` : ''}
    ${cu.phone?.length ? `<div class="row"><span class="k">${this.esc(t.phone)}:</span> <bdi dir="ltr">${this.esc(cu.phone.join(' - '))}</bdi></div>` : ''}
    ${cu.email ? `<div class="row"><span class="k">${this.esc(t.email)}:</span> <bdi dir="ltr">${this.esc(cu.email)}</bdi></div>` : ''}
  </div>
  <div class="box">
    <div class="row"><span class="k">${this.esc(t.number)}:</span> <b><bdi dir="ltr">${this.esc(q.quotationNumber)}</bdi></b></div>
    <div class="row"><span class="k">${this.esc(t.date)}:</span> <bdi dir="ltr">${this.esc(q.quotationDate)}</bdi></div>
  </div>
</div>
${termsHtml ? `<div class="terms">${termsHtml}</div>` : ''}
<table>
  <thead><tr>
    <th>${t.no}</th><th>${t.code}</th><th>${t.desc}</th><th>${t.qty}</th><th>${t.unit}</th><th>${t.unitPrice}</th>
    <th>${t.value}</th><th>${t.shipping}</th><th>${t.customs}</th><th>${t.required}</th>${opts.includeCost ? `<th>${t.cost}</th>` : ''}
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<h3>${this.esc(t.totals)}</h3>
<table class="totals">
  <thead><tr><th>${t.currency}</th><th>${t.value}</th><th>${t.shipping}</th><th>${t.customs}</th><th>${t.required}</th>${opts.includeCost ? `<th>${t.cost}</th>` : ''}</tr></thead>
  <tbody>${totalsRows}</tbody>
</table>
${opts.autoPrint ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>' : ''}
</body>
</html>`;
  }

  async renderPdf(q: QuotationView, opts: PrintOptions): Promise<Buffer> {
    const html = this.renderHtml(q, { ...opts, autoPrint: false });
    let browser;
    try {
      browser = await this.getBrowser();
    } catch (e) {
      this.logger.error(`Chromium launch failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException({
        code: 'PDF_ENGINE_UNAVAILABLE',
        message: 'PDF engine (Chromium) is not available on this server. Install Chrome or Edge, run `npx puppeteer browsers install chrome`, or set PUPPETEER_EXECUTABLE_PATH. The /print page works without it.',
      });
    }
    let page;
    try {
      page = await browser.newPage();
    } catch {
      // the cached browser died between requests: start a new one once
      this.browserPromise = undefined;
      page = await (await this.getBrowser()).newPage();
    }
    try {
      await page.setContent(html.replace(/<div class="bar">[\s\S]*?<\/div>/, ''), { waitUntil: 'load' });
      await page.evaluate('document.fonts.ready');
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        margin: { top: '12mm', bottom: '14mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async onModuleDestroy() {
    if (this.browserPromise) (await this.browserPromise.catch(() => undefined))?.close().catch(() => undefined);
  }

  // ------------------------------------------------------------------ internals

  /**
   * Which browser to launch: PUPPETEER_EXECUTABLE_PATH, else puppeteer's own Chrome, else any Chrome / Edge / Chromium
   * already installed on this machine (so PDF still works when puppeteer's download was skipped).
   */
  private async resolveBrowserPath(p: typeof import('puppeteer')): Promise<string | undefined> {
    const env = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (env) return env;
    try {
      const bundled = await p.executablePath();
      if (bundled && fs.existsSync(bundled)) return undefined; // puppeteer finds it itself
    } catch { /* not installed */ }
    const e = process.env;
    const win = [e.PROGRAMFILES, e['PROGRAMFILES(X86)'], e.LOCALAPPDATA]
      .filter((x): x is string => !!x)
      .flatMap((b) => [path.join(b, 'Google/Chrome/Application/chrome.exe'), path.join(b, 'Microsoft/Edge/Application/msedge.exe')]);
    const candidates =
      process.platform === 'win32' ? win
      : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
    const found = candidates.find((c) => fs.existsSync(c));
    if (found) this.logger.log(`Using installed browser for PDF: ${found}`);
    return found;
  }

  /** One shared Chromium; if it ever dies the next request starts a fresh one. */
  private getBrowser() {
    if (!this.browserPromise) {
      const launched = import('puppeteer').then(async (p) =>
        p.launch({
          headless: true,
          executablePath: await this.resolveBrowserPath(p),
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        }),
      );
      this.browserPromise = launched;
      launched.then((b) => b.on('disconnected', () => { if (this.browserPromise === launched) this.browserPromise = undefined; })).catch(() => {
        if (this.browserPromise === launched) this.browserPromise = undefined;
      });
    }
    return this.browserPromise;
  }

  private esc(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  private numberFormatter(_lang: Lang) {
    // Western digits (976876) in both languages, as requested.
    const locale = 'en-US';
    return (v: string, maxDigits = 4) => {
      const n = Number(v);
      const min = maxDigits === 0 ? 0 : 2;
      return new Intl.NumberFormat(locale, { minimumFractionDigits: min, maximumFractionDigits: maxDigits }).format(n);
    };
  }

  private logoDataUri(rel: string | null): string | null {
    if (!rel) return null;
    try {
      const file = path.join(uploadsRoot(), rel);
      const ext = path.extname(file).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
    } catch {
      return null;
    }
  }

  /** Cairo (Arabic + Latin) embedded as base64 so the document never depends on the network or server fonts. */
  private fontCss(): string {
    if (this.fontCssCache !== undefined) return this.fontCssCache;
    try {
      const dir = path.join(path.dirname(require.resolve('@fontsource/cairo/package.json')), 'files');
      const face = (file: string, weight: number, range: string) =>
        `@font-face{font-family:'Cairo';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${fs
          .readFileSync(path.join(dir, file))
          .toString('base64')}) format('woff2');unicode-range:${range};}`;
      this.fontCssCache = [
        face('cairo-arabic-400-normal.woff2', 400, AR_RANGE),
        face('cairo-latin-400-normal.woff2', 400, LATIN_RANGE),
        face('cairo-arabic-700-normal.woff2', 700, AR_RANGE),
        face('cairo-latin-700-normal.woff2', 700, LATIN_RANGE),
      ].join('\n');
    } catch (e) {
      this.logger.warn(`Cairo font not found (npm i @fontsource/cairo) - falling back to system fonts: ${(e as Error).message}`);
      this.fontCssCache = '';
    }
    return this.fontCssCache;
  }
}
