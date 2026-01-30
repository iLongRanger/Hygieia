import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Archive,
  RotateCcw,
  DollarSign,
  X,
  ArrowRightCircle,
  Building2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  listLeads,
  createLead,
  archiveLead,
  restoreLead,
  listLeadSources,
  canConvertLead,
  convertLead,
  type ConvertLeadInput,
  type ConvertLeadResult,
} from '../../lib/leads';
import { listUsers } from '../../lib/users';
import { listAccounts } from '../../lib/accounts';
import { listFacilities } from '../../lib/facilities';
import type { Lead, CreateLeadInput, LeadSource, Account } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { User } from '../../types/user';
import { maxLengths } from '../../lib/validation';

const LEAD_STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'walk_through_booked', label: 'Walk Through Booked' },
  { value: 'walk_through_completed', label: 'Walk Through Completed' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'reopened', label: 'Reopened' },
];

const ACCOUNT_TYPES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'government', label: 'Government' },
  { value: 'non_profit', label: 'Non-Profit' },
];

const LeadsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
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
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>('');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Conversion states
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConvertLeadResult | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [conversionFormData, setConversionFormData] = useState<ConvertLeadInput>({
    createNewAccount: true,
    existingAccountId: null,
    accountData: {
      name: '',
      type: 'commercial',
      industry: null,
      website: null,
      billingEmail: null,
      billingPhone: null,
      paymentTerms: 'Net 30',
      notes: null,
    },
    facilityOption: 'none',
    existingFacilityId: null,
    facilityData: {
      name: '',
      buildingType: null,
      squareFeet: null,
      accessInstructions: null,
      notes: null,
    },
  });

  const [formData, setFormData] = useState<CreateLeadInput>({
    contactName: '',
    companyName: null,
    primaryEmail: null,
    primaryPhone: null,
    leadSourceId: null,
    status: 'lead',
    estimatedValue: null,
    probability: null,
    expectedCloseDate: null,
    assignedToUserId: null,
    notes: null,
  });

  const fetchLeads = useCallback(
    async (currentPage: number, currentSearch: string, filters?: {
      status?: string;
      leadSourceId?: string;
      assignedToUserId?: string;
      includeArchived?: boolean;
    }) => {
      try {
        setLoading(true);
        const response = await listLeads({
          search: currentSearch || undefined,
          page: currentPage,
          status: filters?.status || undefined,
          leadSourceId: filters?.leadSourceId || undefined,
          assignedToUserId: filters?.assignedToUserId || undefined,
          includeArchived: filters?.includeArchived,
        });
        setLeads(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        toast.error('Failed to load leads');
        setLeads([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchLeadSources = useCallback(async () => {
    try {
      const response = await listLeadSources({ isActive: true });
      setLeadSources(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch lead sources:', error);
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

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await listAccounts({ limit: 1000 });
      setAccounts(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, []);

  const fetchFacilities = useCallback(async () => {
    try {
      const response = await listFacilities({ limit: 1000 });
      setFacilities(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
    }
  }, []);

  useEffect(() => {
    fetchLeads(page, search, {
      status: statusFilter,
      leadSourceId: leadSourceFilter,
      assignedToUserId: assignedToFilter,
      includeArchived,
    });
  }, [fetchLeads, page, search, statusFilter, leadSourceFilter, assignedToFilter, includeArchived]);

  useEffect(() => {
    fetchLeadSources();
    fetchUsers();
    fetchAccounts();
    fetchFacilities();
  }, [fetchLeadSources, fetchUsers, fetchAccounts, fetchFacilities]);

  const handleCreate = async () => {
    if (!formData.contactName) {
      toast.error('Contact name is required');
      return;
    }

    try {
      setCreating(true);
      await createLead(formData);
      toast.success('Lead created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchLeads(page, search, {
        status: statusFilter,
        leadSourceId: leadSourceFilter,
        assignedToUserId: assignedToFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to create lead:', error);
      toast.error('Failed to create lead');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contactName: '',
      companyName: null,
      primaryEmail: null,
      primaryPhone: null,
      leadSourceId: null,
      status: 'lead',
      estimatedValue: null,
      probability: null,
      expectedCloseDate: null,
      assignedToUserId: null,
      notes: null,
    });
  };

  const clearFilters = () => {
    setStatusFilter('');
    setLeadSourceFilter('');
    setAssignedToFilter('');
    setIncludeArchived(false);
    setPage(1);
  };

  const hasActiveFilters = statusFilter || leadSourceFilter || assignedToFilter || includeArchived;

  const handleArchive = async (id: string) => {
    try {
      await archiveLead(id);
      toast.success('Lead archived successfully');
      fetchLeads(page, search, {
        status: statusFilter,
        leadSourceId: leadSourceFilter,
        assignedToUserId: assignedToFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to archive lead:', error);
      toast.error('Failed to archive lead');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreLead(id);
      toast.success('Lead restored successfully');
      fetchLeads(page, search, {
        status: statusFilter,
        leadSourceId: leadSourceFilter,
        assignedToUserId: assignedToFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to restore lead:', error);
      toast.error('Failed to restore lead');
    }
  };

  const openConvertModal = async (lead: Lead) => {
    // Check if lead can be converted
    try {
      const result = await canConvertLead(lead.id);
      if (!result.canConvert) {
        toast.error(result.reason || 'This lead cannot be converted');
        return;
      }
    } catch (error) {
      console.error('Failed to check conversion eligibility:', error);
      toast.error('Failed to check conversion eligibility');
      return;
    }

    setSelectedLead(lead);
    setConversionResult(null);
    // Pre-fill form with lead data
    setConversionFormData({
      createNewAccount: true,
      existingAccountId: null,
      accountData: {
        name: lead.companyName || lead.contactName,
        type: 'commercial',
        industry: null,
        website: null,
        billingEmail: lead.primaryEmail || null,
        billingPhone: lead.primaryPhone || null,
        paymentTerms: 'Net 30',
        notes: null,
      },
      facilityOption: 'none',
      existingFacilityId: null,
      facilityData: {
        name: lead.companyName || lead.contactName,
        buildingType: null,
        squareFeet: null,
        accessInstructions: null,
        notes: null,
      },
    });
    setShowConvertModal(true);
  };

  const handleConvert = async () => {
    if (!selectedLead) return;

    // Validate form
    if (conversionFormData.createNewAccount) {
      if (!conversionFormData.accountData?.name || !conversionFormData.accountData?.type) {
        toast.error('Please fill in required account fields');
        return;
      }
    } else {
      if (!conversionFormData.existingAccountId) {
        toast.error('Please select an existing account');
        return;
      }
    }

    if (conversionFormData.facilityOption === 'new' && !conversionFormData.facilityData?.name) {
      toast.error('Please enter a facility name');
      return;
    }

    if (conversionFormData.facilityOption === 'existing' && !conversionFormData.existingFacilityId) {
      toast.error('Please select an existing facility');
      return;
    }

    try {
      setConverting(true);
      const result = await convertLead(selectedLead.id, conversionFormData);
      toast.success('Lead converted successfully');
      setConversionResult(result);
      // Refresh leads list
      fetchLeads(page, search, {
        status: statusFilter,
        leadSourceId: leadSourceFilter,
        assignedToUserId: assignedToFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to convert lead:', error);
      toast.error('Failed to convert lead. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const closeConvertModal = () => {
    setShowConvertModal(false);
    setSelectedLead(null);
    setConversionResult(null);
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
      case 'won':
        return 'success';
      case 'lost':
        return 'error';
      case 'proposal':
      case 'negotiation':
        return 'warning';
      case 'qualified':
        return 'info';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      header: 'Lead',
      cell: (item: Lead) => (
        <div>
          <div className="font-medium text-surface-900 dark:text-surface-100">{item.contactName}</div>
          <div className="text-sm text-surface-500 dark:text-surface-400">
            {item.companyName || 'No company'}
          </div>
        </div>
      ),
    },
    {
      header: 'Source',
      cell: (item: Lead) => (
        <Badge
          variant="default"
          style={
            item.leadSource
              ? { backgroundColor: `${item.leadSource.color}20`, color: item.leadSource.color }
              : undefined
          }
        >
          {item.leadSource?.name || 'Unknown'}
        </Badge>
      ),
    },
    {
      header: 'Value',
      cell: (item: Lead) => (
        <div className="flex items-center gap-2 text-surface-700 dark:text-surface-300">
          <DollarSign className="h-4 w-4 text-surface-400 dark:text-surface-500" />
          {formatCurrency(item.estimatedValue)}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (item: Lead) => (
        <Badge variant={getStatusVariant(item.status)}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      header: 'Assigned To',
      cell: (item: Lead) => (
        <span className="text-surface-700 dark:text-surface-300">
          {item.assignedToUser?.fullName || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Active',
      cell: (item: Lead) => (
        <Badge variant={item.archivedAt ? 'error' : 'success'}>
          {item.archivedAt ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: Lead) => (
        <div className="flex gap-2">
          {/* Show Convert button only for non-archived, non-converted leads */}
          {!item.archivedAt && !item.convertedAt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openConvertModal(item);
              }}
              title="Convert to Account"
            >
              <ArrowRightCircle className="h-4 w-4" />
            </Button>
          )}
          {/* Show converted badge if already converted */}
          {item.convertedAt && (
            <Badge variant="success" className="text-xs">
              <CheckCircle className="mr-1 h-3 w-3" />
              Converted
            </Badge>
          )}
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Leads</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Lead
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search leads..."
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
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Status"
                placeholder="All Statuses"
                options={LEAD_STATUSES}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <Select
                label="Lead Source"
                placeholder="All Sources"
                options={leadSources.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
                value={leadSourceFilter}
                onChange={setLeadSourceFilter}
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
                <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded border-surface-300 bg-white text-primary-600 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-700"
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

        <Table
          data={leads}
          columns={columns}
          isLoading={loading}
          onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
        />

        <div className="border-t border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
          <div className="flex items-center justify-between text-sm text-surface-500 dark:text-surface-400">
            <span>
              Showing {leads.length} of {total} leads
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
        title="Add New Lead"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              placeholder="John Smith"
              value={formData.contactName}
              onChange={(e) =>
                setFormData({ ...formData, contactName: e.target.value })
              }
              maxLength={maxLengths.fullName}
              showCharacterCount
            />
            <Input
              label="Company Name"
              placeholder="Acme Corp"
              value={formData.companyName || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  companyName: e.target.value || null,
                })
              }
              maxLength={maxLengths.companyName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.primaryEmail || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  primaryEmail: e.target.value || null,
                })
              }
              maxLength={maxLengths.email}
            />
            <Input
              label="Phone"
              placeholder="(555) 123-4567"
              value={formData.primaryPhone || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  primaryPhone: e.target.value || null,
                })
              }
              maxLength={maxLengths.phone}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Lead Source"
              placeholder="Select source"
              options={leadSources.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              value={formData.leadSourceId || ''}
              onChange={(value) =>
                setFormData({ ...formData, leadSourceId: value || null })
              }
            />
            <Select
              label="Status"
              options={LEAD_STATUSES}
              value={formData.status || 'lead'}
              onChange={(value) => setFormData({ ...formData, status: value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Estimated Value"
              type="number"
              placeholder="10000"
              value={formData.estimatedValue || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedValue: e.target.value ? Number(e.target.value) : null,
                })
              }
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <Textarea
            label="Notes"
            placeholder="Additional notes about this lead..."
            value={formData.notes || ''}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value || null })
            }
            maxLength={maxLengths.notes}
            showCharacterCount
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
              disabled={!formData.contactName}
            >
              Create Lead
            </Button>
          </div>
        </div>
      </Modal>

      {/* Conversion Modal */}
      <Modal
        isOpen={showConvertModal}
        onClose={closeConvertModal}
        title={conversionResult ? 'Conversion Successful' : 'Convert Lead to Account'}
        size="lg"
      >
        {conversionResult ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-green-500/10 p-4 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-2 text-lg font-medium text-white">
                Lead Converted Successfully!
              </h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-navy-darker/50 p-4">
                <h4 className="text-sm font-medium text-gray-400">Account Created</h4>
                <p className="mt-1 text-white">{conversionResult.account.name}</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-navy-darker/50 p-4">
                <h4 className="text-sm font-medium text-gray-400">Contact Created</h4>
                <p className="mt-1 text-white">{conversionResult.contact.name}</p>
                {conversionResult.contact.email && (
                  <p className="text-sm text-gray-400">{conversionResult.contact.email}</p>
                )}
              </div>

              {conversionResult.facility && (
                <div className="rounded-lg border border-white/10 bg-navy-darker/50 p-4">
                  <h4 className="text-sm font-medium text-gray-400">Facility Created</h4>
                  <p className="mt-1 text-white">{conversionResult.facility.name}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={closeConvertModal}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedLead && (
              <div className="rounded-lg border border-white/10 bg-navy-darker/50 p-4">
                <h4 className="text-sm font-medium text-gray-400">Converting Lead</h4>
                <p className="mt-1 text-white">{selectedLead.contactName}</p>
                {selectedLead.companyName && (
                  <p className="text-sm text-gray-400">{selectedLead.companyName}</p>
                )}
              </div>
            )}

            {/* Account Selection */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-medium text-white">
                <Building2 className="h-5 w-5" />
                Account
              </h4>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    checked={conversionFormData.createNewAccount}
                    onChange={() =>
                      setConversionFormData({
                        ...conversionFormData,
                        createNewAccount: true,
                        existingAccountId: null,
                      })
                    }
                    className="text-primary-500 focus:ring-primary-500"
                  />
                  Create New Account
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    checked={!conversionFormData.createNewAccount}
                    onChange={() =>
                      setConversionFormData({
                        ...conversionFormData,
                        createNewAccount: false,
                      })
                    }
                    className="text-primary-500 focus:ring-primary-500"
                  />
                  Use Existing Account
                </label>
              </div>

              {conversionFormData.createNewAccount ? (
                <div className="space-y-4 rounded-lg border border-white/10 bg-navy-darker/30 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Account Name"
                      required
                      value={conversionFormData.accountData?.name || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          accountData: {
                            ...conversionFormData.accountData!,
                            name: e.target.value,
                          },
                        })
                      }
                      maxLength={maxLengths.companyName}
                      showCharacterCount
                    />
                    <Select
                      label="Account Type"
                      required
                      options={ACCOUNT_TYPES}
                      value={conversionFormData.accountData?.type || 'commercial'}
                      onChange={(value) =>
                        setConversionFormData({
                          ...conversionFormData,
                          accountData: {
                            ...conversionFormData.accountData!,
                            type: value as 'commercial' | 'residential' | 'industrial' | 'government' | 'non_profit',
                          },
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Industry"
                      value={conversionFormData.accountData?.industry || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          accountData: {
                            ...conversionFormData.accountData!,
                            industry: e.target.value || null,
                          },
                        })
                      }
                      maxLength={maxLengths.industry}
                    />
                    <Input
                      label="Website"
                      value={conversionFormData.accountData?.website || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          accountData: {
                            ...conversionFormData.accountData!,
                            website: e.target.value || null,
                          },
                        })
                      }
                      maxLength={maxLengths.website}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Billing Email"
                      type="email"
                      value={conversionFormData.accountData?.billingEmail || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          accountData: {
                            ...conversionFormData.accountData!,
                            billingEmail: e.target.value || null,
                          },
                        })
                      }
                      maxLength={maxLengths.email}
                    />
                    <Input
                      label="Billing Phone"
                      value={conversionFormData.accountData?.billingPhone || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          accountData: {
                            ...conversionFormData.accountData!,
                            billingPhone: e.target.value || null,
                          },
                        })
                      }
                      maxLength={maxLengths.phone}
                    />
                  </div>
                </div>
              ) : (
                <Select
                  label="Select Account"
                  placeholder="Choose an existing account"
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                  value={conversionFormData.existingAccountId || ''}
                  onChange={(value) =>
                    setConversionFormData({
                      ...conversionFormData,
                      existingAccountId: value || null,
                    })
                  }
                />
              )}
            </div>

            {/* Facility Option */}
            <div className="space-y-4">
              <h4 className="font-medium text-white">Facility</h4>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    checked={conversionFormData.facilityOption === 'none'}
                    onChange={() =>
                      setConversionFormData({
                        ...conversionFormData,
                        facilityOption: 'none',
                        existingFacilityId: null,
                      })
                    }
                    className="text-primary-500 focus:ring-primary-500"
                  />
                  No Facility
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    checked={conversionFormData.facilityOption === 'new'}
                    onChange={() =>
                      setConversionFormData({
                        ...conversionFormData,
                        facilityOption: 'new',
                        existingFacilityId: null,
                      })
                    }
                    className="text-primary-500 focus:ring-primary-500"
                  />
                  Create New Facility
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    checked={conversionFormData.facilityOption === 'existing'}
                    onChange={() =>
                      setConversionFormData({
                        ...conversionFormData,
                        facilityOption: 'existing',
                      })
                    }
                    className="text-primary-500 focus:ring-primary-500"
                  />
                  Use Existing Facility
                </label>
              </div>

              {conversionFormData.facilityOption === 'new' && (
                <div className="space-y-4 rounded-lg border border-white/10 bg-navy-darker/30 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Facility Name"
                      required
                      value={conversionFormData.facilityData?.name || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          facilityData: {
                            ...conversionFormData.facilityData!,
                            name: e.target.value,
                          },
                        })
                      }
                      maxLength={maxLengths.name}
                      showCharacterCount
                    />
                    <Input
                      label="Building Type"
                      placeholder="e.g., Office, Warehouse"
                      value={conversionFormData.facilityData?.buildingType || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          facilityData: {
                            ...conversionFormData.facilityData!,
                            buildingType: e.target.value || null,
                          },
                        })
                      }
                      maxLength={maxLengths.buildingType}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Square Feet"
                      type="number"
                      value={conversionFormData.facilityData?.squareFeet || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          facilityData: {
                            ...conversionFormData.facilityData!,
                            squareFeet: e.target.value ? Number(e.target.value) : null,
                          },
                        })
                      }
                    />
                    <Input
                      label="Access Instructions"
                      value={conversionFormData.facilityData?.accessInstructions || ''}
                      onChange={(e) =>
                        setConversionFormData({
                          ...conversionFormData,
                          facilityData: {
                            ...conversionFormData.facilityData!,
                            accessInstructions: e.target.value || null,
                          },
                        })
                      }
                      maxLength={maxLengths.accessInstructions}
                    />
                  </div>
                </div>
              )}

              {conversionFormData.facilityOption === 'existing' && (
                <Select
                  label="Select Facility"
                  placeholder="Choose an existing facility"
                  options={
                    conversionFormData.createNewAccount
                      ? facilities.map((f) => ({
                          value: f.id,
                          label: `${f.name}${f.account ? ` (${f.account.name})` : ''}`,
                        }))
                      : facilities
                          .filter((f) => f.account?.id === conversionFormData.existingAccountId)
                          .map((f) => ({
                            value: f.id,
                            label: f.name,
                          }))
                  }
                  value={conversionFormData.existingFacilityId || ''}
                  onChange={(value) =>
                    setConversionFormData({
                      ...conversionFormData,
                      existingFacilityId: value || null,
                    })
                  }
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={closeConvertModal}>
                Cancel
              </Button>
              <Button onClick={handleConvert} isLoading={converting}>
                <ArrowRightCircle className="mr-2 h-4 w-4" />
                Convert Lead
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default LeadsList;


