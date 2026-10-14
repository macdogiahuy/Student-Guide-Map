import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
  .max(72, 'Mật khẩu quá dài.')
  .regex(/[A-Za-z]/, 'Mật khẩu phải chứa chữ cái.')
  .regex(/[0-9]/, 'Mật khẩu phải chứa chữ số.');

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự.').max(80),
  email: z.string().email('Email không hợp lệ.').max(120).transform((v) => v.toLowerCase()),
  password,
  role: z.enum(['STUDENT', 'STORE_OWNER']).default('STUDENT'),
  storeName: z.string().min(2).max(120).optional(),
  phone: z.string().min(8).max(20).optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  code: z.string().length(6, 'Mã OTP gồm 6 chữ số.'),
});

export const resendOtpSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ.').transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  code: z.string().length(6, 'Mã OTP gồm 6 chữ số.'),
  newPassword: password,
});
