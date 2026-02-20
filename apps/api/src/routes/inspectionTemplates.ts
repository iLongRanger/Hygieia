import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import { validate } from '../middleware/validate';
import {
  listInspectionTemplatesSchema,
  createInspectionTemplateSchema,
  updateInspectionTemplateSchema,
} from '../schemas/inspection';
import {
  listInspectionTemplates,
  getInspectionTemplateById,
  createInspectionTemplate,
  updateInspectionTemplate,
  archiveInspectionTemplate,
  restoreInspectionTemplate,
  getOrCreateTemplateForContract,
} from '../services/inspectionTemplateService';

const router = Router();

router.use(authenticate);

// List templates
router.get(
  '/',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  validate(listInspectionTemplatesSchema),
  async (req: Request, res: Response) => {
    const { facilityTypeFilter, includeArchived, page, limit } = req.query;

    const result = await listInspectionTemplates({
      facilityTypeFilter: facilityTypeFilter as string,
      includeArchived: includeArchived === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json(result);
  }
);

// Get or create template for a contract
router.get(
  '/by-contract/:contractId',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const template = await getOrCreateTemplateForContract(
      req.params.contractId,
      req.user!.id
    );
    res.json({ data: template });
  }
);

// Get template by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const template = await getInspectionTemplateById(req.params.id);
    res.json({ data: template });
  }
);

// Create template
router.post(
  '/',
  requirePermission(PERMISSIONS.INSPECTIONS_ADMIN),
  validate(createInspectionTemplateSchema),
  async (req: Request, res: Response) => {
    const template = await createInspectionTemplate({
      ...req.body,
      createdByUserId: req.user!.id,
    });
    res.status(201).json({ data: template });
  }
);

// Update template
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTIONS_ADMIN),
  validate(updateInspectionTemplateSchema),
  async (req: Request, res: Response) => {
    const template = await updateInspectionTemplate(req.params.id, req.body);
    res.json({ data: template });
  }
);

// Archive template
router.post(
  '/:id/archive',
  requirePermission(PERMISSIONS.INSPECTIONS_ADMIN),
  async (req: Request, res: Response) => {
    await archiveInspectionTemplate(req.params.id);
    res.status(204).send();
  }
);

// Restore template
router.post(
  '/:id/restore',
  requirePermission(PERMISSIONS.INSPECTIONS_ADMIN),
  async (req: Request, res: Response) => {
    await restoreInspectionTemplate(req.params.id);
    res.status(204).send();
  }
);

export default router;
