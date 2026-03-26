import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ValidationError } from '../middleware/errorHandler';
import { PERMISSIONS } from '../types';
import {
  listOpportunities,
  getOpportunityById,
  updateOpportunity,
  archiveOpportunity,
  restoreOpportunity,
} from '../services/opportunityService';
import { listOpportunitiesQuerySchema, updateOpportunitySchema } from '../schemas/opportunity';

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

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.LEADS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunity = await getOpportunityById(req.params.id);
      res.json({ data: opportunity });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.LEADS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateOpportunitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const opportunity = await updateOpportunity(req.params.id, parsed.data);
      res.json({ data: opportunity });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/archive',
  authenticate,
  requirePermission(PERMISSIONS.LEADS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunity = await archiveOpportunity(req.params.id);
      res.json({ data: opportunity });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.LEADS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunity = await restoreOpportunity(req.params.id);
      res.json({ data: opportunity });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
