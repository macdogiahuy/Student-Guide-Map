import type { NextFunction, Request, Response } from 'express';

/**
 * Vercel Edge cache for public GETs.
 * - Anonymous (no Authorization header): public edge cache + Vary: Authorization
 *   so logged-in variants are never served from the anonymous copy.
 * - Authenticated: private, no-store (responses may contain isFavorite etc).
 * Query string is part of the edge cache key automatically.
 */
export function edgeCache(sMaxAgeSeconds: number, swrSeconds?: number) {
  const swr = swrSeconds ?? sMaxAgeSeconds * 2;
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      res.setHeader(
        'Cache-Control',
        `public, max-age=${Math.min(sMaxAgeSeconds, 15)}, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${swr}`,
      );
      res.setHeader('Vary', 'Authorization');
    } else {
      res.setHeader('Cache-Control', 'private, no-store');
    }
    next();
  };
}
