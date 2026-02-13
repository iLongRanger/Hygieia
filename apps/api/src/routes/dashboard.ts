import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  getDashboardStats,
  exportDashboardCsv,
  TimePeriod,
  ExportType,
} from '../services/dashboardService';
import { PERMISSIONS } from '../types';

const router: Router = Router();

const validPeriods: TimePeriod[] = ['week', 'month', 'quarter'];
const validExportTypes: ExportType[] = ['leads', 'contracts', 'proposals', 'accounts'];

router.get(
  '/stats',
  authenticate,
  requirePermission(PERMISSIONS.DASHBOARD_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodParam = req.query.period as string | undefined;
      const dateFromParam = req.query.dateFrom as string | undefined;
      const dateToParam = req.query.dateTo as string | undefined;

      const period: TimePeriod =
        periodParam && validPeriods.includes(periodParam as TimePeriod)
          ? (periodParam as TimePeriod)
          : 'month';

      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      if (dateFromParam && dateToParam) {
        dateFrom = new Date(dateFromParam);
        dateTo = new Date(dateToParam);
        if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
          dateFrom = undefined;
          dateTo = undefined;
        }
      }

      const stats = await getDashboardStats({ period, dateFrom, dateTo });
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/export',
  authenticate,
  requirePermission(PERMISSIONS.DASHBOARD_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const typeParam = req.query.type as string | undefined;

      if (!typeParam || !validExportTypes.includes(typeParam as ExportType)) {
        res.status(400).json({
          error: `Invalid export type. Must be one of: ${validExportTypes.join(', ')}`,
        });
        return;
      }

      const csv = await exportDashboardCsv(typeParam as ExportType);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${typeParam}-export-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
