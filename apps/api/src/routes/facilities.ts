import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  archiveFacility,
  restoreFacility,
  deleteFacility,
} from '../services/facilityService';
import {
  createFacilitySchema,
  updateFacilitySchema,
  listFacilitiesQuerySchema,
} from '../schemas/facility';
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
      const parsed = listFacilitiesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listFacilities(parsed.data);
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
      const facility = await getFacilityById(req.params.id);
      if (!facility) {
        throw new NotFoundError('Facility not found');
      }
      res.json({ data: facility });
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
      const parsed = createFacilitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const facility = await createFacility({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: facility });
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
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      const parsed = updateFacilitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const facility = await updateFacility(req.params.id, parsed.data);
      res.json({ data: facility });
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
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      const facility = await archiveFacility(req.params.id);
      res.json({ data: facility });
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
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      const facility = await restoreFacility(req.params.id);
      res.json({ data: facility });
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
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      await deleteFacility(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
