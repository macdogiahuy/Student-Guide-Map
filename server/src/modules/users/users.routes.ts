import { Router } from 'express';
import { usersController } from './users.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { changePasswordSchema, updateProfileSchema } from './users.schema.js';

export const userRoutes = Router();

userRoutes.patch('/me', requireAuth, validate(updateProfileSchema), usersController.updateMe);
userRoutes.post(
  '/me/change-password',
  requireAuth,
  validate(changePasswordSchema),
  usersController.changePassword,
);
