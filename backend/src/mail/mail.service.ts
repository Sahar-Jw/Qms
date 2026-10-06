import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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
}
