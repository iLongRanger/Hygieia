import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertTriangle,
  Users,
  FileText,
  BarChart3,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getFinanceOverview } from '../../lib/finance';
import type { FinanceOverview } from '../../types/finance';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

function KpiCard({ label, value, icon, colorClass, bgClass }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
            {label}
          </p>
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${bgClass}`}>{icon}</div>
      </div>
    </Card>
  );
}

const FinanceOverviewPage = () => {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFinanceOverview({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setOverview(data);
    } catch {
      toast.error('Failed to load finance overview');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const netIncomePositive = overview ? overview.netIncome >= 0 : true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <BarChart3 className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Finance Overview
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {overview?.periodLabel || 'Financial summary and key metrics'}
            </p>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
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
      </Card>

      {/* KPI Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : overview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Total Revenue"
            value={formatCurrency(overview.totalRevenue)}
            icon={
              <TrendingUp className="h-5 w-5 text-success-700 dark:text-success-400" />
            }
            colorClass="text-success-700 dark:text-success-400"
            bgClass="bg-success-50 dark:bg-success-900/30"
          />
          <KpiCard
            label="Total Expenses"
            value={formatCurrency(overview.totalExpenses)}
            icon={
              <TrendingDown className="h-5 w-5 text-error-700 dark:text-error-400" />
            }
            colorClass="text-error-700 dark:text-error-400"
            bgClass="bg-error-50 dark:bg-error-900/30"
          />
          <KpiCard
            label="Net Income"
            value={formatCurrency(overview.netIncome)}
            icon={
              <DollarSign
                className={`h-5 w-5 ${
                  netIncomePositive
                    ? 'text-success-700 dark:text-success-400'
                    : 'text-error-700 dark:text-error-400'
                }`}
              />
            }
            colorClass={
              netIncomePositive
                ? 'text-success-700 dark:text-success-400'
                : 'text-error-700 dark:text-error-400'
            }
            bgClass={
              netIncomePositive
                ? 'bg-success-50 dark:bg-success-900/30'
                : 'bg-error-50 dark:bg-error-900/30'
            }
          />
          <KpiCard
            label="Outstanding AR"
            value={formatCurrency(overview.outstandingAR)}
            icon={
              <CreditCard className="h-5 w-5 text-warning-700 dark:text-warning-400" />
            }
            colorClass="text-warning-700 dark:text-warning-400"
            bgClass="bg-warning-50 dark:bg-warning-900/30"
          />
          <KpiCard
            label="Overdue Invoices"
            value={String(overview.overdueInvoices)}
            icon={
              <AlertTriangle className="h-5 w-5 text-error-700 dark:text-error-400" />
            }
            colorClass="text-error-700 dark:text-error-400"
            bgClass="bg-error-50 dark:bg-error-900/30"
          />
          <KpiCard
            label="Upcoming Payroll"
            value={formatCurrency(overview.upcomingPayroll)}
            icon={
              <Users className="h-5 w-5 text-purple-700 dark:text-purple-400" />
            }
            colorClass="text-purple-700 dark:text-purple-400"
            bgClass="bg-purple-50 dark:bg-purple-900/30"
          />
        </div>
      ) : null}

      {/* Quick Links */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-surface-50">
          Quick Links
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/finance/expenses">
            <Button variant="secondary" size="sm">
              <DollarSign className="mr-1.5 h-4 w-4" />
              Expenses
            </Button>
          </Link>
          <Link to="/finance/payroll">
            <Button variant="secondary" size="sm">
              <Users className="mr-1.5 h-4 w-4" />
              Payroll
            </Button>
          </Link>
          <Link to="/finance/reports">
            <Button variant="secondary" size="sm">
              <FileText className="mr-1.5 h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default FinanceOverviewPage;
