import { Router } from 'express';
import { promotionController } from './promotion.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import {
  createPromotionSchema,
  decidePromotionSchema,
  publicPromotionQuery,
  updatePromotionSchema,
} from './promotion.schema.js';

export const promotionRoutes = Router();

promotionRoutes.get('/', validate(publicPromotionQuery, 'query'), promotionController.listPublic);
promotionRoutes.get('/mine', requireAuth, requireRole('STORE_OWNER', 'ADMIN'), promotionController.listMine);
promotionRoutes.get('/:id', promotionController.getPublic);
promotionRoutes.post(
  '/',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  writeLimiter,
  validate(createPromotionSchema),
  promotionController.createStore,
);
promotionRoutes.patch('/:id', requireAuth, requireRole('STORE_OWNER', 'ADMIN'), validate(updatePromotionSchema), promotionController.updateStore);
promotionRoutes.delete('/:id', requireAuth, requireRole('STORE_OWNER', 'ADMIN'), promotionController.removeStore);
promotionRoutes.post(
  '/:id/decide',
  requireAuth,
  requireRole('ADMIN'),
  validate(decidePromotionSchema),
  promotionController.decide,
);
