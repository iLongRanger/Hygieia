import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Filter,
  Plus,
  Zap,
  X,
  AlertTriangle,
  Send,
  CheckSquare,
  Square,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { listInvoices, batchGenerateInvoices, sendInvoice } from '../../lib/invoices';
import type { Invoice, InvoiceStatus } from '../../types/invoice';
import type { Pagination } from '../../types/crm';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  void: 'Void',
  written_off: 'Written Off',
};

const getStatusVariant = (status: InvoiceStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const map: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    pending_review: 'warning',
    sent: 'info',
    viewed: 'info',
    paid: 'success',
    partial: 'warning',
    overdue: 'error',
    void: 'error',
    written_off: 'error',
  };
  return map[status];
};

const formatCurrency = (value: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(value));
};

const TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
];

const InvoicesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchStart, setBatchStart] = useState('');
  const [batchEnd, setBatchEnd] = useState('');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const page = Number(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const isReviewQueue = status === 'pending_review';

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listInvoices({
        status: status || undefined,
        page,
        limit: 20,
      });
      setInvoices(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Always show pending-review count badge in the tab strip
  useEffect(() => {
    let canceled = false;
    listInvoices({ status: 'pending_review', limit: 1 })
      .then((res) => {
        if (!canceled) setPendingCount(res.pagination?.total ?? 0);
      })
      .catch(() => {
        if (!canceled) setPendingCount(0);
      });
    return () => {
      canceled = true;
    };
  }, [invoices]);

  // Reset selection when the underlying rows change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, status]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === invoices.length && invoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((i) => i.id)));
    }
  };

  const handleBulkApproveSend = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one invoice');
      return;
    }
    if (!confirm(`Approve and send ${selectedIds.size} invoice${selectedIds.size === 1 ? '' : 's'} to customers? Each will be emailed with a PDF attached.`)) {
      return;
    }
    setBulkSending(true);
    let ok = 0;
    let failed: string[] = [];
    for (const id of selectedIds) {
      try {
        await sendInvoice(id);
        ok += 1;
      } catch (err) {
        const inv = invoices.find((i) => i.id === id);
        failed.push(inv?.invoiceNumber ?? id);
      }
    }
    setBulkSending(false);
    setSelectedIds(new Set());
    fetchInvoices();
    if (failed.length === 0) {
      toast.success(`Sent ${ok} invoice${ok === 1 ? '' : 's'}`);
    } else {
      toast.error(`Sent ${ok}, failed: ${failed.join(', ')}`);
    }
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const handleBatchGenerate = async () => {
    if (!batchStart || !batchEnd) {
      toast.error('Period dates are required');
      return;
    }
    try {
      const result = await batchGenerateInvoices({ periodStart: batchStart, periodEnd: batchEnd });
      toast.success(`Generated ${result.generated} invoices (${result.skipped} skipped)`);
      setShowBatch(false);
      fetchInvoices();
    } catch {
      toast.error('Failed to batch generate');
    }
  };

  const isOverdue = (invoice: Invoice) => {
    return (
      parseFloat(invoice.balanceDue) > 0 &&
      new Date(invoice.dueDate) < new Date() &&
      !['paid', 'void', 'written_off'].includes(invoice.status)
    );
  };

  const selectionColumn = isReviewQueue
    ? [
        {
          header: (
            <button
              type="button"
              className="flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectAll();
              }}
              aria-label="Select all"
            >
              {selectedIds.size > 0 && selectedIds.size === invoices.length ? (
                <CheckSquare className="h-4 w-4 text-primary-600" />
              ) : (
                <Square className="h-4 w-4 text-surface-400" />
              )}
            </button>
          ) as unknown as string,
          cell: (row: Invoice) => (
            <button
              type="button"
              className="flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                toggleSelected(row.id);
              }}
              aria-label={`Select ${row.invoiceNumber}`}
            >
              {selectedIds.has(row.id) ? (
                <CheckSquare className="h-4 w-4 text-primary-600" />
              ) : (
                <Square className="h-4 w-4 text-surface-400" />
              )}
            </button>
          ),
        },
      ]
    : [];

  const columns = [
    ...selectionColumn,
    {
      header: 'Invoice',
      cell: (row: Invoice) => (
        <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      header: 'Account',
      cell: (row: Invoice) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {row.account.name}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: Invoice) => (
        <div className="flex items-center gap-1">
          <Badge variant={isOverdue(row) ? 'error' : getStatusVariant(row.status)} size="sm">
            {isOverdue(row) ? 'Overdue' : STATUS_LABELS[row.status] ?? row.status}
          </Badge>
          {isOverdue(row) && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
        </div>
      ),
    },
    {
      header: 'Issue Date',
      cell: (row: Invoice) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {new Date(row.issueDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Due Date',
      cell: (row: Invoice) => (
        <span className={`text-sm ${isOverdue(row) ? 'text-red-600 font-medium' : 'text-surface-600 dark:text-surface-400'}`}>
          {new Date(row.dueDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Total',
      cell: (row: Invoice) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {formatCurrency(row.totalAmount)}
        </span>
      ),
    },
    {
      header: 'Balance',
      cell: (row: Invoice) => (
        <span className={`text-sm font-medium ${parseFloat(row.balanceDue) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
          {formatCurrency(row.balanceDue)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <Receipt className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Invoices
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Billing and payment management
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowBatch(!showBatch)}>
            <Zap className="mr-1.5 h-4 w-4" />
            Batch Generate
          </Button>
          <Button size="sm" onClick={() => navigate('/invoices/new', { state: { backLabel: 'Invoices', backPath: '/invoices' } })}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-surface-200 dark:border-surface-700">
        {TABS.map((tab) => {
          const active = tab.value === status;
          const showCount = tab.value === 'pending_review' && pendingCount > 0;
          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => updateParam('status', tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                  : 'border-transparent text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'
              }`}
            >
              {tab.label}
              {showCount && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 dark:bg-amber-900/40 dark:text-amber-300">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk approve/send bar (only on Pending Review tab) */}
      {isReviewQueue && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="text-sm text-surface-700 dark:text-surface-300">
              {selectedIds.size === 0
                ? 'Select invoices to approve and email customers.'
                : `${selectedIds.size} invoice${selectedIds.size === 1 ? '' : 's'} selected.`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleSelectAll}
                disabled={invoices.length === 0}
              >
                {selectedIds.size === invoices.length && invoices.length > 0
                  ? 'Clear selection'
                  : 'Select all on page'}
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApproveSend}
                disabled={selectedIds.size === 0 || bulkSending}
              >
                <Send className="mr-1.5 h-4 w-4" />
                {bulkSending ? 'Sending...' : 'Approve & Send Selected'}
              </Button>
            </div>
          </div>
        </Card>
      )}

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
            <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Batch Generate */}
      {showBatch && (
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              Batch Generate Invoices for All Active Contracts
            </h3>
            <div className="flex items-end gap-4">
              <Input
                label="Period Start"
                type="date"
                value={batchStart}
                onChange={(e) => setBatchStart(e.target.value)}
              />
              <Input
                label="Period End"
                type="date"
                value={batchEnd}
                onChange={(e) => setBatchEnd(e.target.value)}
              />
              <Button size="sm" onClick={handleBatchGenerate}>Generate</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowBatch(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={invoices}
          isLoading={loading}
          onRowClick={(row) => navigate(`/invoices/${row.id}`, { state: { backLabel: 'Invoices', backPath: '/invoices' } })}
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
    </div>
  );
};

export default InvoicesList;
