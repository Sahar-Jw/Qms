import { Injectable, InternalServerErrorException, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, rgb, StandardFonts, type PDFImage, type PDFPage } from 'pdf-lib';
import { CurrencyAmounts } from '../calc/calc.types';
import { Lang } from '../common/enums';
import { uploadsRoot } from '../config/uploads';
import { MaterialCatalogFile } from '../materials/material.entity';
import { ItemView, QuotationView } from '../quotations/quotation-view';
import { TranslationsService } from '../translations/translations.service';

export interface PrintOptions {
  lang: Lang;
  includeCost: boolean;
  autoPrint?: boolean;
  /** Print page: also add the catalog index and the catalog pages after the quotation (default true). */
  includeCatalog?: boolean;
  /** PDF engines: the company header / footer pictures are NOT drawn by the HTML, they are stamped on every page afterwards. */
  stamp?: boolean;
}

/**
 * Page geometry in millimetres - the ONE place that decides where the company header / footer pictures sit and how much room
 * they take. The browser-side PDF (frontend lib/client-pdf.ts) reads these numbers from the data-* attributes of <html>.
 */
export const PAGE = {
  side: 10, // left / right margin
  headTop: 5, headMax: 13, headBand: 21, // header picture: 5 mm from the top edge, at most 13 mm tall, content starts 21 mm from the top
  footBottom: 7, footMax: 10, footBand: 19, // footer picture: 7 mm above the bottom edge, at most 10 mm tall, content ends 19 mm from the bottom
  plainTop: 12, plainBottom: 14, // margins when there is no header / footer picture
  numberY: 3, // page number baseline, mm from the bottom edge (below the footer picture)
} as const;

const MM = 72 / 25.4; // PDF points per millimetre
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const CATALOG_PATH = /^materials\/catalog-[a-f0-9]{32}\.(png|jpg|webp|pdf|docx)$/;

const T = {
  ar: {
    title: 'عرض سعر', number: 'رقم العرض', date: 'التاريخ', to: 'السادة', attn: 'عناية', phone: 'هاتف', email: 'البريد',
    validity: 'مدة صلاحية العرض', deliveryTime: 'مدة التسليم', oneDayRemaining: 'متبقي يوم واحد', daysRemaining: 'متبقي {days} يوم', expired: 'منتهي الصلاحية', paymentMethod: 'طريقة الدفع', paymentLocation: 'مكان الدفع',
    deliveryMethod: 'طريقة التسليم', bank: 'المصرف', customerPayment: 'نظام الدفع', responsible: 'المسؤول',
    no: '#', code: 'الرمز', desc: 'البيان', qty: 'الكمية', unit: 'الوحدة', unitPrice: 'سعر الوحدة', value: 'القيمة',
    shipping: 'الشحن', customs: 'التخليص الجمركي', required: 'المطلوب', cost: 'التكلفة', totals: 'الإجماليات حسب العملة',
    currency: 'العملة', link: 'الرابط', print: 'طباعة', page: 'صفحة',
    catalogTitle: 'الكتالوجات المرفقة', catalogEyebrow: 'ملف الكتالوج', catalogMaterial: 'المادة', catalogFile: 'الملف', catalogType: 'النوع',
    catalogPdfNote: 'ملفات PDF المرفقة تُضاف إلى ملف PDF المُحمَّل فقط، ولا تظهر في الطباعة من المتصفح.',
  },
  en: {
    title: 'Quotation', number: 'Quotation No.', date: 'Date', to: 'To', attn: 'Attn', phone: 'Phone', email: 'Email',
    validity: 'Validity', deliveryTime: 'Delivery time', oneDayRemaining: '1 day remaining', daysRemaining: '{days} days remaining', expired: 'Expired', paymentMethod: 'Payment method', paymentLocation: 'Payment location',
    deliveryMethod: 'Delivery method', bank: 'Bank', customerPayment: 'Payment terms', responsible: 'Prepared by',
    no: '#', code: 'Code', desc: 'Description', qty: 'Qty', unit: 'Unit', unitPrice: 'Unit price', value: 'Value',
    shipping: 'Shipping', customs: 'Customs', required: 'Required', cost: 'Cost', totals: 'Totals by currency',
    currency: 'Currency', link: 'Link', print: 'Print', page: 'Page',
    catalogTitle: 'Attached catalogs', catalogEyebrow: 'Material catalog', catalogMaterial: 'Material', catalogFile: 'File', catalogType: 'Type',
    catalogPdfNote: 'Attached PDF files are added to the downloaded PDF only; they do not appear when printing from the browser.',
  },
} as const;

type Labels = Record<keyof (typeof T)['ar'], string>;
type CatalogEntry = { file: MaterialCatalogFile; material: string };
type CompanyPngs = { header?: Buffer; footer?: Buffer };

const AR_RANGE = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';
const LATIN_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browserPromise?: Promise<import('puppeteer').Browser>;
  private fontCssCache?: string;

  constructor(private readonly config: ConfigService, private readonly translations: TranslationsService) {}

  /** The printed words for one language: the built-in text unless a manager edited it in Settings > Texts (keys `pdf.*`). */
  private async labels(lang: Lang): Promise<Labels> {
    const out: Record<string, string> = { ...T[lang] };
    try {
      const edited = await this.translations.map();
      for (const k of Object.keys(out)) {
        const v = edited[`pdf.${k}`]?.[lang];
        if (v) out[k] = v;
      }
    } catch (e) {
      this.logger.warn(`Could not load edited print texts: ${(e as Error).message}`);
    }
    return out as Labels;
  }

  /** Only plain http(s) links are printed (never javascript:, data: ...). */
  private safeLink(link: string | null | undefined): string | null {
    const v = (link ?? '').trim();
    return /^https?:\/\/[^\s<>"']+$/i.test(v) ? v : null;
  }

  // ------------------------------------------------------------------ catalog files (appended after the quotation)

  /** Every catalog file of the quotation's materials, once each, in the order of the items. */
  private catalogEntries(q: QuotationView): CatalogEntry[] {
    const seen = new Set<string>();
    const files: CatalogEntry[] = [];
    for (const item of q.items) {
      for (const file of item.catalogFiles ?? []) {
        if (seen.has(file.id)) continue;
        seen.add(file.id);
        files.push({ file, material: `${item.materialCode}${item.materialName ? ` - ${item.materialName}` : ''}` });
      }
    }
    return files;
  }

  private async readCatalogFile(file: MaterialCatalogFile): Promise<Buffer> {
    if (!CATALOG_PATH.test(file.path)) {
      throw new InternalServerErrorException({ code: 'INVALID_CATALOG_FILE', message: 'A catalog file has an invalid stored path' });
    }
    try {
      return await fs.promises.readFile(path.join(uploadsRoot(), file.path));
    } catch (error) {
      this.logger.error(`Could not read quotation catalog file ${file.path}: ${(error as Error).message}`);
      throw new InternalServerErrorException({ code: 'CATALOG_FILE_UNAVAILABLE', message: 'A catalog file could not be loaded for printing' });
    }
  }

  private async catalogContentHtml(file: MaterialCatalogFile, bytes: Buffer): Promise<string> {
    if (file.mimeType === DOCX_MIME) {
      const result = await mammoth.convertToHtml({ buffer: bytes }, {
        convertImage: mammoth.images.imgElement(async (image) => ({
          src: `data:${image.contentType};base64,${await image.read('base64')}`,
        })),
      });
      return this.sanitizeDocxHtml(result.value);
    }
    return `<img class="catalog-image" src="data:${file.mimeType};base64,${bytes.toString('base64')}" alt="">`;
  }

  /**
   * Word files become plain HTML. Only basic text / table tags survive (no scripts, links, styles or event attributes),
   * and every text block gets dir="auto" so Arabic paragraphs run right-to-left and English ones left-to-right.
   */
  private sanitizeDocxHtml(html: string): string {
    return html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<\/?a\b[^>]*>/gi, '')
      .replace(/<\/?(?!(?:p|h[1-6]|table|thead|tbody|tr|td|th|br|strong|em|b|i|u|ul|ol|li|img)\b)[a-z][^>]*>/gi, '')
      .replace(/<(\/?)(p|h[1-6]|table|thead|tbody|tr|td|th|br|strong|em|b|i|u|ul|ol|li)\b[^>]*>/gi, (_tag, slash: string, name: string) => {
        const block = /^(p|h[1-6]|td|th|li)$/i.test(name);
        return !slash && block ? `<${name} dir="auto">` : `<${slash}${name}>`;
      })
      .replace(/<img\b([^>]*)>/gi, (_tag, attrs: string) => {
        const src = attrs.match(/\bsrc=["'](data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+)["']/i)?.[1];
        return src ? `<img class="catalog-image" src="${src}" alt="">` : '';
      });
  }

  private kindLabel(file: MaterialCatalogFile): string {
    return file.mimeType === 'application/pdf' ? 'PDF' : file.mimeType === DOCX_MIME ? 'Word' : 'Image';
  }

  /** The list of attached catalog files (one page of the appendix). */
  private catalogIndexHtml(entries: CatalogEntry[], t: Labels, withPdfNote: boolean): string {
    const rows = entries
      .map(({ file, material }, i) => `<tr><td class="c">${i + 1}</td><td><bdi dir="auto">${this.esc(material)}</bdi></td><td><bdi dir="auto">${this.esc(file.name)}</bdi></td><td class="c">${this.kindLabel(file)}</td></tr>`)
      .join('');
    return `<section class="catalog-index">
  <h2 class="catalog-title">${this.esc(t.catalogTitle)}</h2>
  <table class="plain"><thead><tr><th>${t.no}</th><th>${this.esc(t.catalogMaterial)}</th><th>${this.esc(t.catalogFile)}</th><th>${this.esc(t.catalogType)}</th></tr></thead><tbody>${rows}</tbody></table>
  ${withPdfNote ? `<p class="note pdf-note">${this.esc(t.catalogPdfNote)}</p>` : ''}
</section>`;
  }

  /** One Word / picture catalog file: its own page(s), headed by the material and the file name. */
  private async catalogPageHtml({ file, material }: CatalogEntry, bytes: Buffer, t: Labels): Promise<string> {
    const content = await this.catalogContentHtml(file, bytes);
    return `<section class="catalog-page">
  <header class="catalog-heading"><p class="eyebrow">${this.esc(t.catalogEyebrow)}</p><h2><bdi dir="auto">${this.esc(material)}</bdi></h2><p class="catalog-file"><bdi dir="auto">${this.esc(file.name)}</bdi></p></header>
  <div class="catalog-document">${content}</div>
</section>`;
  }

  // ------------------------------------------------------------------ page shell (shared by the quotation and every catalog part)

  private geometry(hasHead: boolean, hasFoot: boolean) {
    return { top: hasHead ? PAGE.headBand : PAGE.plainTop, bottom: hasFoot ? PAGE.footBand : PAGE.plainBottom };
  }

  /**
   * A complete A4 document. The page margin is 0 and every page keeps free room for the company header / footer through a table
   * whose head and foot are empty spacers (browsers repeat them on every printed page), while the header / footer pictures are
   * pinned to the very top / bottom edge of every page (position: fixed repeats on every printed page too).
   * Nothing the user writes can push them away or overlap them.
   */
  private shell(
    content: string,
    o: { lang: Lang; title: string; headerImg: string | null; footerImg: string | null; headBand?: boolean; footBand?: boolean; stamp?: boolean; bar?: string; script?: string },
  ): string {
    const rtl = o.lang === 'ar';
    const g = this.geometry(o.headBand ?? !!o.headerImg, o.footBand ?? !!o.footerImg);
    return `<!doctype html>
<html lang="${o.lang}" dir="${rtl ? 'rtl' : 'ltr'}" class="${o.stamp ? 'stamp' : ''}" data-top="${g.top}" data-bottom="${g.bottom}" data-side="${PAGE.side}" data-head-top="${PAGE.headTop}" data-head-max="${PAGE.headMax}" data-foot-bottom="${PAGE.footBottom}" data-foot-max="${PAGE.footMax}" data-number-y="${PAGE.numberY}">
<head>
<meta charset="utf-8">
<title>${this.esc(o.title)}</title>
<style>
${this.fontCss()}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; }
body { direction: ${rtl ? 'rtl' : 'ltr'}; font-family: 'Cairo', Tahoma, Arial, sans-serif; font-size: 11px; color: #111; line-height: 1.55; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
/* page frame: free room at the top / bottom of every page + the company pictures pinned to the page edges */
table.pg { width: 100%; border-collapse: collapse; }
table.pg > thead > tr > td, table.pg > tfoot > tr > td { border: 0; padding: 0; }
table.pg > tbody > tr > td.pgbody { border: 0; padding: 0 ${PAGE.side}mm; vertical-align: top; }
table.pg > thead > tr, table.pg > tbody > tr, table.pg > tfoot > tr { break-inside: auto; page-break-inside: auto; }
.hs { height: ${g.top}mm; } .fs { height: ${g.bottom}mm; }
img.cohead { position: fixed; z-index: 2; top: ${PAGE.headTop}mm; left: ${PAGE.side}mm; width: calc(100% - ${PAGE.side * 2}mm); height: ${PAGE.headMax}mm; object-fit: contain; }
img.cofoot { position: fixed; z-index: 2; bottom: ${PAGE.footBottom}mm; left: ${PAGE.side}mm; width: calc(100% - ${PAGE.side * 2}mm); height: ${PAGE.footMax}mm; object-fit: contain; }
html.stamp img.cohead, html.stamp img.cofoot { display: none; }
/* quotation */
.head { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #1f3a5f; padding-bottom: 8px; margin-bottom: 10px; }
.head img { max-height: 70px; max-width: 150px; object-fit: contain; }
.head .co { flex: 1; }
.head .co .nm { font-size: 18px; font-weight: 700; color: #1f3a5f; }
.head .co .sub { color: #444; font-size: 10px; }
.title { text-align: center; font-size: 20px; font-weight: 700; color: #1f3a5f; margin: 2px 0 10px; letter-spacing: ${rtl ? 'normal' : '0.2px'}; }
.meta { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.box { border: 1px solid #c9d1dc; border-radius: 4px; padding: 6px 10px; flex: 1; }
.box .row { margin: 1px 0; }
.k { color: #555; }
.terms { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; border: 1px solid #c9d1dc; border-radius: 4px; padding: 6px 10px; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; }
th { background: #e9eef5; color: #1f3a5f; font-weight: 700; padding: 5px 4px; border: 1px solid #c9d1dc; text-align: center; font-size: 10px; } /* light header: saves ink */
td { border: 1px solid #c9d1dc; padding: 4px; vertical-align: top; }
table.items tbody tr:nth-child(even) td { background: #f6f8fb; }
tr { page-break-inside: avoid; break-inside: avoid; }
td.c { text-align: center; }
td.n { text-align: end; white-space: nowrap; }
td.desc { width: 22%; }
td.link-cell { width: 16%; overflow-wrap: anywhere; word-break: break-all; }
.material-name { display: block; text-align: start; unicode-bidi: plaintext; }
.b { font-weight: 700; }
.lnk { display: block; margin-top: 2px; font-size: 9px; color: #1f3a5f; text-decoration: underline; overflow-wrap: anywhere; word-break: break-all; }
.dim { color: #999; }
h3 { margin: 14px 0 4px; font-size: 12px; color: #1f3a5f; }
.totals { width: 62%; margin-inline-start: auto; break-inside: avoid; }
.totals td { background: #f6f8fb; }
.bar { text-align: center; margin: 10px 0; }
.bar button { font-family: inherit; padding: 6px 18px; font-size: 13px; cursor: pointer; }
@media print { .bar { display: none; } }
/* catalog appendix */
.catalog-index, .catalog-page { break-before: page; page-break-before: always; }
.catalog-title { font-size: 16px; color: #1f3a5f; margin: 0 0 4mm; padding-bottom: 3mm; border-bottom: 2px solid #1f3a5f; }
table.plain td, table.plain th { font-size: 10.5px; }
.note { color: #667085; font-size: 9.5px; margin: 4mm 0 0; }
.catalog-heading { border-bottom: 1px solid #d7dee8; padding-bottom: 3mm; margin-bottom: 5mm; }
.catalog-heading .eyebrow { color: #718096; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 1.5mm; }
.catalog-heading h2 { font-size: 15px; line-height: 1.3; color: #1f3a5f; margin: 0 0 1.5mm; overflow-wrap: anywhere; }
.catalog-file { color: #667085; font-size: 9px; margin: 0; overflow-wrap: anywhere; }
.catalog-document { overflow-wrap: anywhere; color: #202a36; font-size: 11.5px; }
.catalog-document p { margin: 0 0 3mm; }
.catalog-document h1, .catalog-document h2, .catalog-document h3 { color: #1f3a5f; break-after: avoid; page-break-after: avoid; }
.catalog-document table { border-collapse: collapse; max-width: 100%; font-size: 10px; margin: 2mm 0; }
.catalog-document td, .catalog-document th { border: 1px solid #d7dee8; padding: 4px 6px; background: none; color: inherit; font-weight: 400; text-align: start; }
.catalog-image { display: block; width: auto; height: auto; max-width: 100%; max-height: 195mm; margin: 4mm auto; object-fit: contain; }
.pdf-slot { height: 0; overflow: hidden; }
/* the browser-side PDF builder lays the page out itself: the frame turns into plain blocks and the pictures are stamped afterwards */
html.client table.pg, html.client table.pg > tbody, html.client table.pg > tbody > tr, html.client table.pg > tbody > tr > td.pgbody { display: block; width: auto; padding: 0; border: 0; }
html.client table.pg > thead, html.client table.pg > tfoot, html.client img.cohead, html.client img.cofoot { display: none; }
</style>
</head>
<body>
${o.headerImg ? `<img class="cohead" src="${o.headerImg}" alt="">` : ''}
${o.footerImg ? `<img class="cofoot" src="${o.footerImg}" alt="">` : ''}
<table class="pg"><thead><tr><td><div class="hs"></div></td></tr></thead><tfoot><tr><td><div class="fs"></div></td></tr></tfoot><tbody><tr><td class="pgbody">
${o.bar ?? ''}
${content}
</td></tr></tbody></table>
${o.script ?? ''}
</body>
</html>`;
  }

  // ------------------------------------------------------------------ public API

  /** Self-contained print-ready HTML (fonts + pictures inlined). Works everywhere - open it and use the browser's "Save as PDF". */
  async renderHtml(q: QuotationView, opts: PrintOptions): Promise<string> {
    const t = await this.labels(opts.lang);
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

    const co = q.company;
    const cu = q.customer;
    const logo = this.logoDataUri(co.logo);
    const coName = co.name ?? '';
    const coAddr = co.address ?? '';
    // Header / footer pictures of the company: the same in every language (none -> the text letterhead / nothing is printed).
    const headerImg = this.logoDataUri(co.headerImage);
    const footerImg = this.logoDataUri(co.footerImage);

    const entries = opts.includeCatalog === false ? [] : this.catalogEntries(q);
    let catalogHtml = '';
    if (entries.length) {
      const parts = [this.catalogIndexHtml(entries, t, entries.some((e) => e.file.mimeType === 'application/pdf'))];
      for (const entry of entries) {
        if (entry.file.mimeType === 'application/pdf') {
          await this.readCatalogFile(entry.file); // fail early when the stored file is missing
          parts.push(`<div class="pdf-slot" data-pdf-name="${this.esc(entry.file.name)}"></div>`); // the browser PDF puts the real pages here
        } else {
          parts.push(await this.catalogPageHtml(entry, await this.readCatalogFile(entry.file), t));
        }
      }
      catalogHtml = parts.join('\n');
    }

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
        const itemName = i.materialName?.trim();
        const materialLink = this.safeLink(i.materialLink);
        return `<tr>
          <td class="c">${nf(String(idx + 1), 0)}</td>
          <td dir="ltr" style="white-space:nowrap">${this.esc(i.materialCode)}</td>
          <td class="desc">${itemName ? `<div class="material-name"><bdi dir="auto">${this.esc(itemName)}</bdi></div>` : ''}</td>
          <td class="link-cell">${materialLink ? `<a class="lnk" dir="ltr" href="${this.esc(materialLink)}">${this.esc(materialLink)}</a>` : ''}</td>
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
    const content = `${headerImg
      ? ''
      : `<div class="head">
  ${logo ? `<img src="${logo}" alt="">` : ''}
  <div class="co">
    <div class="nm">${this.esc(coName)}</div>
    <div class="sub"><bdi dir="auto">${this.esc(coAddr ?? '')}</bdi></div>
    <div class="sub">${contact}</div>
  </div>
</div>`}
<div class="title" dir="${rtl ? 'rtl' : 'ltr'}">${this.esc(t.title)}</div>
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
<table class="items">
  <thead><tr>
    <th>${t.no}</th><th>${t.code}</th><th>${t.desc}</th><th>${t.link}</th><th>${t.qty}</th><th>${t.unit}</th><th>${t.unitPrice}</th>
    <th>${t.value}</th><th>${t.shipping}</th><th>${t.customs}</th><th>${t.required}</th>${opts.includeCost ? `<th>${t.cost}</th>` : ''}
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<h3>${this.esc(t.totals)}</h3>
<table class="totals">
  <thead><tr><th>${t.currency}</th><th>${t.value}</th><th>${t.shipping}</th><th>${t.customs}</th><th>${t.required}</th>${opts.includeCost ? `<th>${t.cost}</th>` : ''}</tr></thead>
  <tbody>${totalsRows}</tbody>
</table>
${catalogHtml}`;

    return this.shell(content, {
      lang: opts.lang, title: q.quotationNumber, headerImg, footerImg, stamp: opts.stamp,
      bar: `<div class="bar"><button onclick="window.print()">${this.esc(t.print)}</button></div>`,
      script: opts.autoPrint ? '<script>window.addEventListener("load",function(){document.fonts.ready.then(function(){requestAnimationFrame(function(){requestAnimationFrame(function(){window.print()})})})})</script>' : '',
    });
  }

  async renderPdf(q: QuotationView, opts: PrintOptions): Promise<Buffer> {
    const t = await this.labels(opts.lang);
    const entries = this.catalogEntries(q);
    // the quotation itself (no catalog); the company pictures are stamped on every page below
    const html = await this.renderHtml(q, { ...opts, autoPrint: false, includeCatalog: false, stamp: true });
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
      const pdfOf = async (doc: string) => {
        await page.setContent(doc.replace(/<div class="bar">[\s\S]*?<\/div>/, ''), { waitUntil: 'load' });
        await page.evaluate('document.fonts.ready');
        return PDFDocument.load(await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }));
      };

      const output = await pdfOf(html); // the page now shows the quotation: the company pictures are read from it
      const images = await this.companyPngs(page, q);
      const head = images.header ? await output.embedPng(images.header) : undefined;
      const foot = images.footer ? await output.embedPng(images.footer) : undefined;

      const hasHead = !!head;
      const hasFoot = !!foot;
      const shellFor = (content: string) => this.shell(content, {
        lang: opts.lang, title: q.quotationNumber, stamp: true, headerImg: null, footerImg: null, headBand: hasHead, footBand: hasFoot,
      });

      // catalog: a list of the attached files, then each file (Word / pictures become pages, PDFs are placed as they are)
      if (entries.length) {
        const copy = async (doc: PDFDocument) => (await output.copyPages(doc, doc.getPageIndices())).forEach((p) => output.addPage(p));
        await copy(await pdfOf(shellFor(this.catalogIndexHtml(entries, t, false))));
        for (const entry of entries) {
          const bytes = await this.readCatalogFile(entry.file);
          if (entry.file.mimeType === 'application/pdf') await this.appendCatalogPdf(output, bytes, head, foot);
          else await copy(await pdfOf(shellFor(await this.catalogPageHtml(entry, bytes, t))));
        }
      }

      const font = await output.embedFont(StandardFonts.Helvetica);
      const pages = output.getPages();
      pages.forEach((p, index) => {
        this.stampBranding(p, head, foot);
        const { width } = p.getSize();
        const label = `${index + 1} / ${pages.length}`;
        p.drawText(label, { x: width / 2 - font.widthOfTextAtSize(label, 8) / 2, y: PAGE.numberY * MM, size: 8, font, color: rgb(0.4, 0.44, 0.5) });
      });
      return Buffer.from(await output.save());
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  /** The company header / footer pictures as PNG (any upload format becomes PNG through the browser's canvas). */
  private async companyPngs(page: { evaluate: (script: string) => Promise<unknown> }, q: QuotationView): Promise<CompanyPngs> {
    const result: unknown = await page.evaluate(`(() => {
      const toPng = (selector) => {
        const image = document.querySelector(selector);
        if (!image) return null;
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas.toDataURL('image/png');
      };
      return { header: toPng('img.cohead'), footer: toPng('img.cofoot') };
    })()`);
    const r = result as { header?: unknown; footer?: unknown } | null;
    const wantHead = !!this.logoDataUri(q.company.headerImage);
    const wantFoot = !!this.logoDataUri(q.company.footerImage);
    if (!r || typeof r !== 'object' || (wantHead && typeof r.header !== 'string') || (wantFoot && typeof r.footer !== 'string')) {
      throw new InternalServerErrorException('Could not prepare company header/footer images for the PDF');
    }
    const png = (v: unknown) => (typeof v === 'string' ? Buffer.from(v.split(',')[1], 'base64') : undefined);
    return { header: png(r.header), footer: png(r.footer) };
  }

  /** Draws the company header (top edge) and footer (bottom edge) on one page, exactly where the HTML pages have them. */
  private stampBranding(page: PDFPage, head?: PDFImage, foot?: PDFImage): void {
    const { width, height } = page.getSize();
    const boxW = width - PAGE.side * 2 * MM;
    const place = (img: PDFImage, boxBottom: number, boxH: number) => {
      const s = Math.min(boxW / img.width, boxH / img.height);
      page.drawImage(img, { x: (width - img.width * s) / 2, y: boxBottom + (boxH - img.height * s) / 2, width: img.width * s, height: img.height * s });
    };
    if (head) place(head, height - (PAGE.headTop + PAGE.headMax) * MM, PAGE.headMax * MM);
    if (foot) place(foot, PAGE.footBottom * MM, PAGE.footMax * MM);
  }

  /** A catalog PDF: every page is scaled to fit between the company header and footer. */
  private async appendCatalogPdf(output: PDFDocument, bytes: Buffer, head?: PDFImage, foot?: PDFImage): Promise<void> {
    let source: PDFDocument;
    try {
      source = await PDFDocument.load(bytes);
    } catch {
      throw new InternalServerErrorException({ code: 'INVALID_CATALOG_FILE', message: 'A catalog PDF could not be read' });
    }
    const g = this.geometry(!!head, !!foot);
    for (const sourcePage of source.getPages()) {
      const { width, height } = sourcePage.getSize();
      const page = output.addPage([595.28, 841.89]);
      if (!sourcePage.node.Contents()) continue; // blank page
      const embedded = await output.embedPage(sourcePage);
      const boxW = page.getWidth() - PAGE.side * 2 * MM;
      const boxH = page.getHeight() - (g.top + g.bottom) * MM;
      const s = Math.min(boxW / width, boxH / height);
      page.drawPage(embedded, {
        x: (page.getWidth() - width * s) / 2,
        y: g.bottom * MM + (boxH - height * s) / 2,
        width: width * s,
        height: height * s,
      });
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
