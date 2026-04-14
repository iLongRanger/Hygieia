import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import {
  getFinanceOverview,
  getArAgingReport,
  getProfitabilityReport,
  getRevenueReport,
  getExpenseSummaryReport,
  getLaborCostReport,
  getPayrollSummaryReport,
} from '../services/financeReportService';

const router: Router = Router();

router.use(authenticate);

function parseDateParam(value: unknown): Date | undefined {
  if (typeof value === 'string' && value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

// Finance overview / KPIs
router.get(
  '/overview',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = parseDateParam(req.query.dateFrom);
      const dateTo = parseDateParam(req.query.dateTo);
      const data = await getFinanceOverview(dateFrom, dateTo);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// AR Aging Report
router.get(
  '/reports/ar-aging',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getArAgingReport();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// Profitability Report
router.get(
  '/reports/profitability',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = parseDateParam(req.query.dateFrom);
      const dateTo = parseDateParam(req.query.dateTo);
      const groupBy = req.query.groupBy === 'facility' ? 'facility' : 'contract';
      const data = await getProfitabilityReport(dateFrom, dateTo, groupBy);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// Revenue Report
router.get(
  '/reports/revenue',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = parseDateParam(req.query.dateFrom);
      const dateTo = parseDateParam(req.query.dateTo);
      const data = await getRevenueReport(dateFrom, dateTo);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// Expense Summary Report
router.get(
  '/reports/expenses',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = parseDateParam(req.query.dateFrom);
      const dateTo = parseDateParam(req.query.dateTo);
      const data = await getExpenseSummaryReport(dateFrom, dateTo);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// Labor Cost Report
router.get(
  '/reports/labor-costs',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = parseDateParam(req.query.dateFrom);
      const dateTo = parseDateParam(req.query.dateTo);
      const data = await getLaborCostReport(dateFrom, dateTo);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// Payroll Summary Report
router.get(
  '/reports/payroll-summary',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = parseDateParam(req.query.dateFrom);
      const dateTo = parseDateParam(req.query.dateTo);
      const data = await getPayrollSummaryReport(dateFrom, dateTo);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
