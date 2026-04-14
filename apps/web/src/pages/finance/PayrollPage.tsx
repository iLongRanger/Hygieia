import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Trash2,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import {
  listPayrollRuns,
  getPayrollRun,
  generatePayrollRun,
  approvePayrollRun,
  markPayrollRunPaid,
  adjustPayrollEntry,
  deletePayrollRun,
} from '../../lib/payroll';
import type {
  PayrollRun,
  PayrollRunDetail,
  PayrollRunStatus,
  PayrollEntry,
  PayrollEntryStatus,
  AdjustPayrollEntryInput,
} from '../../types/payroll';
import type { Pagination } from '../../types/crm';
import { PERMISSIONS } from '../../lib/permissions';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const getRunStatusVariant = (
  status: PayrollRunStatus
): 'default' | 'success' | 'info' => {
  const map: Record<PayrollRunStatus, 'default' | 'success' | 'info'> = {
    draft: 'default',
    approved: 'success',
    paid: 'info',
  };
  return map[status];
};

const getEntryStatusVariant = (
  status: PayrollEntryStatus
): 'success' | 'warning' | 'info' => {
  const map: Record<PayrollEntryStatus, 'success' | 'warning' | 'info'> = {
    valid: 'success',
    flagged: 'warning',
    adjusted: 'info',
  };
  return map[status];
};

const formatCurrency = (value: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(value));
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

const formatHours = (value: string | null) => {
  if (!value) return '-';
  return `${parseFloat(value).toFixed(2)} hrs`;
};

// ---- Generate Modal ----
interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (periodStart: string, periodEnd: string) => void;
  generating: boolean;
}

function GenerateModal({
  isOpen,
  onClose,
  onGenerate,
  generating,
}: GenerateModalProps) {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const handleSubmit = () => {
    if (!periodStart || !periodEnd) {
      toast.error('Both period dates are required');
      return;
    }
    if (periodStart >= periodEnd) {
      toast.error('Period end must be after period start');
      return;
    }
    onGenerate(periodStart, periodEnd);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Payroll Run" size="sm">
      <div className="space-y-4">
        <Input
          label="Period Start"
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
        />
        <Input
          label="Period End"
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={generating}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Adjust Modal ----
interface AdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: PayrollEntry | null;
  onSave: (input: AdjustPayrollEntryInput) => void;
  saving: boolean;
}

function AdjustModal({ isOpen, onClose, entry, onSave, saving }: AdjustModalProps) {
  const [grossPay, setGrossPay] = useState('');
  const [scheduledHours, setScheduledHours] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  useEffect(() => {
    if (entry) {
      setGrossPay(entry.grossPay);
      setScheduledHours(entry.scheduledHours || '');
      setAdjustmentNotes(entry.adjustmentNotes || '');
    }
  }, [entry]);

  const handleSave = () => {
    const input: AdjustPayrollEntryInput = {
      adjustmentNotes: adjustmentNotes.trim() || null,
    };
    const parsedGross = parseFloat(grossPay);
    if (!isNaN(parsedGross) && parsedGross >= 0) {
      input.grossPay = parsedGross;
    }
    const parsedHours = parseFloat(scheduledHours);
    if (!isNaN(parsedHours) && parsedHours >= 0) {
      input.scheduledHours = parsedHours;
    }
    input.status = 'adjusted';
    onSave(input);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Payroll Entry" size="sm">
      <div className="space-y-4">
        {entry && (
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Adjusting entry for{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">
              {entry.user.fullName}
            </span>
          </p>
        )}
        <Input
          label="Gross Pay"
          type="number"
          min="0"
          step="0.01"
          value={grossPay}
          onChange={(e) => setGrossPay(e.target.value)}
        />
        <Input
          label="Scheduled Hours"
          type="number"
          min="0"
          step="0.25"
          value={scheduledHours}
          onChange={(e) => setScheduledHours(e.target.value)}
        />
        <Textarea
          label="Adjustment Notes"
          value={adjustmentNotes}
          onChange={(e) => setAdjustmentNotes(e.target.value)}
          placeholder="Reason for adjustment..."
          rows={3}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Adjustment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Main Page ----
const PayrollPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const canWrite = hasPermission(PERMISSIONS.PAYROLL_WRITE);
  const canApprove = hasPermission(PERMISSIONS.PAYROLL_APPROVE);

  // List state
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  // Detail state
  const [selectedRun, setSelectedRun] = useState<PayrollRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Generate modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Adjust modal state
  const [adjustingEntry, setAdjustingEntry] = useState<PayrollEntry | null>(null);
  const [adjustSaving, setAdjustSaving] = useState(false);

  const page = Number(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listPayrollRuns({
        status: status || undefined,
        page,
        limit: 20,
      });
      setRuns(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error('Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const handleSelectRun = async (run: PayrollRun) => {
    try {
      setDetailLoading(true);
      setSelectedRun(null);
      const detail = await getPayrollRun(run.id);
      setSelectedRun(detail);
    } catch {
      toast.error('Failed to load payroll run details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedRun(null);
  };

  // Generate
  const handleGenerate = async (periodStart: string, periodEnd: string) => {
    try {
      setGenerating(true);
      const detail = await generatePayrollRun(periodStart, periodEnd);
      toast.success('Payroll run generated');
      setShowGenerateModal(false);
      setSelectedRun(detail);
      fetchRuns();
    } catch {
      toast.error('Failed to generate payroll run');
    } finally {
      setGenerating(false);
    }
  };

  // Approve
  const handleApprove = async () => {
    if (!selectedRun) return;
    try {
      const updated = await approvePayrollRun(selectedRun.id);
      toast.success('Payroll run approved');
      setSelectedRun(updated);
      fetchRuns();
    } catch {
      toast.error('Failed to approve payroll run');
    }
  };

  // Mark Paid
  const handleMarkPaid = async () => {
    if (!selectedRun) return;
    try {
      const updated = await markPayrollRunPaid(selectedRun.id);
      toast.success('Payroll run marked as paid');
      setSelectedRun(updated);
      fetchRuns();
    } catch {
      toast.error('Failed to mark payroll run as paid');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedRun) return;
    if (!window.confirm('Are you sure you want to delete this payroll run?')) return;
    try {
      await deletePayrollRun(selectedRun.id);
      toast.success('Payroll run deleted');
      setSelectedRun(null);
      fetchRuns();
    } catch {
      toast.error('Failed to delete payroll run');
    }
  };

  // Adjust entry
  const handleAdjustSave = async (input: AdjustPayrollEntryInput) => {
    if (!selectedRun || !adjustingEntry) return;
    try {
      setAdjustSaving(true);
      await adjustPayrollEntry(selectedRun.id, adjustingEntry.id, input);
      toast.success('Entry adjusted');
      setAdjustingEntry(null);
      // Refresh the detail view
      const updated = await getPayrollRun(selectedRun.id);
      setSelectedRun(updated);
      fetchRuns();
    } catch {
      toast.error('Failed to adjust entry');
    } finally {
      setAdjustSaving(false);
    }
  };

  // Group entries by employee
  const groupedEntries = selectedRun
    ? selectedRun.entries
        .slice()
        .sort((a, b) => a.user.fullName.localeCompare(b.user.fullName))
        .reduce<Record<string, PayrollEntry[]>>((acc, entry) => {
          const key = entry.userId;
          if (!acc[key]) acc[key] = [];
          acc[key].push(entry);
          return acc;
        }, {})
    : {};

  // Table columns for list view
  const columns = [
    {
      header: 'Period',
      cell: (row: PayrollRun) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {formatDate(row.periodStart)} &ndash; {formatDate(row.periodEnd)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: PayrollRun) => (
        <Badge variant={getRunStatusVariant(row.status)} size="sm">
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Total Gross Pay',
      cell: (row: PayrollRun) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {formatCurrency(row.totalGrossPay)}
        </span>
      ),
    },
    {
      header: 'Entries',
      cell: (row: PayrollRun) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {row.totalEntries}
        </span>
      ),
    },
    {
      header: 'Approved By',
      cell: (row: PayrollRun) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {row.approvedByUser?.fullName || '-'}
        </span>
      ),
    },
    {
      header: 'Paid At',
      cell: (row: PayrollRun) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {formatDate(row.paidAt)}
        </span>
      ),
    },
  ];

  // ---- DETAIL VIEW ----
  if (selectedRun || detailLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBackToList}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Payroll Runs
        </Button>

        {detailLoading && !selectedRun ? (
          <Card>
            <div className="p-8 text-center text-surface-400">Loading...</div>
          </Card>
        ) : selectedRun ? (
          <>
            {/* Header with actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  Payroll Run
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {formatDate(selectedRun.periodStart)} &ndash;{' '}
                  {formatDate(selectedRun.periodEnd)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedRun.status === 'draft' && canApprove && (
                  <Button size="sm" onClick={handleApprove}>
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Approve
                  </Button>
                )}
                {selectedRun.status === 'approved' && canWrite && (
                  <Button size="sm" onClick={handleMarkPaid}>
                    <CreditCard className="mr-1.5 h-4 w-4" />
                    Mark Paid
                  </Button>
                )}
                {selectedRun.status === 'draft' && canWrite && (
                  <Button variant="secondary" size="sm" onClick={handleDelete}>
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Summary card */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <div className="space-y-4 p-5">
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                    Summary
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Status
                      </dt>
                      <dd>
                        <Badge variant={getRunStatusVariant(selectedRun.status)} size="sm">
                          {selectedRun.status}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Total Gross Pay
                      </dt>
                      <dd className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                        {formatCurrency(selectedRun.totalGrossPay)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Total Entries
                      </dt>
                      <dd className="text-sm text-surface-900 dark:text-surface-100">
                        {selectedRun.totalEntries}
                      </dd>
                    </div>
                    {selectedRun.approvedByUser && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          Approved By
                        </dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100">
                          {selectedRun.approvedByUser.fullName}
                          {selectedRun.approvedAt && (
                            <span className="text-xs text-surface-400 ml-2">
                              on {formatDate(selectedRun.approvedAt)}
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                    {selectedRun.paidAt && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          Paid At
                        </dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100">
                          {formatDate(selectedRun.paidAt)}
                        </dd>
                      </div>
                    )}
                    {selectedRun.notes && (
                      <div>
                        <dt className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          Notes
                        </dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100 whitespace-pre-wrap">
                          {selectedRun.notes}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </Card>
            </div>

            {/* Entries grouped by employee */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                Entries
              </h3>
              {Object.keys(groupedEntries).length === 0 ? (
                <Card>
                  <div className="p-8 text-center text-surface-400">
                    No entries in this payroll run.
                  </div>
                </Card>
              ) : (
                Object.entries(groupedEntries).map(([userId, entries]) => {
                  const employee = entries[0].user;
                  return (
                    <Card key={userId}>
                      <div className="p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                              {employee.fullName}
                            </h4>
                            <p className="text-xs text-surface-500 dark:text-surface-400 capitalize">
                              {employee.role}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            {formatCurrency(
                              entries
                                .reduce((sum, e) => sum + parseFloat(e.grossPay), 0)
                                .toFixed(2)
                            )}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-surface-200 dark:border-surface-700">
                                <th className="pb-2 pr-4 text-left text-xs font-medium text-surface-500 dark:text-surface-400">
                                  Pay Type
                                </th>
                                <th className="pb-2 pr-4 text-left text-xs font-medium text-surface-500 dark:text-surface-400">
                                  Hours / Contract
                                </th>
                                <th className="pb-2 pr-4 text-left text-xs font-medium text-surface-500 dark:text-surface-400">
                                  Rate / Tier%
                                </th>
                                <th className="pb-2 pr-4 text-left text-xs font-medium text-surface-500 dark:text-surface-400">
                                  Gross Pay
                                </th>
                                <th className="pb-2 pr-4 text-left text-xs font-medium text-surface-500 dark:text-surface-400">
                                  Status
                                </th>
                                {selectedRun.status === 'draft' && canWrite && (
                                  <th className="pb-2 text-left text-xs font-medium text-surface-500 dark:text-surface-400">
                                    Actions
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map((entry) => (
                                <tr
                                  key={entry.id}
                                  className={cn(
                                    'border-b border-surface-100 last:border-0 dark:border-surface-800 align-top',
                                    entry.status === 'flagged' &&
                                      'bg-amber-50 dark:bg-amber-900/20'
                                  )}
                                >
                                  <td className="py-2 pr-4 text-surface-700 dark:text-surface-300 capitalize">
                                    {entry.payType}
                                  </td>
                                  <td className="py-2 pr-4 text-surface-700 dark:text-surface-300">
                                    <div>
                                      {entry.payType === 'hourly'
                                        ? formatHours(entry.scheduledHours)
                                        : entry.contract
                                          ? entry.contract.contractNumber
                                          : '-'}
                                    </div>
                                    {entry.jobAllocations.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {entry.jobAllocations.map((allocation) => (
                                          <div
                                            key={allocation.id}
                                            className="text-xs text-surface-500 dark:text-surface-400"
                                          >
                                            {allocation.job.jobNumber}
                                            {allocation.job.facility ? ` • ${allocation.job.facility.name}` : ''}
                                            {` • ${formatDate(allocation.job.scheduledDate)}`}
                                            {allocation.allocatedHours ? ` • ${formatHours(allocation.allocatedHours)}` : ''}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 pr-4 text-surface-700 dark:text-surface-300">
                                    {entry.payType === 'hourly'
                                      ? entry.hourlyRate
                                        ? formatCurrency(entry.hourlyRate)
                                        : '-'
                                      : entry.tierPercentage
                                        ? `${entry.tierPercentage}%`
                                        : '-'}
                                  </td>
                                  <td className="py-2 pr-4 font-medium text-surface-900 dark:text-surface-100">
                                    <div>{formatCurrency(entry.grossPay)}</div>
                                    {entry.jobAllocations.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {entry.jobAllocations.map((allocation) => (
                                          <div
                                            key={allocation.id}
                                            className="text-xs font-normal text-surface-500 dark:text-surface-400"
                                          >
                                            {formatCurrency(allocation.allocatedGrossPay)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 pr-4">
                                    <div className="flex items-center gap-1.5">
                                      <Badge
                                        variant={getEntryStatusVariant(entry.status)}
                                        size="sm"
                                      >
                                        {entry.status}
                                      </Badge>
                                      {entry.status === 'flagged' && entry.flagReason && (
                                        <span
                                          className="inline-flex items-center gap-1 text-2xs text-amber-600 dark:text-amber-400"
                                          title={entry.flagReason}
                                        >
                                          <AlertTriangle className="h-3 w-3" />
                                          {entry.flagReason}
                                        </span>
                                      )}
                                      {entry.status === 'adjusted' &&
                                        entry.adjustmentNotes && (
                                          <span
                                            className="text-2xs text-surface-500 dark:text-surface-400"
                                            title={entry.adjustmentNotes}
                                          >
                                            ({entry.adjustmentNotes})
                                          </span>
                                        )}
                                    </div>
                                  </td>
                                  {selectedRun.status === 'draft' && canWrite && (
                                    <td className="py-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setAdjustingEntry(entry)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Adjust modal */}
            <AdjustModal
              isOpen={!!adjustingEntry}
              onClose={() => setAdjustingEntry(null)}
              entry={adjustingEntry}
              onSave={handleAdjustSave}
              saving={adjustSaving}
            />
          </>
        ) : null}
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <DollarSign className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Payroll
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Manage payroll runs and employee pay
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <Select
              options={STATUSES}
              value={status}
              onChange={(val) => updateParam('status', val)}
            />
          </div>
          {canWrite && (
            <Button size="sm" onClick={() => setShowGenerateModal(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Generate Run
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={runs}
          isLoading={loading}
          onRowClick={(row) => handleSelectRun(row)}
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
              onClick={() => updateParam('page', String(pagination.page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParam('page', String(pagination.page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Generate modal */}
      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />
    </div>
  );
};

export default PayrollPage;
