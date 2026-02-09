import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { sensitiveRateLimiter } from '../middleware/rateLimiter';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listTeams,
  getTeamById,
  createTeam,
  updateTeam,
  archiveTeam,
  restoreTeam,
} from '../services/teamService';
import { createTeamSchema, updateTeamSchema, listTeamsQuerySchema } from '../schemas/team';
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

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.TEAMS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listTeamsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listTeams(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TEAMS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await getTeamById(req.params.id);
      if (!team) {
        throw new NotFoundError('Team not found');
      }
      res.json({ data: team });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.TEAMS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const team = await createTeam({ ...parsed.data, createdByUserId: req.user.id });
      res.status(201).json({ data: team });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TEAMS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existing = await getTeamById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Team not found');
      }

      const team = await updateTeam(req.params.id, parsed.data);
      res.json({ data: team });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.TEAMS_ADMIN),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await archiveTeam(req.params.id);
      res.json({ data: team, message: 'Team archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.TEAMS_ADMIN),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await restoreTeam(req.params.id);
      res.json({ data: team, message: 'Team restored successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
