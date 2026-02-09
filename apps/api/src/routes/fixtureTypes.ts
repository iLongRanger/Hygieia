import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listFixtureTypes,
  getFixtureTypeById,
  createFixtureType,
  updateFixtureType,
  deleteFixtureType,
} from '../services/fixtureTypeService';
import {
  createFixtureTypeSchema,
  updateFixtureTypeSchema,
  listFixtureTypesQuerySchema,
} from '../schemas/fixtureType';
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
  requirePermission(PERMISSIONS.FIXTURE_TYPES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listFixtureTypesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listFixtureTypes(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.FIXTURE_TYPES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fixtureType = await getFixtureTypeById(req.params.id);
      if (!fixtureType) {
        throw new NotFoundError('Fixture type not found');
      }
      res.json({ data: fixtureType });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FIXTURE_TYPES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createFixtureTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const fixtureType = await createFixtureType(parsed.data);
      res.status(201).json({ data: fixtureType });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.FIXTURE_TYPES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFixtureTypeById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Fixture type not found');
      }

      const parsed = updateFixtureTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const updated = await updateFixtureType(req.params.id, parsed.data);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.FIXTURE_TYPES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFixtureTypeById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Fixture type not found');
      }

      await deleteFixtureType(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
