export interface FinanceOverview {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  outstandingAR: number;
  overdueInvoices: number;
  upcomingPayroll: number;
  periodLabel: string;
}

export interface ArAgingInvoice {
  id: string;
  invoiceNumber: string;
  accountName: string;
  totalAmount: string;
  balanceDue: string;
  dueDate: string;
  daysOverdue: number;
}

export interface ArAgingBucket {
  label: string;
  min: number;
  max: number | null;
  total: number;
  count: number;
  invoices: ArAgingInvoice[];
}

export interface ArAgingReport {
  buckets: ArAgingBucket[];
  summary: { totalOutstanding: number; totalOverdue: number };
}

export interface ProfitabilityRow {
  id: string;
  name: string;
  revenue: number;
  expenses: number;
  labor: number;
  profit: number;
  margin: number;
}

export interface RevenueRow {
  accountId: string;
  accountName: string;
  monthlyRevenue: Record<string, number>;
  total: number;
}

export interface RevenueReport {
  rows: RevenueRow[];
  monthLabels: string[];
  grandTotal: number;
}

export interface ExpenseSummaryRow {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
}

export interface LaborCostRow {
  userId: string;
  userName: string;
  userRole: string;
  payType: string;
  totalHours: number;
  totalGrossPay: number;
  entriesCount: number;
}

export interface PayrollSummaryRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalGrossPay: string;
  totalEntries: number;
  approvedAt: string | null;
  paidAt: string | null;
}
