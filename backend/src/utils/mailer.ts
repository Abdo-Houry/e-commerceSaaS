import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD.replace(/\s+/g, '') } : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    // No SMTP configured (local development): print the email so flows stay testable.
    console.log(`\n📧 [mail not sent — SMTP_HOST empty]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await t.sendMail({ from: env.SMTP_FROM, to, subject, html, text });
}

export function passwordResetEmail(name: string, link: string) {
  const text = `مرحباً ${name}،\n\nلإعادة تعيين كلمة المرور افتح الرابط التالي (صالح لمدة ساعة):\n${link}\n\nإذا لم تطلب ذلك تجاهل هذه الرسالة.\n— متجري`;
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#1C1917">
  <p>مرحباً ${escapeHtml(name)}،</p>
  <p>لإعادة تعيين كلمة المرور اضغط الزر التالي (الرابط صالح لمدة ساعة):</p>
  <p><a href="${link}" style="display:inline-block;background:#047857;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none">إعادة تعيين كلمة المرور</a></p>
  <p style="color:#57534E;font-size:13px">إذا لم تطلب ذلك تجاهل هذه الرسالة.</p>
  <p>— متجري</p></div>`;
  return { subject: 'إعادة تعيين كلمة المرور — متجري', text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
