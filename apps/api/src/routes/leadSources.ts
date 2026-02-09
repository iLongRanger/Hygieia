import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../middleware/errorHandler';
import {
  listLeadSources,
  getLeadSourceById,
  getLeadSourceByName,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
} from '../services/leadSourceService';
import {
  createLeadSourceSchema,
  updateLeadSourceSchema,
  listLeadSourcesQuerySchema,
} from '../schemas/leadSource';
import { ZodError } from 'zod';
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

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.LEAD_SOURCES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listLeadSourcesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const sources = await listLeadSources(parsed.data.isActive);
      res.json({ data: sources });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.LEAD_SOURCES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const source = await getLeadSourceById(req.params.id);
      if (!source) {
        throw new NotFoundError('Lead source not found');
      }
      res.json({ data: source });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.LEAD_SOURCES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createLeadSourceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existing = await getLeadSourceByName(parsed.data.name);
      if (existing) {
        throw new ConflictError('Lead source with this name already exists');
      }

      const source = await createLeadSource(parsed.data);
      res.status(201).json({ data: source });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.LEAD_SOURCES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getLeadSourceById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Lead source not found');
      }

      const parsed = updateLeadSourceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (parsed.data.name && parsed.data.name !== existing.name) {
        const duplicate = await getLeadSourceByName(parsed.data.name);
        if (duplicate) {
          throw new ConflictError('Lead source with this name already exists');
        }
      }

      const source = await updateLeadSource(req.params.id, parsed.data);
      res.json({ data: source });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.LEAD_SOURCES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getLeadSourceById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Lead source not found');
      }

      await deleteLeadSource(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
