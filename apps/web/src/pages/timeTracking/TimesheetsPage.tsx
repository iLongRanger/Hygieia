import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Plus,
  Check,
  X,
  Send,
  ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import {
  listTimesheets,
  getTimesheet,
  generateTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
} from '../../lib/timeTracking';
import type { Timesheet, TimesheetDetail, TimesheetStatus } from '../../types/timeTracking';
import type { Pagination } from '../../types/crm';

const getStatusVariant = (status: TimesheetStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const map: Record<TimesheetStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    submitted: 'info',
    approved: 'success',
    rejected: 'error',
  };
  return map[status];
};

const formatHours = (hours: string) => {
  const h = parseFloat(hours);
  return `${h.toFixed(1)}h`;
};

const TimesheetsPage = () => {
  const navigate = useNavigate();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetDetail | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateUserId, setGenerateUserId] = useState('');
  const [generateStart, setGenerateStart] = useState('');
  const [generateEnd, setGenerateEnd] = useState('');

  const fetchTimesheets = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listTimesheets({ limit: 20 });
      setTimesheets(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await getTimesheet(id);
      setSelectedTimesheet(detail);
    } catch {
      toast.error('Failed to load timesheet');
    }
  };

  const handleGenerate = async () => {
    if (!generateUserId || !generateStart || !generateEnd) {
      toast.error('All fields are required');
      return;
    }
    try {
      await generateTimesheet({
        userId: generateUserId,
        periodStart: generateStart,
        periodEnd: generateEnd,
      });
      toast.success('Timesheet generated');
      setShowGenerate(false);
      fetchTimesheets();
    } catch {
      toast.error('Failed to generate timesheet');
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await submitTimesheet(id);
      toast.success('Timesheet submitted');
      fetchTimesheets();
      if (selectedTimesheet?.id === id) {
        const detail = await getTimesheet(id);
        setSelectedTimesheet(detail);
      }
    } catch {
      toast.error('Failed to submit timesheet');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveTimesheet(id);
      toast.success('Timesheet approved');
      fetchTimesheets();
      if (selectedTimesheet?.id === id) {
        const detail = await getTimesheet(id);
        setSelectedTimesheet(detail);
      }
    } catch {
      toast.error('Failed to approve timesheet');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectTimesheet(id);
      toast.success('Timesheet rejected');
      fetchTimesheets();
      if (selectedTimesheet?.id === id) {
        const detail = await getTimesheet(id);
        setSelectedTimesheet(detail);
      }
    } catch {
      toast.error('Failed to reject timesheet');
    }
  };

  if (selectedTimesheet) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTimesheet(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                Timesheet — {selectedTimesheet.user.fullName}
              </h1>
              <p className="text-sm text-surface-500">
                {new Date(selectedTimesheet.periodStart).toLocaleDateString()} – {new Date(selectedTimesheet.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={getStatusVariant(selectedTimesheet.status as TimesheetStatus)}>
              {selectedTimesheet.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {selectedTimesheet.status === 'draft' && (
              <Button size="sm" onClick={() => handleSubmit(selectedTimesheet.id)}>
                <Send className="mr-1.5 h-4 w-4" />
                Submit
              </Button>
            )}
            {selectedTimesheet.status === 'submitted' && (
              <>
                <Button size="sm" onClick={() => handleApprove(selectedTimesheet.id)}>
                  <Check className="mr-1.5 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleReject(selectedTimesheet.id)}>
                  <X className="mr-1.5 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="p-4 text-center">
              <p className="text-sm text-surface-500">Total Hours</p>
              <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {formatHours(selectedTimesheet.totalHours)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-sm text-surface-500">Regular</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatHours(selectedTimesheet.regularHours)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-sm text-surface-500">Overtime</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {formatHours(selectedTimesheet.overtimeHours)}
              </p>
            </div>
          </Card>
        </div>

        {/* Entries */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-4">
              Time Entries ({selectedTimesheet.entries.length})
            </h3>
            <div className="space-y-2">
              {selectedTimesheet.entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded bg-surface-50 dark:bg-surface-800/50">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      {new Date(entry.clockIn).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-mono text-surface-700 dark:text-surface-300">
                      {new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' — '}
                      {entry.clockOut
                        ? new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'In Progress'}
                    </span>
                    {entry.facility && (
                      <span className="text-xs text-surface-500">{entry.facility.name}</span>
                    )}
                    {entry.job && (
                      <span className="text-xs text-surface-500">{entry.job.jobNumber}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    {entry.totalHours ? `${parseFloat(entry.totalHours).toFixed(1)}h` : '—'}
                  </span>
                </div>
              ))}
              {selectedTimesheet.entries.length === 0 && (
                <p className="text-center text-sm text-surface-400 py-8">No entries in this timesheet</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const columns = [
    {
      header: 'Employee',
      cell: (row: Timesheet) => (
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
          {row.user.fullName}
        </span>
      ),
    },
    {
      header: 'Period',
      cell: (row: Timesheet) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {new Date(row.periodStart).toLocaleDateString()} – {new Date(row.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Total',
      cell: (row: Timesheet) => (
        <span className="text-sm font-medium">{formatHours(row.totalHours)}</span>
      ),
    },
    {
      header: 'Regular',
      cell: (row: Timesheet) => (
        <span className="text-sm text-surface-600">{formatHours(row.regularHours)}</span>
      ),
    },
    {
      header: 'Overtime',
      cell: (row: Timesheet) => (
        <span className={`text-sm ${parseFloat(row.overtimeHours) > 0 ? 'text-orange-600 font-medium' : 'text-surface-400'}`}>
          {formatHours(row.overtimeHours)}
        </span>
      ),
    },
    {
      header: 'Entries',
      cell: (row: Timesheet) => (
        <span className="text-sm text-surface-500">{row._count.entries}</span>
      ),
    },
    {
      header: 'Status',
      cell: (row: Timesheet) => (
        <Badge variant={getStatusVariant(row.status as TimesheetStatus)} size="sm">
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/time-tracking')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <FileSpreadsheet className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Timesheets
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Weekly timesheet management and approval
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowGenerate(!showGenerate)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Generate
        </Button>
      </div>

      {/* Generate form */}
      {showGenerate && (
        <Card>
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Generate Timesheet</h3>
            <div className="flex flex-wrap items-end gap-4">
              <Input
                label="User ID"
                className="w-64"
                value={generateUserId}
                onChange={(e) => setGenerateUserId(e.target.value)}
                placeholder="User UUID"
              />
              <Input
                label="Period Start"
                type="date"
                value={generateStart}
                onChange={(e) => setGenerateStart(e.target.value)}
              />
              <Input
                label="Period End"
                type="date"
                value={generateEnd}
                onChange={(e) => setGenerateEnd(e.target.value)}
              />
              <Button size="sm" onClick={handleGenerate}>Generate</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowGenerate(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={timesheets}
          isLoading={loading}
          onRowClick={(row) => handleViewDetail(row.id)}
        />
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => {/* TODO: add page param support */}}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {/* TODO: add page param support */}}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetsPage;
