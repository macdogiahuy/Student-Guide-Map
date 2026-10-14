import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { AppError } from '../../lib/errors.js';
import { config } from '../../config/unifiedConfig.js';
import { userRepository } from '../auth/auth.repository.js';
import { toPublicUser } from '../auth/auth.service.js';
import type { changePasswordSchema, updateProfileSchema } from './users.schema.js';
import type { z } from 'zod';

export class UsersController extends BaseController {
  updateMe = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const input = req.body as z.infer<typeof updateProfileSchema>;
      const user = await userRepository.findById(req.user!.id);
      if (!user) throw AppError.notFound('Không tìm thấy tài khoản.');
      if (user.role === 'STORE_OWNER' && input.storeName === null) {
        throw AppError.badRequest('Chủ cửa hàng phải có tên cửa hàng.');
      }
      const updated = await userRepository.update(user.id, {
        fullName: input.fullName,
        phone: input.phone,
        storeName: input.storeName,
        avatarUrl: input.avatarUrl,
      });
      this.success(res, toPublicUser(updated), 'Đã cập nhật hồ sơ.');
    } catch (e) {
      this.error(res, e, 'updateMe');
    }
  });

  changePassword = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const input = req.body as z.infer<typeof changePasswordSchema>;
      const user = await userRepository.findById(req.user!.id);
      if (!user) throw AppError.notFound('Không tìm thấy tài khoản.');
      const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!ok) throw AppError.badRequest('Mật khẩu hiện tại không đúng.');
      const passwordHash = await bcrypt.hash(input.newPassword, config.auth.bcryptRounds);
      await userRepository.update(user.id, { passwordHash });
      await userRepository.revokeAllRefreshTokens(user.id);
      this.success(res, null, 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
    } catch (e) {
      this.error(res, e, 'changePassword');
    }
  });
}

export const usersController = new UsersController();
