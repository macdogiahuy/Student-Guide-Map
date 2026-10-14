import type { Response } from 'express';
import { AppError } from './errors.js';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string | null;
  errors: string[];
}

/**
 * BaseController — every controller extends this so response shape stays uniform:
 * { success, data, message, errors }
 */
export abstract class BaseController {
  protected success<T>(res: Response, data: T, message: string | null = null, status = 200): void {
    const body: ApiEnvelope<T> = { success: true, data, message, errors: [] };
    res.status(status).json(body);
  }

  protected created<T>(res: Response, data: T, message: string | null = null): void {
    this.success(res, data, message, 201);
  }

  protected error(res: Response, error: unknown, context: string): void {
    if (error instanceof AppError) {
      const body: ApiEnvelope<null> = {
        success: false,
        data: null,
        message: error.message,
        errors: error.errors,
      };
      res.status(error.statusCode).json(body);
      return;
    }
    // Never leak internals
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, error);
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      message: 'Không thể xử lý yêu cầu. Vui lòng thử lại.',
      errors: [],
    };
    res.status(500).json(body);
  }
}
