import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config/unifiedConfig.js';

export interface MailPayload {
  to: string;
  subject: string;
  text: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtp.host) return null;
  if (transporter) return transporter;
  transporter = createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user
      ? { user: config.smtp.user, pass: config.smtp.pass }
      : undefined,
  });
  return transporter;
}

export async function sendMail(payload: MailPayload): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.log(`[mail:dev] to=${payload.to} subject="${payload.subject}"\n${payload.text}`);
    return;
  }
  try {
    await tx.sendMail({
      from: config.smtp.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });
    // eslint-disable-next-line no-console
    console.log(`[mail:sent] to=${payload.to} subject="${payload.subject}"`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[mail:error] to=${payload.to}`, err);
    // Don't throw — auth flows keep working even if mail fails; OTP is also
    // returned as devOtp in non-prod, and the code is stored hashed in DB.
  }
}
