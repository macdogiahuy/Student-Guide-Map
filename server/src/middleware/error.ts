import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { config } from '../config/unifiedConfig.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    data: null,
    message: 'Không tìm thấy tài nguyên.',
    errors: [],
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
      errors: err.errors,
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      data: null,
      message: 'Dữ liệu không hợp lệ.',
      errors: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
    return;
  }
  // Multer / body parser errors
  const e = err as { type?: string; status?: number; message?: string };
  if (e?.type === 'entity.too.large') {
    res.status(413).json({ success: false, data: null, message: 'Nội dung quá lớn.', errors: [] });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  res.status(500).json({
    success: false,
    data: null,
    message: config.isProd
      ? 'Không thể xử lý yêu cầu. Vui lòng thử lại.'
      : String(e?.message ?? err),
    errors: [],
  });
}
