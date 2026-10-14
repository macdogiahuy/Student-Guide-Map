import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

/**
 * Validates req[source] with a zod schema; replaces req.body with parsed value
 * (query/params stay on their own keys).
 */
export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`);
      return next(AppError.badRequest('Dữ liệu không hợp lệ.', errors));
    }
    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      // req.query is a getter on Express prototypes — shadow it with the parsed value
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      Object.defineProperty(req, 'params', {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }
    next();
  };
