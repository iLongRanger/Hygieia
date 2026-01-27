import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listFacilityTasks,
  getFacilityTaskById,
  createFacilityTask,
  updateFacilityTask,
  archiveFacilityTask,
  restoreFacilityTask,
  deleteFacilityTask,
  bulkCreateFacilityTasks,
} from '../services/facilityTaskService';
import {
  createFacilityTaskSchema,
  updateFacilityTaskSchema,
  listFacilityTasksQuerySchema,
} from '../schemas/facilityTask';
import { ZodError, z } from 'zod';

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

const bulkCreateSchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
  areaId: z.string().uuid('Invalid area ID').optional().nullable(),
  taskTemplateIds: z
    .array(z.string().uuid())
    .min(1, 'At least one task template ID required'),
  cleaningFrequency: z.enum([
    'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'as_needed'
  ]).optional(),
});

router.get(
  '/',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listFacilityTasksQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listFacilityTasks(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await getFacilityTaskById(req.params.id);
      if (!task) {
        throw new NotFoundError('Facility task not found');
      }
      res.json({ data: task });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createFacilityTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const task = await createFacilityTask({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: task });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/bulk',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = bulkCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const result = await bulkCreateFacilityTasks(
        parsed.data.facilityId,
        parsed.data.taskTemplateIds,
        req.user.id,
        parsed.data.areaId || undefined,
        parsed.data.cleaningFrequency
      );

      res.status(201).json({ data: { count: result.count } });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityTaskById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility task not found');
      }

      const parsed = updateFacilityTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const task = await updateFacilityTask(req.params.id, parsed.data);
      res.json({ data: task });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/archive',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityTaskById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility task not found');
      }

      const task = await archiveFacilityTask(req.params.id);
      res.json({ data: task });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/restore',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityTaskById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility task not found');
      }

      const task = await restoreFacilityTask(req.params.id);
      res.json({ data: task });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityTaskById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility task not found');
      }

      await deleteFacilityTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
