import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Target,
  Archive,
  RotateCcw,
  DollarSign,
  X,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  listOpportunities,
  createOpportunity,
  archiveOpportunity,
  restoreOpportunity,
} from '../../lib/opportunities';
import { listLeads } from '../../lib/leads';
import { listAccounts } from '../../lib/accounts';
import { listUsers } from '../../lib/users';
import type { Opportunity, CreateOpportunityInput, Lead, Account } from '../../types/crm';
import type { User } from '../../types/user';

const OPPORTUNITY_STATUSES = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'needs_analysis', label: 'Needs Analysis' },
  { value: 'value_proposition', label: 'Value Proposition' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const OpportunitiesList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [formData, setFormData] = useState<CreateOpportunityInput>({
    name: '',
    status: 'prospecting',
    leadId: null,
    accountId: null,
    probability: null,
    expectedValue: null,
    expectedCloseDate: null,
    assignedToUserId: null,
    description: null,
  });

  const fetchOpportunities = useCallback(
    async (currentPage: number, currentSearch: string, filters?: {
      status?: string;
      assignedToUserId?: string;
      includeArchived?: boolean;
    }) => {
      try {
        setLoading(true);
        const response = await listOpportunities({
          search: currentSearch || undefined,
          page: currentPage,
          status: filters?.status || undefined,
          assignedToUserId: filters?.assignedToUserId || undefined,
          includeArchived: filters?.includeArchived,
        });
        setOpportunities(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch opportunities:', error);
        toast.error('Failed to load opportunities');
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchLeads = useCallback(async () => {
    try {
      const response = await listLeads({ limit: 100 });
      setLeads(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await listAccounts({ limit: 100 });
      setAccounts(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await listUsers({ limit: 100 });
      setUsers(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities(page, search, {
      status: statusFilter,
      assignedToUserId: assignedToFilter,
      includeArchived,
    });
  }, [fetchOpportunities, page, search, statusFilter, assignedToFilter, includeArchived]);

  useEffect(() => {
    fetchLeads();
    fetchAccounts();
    fetchUsers();
  }, [fetchLeads, fetchAccounts, fetchUsers]);

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please enter an opportunity name');
      return;
    }

    try {
      setCreating(true);
      await createOpportunity(formData);
      toast.success('Opportunity created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchOpportunities(page, search, {
        status: statusFilter,
        assignedToUserId: assignedToFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      toast.error('Failed to create opportunity. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      status: 'prospecting',
      leadId: null,
      accountId: null,
      probability: null,
      expectedValue: null,
      expectedCloseDate: null,
      assignedToUserId: null,
      description: null,
    });
  };

  const clearFilters = () => {
    setStatusFilter('');
    setAssignedToFilter('');
    setIncludeArchived(false);
    setPage(1);
  };

  const hasActiveFilters = statusFilter || assignedToFilter || includeArchived;

  const handleArchive = async (id: string) => {
    try {
      await archiveOpportunity(id);
      toast.success('Opportunity archived successfully');
      fetchOpportunities(page, search, {
        status: statusFilter,
        assignedToUserId: assignedToFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to archive opportunity:', error);
      toast.error('Failed to archive opportunity');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreOpportunity(id);
      toast.success('Opportunity restored successfully');
      fetchOpportunities(page, search, {
        status: statusFilter,
        assignedToUserId: assignedToFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to restore opportunity:', error);
      toast.error('Failed to restore opportunity');
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'closed_won':
        return 'success';
      case 'closed_lost':
        return 'error';
      case 'negotiation':
      case 'value_proposition':
        return 'warning';
      case 'qualification':
      case 'needs_analysis':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const columns = [
    {
      header: 'Opportunity',
      cell: (item: Opportunity) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
            <Target className="h-5 w-5 text-emerald" />
          </div>
          <div>
            <div className="font-medium text-white">{item.name}</div>
            <div className="text-sm text-gray-400">
              {item.account?.name || item.lead?.companyName || item.lead?.contactName || 'No association'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Value',
      cell: (item: Opportunity) => (
        <div className="flex items-center gap-2 text-gray-300">
          <DollarSign className="h-4 w-4 text-gray-500" />
          {formatCurrency(item.expectedValue)}
        </div>
      ),
    },
    {
      header: 'Probability',
      cell: (item: Opportunity) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-gray-700">
            <div
              className="h-2 rounded-full bg-emerald"
              style={{ width: `${item.probability || 0}%` }}
            />
          </div>
          <span className="text-sm text-gray-300">{item.probability || 0}%</span>
        </div>
      ),
    },
    {
      header: 'Stage',
      cell: (item: Opportunity) => (
        <Badge variant={getStatusVariant(item.status)}>
          {formatStatus(item.status)}
        </Badge>
      ),
    },
    {
      header: 'Expected Close',
      cell: (item: Opportunity) => (
        <span className="text-gray-300">
          {item.expectedCloseDate
            ? new Date(item.expectedCloseDate).toLocaleDateString()
            : '-'}
        </span>
      ),
    },
    {
      header: 'Assigned To',
      cell: (item: Opportunity) => (
        <span className="text-gray-300">
          {item.assignedToUser?.fullName || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (item: Opportunity) => (
        <Badge variant={item.archivedAt ? 'error' : 'success'}>
          {item.archivedAt ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: Opportunity) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/opportunities/${item.id}`)}
          >
            View
          </Button>
          {item.archivedAt ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRestore(item.id);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(item.id);
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Calculate pipeline summary
  const pipelineValue = opportunities
    .filter((o) => !o.archivedAt && o.status !== 'closed_lost')
    .reduce((sum, o) => sum + (Number(o.expectedValue) || 0), 0);

  const weightedValue = opportunities
    .filter((o) => !o.archivedAt && o.status !== 'closed_lost' && o.status !== 'closed_won')
    .reduce((sum, o) => sum + ((Number(o.expectedValue) || 0) * (o.probability || 0) / 100), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Opportunities</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Opportunity
        </Button>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
              <Target className="h-5 w-5 text-emerald" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Pipeline</div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(pipelineValue.toString())}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
              <TrendingUp className="h-5 w-5 text-gold" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Weighted Pipeline</div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(weightedValue.toString())}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
              <DollarSign className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Open Deals</div>
              <div className="text-xl font-bold text-white">
                {opportunities.filter((o) => !o.archivedAt && !o.status.startsWith('closed')).length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search opportunities..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant={hasActiveFilters ? 'primary' : 'secondary'}
              className="px-3"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && <span className="ml-2">•</span>}
            </Button>
          </div>

          {showFilterPanel && (
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-navy-darker/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Stage"
                placeholder="All Stages"
                options={OPPORTUNITY_STATUSES}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <Select
                label="Assigned To"
                placeholder="All Users"
                options={users.map((u) => ({
                  value: u.id,
                  label: u.fullName,
                }))}
                value={assignedToFilter}
                onChange={setAssignedToFilter}
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

        <Table data={opportunities} columns={columns} isLoading={loading} />

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing {opportunities.length} of {total} opportunities
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

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Opportunity"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Opportunity Name"
            placeholder="Office Cleaning Contract - Main Building"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Link to Lead"
              placeholder="Select a lead (optional)"
              options={leads.map((l) => ({
                value: l.id,
                label: l.companyName ? `${l.contactName} - ${l.companyName}` : l.contactName,
              }))}
              value={formData.leadId || ''}
              onChange={(value) =>
                setFormData({ ...formData, leadId: value || null })
              }
            />
            <Select
              label="Link to Account"
              placeholder="Select an account (optional)"
              options={accounts.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
              value={formData.accountId || ''}
              onChange={(value) =>
                setFormData({ ...formData, accountId: value || null })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Stage"
              options={OPPORTUNITY_STATUSES}
              value={formData.status || 'prospecting'}
              onChange={(value) => setFormData({ ...formData, status: value })}
            />
            <Select
              label="Assigned To"
              placeholder="Select user"
              options={users.map((u) => ({
                value: u.id,
                label: u.fullName,
              }))}
              value={formData.assignedToUserId || ''}
              onChange={(value) =>
                setFormData({ ...formData, assignedToUserId: value || null })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expected Value"
              type="number"
              placeholder="25000"
              value={formData.expectedValue || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expectedValue: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <Input
              label="Probability (%)"
              type="number"
              min={0}
              max={100}
              placeholder="50"
              value={formData.probability || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  probability: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>

          <Input
            label="Expected Close Date"
            type="date"
            value={formData.expectedCloseDate || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                expectedCloseDate: e.target.value || null,
              })
            }
          />

          <Textarea
            label="Description"
            placeholder="Details about this opportunity..."
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || null })
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={creating}
              disabled={!formData.name}
            >
              Create Opportunity
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OpportunitiesList;
