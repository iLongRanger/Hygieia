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
  archiveContract,
  restoreContract,
  updateContractStatus,
} from '../../lib/contracts';
import type { Contract, ContractStatus } from '../../types/contract';

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

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWriteContracts = hasPermission(PERMISSIONS.CONTRACTS_WRITE);
  const canAdminContracts = hasPermission(PERMISSIONS.CONTRACTS_ADMIN);

  const fetchContracts = useCallback(
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
        const result = await listContracts({
          page: currentPage,
          limit: 20,
          search: currentSearch || undefined,
          status: (filters?.status && filters.status !== '' ? filters.status : undefined) as ContractStatus | undefined,
          includeArchived: filters?.includeArchived,
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
    [accountIdFilter]
  );

  useEffect(() => {
    fetchContracts(page, search, { status: statusFilter, includeArchived });
  }, [page, search, statusFilter, includeArchived, fetchContracts]);

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
      fetchContracts(page, search, { status: statusFilter, includeArchived });
    } catch (error) {
      toast.error('Failed to archive contract');
      console.error('Failed to archive contract:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreContract(id);
      toast.success('Contract restored successfully');
      fetchContracts(page, search, { status: statusFilter, includeArchived });
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
      fetchContracts(page, search, { status: statusFilter, includeArchived });
    } catch (error) {
      toast.error('Failed to activate contract');
      console.error('Failed to activate contract:', error);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setIncludeArchived(false);
    setPage(1);
  };

  const hasActiveFilters = statusFilter || includeArchived;

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
      header: 'Monthly Value',
      cell: (contract: Contract) => (
        <div className="flex items-center text-gray-300">
          <DollarSign className="mr-1 h-4 w-4 text-green-400" />
          {formatCurrency(Number(contract.monthlyValue))}
        </div>
      ),
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

          {showFilterPanel && (
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-navy-darker/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Status"
                placeholder="All Statuses"
                options={CONTRACT_STATUSES}
                value={statusFilter}
                onChange={handleStatusFilter}
              />
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

