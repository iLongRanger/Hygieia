import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ValidationError } from '../middleware/errorHandler';
import { ZodError } from 'zod';
import {
  jobListQuerySchema,
  createJobSchema,
  updateJobSchema,
  completeJobSchema,
  completeInitialCleanForJobSchema,
  cancelJobSchema,
  assignJobSchema,
  startJobSchema,
  generateJobsSchema,
  createJobTaskSchema,
  updateJobTaskSchema,
  createJobNoteSchema,
} from '../schemas/job';
import {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  startJob,
  completeJob,
  completeInitialCleanForJob,
  cancelJob,
  assignJob,
  generateJobsFromContract,
  createJobTask,
  updateJobTask,
  deleteJobTask,
  createJobNote,
  deleteJobNote,
  listJobActivities,
} from '../services/jobService';
import { PERMISSIONS } from '../types';

const router: Router = Router();

function assertCanEditJob(req: Request): void {
  if (req.user?.role === 'subcontractor' || req.user?.role === 'cleaner') {
    throw new ValidationError('Insufficient permissions');
  }
}

function assertCanViewJob(req: Request, job: Awaited<ReturnType<typeof getJobById>>): void {
  if (!req.user || !job) {
    return;
  }

  if (req.user.role === 'cleaner' && job.assignedToUser?.id !== req.user.id) {
    throw new ValidationError('Insufficient permissions');
  }

  if (req.user.role === 'subcontractor') {
    const userTeamId = req.user.teamId ?? null;
    const assignedTeamId = job.assignedTeam?.id ?? null;
    const assignedToUserId = job.assignedToUser?.id ?? null;

    const hasAccess =
      assignedToUserId === req.user.id ||
      (Boolean(userTeamId) && assignedTeamId === userTeamId);

    if (!hasAccess) {
      throw new ValidationError('Insufficient permissions');
    }
  }
}

function assertCanGenerateRecurringJobs(req: Request): void {
  if (!req.user || !['owner', 'admin'].includes(req.user.role)) {
    throw new ValidationError('Only admin and owner can generate recurring jobs');
  }
}

function assertCanCreateJob(req: Request): void {
  if (!req.user || ['subcontractor', 'cleaner'].includes(req.user.role)) {
    throw new ValidationError('Only admin, owner, and manager can create jobs');
  }
}

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

// List jobs
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = jobListQuerySchema.safeParse(req.query);
      if (!parsed.success) throw handleZodError(parsed.error);

      const scopedParams = { ...parsed.data };
      if (req.user?.role === 'cleaner') {
        scopedParams.assignedToUserId = req.user.id;
      }

      const result = await listJobs(scopedParams, {
        userRole: req.user?.role,
        userTeamId: req.user?.teamId ?? undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Generate jobs from contract
router.post(
  '/generate',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanGenerateRecurringJobs(req);
      const parsed = generateJobsSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const result = await generateJobsFromContract({
        ...parsed.data,
        createdByUserId: req.user!.id,
      });
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Get job by ID
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      assertCanViewJob(req, job);
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);

// Create job
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanCreateJob(req);
      const parsed = createJobSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await createJob({
        ...parsed.data,
        createdByUserId: req.user!.id,
      });
      res.status(201).json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);

// Update job
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanEditJob(req);
      const parsed = updateJobSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await updateJob(req.params.id, parsed.data, req.user!.id);
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);

// Start job
router.post(
  '/:id/start',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = startJobSchema.safeParse(req.body || {});
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await startJob(req.params.id, req.user!.id, {
        managerOverride: parsed.data.managerOverride,
        overrideReason: parsed.data.overrideReason ?? null,
        userRole: req.user?.role,
        geoLocation: parsed.data.geoLocation ?? null,
      });
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);

// Complete job
router.post(
  '/:id/complete',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = completeJobSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await completeJob(req.params.id, {
        ...parsed.data,
        userId: req.user!.id,
        userRole: req.user?.role,
      });
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);

// Mark initial clean complete from the first eligible job
router.post(
  '/:id/complete-initial-clean',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanEditJob(req);
      const parsed = completeInitialCleanForJobSchema.safeParse(req.body || {});
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await completeInitialCleanForJob(req.params.id, req.user!.id);
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);

// Cancel job
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanEditJob(req);
      const parsed = cancelJobSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await cancelJob(req.params.id, parsed.data.reason ?? null, req.user!.id);
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);

// Assign job
router.post(
  '/:id/assign',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanEditJob(req);
      const parsed = assignJobSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await assignJob(
        req.params.id,
        parsed.data.assignedTeamId ?? null,
        parsed.data.assignedToUserId ?? null,
        req.user!.id
      );
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);

// Job tasks
router.post(
  '/:id/tasks',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanEditJob(req);
      const parsed = createJobTaskSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const task = await createJobTask(req.params.id, parsed.data);
      res.status(201).json({ data: task });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:jobId/tasks/:taskId',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanEditJob(req);
      const parsed = updateJobTaskSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const task = await updateJobTask(req.params.taskId, {
        ...parsed.data,
        completedByUserId: parsed.data.status === 'completed' ? req.user!.id : undefined,
      });
      res.json({ data: task });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:jobId/tasks/:taskId',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanEditJob(req);
      await deleteJobTask(req.params.taskId);
      res.json({ data: { id: req.params.taskId } });
    } catch (error) {
      next(error);
    }
  }
);

// Job notes
router.post(
  '/:id/notes',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertCanEditJob(req);
      const parsed = createJobNoteSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const note = await createJobNote(req.params.id, {
        ...parsed.data,
        createdByUserId: req.user!.id,
      });
      res.status(201).json({ data: note });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:jobId/notes/:noteId',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteJobNote(req.params.noteId);
      res.json({ data: { id: req.params.noteId } });
    } catch (error) {
      next(error);
    }
  }
);

// Job activities
router.get(
  '/:id/activities',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activities = await listJobActivities(req.params.id);
      res.json({ data: activities });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
