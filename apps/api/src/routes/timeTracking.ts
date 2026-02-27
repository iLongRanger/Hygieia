import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import { validate } from '../middleware/validate';
import {
  listTimeEntriesSchema,
  clockInSchema,
  clockOutSchema,
  manualEntrySchema,
  editTimeEntrySchema,
  listTimesheetsSchema,
  generateTimesheetSchema,
  rejectTimesheetSchema,
} from '../schemas/timeTracking';
import {
  listTimeEntries,
  getTimeEntryById,
  getActiveEntry,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  createManualEntry,
  editTimeEntry,
  approveTimeEntry,
  deleteTimeEntry,
  getUserTimeSummary,
} from '../services/timeTrackingService';
import {
  listTimesheets,
  getTimesheetById,
  generateTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  deleteTimesheet,
} from '../services/timesheetService';

const router = Router();

router.use(authenticate);

// ==================== Time Entries ====================

// List time entries
router.get(
  '/entries',
  requirePermission(PERMISSIONS.TIME_TRACKING_READ),
  validate(listTimeEntriesSchema),
  async (req: Request, res: Response) => {
    const { userId, jobId, contractId, facilityId, status, dateFrom, dateTo, page, limit } = req.query;
    const result = await listTimeEntries({
      userId: userId as string,
      jobId: jobId as string,
      contractId: contractId as string,
      facilityId: facilityId as string,
      status: status as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }
);

// Get active entry for current user
router.get('/active', async (req: Request, res: Response) => {
  const entry = await getActiveEntry(req.user!.id);
  res.json({ data: entry });
});

// Get time entry by ID
router.get('/entries/:id', requirePermission(PERMISSIONS.TIME_TRACKING_READ), async (req: Request, res: Response) => {
  const entry = await getTimeEntryById(req.params.id);
  res.json({ data: entry });
});

// Clock in
router.post(
  '/clock-in',
  validate(clockInSchema),
  async (req: Request, res: Response) => {
    const entry = await clockIn({
      userId: req.user!.id,
      ...req.body,
      userRole: req.user?.role,
    });
    res.status(201).json({ data: entry });
  }
);

// Clock out
router.post(
  '/clock-out',
  validate(clockOutSchema),
  async (req: Request, res: Response) => {
    const entry = await clockOut(
      req.user!.id,
      req.body.notes,
      req.body.geoLocation,
      req.user?.role
    );
    res.json({ data: entry });
  }
);

// Start break
router.post('/break/start', async (req: Request, res: Response) => {
  const entry = await startBreak(req.user!.id);
  res.json({ data: entry });
});

// End break
router.post('/break/end', async (req: Request, res: Response) => {
  const entry = await endBreak(req.user!.id);
  res.json({ data: entry });
});

// Create manual entry (admin)
router.post(
  '/entries/manual',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  validate(manualEntrySchema),
  async (req: Request, res: Response) => {
    const entry = await createManualEntry({
      ...req.body,
      clockIn: new Date(req.body.clockIn),
      clockOut: new Date(req.body.clockOut),
      createdByUserId: req.user!.id,
    });
    res.status(201).json({ data: entry });
  }
);

// Edit time entry (admin)
router.patch(
  '/entries/:id',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  validate(editTimeEntrySchema),
  async (req: Request, res: Response) => {
    const input = { ...req.body, editedByUserId: req.user!.id };
    if (input.clockIn) input.clockIn = new Date(input.clockIn);
    if (input.clockOut) input.clockOut = new Date(input.clockOut);
    const entry = await editTimeEntry(req.params.id, input);
    res.json({ data: entry });
  }
);

// Approve time entry
router.post(
  '/entries/:id/approve',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  async (req: Request, res: Response) => {
    const entry = await approveTimeEntry(req.params.id, req.user!.id);
    res.json({ data: entry });
  }
);

// Delete time entry
router.delete(
  '/entries/:id',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  async (req: Request, res: Response) => {
    await deleteTimeEntry(req.params.id);
    res.status(204).send();
  }
);

// Get user time summary
router.get('/summary/:userId', requirePermission(PERMISSIONS.TIME_TRACKING_READ), async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) {
    res.status(400).json({ error: 'dateFrom and dateTo are required' });
    return;
  }
  const summary = await getUserTimeSummary(
    req.params.userId,
    new Date(dateFrom as string),
    new Date(dateTo as string)
  );
  res.json({ data: summary });
});

// ==================== Timesheets ====================

// List timesheets
router.get(
  '/timesheets',
  requirePermission(PERMISSIONS.TIME_TRACKING_READ),
  validate(listTimesheetsSchema),
  async (req: Request, res: Response) => {
    const { userId, status, page, limit } = req.query;
    const result = await listTimesheets({
      userId: userId as string,
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }
);

// Get timesheet by ID
router.get('/timesheets/:id', requirePermission(PERMISSIONS.TIME_TRACKING_READ), async (req: Request, res: Response) => {
  const timesheet = await getTimesheetById(req.params.id);
  res.json({ data: timesheet });
});

// Generate timesheet
router.post(
  '/timesheets/generate',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  validate(generateTimesheetSchema),
  async (req: Request, res: Response) => {
    const timesheet = await generateTimesheet({
      userId: req.body.userId,
      periodStart: new Date(req.body.periodStart),
      periodEnd: new Date(req.body.periodEnd),
    });
    res.status(201).json({ data: timesheet });
  }
);

// Submit timesheet
router.post(
  '/timesheets/:id/submit',
  async (req: Request, res: Response) => {
    const timesheet = await submitTimesheet(req.params.id);
    res.json({ data: timesheet });
  }
);

// Approve timesheet
router.post(
  '/timesheets/:id/approve',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  async (req: Request, res: Response) => {
    const timesheet = await approveTimesheet(req.params.id, req.user!.id);
    res.json({ data: timesheet });
  }
);

// Reject timesheet
router.post(
  '/timesheets/:id/reject',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  validate(rejectTimesheetSchema),
  async (req: Request, res: Response) => {
    const timesheet = await rejectTimesheet(req.params.id, req.body.notes);
    res.json({ data: timesheet });
  }
);

// Delete timesheet
router.delete(
  '/timesheets/:id',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  async (req: Request, res: Response) => {
    await deleteTimesheet(req.params.id);
    res.status(204).send();
  }
);

export default router;
