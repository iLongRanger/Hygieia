import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ValidationError } from '../middleware/errorHandler';
import { PERMISSIONS } from '../types';
import { listOpportunities } from '../services/opportunityService';
import { listOpportunitiesQuerySchema } from '../schemas/opportunity';

const router: Router = Router();

function handleZodError(error: ZodError): ValidationError {
  const firstError = error.errors[0];
  return new ValidationError(firstError.message, {
    field: firstError.path.join('.'),
    errors: error.errors.map((entry) => ({
      field: entry.path.join('.'),
      message: entry.message,
    })),
  });
}

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.LEADS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listOpportunitiesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listOpportunities(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
