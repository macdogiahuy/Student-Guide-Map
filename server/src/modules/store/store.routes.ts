import { Router } from 'express';
import { storeController } from './store.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { correctionRequestSchema, processCorrectionSchema } from './store.schema.js';

export const storeRoutes = Router();

storeRoutes.use(requireAuth, requireRole('STORE_OWNER', 'ADMIN'));
storeRoutes.get('/dashboard', storeController.dashboard);
storeRoutes.get('/locations', storeController.locations);
storeRoutes.get('/reviews', storeController.reviews);
storeRoutes.post('/correction-requests', validate(correctionRequestSchema), storeController.createCorrection);
storeRoutes.get('/correction-requests', storeController.corrections);

/** Admin processing of correction requests lives under /admin — mounted separately. */
export const adminCorrectionRoutes = Router();
adminCorrectionRoutes.patch(
  '/correction-requests/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(processCorrectionSchema),
  storeController.processCorrection,
);
