import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  FileText,
  FileSignature,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Archive,
  RotateCcw,
  X,
  DollarSign,
  Send,
  Eye,
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
  listContracts,
  getContractsSummary,
  archiveContract,
  restoreContract,
  updateContractStatus,
} from '../../lib/contracts';
import type { Contract, ContractStatus, ContractSummary } from '../../types/contract';

const CONTRACT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'pending_signature', label: 'Signed' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
];

const getStatusVariant = (status: ContractStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const variants: Record<ContractStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    sent: 'info',
    viewed: 'info',
    pending_signature: 'success',
    active: 'success',
    expired: 'default',
    terminated: 'error',
  };
  return variants[status];
};

const getStatusIcon = (status: ContractStatus) => {
  const icons: Record<ContractStatus, React.ElementType> = {
    draft: FileText,
    sent: Send,
    viewed: Eye,
    pending_signature: CheckCircle,
    active: CheckCircle,
    expired: Clock,
    terminated: XCircle,
  };
  return icons[status];
};

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'DRAFT',
  sent: 'SENT',
  viewed: 'VIEWED',
  pending_signature: 'SIGNED',
  active: 'ACTIVE',
  expired: 'EXPIRED',
  terminated: 'TERMINATED',
};

type SummaryCardFilter =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'pending_signature'
  | 'active'
  | 'unassigned'
  | 'nearing_renewal';

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

const ContractsList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountIdFilter = searchParams.get('accountId') || undefined;
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [search, setSearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [summaryCardFilter, setSummaryCardFilter] = useState<SummaryCardFilter | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(true);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userRole = useAuthStore((state) => state.user?.role);
  const isFieldWorker = userRole === 'subcontractor' || userRole === 'cleaner';
  const canViewPipelines = userRole === 'owner' || userRole === 'admin';
  const canUseNeedsAttention = userRole === 'owner' || userRole === 'admin';
  const canWriteContracts = hasPermission(PERMISSIONS.CONTRACTS_WRITE);
  const canAdminContracts = hasPermission(PERMISSIONS.CONTRACTS_ADMIN);

  const fetchContracts = useCallback(
    async (
      currentPage: number,
      currentSearch: string,
      filters?: {
        status?: string;
        includeArchived?: boolean;
        needsAttention?: boolean;
        unassignedOnly?: boolean;
        nearingRenewalOnly?: boolean;
        renewalWindowDays?: number;
      }
    ) => {
      try {
        setLoading(true);
        const result = await listContracts({
          page: currentPage,
          limit: 20,
          search: currentSearch || undefined,
          status: (filters?.status && filters.status !== '' ? filters.status : undefined) as ContractStatus | undefined,
          includeArchived: filters?.includeArchived,
          needsAttention: canUseNeedsAttention ? filters?.needsAttention : false,
          unassignedOnly: filters?.unassignedOnly,
          nearingRenewalOnly: filters?.nearingRenewalOnly,
          renewalWindowDays: filters?.renewalWindowDays,
          accountId: accountIdFilter,
        });
        setContracts(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      } catch (error) {
        toast.error('Failed to load contracts');
        console.error('Failed to load contracts:', error);
      } finally {
        setLoading(false);
      }
    },
    [accountIdFilter, canUseNeedsAttention]
  );

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const data = await getContractsSummary({
        accountId: accountIdFilter,
        includeArchived,
      });
      setSummary(data);
    } catch (error) {
      console.error('Failed to load contracts summary:', error);
      toast.error('Failed to load contract summary');
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [accountIdFilter, includeArchived]);

  useEffect(() => {
    const statusFromSummaryCard: ContractStatus | undefined =
      canViewPipelines &&
      (summaryCardFilter === 'draft' ||
        summaryCardFilter === 'sent' ||
        summaryCardFilter === 'viewed' ||
        summaryCardFilter === 'pending_signature' ||
        summaryCardFilter === 'active')
        ? summaryCardFilter
        : undefined;
    fetchContracts(page, search, {
      status: statusFromSummaryCard ?? statusFilter,
      includeArchived,
      needsAttention: canUseNeedsAttention ? needsAttention : false,
      unassignedOnly: canViewPipelines && summaryCardFilter === 'unassigned',
      nearingRenewalOnly: canViewPipelines && summaryCardFilter === 'nearing_renewal',
      renewalWindowDays: summary?.renewalWindowDays ?? 30,
    });
  }, [page, search, statusFilter, includeArchived, needsAttention, summaryCardFilter, summary?.renewalWindowDays, fetchContracts, canViewPipelines, canUseNeedsAttention]);

  useEffect(() => {
    if (!canViewPipelines) {
      setSummary(null);
      setSummaryLoading(false);
      return;
    }
    fetchSummary();
  }, [fetchSummary, canViewPipelines]);

  useEffect(() => {
    setPage(1);
  }, [accountIdFilter]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this contract?')) return;

    try {
      await archiveContract(id);
      toast.success('Contract archived successfully');
      fetchContracts(page, search, { status: statusFilter, includeArchived, needsAttention });
    } catch (error) {
      toast.error('Failed to archive contract');
      console.error('Failed to archive contract:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreContract(id);
      toast.success('Contract restored successfully');
      fetchContracts(page, search, { status: statusFilter, includeArchived, needsAttention });
    } catch (error) {
      toast.error('Failed to restore contract');
      console.error('Failed to restore contract:', error);
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm('Are you sure you want to activate this contract?')) return;

    try {
      await updateContractStatus(id, 'active');
      toast.success('Contract activated successfully');
      fetchContracts(page, search, { status: statusFilter, includeArchived, needsAttention });
    } catch (error) {
      toast.error('Failed to activate contract');
      console.error('Failed to activate contract:', error);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setIncludeArchived(false);
    setNeedsAttention(false);
    setSummaryCardFilter(null);
    setPage(1);
  };

  const hasActiveFilters = statusFilter || includeArchived || needsAttention || summaryCardFilter;

  const handleSummaryCardClick = (filter: SummaryCardFilter) => {
    setSummaryCardFilter((current) => (current === filter ? null : filter));
    setNeedsAttention(false);
    setPage(1);
  };

  const columns = [
    {
      header: 'Contract',
      cell: (contract: Contract) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <FileText className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="font-medium text-white">{contract.contractNumber}</div>
            <div className="text-sm text-gray-400">{contract.title}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Account',
      cell: (contract: Contract) => (
        <span className="text-gray-300">{contract.account.name}</span>
      ),
    },
    {
      header: 'Status',
      cell: (contract: Contract) => {
        const StatusIcon = getStatusIcon(contract.status);
        const daysLeft = contract.status === 'active' && contract.endDate
          ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(contract.status)}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {STATUS_LABELS[contract.status] || contract.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {daysLeft !== null && daysLeft <= 30 && daysLeft > 0 && (
              <Badge variant="warning">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {daysLeft}d
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Start Date',
      cell: (contract: Contract) => (
        <span className="text-gray-300">{formatDate(contract.startDate)}</span>
      ),
    },
    {
      header: 'End Date',
      cell: (contract: Contract) => (
        <span className="text-gray-300">{formatDate(contract.endDate)}</span>
      ),
    },
    {
      header: isFieldWorker ? 'Monthly Payout' : 'Monthly Value',
      cell: (contract: Contract) => {
        const rawValue = isFieldWorker ? contract.subcontractorPayout : contract.monthlyValue;
        const numericValue = Number(rawValue);
        const valueLabel = Number.isFinite(numericValue) ? formatCurrency(numericValue) : '-';
        return (
          <div className="flex items-center text-gray-300">
            <DollarSign className="mr-1 h-4 w-4 text-green-400" />
            {valueLabel}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: (contract: Contract) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/contracts/${contract.id}`);
            }}
          >
            View
          </Button>
          {contract.status === 'draft' && (
            <>
              {canWriteContracts && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/contracts/${contract.id}/edit`);
                  }}
                >
                  Edit
                </Button>
              )}
              {canWriteContracts && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivate(contract.id);
                  }}
                >
                  Activate
                </Button>
              )}
            </>
          )}
          {!contract.archivedAt && contract.status !== 'active' && canAdminContracts && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(contract.id);
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {contract.archivedAt && canAdminContracts && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleRestore(contract.id);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Contracts</h1>
        {canWriteContracts && (
          <Button onClick={() => navigate('/contracts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        )}
      </div>

      {canViewPipelines && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <button
          type="button"
          onClick={() => handleSummaryCardClick('draft')}
          className={`rounded-lg border bg-navy-dark/30 p-3 text-left transition ${
            summaryCardFilter === 'draft' ? 'border-primary-400 ring-1 ring-primary-400/60' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wide">Draft</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {summaryLoading ? '-' : (summary?.byStatus.draft ?? 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleSummaryCardClick('sent')}
          className={`rounded-lg border bg-navy-dark/30 p-3 text-left transition ${
            summaryCardFilter === 'sent' ? 'border-primary-400 ring-1 ring-primary-400/60' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wide">Sent</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {summaryLoading ? '-' : (summary?.byStatus.sent ?? 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleSummaryCardClick('viewed')}
          className={`rounded-lg border bg-navy-dark/30 p-3 text-left transition ${
            summaryCardFilter === 'viewed' ? 'border-primary-400 ring-1 ring-primary-400/60' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wide">Viewed</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {summaryLoading ? '-' : (summary?.byStatus.viewed ?? 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleSummaryCardClick('pending_signature')}
          className={`rounded-lg border bg-navy-dark/30 p-3 text-left transition ${
            summaryCardFilter === 'pending_signature' ? 'border-primary-400 ring-1 ring-primary-400/60' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wide">Signed</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {summaryLoading ? '-' : (summary?.byStatus.pendingSignature ?? 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleSummaryCardClick('active')}
          className={`rounded-lg border bg-navy-dark/30 p-3 text-left transition ${
            summaryCardFilter === 'active' ? 'border-primary-400 ring-1 ring-primary-400/60' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wide">Active</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {summaryLoading ? '-' : (summary?.byStatus.active ?? 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleSummaryCardClick('unassigned')}
          className={`rounded-lg border bg-rose-500/10 p-3 text-left transition ${
            summaryCardFilter === 'unassigned' ? 'border-rose-300 ring-1 ring-rose-300/60' : 'border-rose-400/20 hover:border-rose-300/50'
          }`}
        >
          <div className="text-xs text-rose-200 uppercase tracking-wide">Unassigned</div>
          <div className="mt-1 text-xl font-semibold text-rose-100">
            {summaryLoading ? '-' : (summary?.unassigned ?? 0)}
          </div>
          <div className="text-[11px] text-rose-200/80">
            no team assigned
          </div>
        </button>
        <button
          type="button"
          onClick={() => handleSummaryCardClick('nearing_renewal')}
          className={`rounded-lg border bg-amber-500/10 p-3 text-left transition ${
            summaryCardFilter === 'nearing_renewal' ? 'border-amber-300 ring-1 ring-amber-300/60' : 'border-amber-400/20 hover:border-amber-300/50'
          }`}
        >
          <div className="text-xs text-amber-200 uppercase tracking-wide">Nearing Renewal</div>
          <div className="mt-1 text-xl font-semibold text-amber-100">
            {summaryLoading ? '-' : (summary?.nearingRenewal ?? 0)}
          </div>
          <div className="text-[11px] text-amber-200/80">
            next {summary?.renewalWindowDays ?? 30} days
          </div>
        </button>
      </div>
      )}

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search contracts..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Button
              variant={hasActiveFilters ? 'primary' : 'secondary'}
              className="px-3"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && <span className="ml-2">*</span>}
            </Button>
            {canUseNeedsAttention && (
              <Button
                variant={needsAttention ? 'primary' : 'secondary'}
                className="px-3"
                onClick={() => {
                  setNeedsAttention((prev) => !prev);
                  setPage(1);
                }}
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="ml-2">Needs Attention</span>
              </Button>
            )}
          </div>
          {accountIdFilter && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-300">
              <span className="rounded-full border border-white/10 bg-navy-darker/60 px-3 py-1">
                Filtered by account
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/contracts')}
              >
                Clear
              </Button>
            </div>
          )}
          {canUseNeedsAttention && needsAttention && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-amber-200">
              <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1">
                Showing contracts needing attention: unassigned team or waiting for acceptance
              </span>
            </div>
          )}
          {summaryCardFilter && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-primary-200">
              <span className="rounded-full border border-primary-300/40 bg-primary-500/10 px-3 py-1">
                Summary filter: {summaryCardFilter === 'nearing_renewal' ? 'Nearing Renewal' : summaryCardFilter.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          )}

          {showFilterPanel && (
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-navy-darker/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Status"
                placeholder="All Statuses"
                options={CONTRACT_STATUSES}
                value={statusFilter}
                onChange={handleStatusFilter}
              />
              {canUseNeedsAttention && (
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={needsAttention}
                      onChange={(e) => {
                        setNeedsAttention(e.target.checked);
                        setPage(1);
                      }}
                      className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                    />
                    Needs Attention Only
                  </label>
                </div>
              )}
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                  />
                  Include Archived
                </label>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <Table data={contracts} columns={columns} isLoading={loading} />

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing {contracts.length} of {total} contracts
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ContractsList;

