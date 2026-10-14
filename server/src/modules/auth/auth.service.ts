import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { config } from '../../config/unifiedConfig.js';
import { AppError } from '../../lib/errors.js';
import { issueOtp, verifyOtp } from '../../lib/otp.js';
import { prisma } from '../../lib/prisma.js';
import type { AuthUser } from '../../types/index.js';
import { signAccessToken } from '../../middleware/auth.js';
import { userRepository } from './auth.repository.js';
import type {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from './auth.schema.js';
import type { z } from 'zod';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
type ForgotInput = z.infer<typeof forgotPasswordSchema>;
type ResetInput = z.infer<typeof resetPasswordSchema>;

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: User['role'];
  status: User['status'];
  avatarUrl: string | null;
  storeName: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    avatarUrl: u.avatarUrl,
    storeName: u.storeName,
    emailVerifiedAt: u.emailVerifiedAt,
    createdAt: u.createdAt,
  };
}

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: PublicUser; devOtp?: string }> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict('Email đã được đăng ký.');
    if (input.role === 'STORE_OWNER' && !input.storeName) {
      throw AppError.badRequest('Vui lòng nhập tên cửa hàng.', ['storeName: Bắt buộc']);
    }
    const passwordHash = await bcrypt.hash(input.password, config.auth.bcryptRounds);
    const user = await userRepository.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: input.role,
      storeName: input.role === 'STORE_OWNER' ? input.storeName : undefined,
      ...(config.auth.requireEmailOtp
        ? {}
        : { status: 'ACTIVE' as const, emailVerifiedAt: new Date() }),
    });
    if (!config.auth.requireEmailOtp) {
      return { user: toPublicUser(user) };
    }
    const code = await issueOtp(user.email, 'VERIFY_EMAIL');
    // In dev (no SMTP), return the OTP so the frontend can show it directly.
    const devOtp = config.smtp.host ? undefined : code;
    return { user: toPublicUser(user), devOtp };
  }

  async verifyEmail(input: VerifyOtpInput): Promise<PublicUser> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw AppError.notFound('Tài khoản không tồn tại.');
    if (user.status === 'ACTIVE') return toPublicUser(user);
    const ok = await verifyOtp(input.email, 'VERIFY_EMAIL', input.code);
    if (!ok) throw AppError.badRequest('Mã OTP không đúng hoặc đã hết hạn.');
    const updated = await userRepository.update(user.id, {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    return toPublicUser(updated);
  }

  async resendOtp(input: ForgotInput): Promise<{ devOtp?: string }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw AppError.notFound('Tài khoản không tồn tại.');
    if (user.status === 'ACTIVE') throw AppError.badRequest('Tài khoản đã được xác thực.');
    const code = await issueOtp(input.email, 'VERIFY_EMAIL');
    const devOtp = config.smtp.host ? undefined : code;
    return { devOtp };
  }

  async login(
    input: LoginInput,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: PublicUser }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw AppError.unauthorized('Email hoặc mật khẩu không đúng.');
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw AppError.unauthorized('Email hoặc mật khẩu không đúng.');
    if (user.status === 'PENDING_VERIFICATION') {
      throw AppError.forbidden('Tài khoản chưa được xác thực. Vui lòng nhập mã OTP đã gửi qua email.');
    }
    if (user.status === 'SUSPENDED') {
      throw AppError.forbidden('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }
    const { accessToken, refreshToken } = await this.issueTokens(
      { id: user.id, email: user.email, role: user.role },
      userAgent,
    );
    return { accessToken, refreshToken, user: toPublicUser(user) };
  }

  private async issueTokens(authUser: AuthUser, userAgent?: string) {
    const accessToken = signAccessToken(authUser);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    await userRepository.createRefreshToken({
      userId: authUser.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
      userAgent,
    });
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const record = await userRepository.findRefreshToken(sha256(refreshToken));
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw AppError.unauthorized('Phiên đăng nhập không hợp lệ.');
    }
    // rotate
    await userRepository.revokeRefreshToken(record.id);
    const { accessToken, refreshToken: next } = await this.issueTokens({
      id: record.user.id,
      email: record.user.email,
      role: record.user.role,
    });
    return { accessToken, refreshToken: next };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const record = await userRepository.findRefreshToken(sha256(refreshToken));
    if (record) await userRepository.revokeRefreshToken(record.id);
  }

  async forgotPassword(input: ForgotInput): Promise<void> {
    const user = await userRepository.findByEmail(input.email);
    // do not leak account existence — still issue a code only when account exists
    if (!user) return;
    await issueOtp(input.email, 'RESET_PASSWORD');
  }

  async resetPassword(input: ResetInput): Promise<void> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw AppError.notFound('Tài khoản không tồn tại.');
    const ok = await verifyOtp(input.email, 'RESET_PASSWORD', input.code);
    if (!ok) throw AppError.badRequest('Mã OTP không đúng hoặc đã hết hạn.');
    const passwordHash = await bcrypt.hash(input.newPassword, config.auth.bcryptRounds);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('Không tìm thấy tài khoản.');
    return toPublicUser(user);
  }
}

export const authService = new AuthService();

export function signRefreshJwt(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.auth.jwtRefreshSecret, {
    expiresIn: '7d',
  });
}
