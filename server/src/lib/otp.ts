import crypto from 'node:crypto';
import { config } from '../config/unifiedConfig.js';
import { prisma } from './prisma.js';
import { sendMail } from './mailer.js';

export function generateOtp(): string {
  const max = 10 ** config.auth.otpLength;
  return String(crypto.randomInt(0, max)).padStart(config.auth.otpLength, '0');
}

function hash(code: string): string {
  return crypto.createHash('sha256').update(`${code}:${config.auth.jwtSecret}`).digest('hex');
}

export async function issueOtp(email: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD') {
  // invalidate previous codes of same purpose
  await prisma.otpToken.updateMany({
    where: { email, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  const code = generateOtp();
  await prisma.otpToken.create({
    data: {
      email,
      purpose,
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + config.auth.otpTtlMinutes * 60_000),
    },
  });
  await sendMail({
    to: email,
    subject:
      purpose === 'VERIFY_EMAIL'
        ? '[Student Guide Map] Mã xác thực tài khoản'
        : '[Student Guide Map] Mã đặt lại mật khẩu',
    text: `Mã của bạn là ${code}. Mã có hiệu lực trong ${config.auth.otpTtlMinutes} phút.`,
  });
  return code;
}

export async function verifyOtp(
  email: string,
  purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  code: string,
): Promise<boolean> {
  const token = await prisma.otpToken.findFirst({
    where: { email, purpose, consumedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!token) return false;
  const match = token.codeHash === hash(code);
  if (match) {
    await prisma.otpToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
  }
  return match;
}
