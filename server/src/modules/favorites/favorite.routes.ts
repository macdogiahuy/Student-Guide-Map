import { Router } from 'express';
import { favoriteController } from './favorite.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const favoriteRoutes = Router();

favoriteRoutes.get('/', requireAuth, favoriteController.list);
favoriteRoutes.post('/:locationId', requireAuth, favoriteController.add);
favoriteRoutes.delete('/:locationId', requireAuth, favoriteController.remove);
