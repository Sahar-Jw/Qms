import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** What went wrong while sending, as a stable code the screen can explain (wrong app password, no connection, bad address, too big...). */
export function mailErrorCode(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; message?: string } | undefined;
  const code = err?.code ?? '';
  const text = `${err?.message ?? ''}`.toLowerCase();
  if (code === 'EAUTH' || err?.responseCode === 535 || text.includes('invalid login') || text.includes('username and password not accepted')) return 'MAIL_AUTH_FAILED';
  if (err?.responseCode === 552 || text.includes('message exceeds') || text.includes('too large')) return 'MAIL_TOO_LARGE';
  if (code === 'EENVELOPE' || (err?.responseCode !== undefined && err.responseCode >= 550 && err.responseCode <= 554) || text.includes('no recipients')) return 'MAIL_RECIPIENT_REJECTED';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'].includes(code) || text.includes('wrong version number')) return 'MAIL_CONNECTION_FAILED';
  return 'MAIL_SEND_FAILED';
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private get<T extends string>(k: string): string {
    return String(this.config.get<T>(k) ?? '').trim();
  }

  isConfigured() {
    return !!(this.get('MAIL_HOST') && this.get('MAIL_USER') && this.get('MAIL_PASS'));
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const secure = this.get('MAIL_SECURE') === 'true';
      const port = Number(this.get('MAIL_PORT')) || (secure ? 465 : 587);
      this.transporter = nodemailer.createTransport({
        host: this.get('MAIL_HOST'),
        port,
        secure, // true => 465 (implicit TLS); false => 587 (STARTTLS)
        auth: { user: this.get('MAIL_USER'), pass: this.get('MAIL_PASS') },
      });
    }
    return this.transporter;
  }

  async sendPasswordReset(to: string, name: string, link: string, minutes: number) {
    if (!this.isConfigured()) {
      this.log.warn('MAIL_HOST / MAIL_USER / MAIL_PASS are not set: password reset e-mail was not sent');
      if (process.env.NODE_ENV !== 'production') this.log.warn(`DEV ONLY reset link for ${to}: ${link}`);
      return;
    }
    const from = this.get('MAIL_FROM') || this.get('MAIL_USER');
    const n = esc(name);
    const btn = 'display:inline-block;background:#291C0E;color:#E1D4C2;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700';
    const html = `
<div style="font-family:Tahoma,Arial,sans-serif;max-width:520px;margin:auto;color:#291C0E">
  <div dir="rtl" style="text-align:right">
    <p>مرحباً ${n}،</p>
    <p>وصلنا طلب لإعادة تعيين كلمة المرور. اضغط الزر أدناه (الرابط صالح لمدة ${minutes} دقيقة):</p>
    <p style="text-align:center"><a href="${link}" style="${btn}">إعادة تعيين كلمة المرور</a></p>
    <p style="font-size:12px;color:#6E473B">إذا لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغير شيء.</p>
  </div>
  <hr style="border:none;border-top:1px solid #BEB5A9;margin:20px 0">
  <div dir="ltr" style="text-align:left">
    <p>Hello ${n},</p>
    <p>We received a request to reset your password. Click the button below (valid for ${minutes} minutes):</p>
    <p style="text-align:center"><a href="${link}" style="${btn}">Reset password</a></p>
    <p style="font-size:12px;color:#6E473B">If you did not ask for this, ignore this e-mail and nothing will change.</p>
  </div>
</div>`;
    const text = `${link}\n\nيعمل الرابط ${minutes} دقيقة / valid for ${minutes} minutes.`;
    await this.getTransporter().sendMail({
      from,
      to,
      subject: 'إعادة تعيين كلمة المرور · Reset your password',
      text,
      html,
    });
  }

  /** A quotation PDF to a customer, from the company's mail account (Gmail: smtp.gmail.com + an app password). */
  async sendQuotation(o: { to: string; subject: string; message: string; lang: 'ar' | 'en'; filename: string; pdf: Buffer; replyTo?: string }) {
    const from = this.get('MAIL_FROM') || this.get('MAIL_USER');
    const rtl = o.lang === 'ar';
    const body = esc(o.message).replace(/\r?\n/g, '<br>');
    const html = `<div dir="${rtl ? 'rtl' : 'ltr'}" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;color:#291C0E;text-align:${rtl ? 'right' : 'left'}">${body}</div>`;
    await this.getTransporter().sendMail({
      from,
      to: o.to,
      replyTo: o.replyTo,
      subject: o.subject,
      text: o.message,
      html,
      attachments: [{ filename: o.filename, content: o.pdf, contentType: 'application/pdf' }],
    });
  }
}
