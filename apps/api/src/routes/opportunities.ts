import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import type { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ValidationError } from '../middleware/errorHandler';
import { ensureManagerAccountAccess, ensureOwnershipAccess } from '../middleware/ownership';
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
      await ensureOwnershipAccess(req.user, {
        resourceType: 'opportunity',
        resourceId: req.params.id,
        path: req.path,
        method: req.method,
      });

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
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      await ensureOwnershipAccess(req.user, {
        resourceType: 'opportunity',
        resourceId: req.params.id,
        path: req.path,
        method: req.method,
      });

      const parsed = updateOpportunitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (parsed.data.accountId) {
        await ensureManagerAccountAccess(req.user, parsed.data.accountId, {
          path: req.path,
          method: req.method,
        });
      }

      if (parsed.data.facilityId) {
        await ensureOwnershipAccess(req.user, {
          resourceType: 'facility',
          resourceId: parsed.data.facilityId,
          path: req.path,
          method: req.method,
        });
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
