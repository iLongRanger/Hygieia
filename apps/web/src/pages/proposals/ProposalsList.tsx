import React, { useState, useEffect, useCallback } from 'react';
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
  Download,
  RefreshCw,
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
  listProposals,
  archiveProposal,
  restoreProposal,
  sendProposal,
  acceptProposal,
  rejectProposal,
  downloadProposalPdf,
  remindProposal,
} from '../../lib/proposals';
import SendProposalModal from '../../components/proposals/SendProposalModal';
import type { Proposal, ProposalStatus } from '../../types/proposal';

const PROPOSAL_STATUSES: { value: ProposalStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const getStatusVariant = (status: ProposalStatus) => {
  const variants: Record<ProposalStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    sent: 'info',
    viewed: 'warning',
    accepted: 'success',
    rejected: 'error',
    expired: 'default',
  };
  return variants[status];
};

const getStatusIcon = (status: ProposalStatus) => {
  const icons: Record<ProposalStatus, React.ElementType> = {
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

const ProposalsList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountIdFilter = searchParams.get('accountId') || undefined;
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
  const [sendModalProposal, setSendModalProposal] = useState<Proposal | null>(null);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWriteProposals = hasPermission(PERMISSIONS.PROPOSALS_WRITE);
  const canAdminProposals = hasPermission(PERMISSIONS.PROPOSALS_ADMIN);

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
          status: (filters?.status as ProposalStatus) || undefined,
          includeArchived: filters?.includeArchived,
          accountId: accountIdFilter,
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
    [accountIdFilter]
  );

  useEffect(() => {
    fetchProposals(page, search, {
      status: statusFilter,
      includeArchived,
    });
  }, [fetchProposals, page, search, statusFilter, includeArchived]);

  useEffect(() => {
    setPage(1);
  }, [accountIdFilter]);

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

  const handleSendFromModal = async (data?: any) => {
    if (!sendModalProposal) return;
    try {
      if (['sent', 'viewed'].includes(sendModalProposal.status)) {
        await remindProposal(sendModalProposal.id, data);
        toast.success('Reminder sent successfully');
      } else {
        await sendProposal(sendModalProposal.id, data);
        toast.success('Proposal sent successfully');
      }
      setSendModalProposal(null);
      fetchProposals(page, search, { status: statusFilter, includeArchived });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send proposal');
      throw error;
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

  const handleDownloadPdf = async (proposal: Proposal) => {
    try {
      await downloadProposalPdf(proposal.id, proposal.proposalNumber);
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF');
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
      header: 'Proposal',
      cell: (proposal: Proposal) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <FileText className="h-5 w-5 text-gold" />
          </div>
          <div>
            <button
              onClick={() => navigate(`/proposals/${proposal.id}`)}
              className="font-medium text-white hover:text-gold transition-colors"
            >
              {proposal.proposalNumber}
            </button>
            <div className="text-sm text-gray-400">{proposal.title}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Account',
      cell: (proposal: Proposal) => (
        <span className="text-gray-300">{proposal.account.name}</span>
      ),
    },
    {
      header: 'Status',
      cell: (proposal: Proposal) => {
        const Icon = getStatusIcon(proposal.status);
        return (
          <Badge variant={getStatusVariant(proposal.status)}>
            <Icon className="w-3 h-3 mr-1" />
            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      header: 'Amount',
      cell: (proposal: Proposal) => (
        <span className="font-medium text-emerald">
          {formatCurrency(proposal.totalAmount)}
        </span>
      ),
    },
    {
      header: 'Valid Until',
      cell: (proposal: Proposal) => (
        <span className="text-gray-300">{formatDate(proposal.validUntil)}</span>
      ),
    },
    {
      header: 'Created',
      cell: (proposal: Proposal) => (
        <span className="text-gray-400">{formatDate(proposal.createdAt)}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (proposal: Proposal) => (
        <div className="flex gap-1">
          {/* PDF Download - available for all non-draft proposals */}
          {proposal.status !== 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPdf(proposal);
              }}
              title="Download PDF"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </Button>
          )}
          {proposal.status === 'draft' && canWriteProposals && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSendModalProposal(proposal);
              }}
              title="Send Proposal"
            >
              <Send className="w-4 h-4 text-blue-400" />
            </Button>
          )}
          {['sent', 'viewed'].includes(proposal.status) && canWriteProposals && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSendModalProposal(proposal);
                }}
                title="Send Reminder"
              >
                <RefreshCw className="w-4 h-4 text-purple-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept(proposal.id);
                }}
                title="Accept"
              >
                <CheckCircle className="w-4 h-4 text-green-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(proposal.id);
                }}
                title="Reject"
              >
                <XCircle className="w-4 h-4 text-red-400" />
              </Button>
            </>
          )}
          {!proposal.archivedAt && canAdminProposals ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(proposal.id);
              }}
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </Button>
          ) : proposal.archivedAt && canAdminProposals ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRestore(proposal.id);
              }}
              title="Restore"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  // Stats calculations
  const sentCount = proposals.filter((p) => p.status === 'sent').length;
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;
  const totalValue = proposals.reduce(
    (sum, p) => sum + Number(p.totalAmount),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Proposals</h1>
        {canWriteProposals && (
          <Button onClick={() => navigate('/proposals/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Proposals</p>
              <p className="text-2xl font-bold text-white">{total}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Sent</p>
              <p className="text-2xl font-bold text-white">{sentCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Send className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Accepted</p>
              <p className="text-2xl font-bold text-white">{acceptedCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-emerald">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
              <DollarSign className="w-5 h-5 text-emerald" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search, Filters, and Table */}
      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search proposals..."
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
                onClick={() => navigate('/proposals')}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-navy-darker/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Status"
                placeholder="All Statuses"
                options={PROPOSAL_STATUSES}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => {
                      setIncludeArchived(e.target.checked);
                      setPage(1);
                    }}
                    className="rounded border-white/20 bg-navy-darker text-emerald focus:ring-emerald"
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

        <Table data={proposals} columns={columns} isLoading={loading} />

        {/* Pagination */}
        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing {proposals.length} of {total} proposals
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

      {/* Send Proposal Modal */}
      {sendModalProposal && canWriteProposals && (
        <SendProposalModal
          isOpen={!!sendModalProposal}
          onClose={() => setSendModalProposal(null)}
          proposal={sendModalProposal}
          onSend={handleSendFromModal}
        />
      )}
    </div>
  );
};

export default ProposalsList;

