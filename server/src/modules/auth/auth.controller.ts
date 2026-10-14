import type { Request, Response } from 'express';
import { BaseController } from '../../lib/baseController.js';
import { asyncErrorWrapper } from '../../lib/asyncErrorWrapper.js';
import { AppError } from '../../lib/errors.js';
import { config } from '../../config/unifiedConfig.js';
import { authService } from './auth.service.js';
import type {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from './auth.schema.js';
import type { z } from 'zod';

const REFRESH_COOKIE = 'sgm_refresh';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 3600_000,
  });
}

export class AuthController extends BaseController {
  register = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const input = req.body as z.infer<typeof registerSchema>;
      const { user, devOtp } = await authService.register(input);
      const message = devOtp
        ? `Đăng ký thành công. Mã OTP (dev): ${devOtp}`
        : 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.';
      this.created(res, { ...user, devOtp }, message);
    } catch (e) {
      this.error(res, e, 'register');
    }
  });

  verifyOtp = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const user = await authService.verifyEmail(req.body as z.infer<typeof verifyOtpSchema>);
      this.success(res, user, 'Xác thực tài khoản thành công.');
    } catch (e) {
      this.error(res, e, 'verifyOtp');
    }
  });

  resendOtp = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const { devOtp } = await authService.resendOtp(req.body as z.infer<typeof resendOtpSchema>);
      const message = devOtp ? `Đã gửi lại mã OTP (dev): ${devOtp}` : 'Đã gửi lại mã OTP.';
      this.success(res, { devOtp }, message);
    } catch (e) {
      this.error(res, e, 'resendOtp');
    }
  });

  login = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const input = req.body as z.infer<typeof loginSchema>;
      const { accessToken, refreshToken, user } = await authService.login(
        input,
        req.headers['user-agent'],
      );
      setRefreshCookie(res, refreshToken);
      this.success(res, { accessToken, user }, 'Đăng nhập thành công.');
    } catch (e) {
      this.error(res, e, 'login');
    }
  });

  refresh = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (!token) throw AppError.unauthorized('Phiên đăng nhập không hợp lệ.');
      const { accessToken, refreshToken } = await authService.refresh(token);
      setRefreshCookie(res, refreshToken);
      this.success(res, { accessToken }, null);
    } catch (e) {
      this.error(res, e, 'refresh');
    }
  });

  logout = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      await authService.logout(token);
      res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
      this.success(res, null, 'Đã đăng xuất.');
    } catch (e) {
      this.error(res, e, 'logout');
    }
  });

  forgotPassword = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      await authService.forgotPassword(req.body as z.infer<typeof forgotPasswordSchema>);
      this.success(res, null, 'Nếu email tồn tại, mã OTP đặt lại mật khẩu đã được gửi.');
    } catch (e) {
      this.error(res, e, 'forgotPassword');
    }
  });

  resetPassword = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      await authService.resetPassword(req.body as z.infer<typeof resetPasswordSchema>);
      this.success(res, null, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
    } catch (e) {
      this.error(res, e, 'resetPassword');
    }
  });

  me = asyncErrorWrapper(async (req: Request, res: Response) => {
    try {
      const user = await authService.me(req.user!.id);
      this.success(res, user);
    } catch (e) {
      this.error(res, e, 'me');
    }
  });
}

export const authController = new AuthController();
