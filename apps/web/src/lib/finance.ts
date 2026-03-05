import api from './api';
import type { FinanceOverview, ArAgingReport, ProfitabilityRow, RevenueReport, ExpenseSummaryRow, LaborCostRow, PayrollSummaryRow } from '../types/finance';

export interface DateRangeParams {
  dateFrom?: string;
  dateTo?: string;
}

export async function getFinanceOverview(params: DateRangeParams = {}): Promise<FinanceOverview> {
  const response = await api.get('/finance/overview', { params });
  return response.data.data;
}

export async function getArAgingReport(): Promise<ArAgingReport> {
  const response = await api.get('/finance/reports/ar-aging');
  return response.data.data;
}

export async function getProfitabilityReport(params: DateRangeParams & { groupBy?: string } = {}): Promise<{ rows: ProfitabilityRow[]; summary: { totalRevenue: number; totalProfit: number } }> {
  const response = await api.get('/finance/reports/profitability', { params });
  return response.data.data;
}

export async function getRevenueReport(params: DateRangeParams = {}): Promise<RevenueReport> {
  const response = await api.get('/finance/reports/revenue', { params });
  return response.data.data;
}

export async function getExpenseSummaryReport(params: DateRangeParams = {}): Promise<{ rows: ExpenseSummaryRow[]; grandTotal: number }> {
  const response = await api.get('/finance/reports/expenses', { params });
  return response.data.data;
}

export async function getLaborCostReport(params: DateRangeParams = {}): Promise<{ rows: LaborCostRow[]; grandTotal: number }> {
  const response = await api.get('/finance/reports/labor-costs', { params });
  return response.data.data;
}

export async function getPayrollSummaryReport(params: DateRangeParams = {}): Promise<{ rows: PayrollSummaryRow[]; summary: { totalPaid: number; totalApproved: number; totalDraft: number } }> {
  const response = await api.get('/finance/reports/payroll-summary', { params });
  return response.data.data;
}
