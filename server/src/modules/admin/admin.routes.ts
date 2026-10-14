import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const adminRoutes = Router();

// All /admin routes require ADMIN
adminRoutes.use(requireAuth, requireRole('ADMIN'));

adminRoutes.get('/dashboard', adminController.dashboard);
adminRoutes.get('/statistics', adminController.statistics);

adminRoutes.get('/users', adminController.listUsers);
adminRoutes.patch('/users/:id', adminController.updateUser);

adminRoutes.get('/categories', adminController.listCategories);
adminRoutes.post('/categories', adminController.createCategory);
adminRoutes.patch('/categories/:id', adminController.updateCategory);
adminRoutes.delete('/categories/:id', adminController.deleteCategory);

adminRoutes.get('/locations', adminController.listLocations);
adminRoutes.get('/promotions', adminController.listPromotions);
adminRoutes.get('/reviews', adminController.listReviews);
