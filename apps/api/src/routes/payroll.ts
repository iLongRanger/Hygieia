import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import { validate } from '../middleware/validate';
import {
  listPayrollRunsSchema,
  generatePayrollSchema,
  adjustPayrollEntrySchema,
} from '../schemas/payroll';
import {
  listPayrollRuns,
  getPayrollRunById,
  generatePayrollRun,
  approvePayrollRun,
  markPayrollRunPaid,
  adjustPayrollEntry,
  deletePayrollRun,
} from '../services/payrollService';

const router = Router();

router.use(authenticate);

// List payroll runs
router.get(
  '/',
  requirePermission(PERMISSIONS.PAYROLL_READ),
  validate(listPayrollRunsSchema),
  async (req: Request, res: Response) => {
    const { status, page, limit } = req.query;
    const result = await listPayrollRuns({
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }
);

// Get payroll run by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.PAYROLL_READ),
  async (req: Request, res: Response) => {
    const run = await getPayrollRunById(req.params.id, {
      userRole: req.user!.role,
      userId: req.user!.id,
    });
    res.json({ data: run });
  }
);

// Generate payroll run
router.post(
  '/generate',
  requirePermission(PERMISSIONS.PAYROLL_WRITE),
  validate(generatePayrollSchema),
  async (req: Request, res: Response) => {
    const run = await generatePayrollRun(req.body.periodStart, req.body.periodEnd);
    res.status(201).json({ data: run });
  }
);

// Approve payroll run
router.post(
  '/:id/approve',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  async (req: Request, res: Response) => {
    const run = await approvePayrollRun(req.params.id, req.user!.id);
    res.json({ data: run });
  }
);

// Mark payroll run as paid
router.post(
  '/:id/mark-paid',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  async (req: Request, res: Response) => {
    const run = await markPayrollRunPaid(req.params.id);
    res.json({ data: run });
  }
);

// Adjust payroll entry
router.patch(
  '/:id/entries/:entryId',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  validate(adjustPayrollEntrySchema),
  async (req: Request, res: Response) => {
    const run = await adjustPayrollEntry(
      req.params.entryId,
      req.body,
      req.user!.id
    );
    res.json({ data: run });
  }
);

// Delete payroll run (draft only)
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  async (req: Request, res: Response) => {
    await deletePayrollRun(req.params.id);
    res.status(204).send();
  }
);

export default router;
