import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getDashboardStats, TimePeriod } from '../services/dashboardService';
import { PERMISSIONS } from '../types';

const router: Router = Router();

const validPeriods: TimePeriod[] = ['week', 'month', 'quarter'];

router.get(
  '/stats',
  authenticate,
  requirePermission(PERMISSIONS.DASHBOARD_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodParam = req.query.period as string | undefined;
      const period: TimePeriod =
        periodParam && validPeriods.includes(periodParam as TimePeriod)
          ? (periodParam as TimePeriod)
          : 'month';
      const stats = await getDashboardStats(period);
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
