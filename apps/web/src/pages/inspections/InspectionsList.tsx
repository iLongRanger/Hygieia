import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  Filter,
  Plus,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { listInspections } from '../../lib/inspections';
import type { Inspection, InspectionStatus } from '../../types/inspection';
import type { Pagination } from '../../types/crm';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
];

const getStatusVariant = (status: InspectionStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const variants: Record<InspectionStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    scheduled: 'info',
    in_progress: 'warning',
    completed: 'success',
    canceled: 'error',
  };
  return variants[status];
};

const getRatingVariant = (rating: string | null): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  if (!rating) return 'default';
  if (rating === 'excellent' || rating === 'good') return 'success';
  if (rating === 'fair') return 'warning';
  return 'error';
};

const InspectionsList = () => {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userRole = useAuthStore((state) => state.user?.role);
  const isFieldWorker = userRole === 'subcontractor' || userRole === 'cleaner';
  const canManageTemplates =
    hasPermission(PERMISSIONS.INSPECTIONS_ADMIN) &&
    userRole !== 'subcontractor' &&
    userRole !== 'cleaner';
  const canCreateInspection =
    hasPermission(PERMISSIONS.INSPECTIONS_WRITE) &&
    userRole !== 'subcontractor' &&
    userRole !== 'cleaner';
  const [searchParams, setSearchParams] = useSearchParams();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const page = Number(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listInspections({
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });
      setInspections(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error('Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [page, status, dateFrom, dateTo]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const columns = [
    {
      header: 'Number',
      cell: (row: Inspection) => (
        <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">
          {row.inspectionNumber}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: Inspection) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Facility',
      cell: (row: Inspection) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {row.facility.name}
        </span>
      ),
    },
    {
      header: 'Inspector',
      cell: (row: Inspection) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {row.inspectorUser.fullName}
        </span>
      ),
    },
    {
      header: 'Date',
      cell: (row: Inspection) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {new Date(row.scheduledDate.split('T')[0] + 'T00:00:00').toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Score',
      cell: (row: Inspection) =>
        row.overallScore ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{parseFloat(row.overallScore).toFixed(0)}%</span>
            {row.overallRating && (
              <Badge variant={getRatingVariant(row.overallRating)} size="sm">
                {row.overallRating}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-xs text-surface-400">—</span>
        ),
    },
    {
      header: 'Items',
      cell: (row: Inspection) => (
        <span className="text-sm text-surface-500">{row._count.items}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (row: Inspection) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-surface-700 dark:text-surface-300">{row.openCorrectiveActions}</span>
          {row.overdueCorrectiveActions > 0 && (
            <Badge variant="error" size="sm">
              {row.overdueCorrectiveActions} overdue
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Signoffs',
      cell: (row: Inspection) => (
        <span className="text-sm text-surface-500">{row.signoffCount}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <ClipboardCheck className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Inspections
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Quality inspections and checklists
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {canManageTemplates && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => navigate('/inspection-templates')}
            >
              Templates
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
          {canCreateInspection && (
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => navigate('/inspections/new', { state: { backLabel: 'Inspections', backPath: '/inspections' } })}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Inspection
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="flex flex-wrap items-end gap-4 p-4">
            <div className="w-full sm:w-48">
              <Select
                label="Status"
                options={STATUSES}
                value={status}
                onChange={(val) => updateParam('status', val)}
              />
            </div>
            <div className="w-40">
              <Input
                label="From"
                type="date"
                value={dateFrom}
                onChange={(e) => updateParam('dateFrom', e.target.value)}
              />
            </div>
            <div className="w-40">
              <Input
                label="To"
                type="date"
                value={dateTo}
                onChange={(e) => updateParam('dateTo', e.target.value)}
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
      <Card className={isFieldWorker ? 'p-3 md:p-6' : undefined}>
        {isFieldWorker && (
          <div data-testid="field-worker-inspection-cards" className="space-y-3 md:hidden">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 rounded-xl skeleton" />
              ))
            ) : inspections.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-surface-200 p-8 text-center dark:border-surface-700">
                <ClipboardCheck className="mx-auto h-8 w-8 text-surface-400" />
                <p className="mt-3 text-sm font-medium text-surface-600 dark:text-surface-400">
                  No inspections found
                </p>
              </div>
            ) : (
              inspections.map((inspection) => (
                <button
                  key={inspection.id}
                  type="button"
                  onClick={() => navigate(`/inspections/${inspection.id}`, { state: { backLabel: 'Inspections', backPath: '/inspections' } })}
                  className="w-full rounded-xl border border-surface-200 bg-surface-50 p-4 text-left shadow-soft transition hover:border-primary-200 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-primary-700 dark:hover:bg-surface-700/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {inspection.inspectionNumber}
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-surface-900 dark:text-surface-100">
                        {inspection.facility.name}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(inspection.status)} size="sm">
                      {inspection.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-300">
                    <div className="flex justify-between gap-3">
                      <span className="text-surface-500">Date</span>
                      <span>{new Date(inspection.scheduledDate.split('T')[0] + 'T00:00:00').toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-surface-500">Inspector</span>
                      <span className="text-right">{inspection.inspectorUser.fullName}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-surface-500">Score</span>
                      <span className="font-medium">
                        {inspection.overallScore ? `${parseFloat(inspection.overallScore).toFixed(0)}%` : '-'}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
        <div className={isFieldWorker ? 'hidden md:block' : undefined}>
          <Table
            columns={columns}
            data={inspections}
            isLoading={loading}
            onRowClick={(row) => navigate(`/inspections/${row.id}`, { state: { backLabel: 'Inspections', backPath: '/inspections' } })}
          />
        </div>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-surface-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              disabled={pagination.page <= 1}
              onClick={() => updateParam('page', String(pagination.page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParam('page', String(pagination.page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionsList;
