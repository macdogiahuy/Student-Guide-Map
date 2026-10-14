import rateLimit from 'express-rate-limit';
import { config } from '../config/unifiedConfig.js';

const skipInTest = () => config.isTest;

/** Strict limiter for sensitive auth endpoints. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    data: null,
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.',
    errors: [],
  },
});

/** General limiter for write endpoints. */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    data: null,
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    errors: [],
  },
});
