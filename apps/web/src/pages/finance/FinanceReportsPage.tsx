import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import {
  getArAgingReport,
  getProfitabilityReport,
  getRevenueReport,
  getExpenseSummaryReport,
  getLaborCostReport,
  getPayrollSummaryReport,
} from '../../lib/finance';
import type {
  ArAgingReport,
  ArAgingBucket,
  ProfitabilityRow,
  RevenueReport,
  RevenueRow,
  ExpenseSummaryRow,
  LaborCostRow,
  PayrollSummaryRow,
} from '../../types/finance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey =
  | 'ar-aging'
  | 'profitability'
  | 'revenue'
  | 'expenses'
  | 'labor-costs'
  | 'payroll-summary';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ar-aging', label: 'AR Aging' },
  { key: 'profitability', label: 'Profitability' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'labor-costs', label: 'Labor Costs' },
  { key: 'payroll-summary', label: 'Payroll Summary' },
];

// ---------------------------------------------------------------------------
// Date range filter (shared by most tabs)
// ---------------------------------------------------------------------------

interface DateFilterProps {
  dateFrom: string;
  dateTo: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
}

function DateFilter({ dateFrom, dateTo, setDateFrom, setDateTo }: DateFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-full sm:w-44">
        <Input
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </div>
      <div className="w-full sm:w-44">
        <Input
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>
      {(dateFrom || dateTo) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDateFrom('');
            setDateTo('');
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AR Aging Tab
// ---------------------------------------------------------------------------

function ArAgingTab() {
  const [report, setReport] = useState<ArAgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getArAgingReport()
      .then(setReport)
      .catch(() => toast.error('Failed to load AR Aging report'))
      .finally(() => setLoading(false));
  }, []);

  const toggleBucket = (label: string) => {
    setExpandedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleExport = () => {
    if (!report) return;
    const rows = [
      ['Bucket', 'Invoice #', 'Account', 'Total Amount', 'Balance Due', 'Due Date', 'Days Overdue'],
    ];
    for (const bucket of report.buckets) {
      for (const inv of bucket.invoices) {
        rows.push([
          escapeCsv(bucket.label),
          escapeCsv(inv.invoiceNumber),
          escapeCsv(inv.accountName),
          escapeCsv(inv.totalAmount),
          escapeCsv(inv.balanceDue),
          escapeCsv(inv.dueDate),
          escapeCsv(inv.daysOverdue),
        ]);
      }
    }
    downloadCsv('ar-aging-report.csv', rows.map((r) => r.join(',')).join('\n'));
  };

  if (loading) return <LoadingSpinner />;
  if (!report) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          AR Aging is always based on current outstanding invoices.
        </p>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
            Total Outstanding
          </p>
          <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-50">
            {formatCurrency(report.summary.totalOutstanding)}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
            Total Overdue
          </p>
          <p className="mt-1 text-2xl font-bold text-error-700 dark:text-error-400">
            {formatCurrency(report.summary.totalOverdue)}
          </p>
        </Card>
      </div>

      {/* Bucket cards */}
      <div className="space-y-3">
        {report.buckets.map((bucket: ArAgingBucket) => {
          const isExpanded = expandedBuckets.has(bucket.label);
          return (
            <Card key={bucket.label} noPadding>
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => toggleBucket(bucket.label)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-surface-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-surface-400" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                      {bucket.label}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      {bucket.count} invoice{bucket.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-surface-900 dark:text-surface-50">
                  {formatCurrency(bucket.total)}
                </p>
              </button>
              {isExpanded && bucket.invoices.length > 0 && (
                <div className="border-t border-surface-200 dark:border-surface-700">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-50 dark:bg-surface-800/50">
                        <tr>
                          <th className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                            Invoice #
                          </th>
                          <th className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                            Account
                          </th>
                          <th className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                            Total
                          </th>
                          <th className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                            Balance Due
                          </th>
                          <th className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                            Due Date
                          </th>
                          <th className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                            Days Overdue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                        {bucket.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="px-6 py-3 font-medium text-surface-900 dark:text-surface-100">
                              {inv.invoiceNumber}
                            </td>
                            <td className="px-6 py-3 text-surface-700 dark:text-surface-300">
                              {inv.accountName}
                            </td>
                            <td className="px-6 py-3 text-surface-700 dark:text-surface-300">
                              {formatCurrency(inv.totalAmount)}
                            </td>
                            <td className="px-6 py-3 text-surface-700 dark:text-surface-300">
                              {formatCurrency(inv.balanceDue)}
                            </td>
                            <td className="px-6 py-3 text-surface-700 dark:text-surface-300">
                              {new Date(inv.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-3">
                              <Badge
                                variant={inv.daysOverdue > 60 ? 'error' : inv.daysOverdue > 0 ? 'warning' : 'success'}
                                size="sm"
                              >
                                {inv.daysOverdue > 0 ? `${inv.daysOverdue} days` : 'Current'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profitability Tab
// ---------------------------------------------------------------------------

function ProfitabilityTab() {
  const [rows, setRows] = useState<ProfitabilityRow[]>([]);
  const [summary, setSummary] = useState<{ totalRevenue: number; totalProfit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProfitabilityReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(data.rows);
      setSummary(data.summary);
    } catch {
      toast.error('Failed to load profitability report');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleExport = () => {
    const csvRows = [
      ['Name', 'Revenue', 'Expenses', 'Labor', 'Profit', 'Margin'],
      ...rows.map((r) => [
        escapeCsv(r.name),
        r.revenue.toFixed(2),
        r.expenses.toFixed(2),
        r.labor.toFixed(2),
        r.profit.toFixed(2),
        r.margin.toFixed(1) + '%',
      ]),
    ];
    downloadCsv('profitability-report.csv', csvRows.map((r) => r.join(',')).join('\n'));
  };

  const columns = [
    {
      header: 'Name',
      cell: (row: ProfitabilityRow) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {row.name}
        </span>
      ),
    },
    {
      header: 'Revenue',
      cell: (row: ProfitabilityRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {formatCurrency(row.revenue)}
        </span>
      ),
    },
    {
      header: 'Expenses',
      cell: (row: ProfitabilityRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {formatCurrency(row.expenses)}
        </span>
      ),
    },
    {
      header: 'Labor',
      cell: (row: ProfitabilityRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {formatCurrency(row.labor)}
        </span>
      ),
    },
    {
      header: 'Profit',
      cell: (row: ProfitabilityRow) => (
        <span
          className={cn(
            'text-sm font-medium',
            row.profit >= 0
              ? 'text-success-700 dark:text-success-400'
              : 'text-error-700 dark:text-error-400'
          )}
        >
          {formatCurrency(row.profit)}
        </span>
      ),
    },
    {
      header: 'Margin',
      cell: (row: ProfitabilityRow) => (
        <Badge
          variant={row.margin >= 20 ? 'success' : row.margin >= 0 ? 'warning' : 'error'}
          size="sm"
        >
          {formatPercent(row.margin)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
        />
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <Card noPadding>
        <Table columns={columns} data={rows} isLoading={loading} />
        {!loading && summary && rows.length > 0 && (
          <div className="border-t border-surface-200 bg-surface-50 px-6 py-3 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                Summary
              </span>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-surface-600 dark:text-surface-400">
                  Revenue: <strong>{formatCurrency(summary.totalRevenue)}</strong>
                </span>
                <span
                  className={cn(
                    summary.totalProfit >= 0
                      ? 'text-success-700 dark:text-success-400'
                      : 'text-error-700 dark:text-error-400'
                  )}
                >
                  Profit: <strong>{formatCurrency(summary.totalProfit)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue Tab
// ---------------------------------------------------------------------------

function RevenueTab() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRevenueReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setReport(data);
    } catch {
      toast.error('Failed to load revenue report');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleExport = () => {
    if (!report) return;
    const headers = ['Account', ...report.monthLabels, 'Total'];
    const csvRows = [
      headers,
      ...report.rows.map((r: RevenueRow) => [
        escapeCsv(r.accountName),
        ...report.monthLabels.map((m) => (r.monthlyRevenue[m] ?? 0).toFixed(2)),
        r.total.toFixed(2),
      ]),
    ];
    downloadCsv('revenue-report.csv', csvRows.map((r) => r.join(',')).join('\n'));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <DateFilter dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
        />
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={!report || report.rows.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      {report && (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Account
                  </th>
                  {report.monthLabels.map((m) => (
                    <th
                      key={m}
                      className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {report.rows.map((row: RevenueRow) => (
                  <tr key={row.accountId} className="hover:bg-surface-100 dark:hover:bg-surface-800/50">
                    <td className="px-6 py-4 font-medium text-surface-900 dark:text-surface-100">
                      {row.accountName}
                    </td>
                    {report.monthLabels.map((m) => (
                      <td
                        key={m}
                        className="px-6 py-4 text-right text-surface-700 dark:text-surface-300"
                      >
                        {formatCurrency(row.monthlyRevenue[m] ?? 0)}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right font-medium text-surface-900 dark:text-surface-100">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-surface-300 bg-surface-50 dark:border-surface-600 dark:bg-surface-800/50">
                <tr>
                  <td className="px-6 py-3 text-sm font-bold text-surface-900 dark:text-surface-50">
                    Grand Total
                  </td>
                  {report.monthLabels.map((m) => (
                    <td
                      key={m}
                      className="px-6 py-3 text-right text-sm font-bold text-surface-900 dark:text-surface-50"
                    >
                      {formatCurrency(
                        report.rows.reduce((sum: number, r: RevenueRow) => sum + (r.monthlyRevenue[m] ?? 0), 0)
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-3 text-right text-sm font-bold text-surface-900 dark:text-surface-50">
                    {formatCurrency(report.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expenses Tab
// ---------------------------------------------------------------------------

function ExpensesTab() {
  const [rows, setRows] = useState<ExpenseSummaryRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getExpenseSummaryReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(data.rows);
      setGrandTotal(data.grandTotal);
    } catch {
      toast.error('Failed to load expense summary');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleExport = () => {
    const csvRows = [
      ['Category', 'Total', 'Count'],
      ...rows.map((r) => [escapeCsv(r.categoryName), r.total.toFixed(2), String(r.count)]),
    ];
    downloadCsv('expense-summary-report.csv', csvRows.map((r) => r.join(',')).join('\n'));
  };

  const columns = [
    {
      header: 'Category',
      cell: (row: ExpenseSummaryRow) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {row.categoryName}
        </span>
      ),
    },
    {
      header: 'Total',
      cell: (row: ExpenseSummaryRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {formatCurrency(row.total)}
        </span>
      ),
    },
    {
      header: 'Count',
      cell: (row: ExpenseSummaryRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">{row.count}</span>
      ),
    },
  ];

  // The Table component requires items with `id`, map categoryId -> id
  const tableData = rows.map((r) => ({ ...r, id: r.categoryId }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
        />
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <Card noPadding>
        <Table columns={columns} data={tableData} isLoading={loading} />
        {!loading && rows.length > 0 && (
          <div className="border-t border-surface-200 bg-surface-50 px-6 py-3 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                Grand Total
              </span>
              <span className="text-sm font-bold text-surface-900 dark:text-surface-50">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labor Costs Tab
// ---------------------------------------------------------------------------

function LaborCostsTab() {
  const [rows, setRows] = useState<LaborCostRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLaborCostReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(data.rows);
      setGrandTotal(data.grandTotal);
    } catch {
      toast.error('Failed to load labor cost report');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleExport = () => {
    const csvRows = [
      ['Employee', 'Role', 'Pay Type', 'Hours', 'Gross Pay', 'Entries'],
      ...rows.map((r) => [
        escapeCsv(r.userName),
        escapeCsv(r.userRole),
        escapeCsv(r.payType),
        r.totalHours.toFixed(2),
        r.totalGrossPay.toFixed(2),
        String(r.entriesCount),
      ]),
    ];
    downloadCsv('labor-cost-report.csv', csvRows.map((r) => r.join(',')).join('\n'));
  };

  const columns = [
    {
      header: 'Employee',
      cell: (row: LaborCostRow) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {row.userName}
        </span>
      ),
    },
    {
      header: 'Role',
      cell: (row: LaborCostRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">{row.userRole}</span>
      ),
    },
    {
      header: 'Pay Type',
      cell: (row: LaborCostRow) => (
        <Badge variant="default" size="sm">
          {row.payType}
        </Badge>
      ),
    },
    {
      header: 'Hours',
      cell: (row: LaborCostRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {row.totalHours.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Gross Pay',
      cell: (row: LaborCostRow) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {formatCurrency(row.totalGrossPay)}
        </span>
      ),
    },
    {
      header: 'Entries',
      cell: (row: LaborCostRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">{row.entriesCount}</span>
      ),
    },
  ];

  const tableData = rows.map((r) => ({ ...r, id: r.userId }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
        />
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <Card noPadding>
        <Table columns={columns} data={tableData} isLoading={loading} />
        {!loading && rows.length > 0 && (
          <div className="border-t border-surface-200 bg-surface-50 px-6 py-3 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                Grand Total
              </span>
              <span className="text-sm font-bold text-surface-900 dark:text-surface-50">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payroll Summary Tab
// ---------------------------------------------------------------------------

function PayrollSummaryTab() {
  const [rows, setRows] = useState<PayrollSummaryRow[]>([]);
  const [summary, setSummary] = useState<{
    totalPaid: number;
    totalApproved: number;
    totalDraft: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPayrollSummaryReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(data.rows);
      setSummary(data.summary);
    } catch {
      toast.error('Failed to load payroll summary');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleExport = () => {
    const csvRows = [
      ['Period Start', 'Period End', 'Status', 'Total Gross Pay', 'Entries', 'Approved At', 'Paid At'],
      ...rows.map((r) => [
        escapeCsv(r.periodStart),
        escapeCsv(r.periodEnd),
        escapeCsv(r.status),
        escapeCsv(r.totalGrossPay),
        String(r.totalEntries),
        escapeCsv(r.approvedAt ?? ''),
        escapeCsv(r.paidAt ?? ''),
      ]),
    ];
    downloadCsv('payroll-summary-report.csv', csvRows.map((r) => r.join(',')).join('\n'));
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'default' | 'info' => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'approved':
        return 'info';
      case 'draft':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      header: 'Period',
      cell: (row: PayrollSummaryRow) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {new Date(row.periodStart).toLocaleDateString()} &mdash;{' '}
          {new Date(row.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: PayrollSummaryRow) => (
        <Badge variant={getStatusVariant(row.status)} size="sm">
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Total Gross Pay',
      cell: (row: PayrollSummaryRow) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {formatCurrency(row.totalGrossPay)}
        </span>
      ),
    },
    {
      header: 'Entries',
      cell: (row: PayrollSummaryRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {row.totalEntries}
        </span>
      ),
    },
    {
      header: 'Approved At',
      cell: (row: PayrollSummaryRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {row.approvedAt ? new Date(row.approvedAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      header: 'Paid At',
      cell: (row: PayrollSummaryRow) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {row.paidAt ? new Date(row.paidAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
        />
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      {!loading && summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Paid</p>
            <p className="mt-1 text-xl font-bold text-success-700 dark:text-success-400">
              {formatCurrency(summary.totalPaid)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Approved</p>
            <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(summary.totalApproved)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Draft</p>
            <p className="mt-1 text-xl font-bold text-surface-700 dark:text-surface-300">
              {formatCurrency(summary.totalDraft)}
            </p>
          </Card>
        </div>
      )}

      <Card noPadding>
        <Table columns={columns} data={rows} isLoading={loading} />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared loading spinner
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const FinanceReportsPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('ar-aging');

  const renderTab = () => {
    switch (activeTab) {
      case 'ar-aging':
        return <ArAgingTab />;
      case 'profitability':
        return <ProfitabilityTab />;
      case 'revenue':
        return <RevenueTab />;
      case 'expenses':
        return <ExpensesTab />;
      case 'labor-costs':
        return <LaborCostsTab />;
      case 'payroll-summary':
        return <PayrollSummaryTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
          <FileText className="h-5 w-5 text-primary-700 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            Financial Reports
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Detailed reports and analytics
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-surface-200 dark:border-surface-700">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-700 dark:text-surface-400 dark:hover:border-surface-600 dark:hover:text-surface-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active tab content */}
      {renderTab()}
    </div>
  );
};

export default FinanceReportsPage;
