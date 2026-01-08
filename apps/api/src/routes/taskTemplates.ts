import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listTaskTemplates,
  getTaskTemplateById,
  createTaskTemplate,
  updateTaskTemplate,
  archiveTaskTemplate,
  restoreTaskTemplate,
  deleteTaskTemplate,
} from '../services/taskTemplateService';
import {
  createTaskTemplateSchema,
  updateTaskTemplateSchema,
  listTaskTemplatesQuerySchema,
} from '../schemas/taskTemplate';
import { ZodError } from 'zod';

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
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listTaskTemplatesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listTaskTemplates(parsed.data);
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
      const template = await getTaskTemplateById(req.params.id);
      if (!template) {
        throw new NotFoundError('Task template not found');
      }
      res.json({ data: template });
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
      const parsed = createTaskTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const template = await createTaskTemplate({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: template });
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
      const existing = await getTaskTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Task template not found');
      }

      const parsed = updateTaskTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const template = await updateTaskTemplate(req.params.id, parsed.data);
      res.json({ data: template });
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
      const existing = await getTaskTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Task template not found');
      }

      const template = await archiveTaskTemplate(req.params.id);
      res.json({ data: template });
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
      const existing = await getTaskTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Task template not found');
      }

      const template = await restoreTaskTemplate(req.params.id);
      res.json({ data: template });
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
      const existing = await getTaskTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Task template not found');
      }

      await deleteTaskTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
