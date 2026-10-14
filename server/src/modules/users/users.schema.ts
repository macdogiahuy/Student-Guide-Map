import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  phone: z.string().min(8).max(20).nullable().optional(),
  storeName: z.string().min(2).max(120).nullable().optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
    .regex(/[A-Za-z]/, 'Mật khẩu phải chứa chữ cái.')
    .regex(/[0-9]/, 'Mật khẩu phải chứa chữ số.'),
});
