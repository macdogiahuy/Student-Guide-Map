import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/unifiedConfig.js';
import { AppError } from '../lib/errors.js';
import { asyncErrorWrapper } from '../lib/asyncErrorWrapper.js';
import type { AuthUser } from '../types/index.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function verifyToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as AccessTokenPayload;
    return { id: payload.sub, email: payload.email, role: payload.role as AuthUser['role'] };
  } catch {
    throw AppError.unauthorized('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }
}

/** Require a valid access token. */
export const requireAuth = asyncErrorWrapper(async (req, _res, next: NextFunction) => {
  const token = readBearer(req);
  if (!token) throw AppError.unauthorized('Vui lòng đăng nhập.');
  req.user = verifyToken(token);
  next();
});

/** Attach user when a token is present, otherwise continue anonymously. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = readBearer(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      /* anonymous */
    }
  }
  next();
};

export const requireRole =
  (...roles: AuthUser['role'][]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized('Vui lòng đăng nhập.'));
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('Bạn không có quyền thực hiện thao tác này.'));
    }
    next();
  };
