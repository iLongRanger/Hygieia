import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  listProposals,
  archiveProposal,
  restoreProposal,
  sendProposal,
  acceptProposal,
  rejectProposal,
} from '../../lib/proposals';
import type { Proposal, ProposalStatus } from '../../types/proposal';

const PROPOSAL_STATUSES: { value: ProposalStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const getStatusBadge = (status: ProposalStatus) => {
  const statusConfig = {
    draft: { variant: 'secondary' as const, icon: FileText },
    sent: { variant: 'info' as const, icon: Send },
    viewed: { variant: 'warning' as const, icon: Eye },
    accepted: { variant: 'success' as const, icon: CheckCircle },
    rejected: { variant: 'danger' as const, icon: XCircle },
    expired: { variant: 'secondary' as const, icon: Clock },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
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

const ProposalsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [search, setSearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const fetchProposals = useCallback(
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
        const response = await listProposals({
          search: currentSearch || undefined,
          page: currentPage,
          status: filters?.status as ProposalStatus | undefined,
          includeArchived: filters?.includeArchived,
        });
        setProposals(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
        toast.error('Failed to load proposals');
        setProposals([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchProposals(page, search, {
      status: statusFilter,
      includeArchived,
    });
  }, [fetchProposals, page, search, statusFilter, includeArchived]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this proposal?')) return;

    try {
      await archiveProposal(id);
      toast.success('Proposal archived successfully');
      fetchProposals(page, search, { status: statusFilter, includeArchived });
    } catch (error) {
      console.error('Failed to archive proposal:', error);
      toast.error('Failed to archive proposal');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreProposal(id);
      toast.success('Proposal restored successfully');
      fetchProposals(page, search, { status: statusFilter, includeArchived });
    } catch (error) {
      console.error('Failed to restore proposal:', error);
      toast.error('Failed to restore proposal');
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Are you sure you want to send this proposal to the client?')) return;

    try {
      await sendProposal(id);
      toast.success('Proposal sent successfully');
      fetchProposals(page, search, { status: statusFilter, includeArchived });
    } catch (error: any) {
      console.error('Failed to send proposal:', error);
      toast.error(error.response?.data?.message || 'Failed to send proposal');
    }
  };

  const handleAccept = async (id: string) => {
    if (!confirm('Mark this proposal as accepted?')) return;

    try {
      await acceptProposal(id);
      toast.success('Proposal accepted');
      fetchProposals(page, search, { status: statusFilter, includeArchived });
    } catch (error: any) {
      console.error('Failed to accept proposal:', error);
      toast.error(error.response?.data?.message || 'Failed to accept proposal');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    try {
      await rejectProposal(id, { rejectionReason: reason });
      toast.success('Proposal rejected');
      fetchProposals(page, search, { status: statusFilter, includeArchived });
    } catch (error: any) {
      console.error('Failed to reject proposal:', error);
      toast.error(error.response?.data?.message || 'Failed to reject proposal');
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setIncludeArchived(false);
    setPage(1);
  };

  const activeFiltersCount = [statusFilter, includeArchived].filter(Boolean).length;

  const columns = [
    {
      key: 'proposalNumber',
      header: 'Proposal #',
      render: (proposal: Proposal) => (
        <button
          onClick={() => navigate(`/proposals/${proposal.id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {proposal.proposalNumber}
        </button>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (proposal: Proposal) => (
        <div>
          <div className="font-medium">{proposal.title}</div>
          <div className="text-sm text-gray-500">{proposal.account.name}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (proposal: Proposal) => getStatusBadge(proposal.status),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      render: (proposal: Proposal) => (
        <div className="font-medium">{formatCurrency(proposal.totalAmount)}</div>
      ),
    },
    {
      key: 'validUntil',
      header: 'Valid Until',
      render: (proposal: Proposal) => formatDate(proposal.validUntil),
    },
    {
      key: 'sentAt',
      header: 'Sent Date',
      render: (proposal: Proposal) => formatDate(proposal.sentAt),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (proposal: Proposal) => formatDate(proposal.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (proposal: Proposal) => (
        <div className="flex gap-2">
          {proposal.status === 'draft' && (
            <Button size="sm" variant="primary" onClick={() => handleSend(proposal.id)}>
              <Send className="w-4 h-4" />
            </Button>
          )}
          {['sent', 'viewed'].includes(proposal.status) && (
            <>
              <Button
                size="sm"
                variant="success"
                onClick={() => handleAccept(proposal.id)}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleReject(proposal.id)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          {!proposal.archivedAt ? (
            <Button size="sm" variant="secondary" onClick={() => handleArchive(proposal.id)}>
              <Archive className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => handleRestore(proposal.id)}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-600 mt-1">Manage client proposals and estimates</p>
        </div>
        <Button onClick={() => navigate('/proposals/new')}>
          <Plus className="w-5 h-5 mr-2" />
          New Proposal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Proposals</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-gray-900">
                {proposals.filter((p) => p.status === 'sent').length}
              </p>
            </div>
            <Send className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-gray-900">
                {proposals.filter((p) => p.status === 'accepted').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(proposals.reduce((sum, p) => sum + Number(p.totalAmount), 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search proposals..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'All Statuses' },
                  ...PROPOSAL_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                ]}
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeArchived"
                  checked={includeArchived}
                  onChange={(e) => {
                    setIncludeArchived(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeArchived" className="ml-2 text-sm text-gray-700">
                  Include archived proposals
                </label>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={proposals}
          loading={loading}
          emptyMessage="No proposals found"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-700">
              Showing {proposals.length} of {total} proposals
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`px-3 py-1 rounded ${
                      page === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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

export default ProposalsList;
