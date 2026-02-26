import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Filter,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  X,
  Zap,
  CalendarDays,
  ListOrdered,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { listJobs, startJob, completeJob, cancelJob, generateJobs } from '../../lib/jobs';
import { listContracts } from '../../lib/contracts';
import { listTeams } from '../../lib/teams';
import { listUsers } from '../../lib/users';
import type { Job, JobStatus } from '../../types/job';
import type { Contract } from '../../types/contract';
import type { Team } from '../../types/team';
import type { User } from '../../types/user';
import type { Pagination } from '../../types/crm';
import { useAuthStore } from '../../stores/authStore';

const JOB_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'special_job', label: 'Special Jobs' },
  { value: 'scheduled_service', label: 'Scheduled Service' },
];

const JOB_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'missed', label: 'Missed' },
];

const getStatusVariant = (status: JobStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const variants: Record<JobStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    scheduled: 'info',
    in_progress: 'warning',
    completed: 'success',
    canceled: 'error',
    missed: 'default',
  };
  return variants[status];
};

const getStatusIcon = (status: JobStatus) => {
  const icons: Record<JobStatus, React.ElementType> = {
    scheduled: Clock,
    in_progress: Play,
    completed: CheckCircle,
    canceled: XCircle,
    missed: AlertTriangle,
  };
  return icons[status];
};

const getWorkforceIndicator = (job: Job): {
  label: string;
  badgeVariant: 'default' | 'info' | 'warning';
} => {
  const assignmentType =
    job.workforceAssignmentType ||
    (job.assignedToUser ? 'internal_employee' : job.assignedTeam ? 'subcontractor_team' : 'unassigned');

  if (assignmentType === 'internal_employee') {
    return { label: 'Internal Employee', badgeVariant: 'info' };
  }
  if (assignmentType === 'subcontractor_team') {
    return { label: 'Subcontractor Team', badgeVariant: 'warning' };
  }
  return { label: 'Unassigned', badgeVariant: 'default' };
};

const toDateInputValue = (date: Date): string => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

type GenerateAssignmentMode = 'contract_default' | 'subcontractor_team' | 'internal_employee';
type JobsViewMode = 'table' | 'schedule';

const JobsList = () => {
  const navigate = useNavigate();
  const userRole = useAuthStore((state) => state.user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignmentOptionsLoading, setAssignmentOptionsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState(() => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);

    return {
      contractId: '',
      dateFrom: toDateInputValue(today),
      dateTo: toDateInputValue(nextMonth),
      assignmentMode: 'contract_default' as GenerateAssignmentMode,
      assignedTeamId: '',
      assignedToUserId: '',
    };
  });

  const page = parseInt(searchParams.get('page') || '1', 10);
  const rawViewMode = searchParams.get('view');
  const viewMode: JobsViewMode = rawViewMode === 'table' ? 'table' : 'schedule';
  const jobTypeFilter = searchParams.get('jobType') || '';
  const statusFilter = searchParams.get('status') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: 25 };
      if (jobTypeFilter) params.jobType = jobTypeFilter;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const result = await listJobs(params);
      setJobs(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [page, jobTypeFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const setViewMode = (mode: JobsViewMode) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', mode);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const openGenerateModal = async () => {
    setShowGenerateModal(true);

    if ((contracts.length > 0 && teams.length > 0 && users.length > 0) || contractsLoading || assignmentOptionsLoading) return;

    try {
      setContractsLoading(true);
      setAssignmentOptionsLoading(true);
      const [contractsResult, teamsResult, usersResult] = await Promise.all([
        listContracts({ status: 'active', limit: 100 }),
        listTeams({ limit: 100, isActive: true }),
        listUsers({ limit: 100, status: 'active' }),
      ]);
      setContracts(contractsResult.data || []);
      setTeams(teamsResult.data || []);
      setUsers(usersResult.data || []);
    } catch {
      toast.error('Failed to load generate options');
    } finally {
      setContractsLoading(false);
      setAssignmentOptionsLoading(false);
    }
  };

  const handleGenerateRecurringJobs = async () => {
    if (!generateForm.contractId) {
      toast.error('Please select a contract');
      return;
    }

    if (!generateForm.dateFrom || !generateForm.dateTo) {
      toast.error('Please select a valid date range');
      return;
    }

    if (new Date(generateForm.dateFrom) > new Date(generateForm.dateTo)) {
      toast.error('Date From must be before Date To');
      return;
    }

    try {
      setGenerating(true);
      const payload = {
        contractId: generateForm.contractId,
        dateFrom: generateForm.dateFrom,
        dateTo: generateForm.dateTo,
        ...(generateForm.assignmentMode === 'subcontractor_team' && generateForm.assignedTeamId
          ? { assignedTeamId: generateForm.assignedTeamId, assignedToUserId: null }
          : {}),
        ...(generateForm.assignmentMode === 'internal_employee' && generateForm.assignedToUserId
          ? { assignedToUserId: generateForm.assignedToUserId, assignedTeamId: null }
          : {}),
      };

      if (generateForm.assignmentMode === 'subcontractor_team' && !generateForm.assignedTeamId) {
        toast.error('Please select a subcontractor team');
        return;
      }
      if (generateForm.assignmentMode === 'internal_employee' && !generateForm.assignedToUserId) {
        toast.error('Please select an internal employee');
        return;
      }

      const result = await generateJobs({
        ...payload,
      });

      if (result.created > 0) {
        toast.success(`Generated ${result.created} recurring job${result.created === 1 ? '' : 's'}`);
      } else {
        toast.success('No new jobs needed for this date range');
      }

      setShowGenerateModal(false);
      await fetchJobs();
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        'Failed to generate recurring jobs';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await startJob(id);
      toast.success('Job started');
      fetchJobs();
    } catch (error: any) {
      const details = error?.response?.data?.error?.details;
      const canManagerOverride = ['owner', 'admin', 'manager'].includes(userRole || '');
      if (details?.code === 'OUTSIDE_SERVICE_WINDOW' && canManagerOverride) {
        const confirmed = confirm(
          `Outside allowed service window (${details.allowedWindowStart}-${details.allowedWindowEnd}, ` +
          `${details.timezone}). Apply manager override?`
        );
        if (confirmed) {
          await startJob(id, {
            managerOverride: true,
            overrideReason: 'Manager override from Jobs list',
          });
          toast.success('Job started with manager override');
          fetchJobs();
          return;
        }
      }
      toast.error(details?.code === 'OUTSIDE_SERVICE_WINDOW'
        ? 'Outside allowed service window'
        : 'Failed to start job');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeJob(id);
      toast.success('Job completed');
      fetchJobs();
    } catch {
      toast.error('Failed to complete job');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return;
    try {
      await cancelJob(id);
      toast.success('Job canceled');
      fetchJobs();
    } catch {
      toast.error('Failed to cancel job');
    }
  };

  const columns = [
    {
      header: 'Job #',
      cell: (job: Job) => (
        <button
          onClick={() => navigate(`/jobs/${job.id}`)}
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {job.jobNumber}
        </button>
      ),
    },
    {
      header: 'Type',
      cell: (job: Job) => (
        <Badge variant={job.jobType === 'special_job' ? 'warning' : 'default'}>
          {job.jobType === 'special_job' ? 'Special' : 'Service'}
        </Badge>
      ),
    },
    {
      header: 'Category',
      cell: (job: Job) => (
        <Badge variant={job.jobCategory === 'recurring' ? 'info' : 'default'}>
          {job.jobCategory === 'recurring' ? 'Recurring' : 'One-Time'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      cell: (job: Job) => {
        const Icon = getStatusIcon(job.status);
        return (
          <Badge variant={getStatusVariant(job.status)}>
            <Icon className="mr-1 h-3 w-3" />
            {job.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Badge>
        );
      },
    },
    {
      header: 'Scheduled',
      cell: (job: Job) => (
        <span className="text-sm">
          {new Date(job.scheduledDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </span>
      ),
    },
    {
      header: 'Facility',
      cell: (job: Job) => (
        <div>
          <div className="font-medium text-surface-900 dark:text-surface-100">
            {job.facility.name}
          </div>
          <div className="text-xs text-surface-500">{job.account.name}</div>
        </div>
      ),
    },
    {
      header: 'Assigned To',
      cell: (job: Job) => {
        const workforce = getWorkforceIndicator(job);
        return (
          <div>
            <div className="text-sm">
              {job.assignedToUser?.fullName || job.assignedTeam?.name || '-'}
            </div>
            <div className="mt-1">
              <Badge variant={workforce.badgeVariant}>{workforce.label}</Badge>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Hours',
      cell: (job: Job) => (
        <span className="text-sm">
          {job.actualHours
            ? `${Number(job.actualHours).toFixed(1)}h`
            : job.estimatedHours
              ? `~${Number(job.estimatedHours).toFixed(1)}h`
              : '-'}
        </span>
      ),
    },
    {
      header: '',
      cell: (job: Job) => (
        <div className="flex items-center gap-1">
          {job.status === 'scheduled' && (
            <Button variant="ghost" size="sm" onClick={() => handleStart(job.id)}>
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {job.status === 'in_progress' && (
            <Button variant="ghost" size="sm" onClick={() => handleComplete(job.id)}>
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {['scheduled', 'in_progress'].includes(job.status) && (
            <Button variant="ghost" size="sm" onClick={() => handleCancel(job.id)}>
              <XCircle className="h-3.5 w-3.5 text-danger-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const scheduledJobs = jobs.filter((job) => ['scheduled', 'in_progress'].includes(job.status));
  const jobsByDate = scheduledJobs.reduce<Record<string, Job[]>>((acc, job) => {
    const dateKey = job.scheduledDate.slice(0, 10);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(job);
    return acc;
  }, {});
  const scheduleDates = Object.keys(jobsByDate).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <Briefcase className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Jobs
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {pagination ? `${pagination.total} total` : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-surface-200 p-1 dark:border-surface-700">
            <Button
              variant={viewMode === 'schedule' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('schedule')}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Schedule
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <ListOrdered className="mr-1.5 h-4 w-4" />
              Table
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
          <Button variant="secondary" size="sm" onClick={openGenerateModal}>
            <Zap className="mr-1.5 h-4 w-4" />
            Generate Recurring
          </Button>
          <Button size="sm" onClick={() => navigate('/jobs/new')}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Job
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="flex flex-wrap items-end gap-4 p-4">
            <div className="w-full sm:w-48">
              <Select
                label="Job Type"
                options={JOB_TYPES}
                value={jobTypeFilter}
                onChange={(val) => updateFilter('jobType', val)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                label="Status"
                options={JOB_STATUSES}
                value={statusFilter}
                onChange={(val) => updateFilter('status', val)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="rounded-md border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="rounded-md border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Main view */}
      {viewMode === 'table' ? (
        <Card noPadding>
          {loading ? (
            <div className="space-y-1 p-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 w-full rounded-lg skeleton" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-800">
                <Briefcase className="h-8 w-8 text-surface-400 dark:text-surface-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                No jobs found
              </p>
              <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
                Generate jobs from a contract or create one manually.
              </p>
            </div>
          ) : (
            <Table
              columns={columns}
              data={jobs}
              onRowClick={(job) => navigate(`/jobs/${job.id}`)}
            />
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-surface-200 px-4 py-3 dark:border-surface-700">
              <span className="text-xs text-surface-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateFilter('page', String(page - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => updateFilter('page', String(page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          {loading ? (
            <div className="grid gap-4 p-1 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-44 rounded-xl skeleton" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-800">
                <Briefcase className="h-8 w-8 text-surface-400 dark:text-surface-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                No jobs found
              </p>
            </div>
          ) : scheduleDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-800">
                <CalendarDays className="h-8 w-8 text-surface-400 dark:text-surface-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                No scheduled jobs in this page
              </p>
              <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
                Try clearing status filters or switching to table view.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-700/30">
                <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                  Scheduled Board
                </p>
                <p className="mt-1 text-sm text-surface-700 dark:text-surface-200">
                  {scheduledJobs.length} active jobs grouped by scheduled date
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {scheduleDates.map((dateKey, index) => {
                  const dateJobs = jobsByDate[dateKey];
                  const headerToneClass =
                    index % 2 === 0
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'bg-secondary-50 dark:bg-secondary-900/20';
                  const counterToneClass =
                    index % 2 === 0
                      ? 'border-primary-200 bg-primary-100 text-primary-700 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'border-secondary-200 bg-secondary-100 text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900/40 dark:text-secondary-300';
                  return (
                    <div
                      key={dateKey}
                      className="rounded-xl border border-surface-200 bg-white shadow-soft dark:border-surface-700 dark:bg-surface-800"
                    >
                      <div className={`border-b border-surface-200 px-4 py-3 dark:border-surface-700 ${headerToneClass}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                            {new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'UTC',
                            })}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${counterToneClass}`}
                          >
                            {dateJobs.length} {dateJobs.length === 1 ? 'job' : 'jobs'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 p-3">
                        {dateJobs.map((job) => {
                          const workforce = getWorkforceIndicator(job);
                          const StatusIcon = getStatusIcon(job.status);
                          return (
                            <div
                              key={job.id}
                              className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800"
                            >
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/jobs/${job.id}`)}
                                  className="text-left text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                                >
                                  {job.jobNumber}
                                </button>
                                <Badge variant={getStatusVariant(job.status)}>
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {job.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>

                              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                                {job.facility.name}
                              </p>
                              <p className="text-xs text-surface-500">{job.account.name}</p>

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge variant={job.jobCategory === 'recurring' ? 'info' : 'default'}>
                                  {job.jobCategory === 'recurring' ? 'Recurring' : 'One-Time'}
                                </Badge>
                                <Badge variant={workforce.badgeVariant}>
                                  {job.assignedToUser?.fullName || job.assignedTeam?.name || workforce.label}
                                </Badge>
                              </div>

                              <div className="mt-3 flex items-center gap-1">
                                {job.status === 'scheduled' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleStart(job.id)}>
                                    <Play className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {job.status === 'in_progress' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleComplete(job.id)}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {['scheduled', 'in_progress'].includes(job.status) && (
                                  <Button variant="ghost" size="sm" onClick={() => handleCancel(job.id)}>
                                    <XCircle className="h-3.5 w-3.5 text-danger-500" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Recurring Jobs"
      >
        <div className="space-y-4">
          <Select
            label="Contract *"
            placeholder={contractsLoading ? 'Loading active contracts...' : 'Select an active contract'}
            value={generateForm.contractId}
            onChange={(value) =>
              setGenerateForm((prev) => ({ ...prev, contractId: value }))
            }
            options={contracts.map((contract) => ({
              value: contract.id,
              label: `${contract.contractNumber} — ${contract.account.name}${contract.facility ? ` (${contract.facility.name})` : ''}`,
            }))}
            disabled={contractsLoading || generating}
          />

          <Select
            label="Assignment"
            value={generateForm.assignmentMode}
            onChange={(value) =>
              setGenerateForm((prev) => ({
                ...prev,
                assignmentMode: value as GenerateAssignmentMode,
                assignedTeamId: '',
                assignedToUserId: '',
              }))
            }
            options={[
              { value: 'contract_default', label: 'Use contract default' },
              { value: 'subcontractor_team', label: 'Override: Subcontractor team' },
              { value: 'internal_employee', label: 'Override: Internal employee' },
            ]}
            disabled={generating || assignmentOptionsLoading}
          />

          {generateForm.assignmentMode === 'subcontractor_team' && (
            <Select
              label="Subcontractor Team *"
              placeholder={assignmentOptionsLoading ? 'Loading teams...' : 'Select a subcontractor team'}
              value={generateForm.assignedTeamId}
              onChange={(value) =>
                setGenerateForm((prev) => ({ ...prev, assignedTeamId: value }))
              }
              options={[
                { value: '', label: 'Select a team' },
                ...teams.map((team) => ({ value: team.id, label: team.name })),
              ]}
              disabled={generating || assignmentOptionsLoading}
            />
          )}

          {generateForm.assignmentMode === 'internal_employee' && (
            <Select
              label="Internal Employee *"
              placeholder={assignmentOptionsLoading ? 'Loading users...' : 'Select an internal employee'}
              value={generateForm.assignedToUserId}
              onChange={(value) =>
                setGenerateForm((prev) => ({ ...prev, assignedToUserId: value }))
              }
              options={[
                { value: '', label: 'Select an employee' },
                ...users.map((user) => ({ value: user.id, label: user.fullName })),
              ]}
              disabled={generating || assignmentOptionsLoading}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Date From *
              </label>
              <input
                type="date"
                value={generateForm.dateFrom}
                onChange={(e) =>
                  setGenerateForm((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
                className="w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                disabled={generating}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Date To *
              </label>
              <input
                type="date"
                value={generateForm.dateTo}
                onChange={(e) =>
                  setGenerateForm((prev) => ({ ...prev, dateTo: e.target.value }))
                }
                className="w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                disabled={generating}
              />
            </div>
          </div>

          {!contractsLoading && contracts.length === 0 && (
            <p className="text-sm text-surface-500 dark:text-surface-400">
              No active contracts found.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowGenerateModal(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateRecurringJobs}
              isLoading={generating}
              disabled={contractsLoading || contracts.length === 0}
            >
              Generate Jobs
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JobsList;
