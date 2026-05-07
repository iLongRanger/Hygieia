import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import { exportSystemConfiguration } from '../services/systemConfigExportService';

const router: Router = Router();

router.get(
  '/export',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await exportSystemConfiguration();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
