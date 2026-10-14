import { Router } from 'express';
import { categoryController } from './category.controller.js';
import { edgeCache } from '../../middleware/edgeCache.js';

export const categoryRoutes = Router();
categoryRoutes.get('/', edgeCache(3600), categoryController.list);
