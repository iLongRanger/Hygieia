import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listAreaTemplates,
  getAreaTemplateById,
  getAreaTemplateByAreaType,
  createAreaTemplate,
  updateAreaTemplate,
  deleteAreaTemplate,
} from '../services/areaTemplateService';
import {
  createAreaTemplateSchema,
  updateAreaTemplateSchema,
  listAreaTemplatesQuerySchema,
} from '../schemas/areaTemplate';
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
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listAreaTemplatesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listAreaTemplates(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/area-type/:areaTypeId',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await getAreaTemplateByAreaType(req.params.areaTypeId);
      if (!template) {
        throw new NotFoundError('Area template not found');
      }
      res.json({ data: template });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await getAreaTemplateById(req.params.id);
      if (!template) {
        throw new NotFoundError('Area template not found');
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
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createAreaTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const template = await createAreaTemplate({
        ...parsed.data,
        createdByUserId: req.user!.id,
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
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getAreaTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Area template not found');
      }

      const parsed = updateAreaTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const updated = await updateAreaTemplate(req.params.id, parsed.data);
      res.json({ data: updated });
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
      const existing = await getAreaTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Area template not found');
      }

      await deleteAreaTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
