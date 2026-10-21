import { Router } from 'express';
import { z } from 'zod';
import { locationController } from './location.controller.js';
import { edgeCache } from '../../middleware/edgeCache.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { upload } from '../../lib/upload.js';
import {
  createLocationSchema,
  hoursSchema,
  priceReferenceSchema,
  searchQuerySchema,
  updateLocationSchema,
} from './location.schema.js';

export const locationRoutes = Router();

locationRoutes.get('/', optionalAuth, validate(searchQuerySchema, 'query'), edgeCache(60), locationController.search);
locationRoutes.get('/compare', locationController.compare);
// Route results depend on the caller's live GPS position. Do not serve a
// previous navigation request from an intermediary cache.
locationRoutes.get('/:id/route', locationController.route);
locationRoutes.get('/:id', optionalAuth, edgeCache(60), locationController.getDetail);

// writes
locationRoutes.post(
  '/',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  writeLimiter,
  validate(createLocationSchema),
  locationController.create,
);
locationRoutes.patch(
  '/:id',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  validate(updateLocationSchema),
  locationController.update,
);
locationRoutes.put(
  '/:id/hours',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  validate(hoursSchema),
  locationController.setHours,
);
locationRoutes.post(
  '/:id/images',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  upload.array('images', 8),
  locationController.addImages,
);
locationRoutes.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  locationController.deleteImage,
);
locationRoutes.put(
  '/:id/prices',
  requireAuth,
  requireRole('STORE_OWNER', 'ADMIN'),
  validate(z.array(priceReferenceSchema).max(50)),
  locationController.setPrices,
);

// admin-only lifecycle
locationRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(z.object({ id: z.string() }), 'params'),
  locationController.remove,
);
locationRoutes.post(
  '/:id/decide',
  requireAuth,
  requireRole('ADMIN'),
  validate(
    z.object({
      decision: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().max(300).optional(),
    }),
  ),
  locationController.decide,
);
