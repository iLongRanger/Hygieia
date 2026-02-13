import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAnyRole } from '../middleware/rbac';
import { ValidationError } from '../middleware/errorHandler';
import { ZodError } from 'zod';
import {
  listNotificationsQuerySchema,
  markNotificationReadSchema,
} from '../schemas/notification';
import {
  listNotifications,
  markNotificationRead,
} from '../services/notificationService';
import { NotFoundError } from '../middleware/errorHandler';

const router: Router = Router();

function handleZodError(error: ZodError): ValidationError {
  const firstError = error.errors[0];
  return new ValidationError(firstError.message, {
    field: firstError.path.join('.'),
    errors: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  });
}

router.get(
  '/',
  authenticate,
  requireAnyRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listNotificationsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const notifications = await listNotifications({
        userId: req.user.id,
        limit: parsed.data.limit,
        includeRead: parsed.data.includeRead,
      });

      res.json({ data: notifications });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/read',
  authenticate,
  requireAnyRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = markNotificationReadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const notification = await markNotificationRead(req.params.id, req.user.id, parsed.data.read);
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }
      res.json({ data: notification });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
