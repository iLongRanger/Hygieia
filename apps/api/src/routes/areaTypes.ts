import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../middleware/errorHandler';
import {
  listAreaTypes,
  getAreaTypeById,
  getAreaTypeByName,
  createAreaType,
  updateAreaType,
  deleteAreaType,
} from '../services/areaTypeService';
import {
  createAreaTypeSchema,
  updateAreaTypeSchema,
  listAreaTypesQuerySchema,
} from '../schemas/areaType';
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
      const parsed = listAreaTypesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listAreaTypes(parsed.data);
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
      const areaType = await getAreaTypeById(req.params.id);
      if (!areaType) {
        throw new NotFoundError('Area type not found');
      }
      res.json({ data: areaType });
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
      const parsed = createAreaTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existing = await getAreaTypeByName(parsed.data.name);
      if (existing) {
        throw new ConflictError('Area type with this name already exists');
      }

      const areaType = await createAreaType(parsed.data);
      res.status(201).json({ data: areaType });
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
      const existing = await getAreaTypeById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Area type not found');
      }

      const parsed = updateAreaTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (parsed.data.name && parsed.data.name !== existing.name) {
        const duplicate = await getAreaTypeByName(parsed.data.name);
        if (duplicate) {
          throw new ConflictError('Area type with this name already exists');
        }
      }

      const areaType = await updateAreaType(req.params.id, parsed.data);
      res.json({ data: areaType });
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
      const existing = await getAreaTypeById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Area type not found');
      }

      await deleteAreaType(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
