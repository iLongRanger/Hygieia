import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  FileText,
  FileSignature,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
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
import {
  listContracts,
  archiveContract,
  restoreContract,
  updateContractStatus,
} from '../../lib/contracts';
import type { Contract, ContractStatus } from '../../types/contract';

const CONTRACT_STATUSES: { value: ContractStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_signature', label: 'Pending Signature' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'renewed', label: 'Renewed' },
];

const getStatusVariant = (status: ContractStatus) => {
  const variants: Record<ContractStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    pending_signature: 'warning',
    active: 'success',
    expired: 'default',
    terminated: 'error',
    renewed: 'info',
  };
  return variants[status];
};

const getStatusIcon = (status: ContractStatus) => {
  const icons: Record<ContractStatus, React.ElementType> = {
    draft: FileText,
    pending_signature: FileSignature,
    active: CheckCircle,
    expired: Clock,
    terminated: XCircle,
    renewed: AlertCircle,
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

const ContractsList = () => {
  const navigate = useNavigate();
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
    []
  );

  useEffect(() => {
    fetchContracts(page, search, { status: statusFilter, includeArchived });
  }, [page, search, statusFilter, includeArchived, fetchContracts]);

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

  const columns = [
    {
      header: 'Contract #',
      accessor: 'contractNumber' as keyof Contract,
      render: (contract: Contract) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-100">{contract.contractNumber}</span>
          <span className="text-sm text-gray-400">{contract.title}</span>
        </div>
      ),
    },
    {
      header: 'Account',
      accessor: 'account' as keyof Contract,
      render: (contract: Contract) => (
        <span className="text-gray-100">{contract.account.name}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status' as keyof Contract,
      render: (contract: Contract) => {
        const StatusIcon = getStatusIcon(contract.status);
        return (
          <Badge variant={getStatusVariant(contract.status)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {contract.status.replace('_', ' ').toUpperCase()}
          </Badge>
        );
      },
    },
    {
      header: 'Start Date',
      accessor: 'startDate' as keyof Contract,
      render: (contract: Contract) => (
        <span className="text-gray-300">{formatDate(contract.startDate)}</span>
      ),
    },
    {
      header: 'End Date',
      accessor: 'endDate' as keyof Contract,
      render: (contract: Contract) => (
        <span className="text-gray-300">{formatDate(contract.endDate)}</span>
      ),
    },
    {
      header: 'Monthly Value',
      accessor: 'monthlyValue' as keyof Contract,
      render: (contract: Contract) => (
        <div className="flex items-center text-gray-100">
          <DollarSign className="w-4 h-4 mr-1 text-green-400" />
          {formatCurrency(Number(contract.monthlyValue))}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof Contract,
      render: (contract: Contract) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/contracts/${contract.id}`)}
          >
            View
          </Button>
          {contract.status === 'draft' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/contracts/${contract.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleActivate(contract.id)}
              >
                Activate
              </Button>
            </>
          )}
          {!contract.archivedAt && contract.status !== 'active' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleArchive(contract.id)}
            >
              <Archive className="w-4 h-4" />
            </Button>
          )}
          {contract.archivedAt && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRestore(contract.id)}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Contracts</h1>
          <p className="text-gray-400">Manage service contracts and agreements</p>
        </div>

        {/* Toolbar */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search contracts..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/contracts/new')}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Contract
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <Select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-gray-100"
                  >
                    <option value="">All Statuses</option>
                    {CONTRACT_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center space-x-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={includeArchived}
                      onChange={(e) => setIncludeArchived(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                    <span>Include archived</span>
                  </label>
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('');
                      setIncludeArchived(false);
                      setShowFilterPanel(false);
                    }}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Table */}
        <Card className="bg-gray-800 border-gray-700">
          <Table
            columns={columns}
            data={contracts}
            loading={loading}
            emptyMessage="No contracts found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
              <div className="text-sm text-gray-400">
                Showing page {page} of {totalPages} ({total} total contracts)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-gray-600 text-gray-300 disabled:opacity-50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-gray-600 text-gray-300 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ContractsList;
