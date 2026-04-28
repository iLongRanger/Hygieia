import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import { validate } from '../middleware/validate';
import { UnauthorizedError, ForbiddenError } from '../middleware/errorHandler';
import { ensureManagerAccountAccess, ensureOwnershipAccess } from '../middleware/ownership';
import {
  listInspectionsSchema,
  createInspectionSchema,
  updateInspectionSchema,
  completeInspectionSchema,
  cancelInspectionSchema,
  addInspectionItemSchema,
  updateInspectionItemSchema,
  createInspectionCorrectiveActionSchema,
  updateInspectionCorrectiveActionSchema,
  verifyInspectionCorrectiveActionSchema,
  createInspectionSignoffSchema,
  createReinspectionSchema,
  createInspectionItemFeedbackSchema,
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
  listInspectionCorrectiveActions,
  createInspectionCorrectiveAction,
  updateInspectionCorrectiveAction,
  verifyInspectionCorrectiveAction,
  listInspectionSignoffs,
  createInspectionSignoff,
  createReinspection,
  listInspectionActivities,
  createInspectionItemFeedback,
  listInspectionItemFeedback,
} from '../services/inspectionService';

const router: Router = Router();

router.use(authenticate);

function requireAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }
  return req.user;
}

async function assertInspectionAccess(
  req: Request,
  inspection: { accountId: string; contractId: string | null }
) {
  if (req.user?.role === 'manager') {
    await ensureManagerAccountAccess(req.user, inspection.accountId, {
      path: req.path,
      method: req.method,
    });
    return;
  }
  if (req.user?.role === 'cleaner' || req.user?.role === 'subcontractor') {
    if (!inspection.contractId) {
      throw new ForbiddenError('Access denied');
    }
    await ensureOwnershipAccess(req.user, {
      resourceType: 'contract',
      resourceId: inspection.contractId,
      path: req.path,
      method: req.method,
    });
  }
}

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

    const result = await listInspections(
      {
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
      },
      {
        userRole: req.user?.role,
        userId: req.user?.id,
        userTeamId: req.user?.teamId ?? null,
      }
    );

    res.json(result);
  }
);

// Get inspection by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const inspection = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, inspection);
    res.json({ data: inspection });
  }
);

// Create inspection
router.post(
  '/',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(createInspectionSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    if (req.user?.role === 'manager') {
      await ensureManagerAccountAccess(req.user, req.body.accountId, {
        path: req.path,
        method: req.method,
      });
    }

    const inspection = await createInspection({
      ...req.body,
      scheduledDate: new Date(req.body.scheduledDate + 'T12:00:00'),
      createdByUserId: user.id,
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
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const input = { ...req.body };
    if (input.scheduledDate) input.scheduledDate = new Date(input.scheduledDate + 'T12:00:00');
    const inspection = await updateInspection(req.params.id, input);
    res.json({ data: inspection });
  }
);

// Start inspection
router.post(
  '/:id/start',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      const existing = await getInspectionById(req.params.id);
      await assertInspectionAccess(req, existing);

      const inspection = await startInspection(req.params.id, user.id);
      res.json({ data: inspection });
    } catch (error) {
      next(error);
    }
  }
);

// Complete inspection
router.post(
  '/:id/complete',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(completeInspectionSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const inspection = await completeInspection(req.params.id, {
      ...req.body,
      defaultActionDueDate: req.body.defaultActionDueDate
        ? new Date(req.body.defaultActionDueDate)
        : undefined,
      userId: user.id,
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
    const user = requireAuthenticatedUser(req);
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const inspection = await cancelInspection(
      req.params.id,
      user.id,
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
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

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
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const item = await updateInspectionItem(req.params.id, req.params.itemId, req.body);
    res.json({ data: item });
  }
);

// Delete inspection item
router.delete(
  '/:id/items/:itemId',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  async (req: Request, res: Response) => {
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    await deleteInspectionItem(req.params.id, req.params.itemId);
    res.status(204).send();
  }
);

// List corrective actions
router.get(
  '/:id/actions',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const actions = await listInspectionCorrectiveActions(req.params.id);
    res.json({ data: actions });
  }
);

// Add corrective action
router.post(
  '/:id/actions',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(createInspectionCorrectiveActionSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const action = await createInspectionCorrectiveAction(
      req.params.id,
      {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : req.body.dueDate,
      },
      user.id
    );
    res.status(201).json({ data: action });
  }
);

// Update corrective action
router.patch(
  '/:id/actions/:actionId',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(updateInspectionCorrectiveActionSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const action = await updateInspectionCorrectiveAction(
      req.params.id,
      req.params.actionId,
      {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : req.body.dueDate,
      },
      user.id
    );
    res.json({ data: action });
  }
);

// Verify corrective action
router.post(
  '/:id/actions/:actionId/verify',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(verifyInspectionCorrectiveActionSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const action = await verifyInspectionCorrectiveAction(
      req.params.id,
      req.params.actionId,
      user.id,
      req.body.notes
    );
    res.json({ data: action });
  }
);

// List signoffs
router.get(
  '/:id/signoffs',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const signoffs = await listInspectionSignoffs(req.params.id);
    res.json({ data: signoffs });
  }
);

// Add signoff
router.post(
  '/:id/signoffs',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(createInspectionSignoffSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const signoff = await createInspectionSignoff(req.params.id, req.body, user.id);
    res.status(201).json({ data: signoff });
  }
);

// Create reinspection from failed items
router.post(
  '/:id/reinspect',
  requirePermission(PERMISSIONS.INSPECTIONS_WRITE),
  validate(createReinspectionSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const inspection = await createReinspection(
      req.params.id,
      {
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate + 'T12:00:00') : undefined,
      },
      user.id
    );
    res.status(201).json({ data: inspection });
  }
);

// Get inspection activities
router.get(
  '/:id/activities',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const existing = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, existing);

    const activities = await listInspectionActivities(req.params.id);
    res.json({ data: activities });
  }
);

// List feedback for an inspection item
router.get(
  '/:id/items/:itemId/feedback',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const inspection = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, inspection);

    const feedback = await listInspectionItemFeedback(req.params.id, req.params.itemId);
    res.json({ data: feedback });
  }
);

// Create feedback on an inspection item
router.post(
  '/:id/items/:itemId/feedback',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  validate(createInspectionItemFeedbackSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const inspection = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, inspection);

    const feedback = await createInspectionItemFeedback(
      req.params.id,
      req.params.itemId,
      {
        body: req.body.body,
        authorUserId: user.id,
      }
    );
    res.status(201).json({ data: feedback });
  }
);

export default router;
