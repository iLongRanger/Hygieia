import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listPricingRules,
  getPricingRuleById,
  createPricingRule,
  updatePricingRule,
  archivePricingRule,
  restorePricingRule,
  deletePricingRule,
} from '../services/pricingRuleService';
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  listPricingRulesQuerySchema,
} from '../schemas/pricingRule';
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
      const parsed = listPricingRulesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listPricingRules(parsed.data);
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
      const pricingRule = await getPricingRuleById(req.params.id);
      if (!pricingRule) {
        throw new NotFoundError('Pricing rule not found');
      }
      res.json({ data: pricingRule });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createPricingRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const pricingRule = await createPricingRule({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: pricingRule });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getPricingRuleById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing rule not found');
      }

      const parsed = updatePricingRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const pricingRule = await updatePricingRule(req.params.id, parsed.data);
      res.json({ data: pricingRule });
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
      const existing = await getPricingRuleById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing rule not found');
      }

      const pricingRule = await archivePricingRule(req.params.id);
      res.json({ data: pricingRule });
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
      const existing = await getPricingRuleById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing rule not found');
      }

      const pricingRule = await restorePricingRule(req.params.id);
      res.json({ data: pricingRule });
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
      const existing = await getPricingRuleById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Pricing rule not found');
      }

      await deletePricingRule(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
