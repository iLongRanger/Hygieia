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
        userTeamId: req.user?.teamId,
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
      if (req.user?.role === 'cleaner' && job.assignedToUser?.id !== req.user.id) {
        throw new ValidationError('Insufficient permissions');
      }
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
      });
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
