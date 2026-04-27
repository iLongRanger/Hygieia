import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { UnauthorizedError } from '../middleware/errorHandler';
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
  generateTimesheetsBulkSchema,
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
  generateTimesheetsBulk,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  deleteTimesheet,
} from '../services/timesheetService';

const router: Router = Router();

router.use(authenticate);

function requireAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }
  return req.user;
}

// ==================== Time Entries ====================

// List time entries
router.get(
  '/entries',
  requirePermission(PERMISSIONS.TIME_TRACKING_READ),
  validate(listTimeEntriesSchema),
  async (req: Request, res: Response) => {
    const { userId, jobId, contractId, facilityId, status, dateFrom, dateTo, page, limit } = req.query;

    const scopedUserId = req.user?.role === 'cleaner' ? req.user.id : (userId as string);

    const result = await listTimeEntries(
      {
        userId: scopedUserId,
        jobId: jobId as string,
        contractId: contractId as string,
        facilityId: facilityId as string,
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      {
        userRole: req.user?.role,
        userId: req.user?.id,
        userTeamId: req.user?.teamId ?? undefined,
      }
    );
    res.json(result);
  }
);

// Get active entry for current user
router.get('/active', requirePermission(PERMISSIONS.TIME_TRACKING_READ), async (req: Request, res: Response) => {
  const user = requireAuthenticatedUser(req);
  const entry = await getActiveEntry(user.id);
  res.json({ data: entry });
});

// Get time entry by ID
router.get('/entries/:id', requirePermission(PERMISSIONS.TIME_TRACKING_READ), async (req: Request, res: Response) => {
  const entry = await getTimeEntryById(req.params.id, {
    userRole: req.user?.role,
    userId: req.user?.id,
    userTeamId: req.user?.teamId ?? undefined,
  });
  res.json({ data: entry });
});

// Clock in
router.post(
  '/clock-in',
  requirePermission(PERMISSIONS.TIME_TRACKING_WRITE),
  validate(clockInSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      const entry = await clockIn({
        userId: user.id,
        ...req.body,
        userRole: user.role,
        userTeamId: user.teamId ?? null,
      });
      res.status(201).json({ data: entry });
    } catch (error) {
      next(error);
    }
  }
);

// Clock out
router.post(
  '/clock-out',
  requirePermission(PERMISSIONS.TIME_TRACKING_WRITE),
  validate(clockOutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      const entry = await clockOut(
        user.id,
        req.body.notes,
        req.body.geoLocation,
        user.role
      );
      res.json({ data: entry });
    } catch (error) {
      next(error);
    }
  }
);

// Start break
router.post('/break/start', requirePermission(PERMISSIONS.TIME_TRACKING_WRITE), async (req: Request, res: Response) => {
  const user = requireAuthenticatedUser(req);
  const entry = await startBreak(user.id);
  res.json({ data: entry });
});

// End break
router.post('/break/end', requirePermission(PERMISSIONS.TIME_TRACKING_WRITE), async (req: Request, res: Response) => {
  const user = requireAuthenticatedUser(req);
  const entry = await endBreak(user.id);
  res.json({ data: entry });
});

// Create manual entry (admin)
router.post(
  '/entries/manual',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  validate(manualEntrySchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const entry = await createManualEntry({
      ...req.body,
      clockIn: new Date(req.body.clockIn),
      clockOut: new Date(req.body.clockOut),
      createdByUserId: user.id,
    }, {
      userRole: user.role,
      userId: user.id,
      userTeamId: user.teamId ?? undefined,
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
    const user = requireAuthenticatedUser(req);
    const input = { ...req.body, editedByUserId: user.id };
    if (input.clockIn) input.clockIn = new Date(input.clockIn);
    if (input.clockOut) input.clockOut = new Date(input.clockOut);
    const entry = await editTimeEntry(req.params.id, input, {
      userRole: user.role,
      userId: user.id,
      userTeamId: user.teamId ?? undefined,
    });
    res.json({ data: entry });
  }
);

// Approve time entry
router.post(
  '/entries/:id/approve',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const entry = await approveTimeEntry(req.params.id, user.id, {
      userRole: user.role,
      userId: user.id,
      userTeamId: user.teamId ?? undefined,
    });
    res.json({ data: entry });
  }
);

// Delete time entry
router.delete(
  '/entries/:id',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  async (req: Request, res: Response) => {
    await deleteTimeEntry(req.params.id, {
      userRole: req.user?.role,
      userId: req.user?.id,
      userTeamId: req.user?.teamId ?? undefined,
    });
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

  // Cleaners can only view their own summary
  let targetUserId = req.params.userId;
  if (req.user?.role === 'cleaner') {
    targetUserId = req.user.id;
  } else if (req.user?.role === 'subcontractor' && req.user.teamId) {
    // Subcontractors can only view summaries for users on their team
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { teamId: true },
    });
    if (!targetUser || targetUser.teamId !== req.user.teamId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
  }

  const summary = await getUserTimeSummary(
    targetUserId,
    new Date(dateFrom as string),
    new Date(dateTo as string),
    {
      userRole: req.user?.role,
      userId: req.user?.id,
      userTeamId: req.user?.teamId ?? undefined,
    }
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

    const scopedUserId = req.user?.role === 'cleaner' ? req.user.id : (userId as string);

    const result = await listTimesheets(
      {
        userId: scopedUserId,
        status: status as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      {
        userRole: req.user?.role,
        userId: req.user?.id,
        userTeamId: req.user?.teamId ?? undefined,
      }
    );
    res.json(result);
  }
);

// Get timesheet by ID
router.get('/timesheets/:id', requirePermission(PERMISSIONS.TIME_TRACKING_READ), async (req: Request, res: Response) => {
  const timesheet = await getTimesheetById(req.params.id, {
    userRole: req.user?.role,
    userId: req.user?.id,
    userTeamId: req.user?.teamId ?? undefined,
  });
  res.json({ data: timesheet });
});

// Generate timesheet
router.post(
  '/timesheets/generate',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  validate(generateTimesheetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timesheet = await generateTimesheet({
        userId: req.body.userId,
        periodStart: new Date(req.body.periodStart),
        periodEnd: new Date(req.body.periodEnd),
      }, {
        userRole: req.user?.role,
        userId: req.user?.id,
        userTeamId: req.user?.teamId ?? undefined,
      });
      res.status(201).json({ data: timesheet });
    } catch (error) {
      next(error);
    }
  }
);

// Generate timesheets in bulk
router.post(
  '/timesheets/generate-bulk',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  validate(generateTimesheetsBulkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await generateTimesheetsBulk({
        userIds: req.body.userIds,
        periodStart: new Date(req.body.periodStart),
        periodEnd: new Date(req.body.periodEnd),
      }, {
        userRole: req.user?.role,
        userId: req.user?.id,
        userTeamId: req.user?.teamId ?? undefined,
      });
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Submit timesheet
router.post(
  '/timesheets/:id/submit',
  requirePermission(PERMISSIONS.TIME_TRACKING_WRITE),
  async (req: Request, res: Response) => {
    await getTimesheetById(req.params.id, {
      userRole: req.user?.role,
      userId: req.user?.id,
      userTeamId: req.user?.teamId ?? undefined,
    });
    const timesheet = await submitTimesheet(req.params.id);
    res.json({ data: timesheet });
  }
);

// Approve timesheet
router.post(
  '/timesheets/:id/approve',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    await getTimesheetById(req.params.id, {
      userRole: user.role,
      userId: user.id,
      userTeamId: user.teamId ?? undefined,
    });
    const timesheet = await approveTimesheet(req.params.id, user.id);
    res.json({ data: timesheet });
  }
);

// Reject timesheet
router.post(
  '/timesheets/:id/reject',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  validate(rejectTimesheetSchema),
  async (req: Request, res: Response) => {
    await getTimesheetById(req.params.id, {
      userRole: req.user?.role,
      userId: req.user?.id,
      userTeamId: req.user?.teamId ?? undefined,
    });
    const timesheet = await rejectTimesheet(req.params.id, req.body.notes);
    res.json({ data: timesheet });
  }
);

// Delete timesheet
router.delete(
  '/timesheets/:id',
  requirePermission(PERMISSIONS.TIME_TRACKING_APPROVE),
  async (req: Request, res: Response) => {
    await getTimesheetById(req.params.id, {
      userRole: req.user?.role,
      userId: req.user?.id,
      userTeamId: req.user?.teamId ?? undefined,
    });
    await deleteTimesheet(req.params.id);
    res.status(204).send();
  }
);

export default router;
