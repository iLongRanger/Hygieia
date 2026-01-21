import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  archiveLead,
  restoreLead,
  deleteLead,
  convertLead,
  canConvertLead,
} from '../services/leadService';
import {
  createLeadSchema,
  updateLeadSchema,
  listLeadsQuerySchema,
  convertLeadSchema,
} from '../schemas/lead';
import { BadRequestError } from '../middleware/errorHandler';
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
      const parsed = listLeadsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listLeads(parsed.data);
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
      const lead = await getLeadById(req.params.id);
      if (!lead) {
        throw new NotFoundError('Lead not found');
      }
      res.json({ data: lead });
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
      const parsed = createLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const lead = await createLead({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: lead });
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
      const existing = await getLeadById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Lead not found');
      }

      const parsed = updateLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const lead = await updateLead(req.params.id, parsed.data);
      res.json({ data: lead });
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
      const existing = await getLeadById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Lead not found');
      }

      const lead = await archiveLead(req.params.id);
      res.json({ data: lead });
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
      const existing = await getLeadById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Lead not found');
      }

      const lead = await restoreLead(req.params.id);
      res.json({ data: lead });
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
      const existing = await getLeadById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Lead not found');
      }

      await deleteLead(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// Lead Conversion Routes
// ============================================================

/** Check if a lead can be converted */
router.get(
  '/:id/can-convert',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await canConvertLead(req.params.id);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/** Convert a lead to an account */
router.post(
  '/:id/convert',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = convertLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      // Check if lead can be converted
      const canConvert = await canConvertLead(req.params.id);
      if (!canConvert.canConvert) {
        throw new BadRequestError(canConvert.reason || 'Lead cannot be converted');
      }

      const result = await convertLead(req.params.id, {
        ...parsed.data,
        userId: req.user.id,
      });

      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
