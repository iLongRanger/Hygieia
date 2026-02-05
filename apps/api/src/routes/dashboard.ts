import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getDashboardStats } from '../services/dashboardService';

const router: Router = Router();

router.get(
  '/stats',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
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
