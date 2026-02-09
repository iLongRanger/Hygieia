import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { sensitiveRateLimiter } from '../middleware/rateLimiter';
import { ValidationError } from '../middleware/errorHandler';
import {
  getGlobalSettings,
  updateGlobalSettings,
  clearGlobalLogo,
} from '../services/globalSettingsService';
import { updateGlobalSettingsSchema, updateLogoSchema } from '../schemas/globalSettings';
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
  requirePermission(PERMISSIONS.SETTINGS_READ),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await getGlobalSettings();
      res.json({ data: settings });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateGlobalSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const settings = await updateGlobalSettings(parsed.data);
      res.json({ data: settings, message: 'Global settings updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/logo',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateLogoSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const settings = await updateGlobalSettings({ logoDataUrl: parsed.data.logoDataUrl });
      res.json({ data: settings, message: 'Logo updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/logo',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await clearGlobalLogo();
      res.json({ data: settings, message: 'Logo removed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
