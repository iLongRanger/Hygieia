import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listPricingSettings,
  getPricingSettingsById,
  getActivePricingSettings,
  createPricingSettings,
  updatePricingSettings,
  archivePricingSettings,
  restorePricingSettings,
  deletePricingSettings,
  setActivePricingSettings,
} from '../services/pricingSettingsService';
import {
  createPricingSettingsSchema,
  updatePricingSettingsSchema,
  listPricingSettingsQuerySchema,
} from '../schemas/pricingSettings';
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

// List all pricing settings
router.get(
  '/',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listPricingSettingsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listPricingSettings(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

// Get active pricing settings (commonly used for calculations)
router.get(
  '/active',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pricingSettings = await getActivePricingSettings();
      if (!pricingSettings) {
        throw new NotFoundError('No active pricing settings found');
      }
      res.json({ data: pricingSettings });
    } catch (error) {
      next(error);
    }
  }
);

// Get pricing settings by ID
router.get(
  '/:id',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pricingSettings = await getPricingSettingsById(req.params.id);
      if (!pricingSettings) {
        throw new NotFoundError('Pricing settings not found');
      }
      res.json({ data: pricingSettings });
    } catch (error) {
      next(error);
    }
  }
);

// Create new pricing settings
router.post(
  '/',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createPricingSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const pricingSettings = await createPricingSettings(parsed.data);
      res.status(201).json({ data: pricingSettings });
    } catch (error) {
      next(error);
    }
  }
);

// Update pricing settings
router.patch(
  '/:id',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getPricingSettingsById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing settings not found');
      }

      const parsed = updatePricingSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const pricingSettings = await updatePricingSettings(req.params.id, parsed.data);
      res.json({ data: pricingSettings });
    } catch (error) {
      next(error);
    }
  }
);

// Set as active (deactivates all others)
router.post(
  '/:id/set-active',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getPricingSettingsById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing settings not found');
      }

      const pricingSettings = await setActivePricingSettings(req.params.id);
      res.json({ data: pricingSettings });
    } catch (error) {
      next(error);
    }
  }
);

// Archive pricing settings
router.post(
  '/:id/archive',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getPricingSettingsById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing settings not found');
      }

      const pricingSettings = await archivePricingSettings(req.params.id);
      res.json({ data: pricingSettings });
    } catch (error) {
      next(error);
    }
  }
);

// Restore pricing settings
router.post(
  '/:id/restore',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getPricingSettingsById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing settings not found');
      }

      const pricingSettings = await restorePricingSettings(req.params.id);
      res.json({ data: pricingSettings });
    } catch (error) {
      next(error);
    }
  }
);

// Delete pricing settings
router.delete(
  '/:id',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getPricingSettingsById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing settings not found');
      }

      await deletePricingSettings(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
