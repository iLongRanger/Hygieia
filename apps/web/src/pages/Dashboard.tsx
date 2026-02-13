import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import {
  DollarSign,
  TrendingUp,
  Send,
  Building2,
  Calendar,
  Download,
  Briefcase,
  ClipboardCheck,
  Timer,
  Receipt,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import {
  getDashboardStats,
  exportDashboardCsv,
} from '../lib/dashboard';
import type { DashboardStats, TimePeriod, ExportType } from '../lib/dashboard';
import StatCard from '../components/dashboard/StatCard';
import TimePeriodSelector from '../components/dashboard/TimePeriodSelector';
import LeadFunnelChart from '../components/dashboard/LeadFunnelChart';
import ProposalChart from '../components/dashboard/ProposalChart';
import RevenueChart from '../components/dashboard/RevenueChart';
import ContractStatusChart from '../components/dashboard/ContractStatusChart';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import ExpiringContractsTable from '../components/dashboard/ExpiringContractsTable';

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-700 dark:bg-surface-800">
    <div className="flex items-start gap-4">
      <div className="h-12 w-12 rounded-xl bg-surface-200 dark:bg-surface-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-20 rounded bg-surface-200 dark:bg-surface-700" />
        <div className="h-7 w-16 rounded bg-surface-200 dark:bg-surface-700" />
        <div className="h-3 w-28 rounded bg-surface-200 dark:bg-surface-700" />
      </div>
    </div>
  </div>
);

const SkeletonChart = () => (
  <div className="animate-pulse rounded-xl border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-700 dark:bg-surface-800">
    <div className="h-5 w-32 rounded bg-surface-200 dark:bg-surface-700" />
    <div className="mt-4 h-64 rounded-lg bg-surface-100 dark:bg-surface-700/50" />
  </div>
);

const EXPORT_OPTIONS: { value: ExportType; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'proposals', label: 'Proposals' },
  { value: 'contracts', label: 'Contracts' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params =
          period === 'custom' && dateFrom && dateTo
            ? { dateFrom, dateTo }
            : { period };
        const data = await getDashboardStats(params);
        if (!cancelled) setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [period, dateFrom, dateTo]);

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setDateFrom('');
      setDateTo('');
    }
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleExport = async (type: ExportType) => {
    setShowExportMenu(false);
    setExporting(true);
    try {
      await exportDashboardCsv(type);
      toast.success(`${type} exported successfully`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const groupedAppointments = useMemo(() => {
    if (!stats) return [];
    const upcomingAppointments = stats.upcomingAppointments ?? [];
    const groups: Record<string, DashboardStats['upcomingAppointments']> = {};
    upcomingAppointments.forEach((appointment) => {
      const date = new Date(appointment.scheduledStart);
      const dateKey = date.toISOString().slice(0, 10);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(appointment);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        label: new Date(key).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        }),
        items,
      }));
  }, [stats]);

  const formatCurrency = (val: number) =>
    val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toLocaleString()}`;

  const periodLabel =
    period === 'week'
      ? 'this week'
      : period === 'month'
        ? 'this month'
        : period === 'quarter'
          ? 'this quarter'
          : 'selected period';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 sm:text-3xl">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">
            Here's what's happening with your cleaning operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TimePeriodSelector
            value={period}
            onChange={handlePeriodChange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateRangeChange={handleDateRangeChange}
          />
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-surface-200 bg-white py-1 shadow-lg dark:border-surface-700 dark:bg-surface-800">
                {EXPORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleExport(opt.value)}
                    className="block w-full px-4 py-2 text-left text-sm text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          <StatCard
            label="Monthly Revenue"
            value={formatCurrency(stats.totalMRR)}
            subtitle={`${stats.activeContracts} active contract${stats.activeContracts !== 1 ? 's' : ''}`}
            icon={DollarSign}
            color="text-success-600 dark:text-success-400"
            bg="bg-success-100 dark:bg-success-900/30"
            change={stats.comparison.mrrChange}
            onClick={() => navigate('/contracts?status=active')}
          />
          <StatCard
            label="Pipeline Value"
            value={formatCurrency(stats.pipelineValue)}
            subtitle={`${stats.totalLeads} total lead${stats.totalLeads !== 1 ? 's' : ''}`}
            icon={TrendingUp}
            color="text-blue-600 dark:text-blue-400"
            bg="bg-blue-100 dark:bg-blue-900/30"
            change={stats.comparison.newLeadsChange}
            onClick={() => navigate('/leads')}
          />
          <StatCard
            label="Proposals Sent"
            value={stats.proposalsSentInPeriod}
            subtitle={`${stats.proposalWinRate}% win rate ${periodLabel}`}
            icon={Send}
            color="text-purple-600 dark:text-purple-400"
            bg="bg-purple-100 dark:bg-purple-900/30"
            change={stats.comparison.proposalsSentChange}
            onClick={() => navigate('/proposals')}
          />
          <StatCard
            label="Active Accounts"
            value={stats.activeAccounts}
            subtitle={`+${stats.newAccountsInPeriod} new ${periodLabel}`}
            icon={Building2}
            color="text-primary-600 dark:text-primary-400"
            bg="bg-primary-100 dark:bg-primary-900/30"
            change={stats.comparison.newAccountsChange}
            onClick={() => navigate('/accounts')}
          />
        </div>
      ) : null}

      {/* Sales Section */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LeadFunnelChart data={stats.leadsByStatus} />
          <ProposalChart data={stats.proposalsByStatus} />
        </div>
      ) : null}

      {/* Revenue Section */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RevenueChart data={stats.revenueByMonth} />
          <ContractStatusChart data={stats.contractsByStatus} />
        </div>
      ) : null}

      {/* Expiring Contracts */}
      {!loading && stats && stats.expiringContracts.length > 0 && (
        <ExpiringContractsTable data={stats.expiringContracts} />
      )}

      {/* Operations KPIs */}
      {!loading && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          <StatCard
            label="Jobs Today"
            value={stats.jobsScheduledToday}
            subtitle={`${stats.jobsCompletedInPeriod} completed ${periodLabel}`}
            icon={Briefcase}
            color="text-indigo-600 dark:text-indigo-400"
            bg="bg-indigo-100 dark:bg-indigo-900/30"
            onClick={() => navigate('/jobs')}
          />
          <StatCard
            label="Inspection Score"
            value={stats.inspectionAvgScore != null ? `${stats.inspectionAvgScore}%` : '—'}
            subtitle={`${stats.inspectionsCompletedInPeriod} completed ${periodLabel}`}
            icon={ClipboardCheck}
            color="text-teal-600 dark:text-teal-400"
            bg="bg-teal-100 dark:bg-teal-900/30"
            onClick={() => navigate('/inspections')}
          />
          <StatCard
            label="Active Clock-ins"
            value={stats.activeClockIns}
            subtitle={`${stats.pendingTimesheets} pending timesheet${stats.pendingTimesheets !== 1 ? 's' : ''}`}
            icon={Timer}
            color="text-amber-600 dark:text-amber-400"
            bg="bg-amber-100 dark:bg-amber-900/30"
            onClick={() => navigate('/time-tracking')}
          />
          <StatCard
            label="Outstanding AR"
            value={formatCurrency(stats.outstandingInvoiceAmount)}
            subtitle={`${stats.overdueInvoiceCount} overdue`}
            icon={Receipt}
            color="text-rose-600 dark:text-rose-400"
            bg="bg-rose-100 dark:bg-rose-900/30"
            onClick={() => navigate('/invoices')}
          />
        </div>
      )}

      {/* Operations Section */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Upcoming Appointments */}
          <Card
            className="min-h-[300px] cursor-pointer transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/40"
            onClick={() => navigate('/appointments')}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                Upcoming Appointments
              </h3>
              <span className="text-xs text-surface-400 dark:text-surface-500">
                Next 10
              </span>
            </div>
            {(stats.upcomingAppointments ?? []).length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-700">
                  <Calendar className="h-8 w-8 text-surface-400 dark:text-surface-500" />
                </div>
                <p className="mt-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                  No upcoming appointments
                </p>
                <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
                  Scheduled walkthroughs will appear here
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {groupedAppointments.map((group) => (
                  <div
                    key={group.key}
                    className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                      {group.label}
                    </div>
                    <div className="mt-2 space-y-2">
                      {group.items.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between rounded-md bg-surface-50 px-3 py-2 text-sm dark:bg-surface-800/50"
                        >
                          <div>
                            <div className="font-medium text-surface-800 dark:text-surface-100">
                              {appointment.lead?.companyName ||
                                appointment.lead?.contactName ||
                                appointment.account?.name ||
                                'Unknown'}
                            </div>
                            <div className="text-xs text-surface-500 dark:text-surface-400">
                              {appointment.assignedToUser.fullName}
                            </div>
                          </div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            {new Date(
                              appointment.scheduledStart
                            ).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Activity Feed */}
          <ActivityFeed data={stats.recentActivity} />
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
