import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listPricingOverrides,
  getPricingOverrideById,
  createPricingOverride,
  updatePricingOverride,
  approvePricingOverride,
  deletePricingOverride,
} from '../services/pricingOverrideService';
import {
  createPricingOverrideSchema,
  updatePricingOverrideSchema,
  listPricingOverridesQuerySchema,
} from '../schemas/pricingOverride';
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
      const parsed = listPricingOverridesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listPricingOverrides(parsed.data);
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
      const pricingOverride = await getPricingOverrideById(req.params.id);
      if (!pricingOverride) {
        throw new NotFoundError('Pricing override not found');
      }
      res.json({ data: pricingOverride });
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
      const parsed = createPricingOverrideSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const pricingOverride = await createPricingOverride({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: pricingOverride });
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
      const existing = await getPricingOverrideById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing override not found');
      }

      const parsed = updatePricingOverrideSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const pricingOverride = await updatePricingOverride(req.params.id, parsed.data);
      res.json({ data: pricingOverride });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/approve',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getPricingOverrideById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing override not found');
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const pricingOverride = await approvePricingOverride(req.params.id, req.user.id);
      res.json({ data: pricingOverride });
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
      const existing = await getPricingOverrideById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing override not found');
      }

      await deletePricingOverride(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
