import { Router, Request, Response } from 'express';
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

const router = Router();

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
  async (req: Request, res: Response) => {
    const dateFrom = parseDateParam(req.query.dateFrom);
    const dateTo = parseDateParam(req.query.dateTo);
    const data = await getFinanceOverview(dateFrom, dateTo);
    res.json({ data });
  }
);

// AR Aging Report
router.get(
  '/reports/ar-aging',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response) => {
    const data = await getArAgingReport();
    res.json({ data });
  }
);

// Profitability Report
router.get(
  '/reports/profitability',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response) => {
    const dateFrom = parseDateParam(req.query.dateFrom);
    const dateTo = parseDateParam(req.query.dateTo);
    const groupBy = req.query.groupBy === 'facility' ? 'facility' : 'contract';
    const data = await getProfitabilityReport(dateFrom, dateTo, groupBy);
    res.json({ data });
  }
);

// Revenue Report
router.get(
  '/reports/revenue',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response) => {
    const dateFrom = parseDateParam(req.query.dateFrom);
    const dateTo = parseDateParam(req.query.dateTo);
    const data = await getRevenueReport(dateFrom, dateTo);
    res.json({ data });
  }
);

// Expense Summary Report
router.get(
  '/reports/expenses',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response) => {
    const dateFrom = parseDateParam(req.query.dateFrom);
    const dateTo = parseDateParam(req.query.dateTo);
    const data = await getExpenseSummaryReport(dateFrom, dateTo);
    res.json({ data });
  }
);

// Labor Cost Report
router.get(
  '/reports/labor-costs',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response) => {
    const dateFrom = parseDateParam(req.query.dateFrom);
    const dateTo = parseDateParam(req.query.dateTo);
    const data = await getLaborCostReport(dateFrom, dateTo);
    res.json({ data });
  }
);

// Payroll Summary Report
router.get(
  '/reports/payroll-summary',
  requirePermission(PERMISSIONS.FINANCE_REPORTS_READ),
  async (req: Request, res: Response) => {
    const dateFrom = parseDateParam(req.query.dateFrom);
    const dateTo = parseDateParam(req.query.dateTo);
    const data = await getPayrollSummaryReport(dateFrom, dateTo);
    res.json({ data });
  }
);

export default router;
