import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listTemplates,
  getTemplateById,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  archiveTemplate,
  restoreTemplate,
  deleteTemplate,
} from '../services/proposalTemplateService';
import {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
} from '../schemas/proposalTemplate';
import { ZodError } from 'zod';
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

// List all templates
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSAL_TEMPLATES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listTemplatesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const templates = await listTemplates(parsed.data.includeArchived);
      res.json({ data: templates });
    } catch (error) {
      next(error);
    }
  }
);

// Get default template
router.get(
  '/default',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSAL_TEMPLATES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await getDefaultTemplate();
      res.json({ data: template });
    } catch (error) {
      next(error);
    }
  }
);

// Get template by ID
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSAL_TEMPLATES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await getTemplateById(req.params.id);
      if (!template) {
        throw new NotFoundError('Template not found');
      }
      res.json({ data: template });
    } catch (error) {
      next(error);
    }
  }
);

// Create template
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSAL_TEMPLATES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const template = await createTemplate({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: template });
    } catch (error) {
      next(error);
    }
  }
);

// Update template
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSAL_TEMPLATES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existing = await getTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Template not found');
      }

      const template = await updateTemplate(req.params.id, parsed.data);
      res.json({ data: template });
    } catch (error) {
      next(error);
    }
  }
);

// Archive template
router.post(
  '/:id/archive',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSAL_TEMPLATES_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Template not found');
      }

      const template = await archiveTemplate(req.params.id);
      res.json({ data: template, message: 'Template archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Restore template
router.post(
  '/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSAL_TEMPLATES_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Template not found');
      }

      const template = await restoreTemplate(req.params.id);
      res.json({ data: template, message: 'Template restored successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Delete template
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSAL_TEMPLATES_DELETE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getTemplateById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Template not found');
      }

      await deleteTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
