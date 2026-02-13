import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAnyRole, requirePermission } from '../middleware/rbac';
import { ValidationError } from '../middleware/errorHandler';
import { ZodError } from 'zod';
import {
  listNotificationsQuerySchema,
  markNotificationReadSchema,
} from '../schemas/notification';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '../services/notificationService';
import {
  sendAppointmentReminders,
  sendContractExpiryReminders,
} from '../services/reminderService';
import { NotFoundError } from '../middleware/errorHandler';
import { PERMISSIONS } from '../types';

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

// List notifications with pagination and filters
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

      const result = await listNotifications({
        userId: req.user.id,
        page: parsed.data.page,
        limit: parsed.data.limit,
        includeRead: parsed.data.includeRead,
        type: parsed.data.type,
        dateFrom: parsed.data.dateFrom,
        dateTo: parsed.data.dateTo,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get unread count
router.get(
  '/unread-count',
  authenticate,
  requireAnyRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const count = await getUnreadCount(req.user.id);
      res.json({ data: { count } });
    } catch (error) {
      next(error);
    }
  }
);

// Mark single notification as read/unread
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

// Mark all notifications as read
router.post(
  '/mark-all-read',
  authenticate,
  requireAnyRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const count = await markAllNotificationsRead(req.user.id);
      res.json({ data: { markedCount: count } });
    } catch (error) {
      next(error);
    }
  }
);

// Trigger appointment reminders (admin/cron)
router.post(
  '/reminders/appointments',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await sendAppointmentReminders();
      res.json({ data: { sent: count } });
    } catch (error) {
      next(error);
    }
  }
);

// Trigger contract expiry reminders (admin/cron)
router.post(
  '/reminders/contracts',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const count = await sendContractExpiryReminders(isNaN(days) ? 30 : days);
      res.json({ data: { sent: count } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
