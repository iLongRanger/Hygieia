import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { verifyOwnership } from '../middleware/ownership';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  archiveFacility,
  restoreFacility,
  deleteFacility,
  getTaskTimeBreakdown,
} from '../services/facilityService';
import {
  calculateFacilityPricing,
  calculateFacilityPricingComparison,
  isFacilityReadyForPricing,
  getFacilityTasksGrouped,
} from '../services/pricingCalculatorService';
import {
  calculatePricing,
  generateProposalServices,
} from '../services/pricing';
import {
  createFacilitySchema,
  updateFacilitySchema,
  listFacilitiesQuerySchema,
} from '../schemas/facility';
import { ZodError } from 'zod';

const router: Router = Router();

const SUBCONTRACTOR_TIER_MAP: Record<string, number> = {
  labor_only: 0.40,
  standard: 0.50,
  premium: 0.60,
  independent: 0.70,
};

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
  verifyOwnership({ resourceType: 'facility' }),
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
  verifyOwnership({ resourceType: 'facility' }),
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

// Check if facility is ready for pricing/proposal
router.get(
  '/:id/pricing-readiness',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await isFacilityReadyForPricing(req.params.id);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Calculate pricing for a specific frequency
router.get(
  '/:id/pricing',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      const frequency = (req.query.frequency as string) || '5x_week';
      const taskComplexity = (req.query.taskComplexity as string) || 'standard';
      const pricingPlanId = (req.query.pricingPlanId as string) || undefined;

      const pricing = await calculateFacilityPricing({
        facilityId: req.params.id,
        serviceFrequency: frequency,
        taskComplexity,
        pricingPlanId,
      });

      res.json({ data: pricing });
    } catch (error) {
      next(error);
    }
  }
);

// Get pricing comparison across multiple frequencies
router.get(
  '/:id/pricing-comparison',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      const frequenciesParam = req.query.frequencies as string;
      const frequencies = frequenciesParam
        ? frequenciesParam.split(',')
        : ['1x_week', '2x_week', '3x_week', '5x_week'];
      const pricingPlanId = (req.query.pricingPlanId as string) || undefined;

      const comparison = await calculateFacilityPricingComparison(
        req.params.id,
        frequencies,
        pricingPlanId
      );

      res.json({ data: comparison });
    } catch (error) {
      next(error);
    }
  }
);

// Generate proposal template from facility
router.get(
  '/:id/proposal-template',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      const frequency = (req.query.frequency as string) || '5x_week';
      const pricingPlanId = (req.query.pricingPlanId as string) || undefined;
      const workerCount = req.query.workerCount ? Number(req.query.workerCount) : undefined;
      const subcontractorTier = (req.query.subcontractorTier as string) || undefined;
      const subcontractorPercentageOverride = subcontractorTier
        ? SUBCONTRACTOR_TIER_MAP[subcontractorTier]
        : undefined;

      // Check if facility is ready
      const readiness = await isFacilityReadyForPricing(req.params.id);
      if (!readiness.isReady) {
        throw new ValidationError(readiness.reason || 'Facility is not ready for proposal');
      }

      // Get pricing calculation using selected plan
      const pricing = await calculatePricing(
        {
          facilityId: req.params.id,
          serviceFrequency: frequency,
          workerCount,
          subcontractorPercentageOverride,
        },
        { pricingPlanId, accountId: existing.accountId }
      );

      // Generate suggested services
      const suggestedServices = await generateProposalServices(
        {
          facilityId: req.params.id,
          serviceFrequency: frequency,
          workerCount,
          subcontractorPercentageOverride,
        },
        { pricingPlanId, accountId: existing.accountId }
      );

      res.json({
        data: {
          facility: existing,
          pricing,
          suggestedServices,
          suggestedItems: [], // Can add suggested one-time items later
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get tasks for a facility grouped by area and frequency
router.get(
  '/:id/tasks-grouped',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      const { byArea, byFrequency } = await getFacilityTasksGrouped(req.params.id);

      // Convert Maps to plain objects for JSON serialization
      const areasObj: Record<string, { areaName: string; tasks: { name: string; frequency: string }[] }> = {};
      byArea.forEach((value, key) => {
        areasObj[key] = value;
      });

      const frequencyObj: Record<string, { name: string; areaName: string }[]> = {};
      byFrequency.forEach((value, key) => {
        frequencyObj[key] = value;
      });

      res.json({
        data: {
          byArea: areasObj,
          byFrequency: frequencyObj,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get task time breakdown for per-hour pricing preview
router.get(
  '/:id/task-time-breakdown',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getFacilityById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Facility not found');
      }

      const breakdown = await getTaskTimeBreakdown(req.params.id);
      res.json({ data: breakdown });
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
