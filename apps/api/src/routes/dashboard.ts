import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getDashboardStats } from '../services/dashboardService';
import { PERMISSIONS } from '../types';

const router: Router = Router();

router.get(
  '/stats',
  authenticate,
  requirePermission(PERMISSIONS.DASHBOARD_READ),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await getDashboardStats();
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
