import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { sensitiveRateLimiter } from '../middleware/rateLimiter';
import { ValidationError, UnauthorizedError } from '../middleware/errorHandler';
import { PERMISSIONS } from '../types';
import { importSystemConfigurationSchema } from '../schemas/systemConfig';
import { exportSystemConfiguration } from '../services/systemConfigExportService';
import { importSystemConfiguration } from '../services/systemConfigImportService';
import type { ZodError } from 'zod';

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
  '/export',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await exportSystemConfiguration();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/import',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }
      const parsed = importSystemConfigurationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await importSystemConfiguration(
        parsed.data.data,
        req.user.id,
        {
          dryRun: parsed.data.dryRun,
        }
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
