import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { userRoutes } from '../modules/users/users.routes.js';
import { categoryRoutes } from '../modules/categories/category.routes.js';
import { locationRoutes } from '../modules/locations/location.routes.js';
import { reviewRoutes } from '../modules/reviews/review.routes.js';
import { favoriteRoutes } from '../modules/favorites/favorite.routes.js';
import { promotionRoutes } from '../modules/promotions/promotion.routes.js';
import { reportRoutes } from '../modules/reports/report.routes.js';
import { notificationRoutes } from '../modules/notifications/notification.routes.js';
import { adminCorrectionRoutes, storeRoutes } from '../modules/store/store.routes.js';
import { adminRoutes } from '../modules/admin/admin.routes.js';

export const v1Routes = Router();

v1Routes.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() }, message: null, errors: [] });
});

v1Routes.use('/auth', authRoutes);
v1Routes.use('/users', userRoutes);
v1Routes.use('/categories', categoryRoutes);
v1Routes.use('/locations', locationRoutes);
v1Routes.use('/reviews', reviewRoutes);
v1Routes.use('/favorites', favoriteRoutes);
v1Routes.use('/promotions', promotionRoutes);
v1Routes.use('/reports', reportRoutes);
v1Routes.use('/notifications', notificationRoutes);
v1Routes.use('/store', storeRoutes);
v1Routes.use('/admin', adminRoutes);
v1Routes.use('/admin', adminCorrectionRoutes);
