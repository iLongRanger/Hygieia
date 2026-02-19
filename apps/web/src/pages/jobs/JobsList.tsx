import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Search,
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
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { listJobs, startJob, completeJob, cancelJob } from '../../lib/jobs';
import type { Job, JobStatus, JobType } from '../../types/job';
import type { Pagination } from '../../types/crm';

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

const JobsList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

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

  const handleStart = async (id: string) => {
    try {
      await startJob(id);
      toast.success('Job started');
      fetchJobs();
    } catch {
      toast.error('Failed to start job');
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
    </div>
  );
};

export default JobsList;
