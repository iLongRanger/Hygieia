import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Archive,
  RotateCcw,
  X,
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import {
  listQuotations,
  archiveQuotation,
  restoreQuotation,
} from '../../lib/quotations';
import type { Quotation, QuotationStatus } from '../../types/quotation';

const QUOTATION_STATUSES: { value: QuotationStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const getStatusVariant = (status: QuotationStatus) => {
  const variants: Record<QuotationStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    sent: 'info',
    viewed: 'warning',
    accepted: 'success',
    rejected: 'error',
    expired: 'default',
  };
  return variants[status];
};

const getStatusIcon = (status: QuotationStatus) => {
  const icons: Record<QuotationStatus, React.ElementType> = {
    draft: FileText,
    sent: Send,
    viewed: Eye,
    accepted: CheckCircle,
    rejected: XCircle,
    expired: Clock,
  };
  return icons[status];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
};

const QuotationsList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountIdFilter = searchParams.get('accountId') || undefined;
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWriteQuotations = hasPermission(PERMISSIONS.QUOTATIONS_WRITE);
  const canAdminQuotations = hasPermission(PERMISSIONS.QUOTATIONS_ADMIN);

  const fetchQuotations = useCallback(
    async (
      currentPage: number,
      currentSearch: string,
      filters?: {
        status?: string;
        includeArchived?: boolean;
      }
    ) => {
      try {
        setLoading(true);
        const response = await listQuotations({
          search: currentSearch || undefined,
          page: currentPage,
          status: (filters?.status as QuotationStatus) || undefined,
          includeArchived: filters?.includeArchived,
          accountId: accountIdFilter,
        });
        setQuotations(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch quotations:', error);
        toast.error('Failed to load quotations');
        setQuotations([]);
      } finally {
        setLoading(false);
      }
    },
    [accountIdFilter]
  );

  useEffect(() => {
    fetchQuotations(page, search, {
      status: statusFilter,
      includeArchived,
    });
  }, [fetchQuotations, page, search, statusFilter, includeArchived]);

  useEffect(() => {
    setPage(1);
  }, [accountIdFilter]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this quotation?')) return;
    try {
      await archiveQuotation(id);
      toast.success('Quotation archived');
      fetchQuotations(page, search, { status: statusFilter, includeArchived });
    } catch {
      toast.error('Failed to archive quotation');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreQuotation(id);
      toast.success('Quotation restored');
      fetchQuotations(page, search, { status: statusFilter, includeArchived });
    } catch {
      toast.error('Failed to restore quotation');
    }
  };

  const columns = [
    {
      header: 'Number',
      cell: (q: Quotation) => (
        <button
          onClick={() => navigate(`/quotations/${q.id}`)}
          className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
        >
          {q.quotationNumber}
        </button>
      ),
    },
    {
      header: 'Title',
      cell: (q: Quotation) => (
        <span className="text-sm text-surface-900 dark:text-surface-100">{q.title}</span>
      ),
    },
    {
      header: 'Account',
      cell: (q: Quotation) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">{q.account?.name}</span>
      ),
    },
    {
      header: 'Status',
      cell: (q: Quotation) => {
        const StatusIcon = getStatusIcon(q.status);
        return (
          <Badge variant={getStatusVariant(q.status)} size="sm">
            <StatusIcon className="mr-1 h-3 w-3" />
            {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      header: 'Amount',
      cell: (q: Quotation) => (
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {formatCurrency(Number(q.totalAmount))}
        </span>
      ),
    },
    {
      header: 'Valid Until',
      cell: (q: Quotation) => (
        <span className="text-sm text-surface-500">{formatDate(q.validUntil)}</span>
      ),
    },
    {
      header: 'Created',
      cell: (q: Quotation) => (
        <span className="text-sm text-surface-500">{formatDate(q.createdAt)}</span>
      ),
    },
    ...(canAdminQuotations
      ? [
          {
            header: '',
            cell: (q: Quotation) => (
              <div className="flex items-center gap-1">
                {q.archivedAt ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(q.id);
                    }}
                    className="p-1.5 text-surface-400 hover:text-green-600"
                    title="Restore"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive(q.id);
                    }}
                    className="p-1.5 text-surface-400 hover:text-orange-600"
                    title="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <DollarSign className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Quotations
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              One-time quotes for specialized cleaning services
            </p>
          </div>
        </div>
        {canWriteQuotations && (
          <Button onClick={() => navigate('/quotations/new')}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Quotation
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <Input
                className="pl-9"
                placeholder="Search quotations..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <Filter className="mr-1.5 h-4 w-4" />
              Filters
              {(statusFilter || includeArchived) && (
                <span className="ml-1.5 h-5 w-5 rounded-full bg-primary-600 text-xs font-bold text-white flex items-center justify-center">
                  {[statusFilter, includeArchived].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>

          {showFilterPanel && (
            <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-surface-100 pt-4 dark:border-surface-700">
              <div className="w-48">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: 'All Statuses' },
                    ...QUOTATION_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                  ]}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => {
                    setIncludeArchived(e.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-surface-300"
                />
                Include archived
              </label>
              {(statusFilter || includeArchived) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('');
                    setIncludeArchived(false);
                    setPage(1);
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={quotations}
          loading={loading}
          emptyMessage="No quotations found"
          emptyIcon={<DollarSign className="h-8 w-8 text-surface-400" />}
          onRowClick={(q) => navigate(`/quotations/${q.id}`)}
          pagination={{
            page,
            totalPages,
            total,
            onPageChange: setPage,
          }}
        />
      </Card>
    </div>
  );
};

export default QuotationsList;
