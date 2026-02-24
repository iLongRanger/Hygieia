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
import type { Job, JobStatus } from '../../types/job';
import type { Contract } from '../../types/contract';
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

const toDateInputValue = (date: Date): string => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

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
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState(() => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);

    return {
      contractId: '',
      dateFrom: toDateInputValue(today),
      dateTo: toDateInputValue(nextMonth),
    };
  });

  const page = parseInt(searchParams.get('page') || '1', 10);
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

  const clearFilters = () => {
    setSearchParams({});
  };

  const openGenerateModal = async () => {
    setShowGenerateModal(true);

    if (contracts.length > 0 || contractsLoading) return;

    try {
      setContractsLoading(true);
      const result = await listContracts({ status: 'active', limit: 100 });
      setContracts(result.data || []);
    } catch {
      toast.error('Failed to load active contracts');
    } finally {
      setContractsLoading(false);
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
      const result = await generateJobs({
        contractId: generateForm.contractId,
        dateFrom: generateForm.dateFrom,
        dateTo: generateForm.dateTo,
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
      cell: (job: Job) => (
        <span className="text-sm">
          {job.assignedToUser?.fullName || job.assignedTeam?.name || '-'}
        </span>
      ),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2">
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
            <div className="w-48">
              <Select
                label="Job Type"
                options={JOB_TYPES}
                value={jobTypeFilter}
                onChange={(val) => updateFilter('jobType', val)}
              />
            </div>
            <div className="w-48">
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

      {/* Table */}
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

        {/* Pagination */}
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
