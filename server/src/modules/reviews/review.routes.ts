import { Router } from 'express';
import { z } from 'zod';
import { reviewController } from './review.controller.js';
import { edgeCache } from '../../middleware/edgeCache.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { createReviewSchema, replySchema, reviewListQuery, updateReviewSchema } from './review.schema.js';

export const reviewRoutes = Router();

reviewRoutes.get('/', validate(reviewListQuery, 'query'), edgeCache(30), reviewController.list);
reviewRoutes.get('/mine', requireAuth, reviewController.mine);

reviewRoutes.post(
  '/',
  requireAuth,
  requireRole('STUDENT', 'ADMIN'),
  writeLimiter,
  validate(createReviewSchema),
  reviewController.create,
);
reviewRoutes.patch(
  '/:id',
  requireAuth,
  validate(updateReviewSchema),
  reviewController.update,
);
reviewRoutes.delete('/:id', requireAuth, reviewController.remove);

// store owner / admin reply
reviewRoutes.post(
  '/:id/reply',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  validate(replySchema),
  reviewController.reply,
);
reviewRoutes.patch(
  '/:id/reply',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  validate(replySchema),
  reviewController.updateReply,
);
reviewRoutes.delete('/:id/reply', requireAuth, requireRole('STORE_OWNER', 'ADMIN'), reviewController.deleteReply);

// admin moderation
reviewRoutes.patch(
  '/:id/moderate',
  requireAuth,
  requireRole('ADMIN'),
  validate(z.object({ status: z.enum(['DISPLAYED', 'HIDDEN', 'DELETED']) })),
  reviewController.moderate,
);
