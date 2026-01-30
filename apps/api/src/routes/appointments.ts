import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAnyRole, requireManager } from '../middleware/rbac';
import { NotFoundError, ValidationError, BadRequestError } from '../middleware/errorHandler';
import { ZodError } from 'zod';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
  completeAppointmentSchema,
} from '../schemas/appointment';
import {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  rescheduleAppointment,
  completeAppointment,
} from '../services/appointmentService';

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
      const parsed = listAppointmentsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const params = { ...parsed.data };

      if (req.user?.role === 'cleaner') {
        params.assignedToUserId = req.user.id;
      }

      const appointments = await listAppointments(params);
      res.json({ data: appointments });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requireAnyRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointment = await getAppointmentById(req.params.id);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      if (req.user?.role === 'cleaner' && appointment.assignedToUser.id !== req.user.id) {
        throw new ValidationError('Insufficient permissions');
      }

      res.json({ data: appointment });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requireManager,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const appointment = await createAppointment({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: appointment });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requireManager,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getAppointmentById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Appointment not found');
      }

      const parsed = updateAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const appointment = await updateAppointment(req.params.id, parsed.data);
      res.json({ data: appointment });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/reschedule',
  authenticate,
  requireManager,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = rescheduleAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const appointment = await rescheduleAppointment(req.params.id, parsed.data, req.user.id);
      res.status(201).json({ data: appointment });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/complete',
  authenticate,
  requireAnyRole,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = completeAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const appointment = await getAppointmentById(req.params.id);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      const isManager = ['owner', 'admin', 'manager'].includes(req.user.role);
      if (!isManager && appointment.assignedToUser.id !== req.user.id) {
        throw new BadRequestError('Only the assigned rep can complete this appointment');
      }

      const updated = await completeAppointment(req.params.id, {
        ...parsed.data,
        userId: req.user.id,
      });

      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
