import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import { validate } from '../middleware/validate';
import {
  listInspectionsSchema,
  createInspectionSchema,
  updateInspectionSchema,
  completeInspectionSchema,
  cancelInspectionSchema,
  addInspectionItemSchema,
  updateInspectionItemSchema,
} from '../schemas/inspection';
import {
  listInspections,
  getInspectionById,
  createInspection,
  updateInspection,
  startInspection,
  completeInspection,
  cancelInspection,
  addInspectionItem,
  updateInspectionItem,
  deleteInspectionItem,
  listInspectionActivities,
} from '../services/inspectionService';

const router = Router();

router.use(authenticate);

// List inspections
router.get(
  '/',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  validate(listInspectionsSchema),
  async (req: Request, res: Response) => {
    const {
      facilityId, accountId, contractId, jobId, inspectorUserId,
      status, dateFrom, dateTo, minScore, maxScore, page, limit,
    } = req.query;

    const result = await listInspections({
      facilityId: facilityId as string,
      accountId: accountId as string,
      contractId: contractId as string,
      jobId: jobId as string,
      inspectorUserId: inspectorUserId as string,
      status: status as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json(result);
  }
);

// Get inspection by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const inspection = await getInspectionById(req.params.id);
    res.json({ data: inspection });
  }
);

// Create inspection
router.post(
  '/',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(createInspectionSchema),
  async (req: Request, res: Response) => {
    const inspection = await createInspection({
      ...req.body,
      scheduledDate: new Date(req.body.scheduledDate),
      createdByUserId: req.user!.id,
    });
    res.status(201).json({ data: inspection });
  }
);

// Update inspection
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(updateInspectionSchema),
  async (req: Request, res: Response) => {
    const input = { ...req.body };
    if (input.scheduledDate) input.scheduledDate = new Date(input.scheduledDate);
    const inspection = await updateInspection(req.params.id, input);
    res.json({ data: inspection });
  }
);

// Start inspection
router.post(
  '/:id/start',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  async (req: Request, res: Response) => {
    const inspection = await startInspection(req.params.id, req.user!.id);
    res.json({ data: inspection });
  }
);

// Complete inspection
router.post(
  '/:id/complete',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(completeInspectionSchema),
  async (req: Request, res: Response) => {
    const inspection = await completeInspection(req.params.id, {
      ...req.body,
      userId: req.user!.id,
    });
    res.json({ data: inspection });
  }
);

// Cancel inspection
router.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(cancelInspectionSchema),
  async (req: Request, res: Response) => {
    const inspection = await cancelInspection(
      req.params.id,
      req.user!.id,
      req.body.reason
    );
    res.json({ data: inspection });
  }
);

// Add item to inspection
router.post(
  '/:id/items',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(addInspectionItemSchema),
  async (req: Request, res: Response) => {
    const item = await addInspectionItem(req.params.id, req.body);
    res.status(201).json({ data: item });
  }
);

// Update inspection item
router.patch(
  '/:id/items/:itemId',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(updateInspectionItemSchema),
  async (req: Request, res: Response) => {
    const item = await updateInspectionItem(req.params.itemId, req.body);
    res.json({ data: item });
  }
);

// Delete inspection item
router.delete(
  '/:id/items/:itemId',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  async (req: Request, res: Response) => {
    await deleteInspectionItem(req.params.itemId);
    res.status(204).send();
  }
);

// Get inspection activities
router.get(
  '/:id/activities',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const activities = await listInspectionActivities(req.params.id);
    res.json({ data: activities });
  }
);

export default router;
