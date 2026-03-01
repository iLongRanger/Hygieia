import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
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

const CREATE_LEAD_SOURCE_OPTIONS = [
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Cold Call', label: 'Cold Call' },
  { value: 'Google Ads', label: 'Google Ads' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Email Campaign', label: 'Email Campaign' },
  { value: 'Walk-In', label: 'Walk-In' },
  { value: 'others', label: 'Others' },
];

const OTHER_LEAD_SOURCE_VALUE = 'others';
const LEAD_ASSIGNABLE_ROLES = new Set(['owner', 'admin', 'manager']);

const isLeadAssignableUser = (user: User): boolean => {
  const roleKeys = new Set<string>();
  const primaryRole = (user as User & { role?: unknown }).role;

  if (typeof primaryRole === 'string') {
    roleKeys.add(primaryRole.toLowerCase());
  } else if (
    primaryRole
    && typeof primaryRole === 'object'
    && 'key' in primaryRole
    && typeof (primaryRole as { key?: unknown }).key === 'string'
  ) {
    roleKeys.add((primaryRole as { key: string }).key.toLowerCase());
  }

  for (const userRole of user.roles ?? []) {
    if (typeof userRole?.role?.key === 'string') {
      roleKeys.add(userRole.role.key.toLowerCase());
    }
  }

  for (const roleKey of roleKeys) {
    if (LEAD_ASSIGNABLE_ROLES.has(roleKey)) {
      return true;
    }
  }

  return false;
};

const normalizeLeadSourceName = (value: string) => value.trim().toLowerCase();

const getLeadSourceFromNotes = (notes: string | null | undefined): string | null => {
  if (!notes) return null;

  const lines = notes.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const otherMatch = /^Lead source \(other\):\s*(.+)$/i.exec(line);
    if (otherMatch?.[1]) {
      return otherMatch[1].trim();
    }

    const sourceMatch = /^Lead source:\s*(.+)$/i.exec(line);
    if (sourceMatch?.[1]) {
      return sourceMatch[1].trim();
    }
  }

  return null;
};

const getLeadSourceDisplay = (lead: Lead): string => {
  return lead.leadSource?.name || getLeadSourceFromNotes(lead.notes) || 'Unknown';
};

const ACCOUNT_TYPES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'government', label: 'Government' },
  { value: 'non_profit', label: 'Non-Profit' },
];

const FACILITY_BUILDING_TYPE_OPTIONS = [
  { value: 'office', label: 'Office' },
  { value: 'medical', label: 'Medical' },
  { value: 'retail', label: 'Retail' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'educational', label: 'Educational' },
  { value: 'residential', label: 'Residential' },
  { value: 'mixed', label: 'Mixed Use' },
  { value: 'other', label: 'Other' },
];

const OTHER_INDUSTRY_VALUE = 'other';

const isKnownIndustryValue = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return FACILITY_BUILDING_TYPE_OPTIONS.some((option) => option.value === value);
};

const hasFacilityStreetAddress = (facility: Facility | null | undefined): boolean => {
  if (!facility?.address) return false;
  const street = facility.address.street;
  return typeof street === 'string' && street.trim().length > 0;
};

const isValidLeadStatus = (value: string | null): value is string => {
  if (!value) return false;
  return LEAD_STATUSES.some((status) => status.value === value);
};

const LeadsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelineLeads, setPipelineLeads] = useState<Lead[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createLeadSourceOption, setCreateLeadSourceOption] = useState('');
  const [otherLeadSource, setOtherLeadSource] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const initialStatusFilter = (() => {
    const routeStatus = new URLSearchParams(location.search).get('status');
    return isValidLeadStatus(routeStatus) ? routeStatus : '';
  })();
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
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
    facilityOption: 'new',
    existingFacilityId: null,
    facilityData: {
      name: '',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      buildingType: null,
      squareFeet: null,
      accessInstructions: null,
      notes: null,
    },
  });
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWriteLeads = hasPermission(PERMISSIONS.LEADS_WRITE);
  const canAdminLeads = hasPermission(PERMISSIONS.LEADS_ADMIN);
  const leadAssignableUsers = users.filter(isLeadAssignableUser);
  const isCreateRoute = location.pathname === '/leads/new';
  const isCreateModalOpen = canWriteLeads && isCreateRoute;

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

  const fetchPipelineLeads = useCallback(async () => {
    try {
      setPipelineLoading(true);
      const allLeads: Lead[] = [];
      const limit = 200;
      let currentPage = 1;
      let totalPagesCount = 1;

      while (currentPage <= totalPagesCount) {
        const response = await listLeads({
          page: currentPage,
          limit,
          includeArchived: false,
        });
        allLeads.push(...(response?.data || []));
        totalPagesCount = response?.pagination?.totalPages || currentPage;
        currentPage += 1;
      }

      setPipelineLeads(allLeads);
    } catch (error) {
      console.error('Failed to fetch pipeline leads:', error);
      setPipelineLeads([]);
    } finally {
      setPipelineLoading(false);
    }
  }, []);

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
    fetchPipelineLeads();
  }, [fetchLeadSources, fetchUsers, fetchAccounts, fetchFacilities, fetchPipelineLeads]);

  useEffect(() => {
    const routeStatus = new URLSearchParams(location.search).get('status');
    const nextStatus = isValidLeadStatus(routeStatus) ? routeStatus : '';
    if (nextStatus !== statusFilter) {
      setStatusFilter(nextStatus);
      setPage(1);
    }
  }, [location.search, statusFilter]);

  const setStatusFilterWithRoute = useCallback((nextStatus: string) => {
    const params = new URLSearchParams(location.search);
    if (nextStatus) {
      params.set('status', nextStatus);
    } else {
      params.delete('status');
    }

    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true }
    );
    setStatusFilter(nextStatus);
    setPage(1);
  }, [location.pathname, location.search, navigate]);

  const handleCreate = async () => {
    if (!formData.contactName) {
      toast.error('Contact name is required');
      return;
    }

    if (createLeadSourceOption === OTHER_LEAD_SOURCE_VALUE && !otherLeadSource.trim()) {
      toast.error('Please enter where the lead came from');
      return;
    }

    const selectedSourceName = createLeadSourceOption
      && createLeadSourceOption !== OTHER_LEAD_SOURCE_VALUE
      ? createLeadSourceOption
      : null;
    const sourceIdByName = new Map(
      leadSources.map((source) => [normalizeLeadSourceName(source.name), source.id])
    );
    const mappedLeadSourceId = selectedSourceName
      ? (sourceIdByName.get(normalizeLeadSourceName(selectedSourceName)) ?? null)
      : null;

    const notesParts: string[] = [];
    if (createLeadSourceOption === OTHER_LEAD_SOURCE_VALUE) {
      notesParts.push(`Lead source (other): ${otherLeadSource.trim()}`);
    } else if (selectedSourceName) {
      notesParts.push(`Lead source: ${selectedSourceName}`);
    }
    if (formData.notes?.trim()) {
      notesParts.push(formData.notes.trim());
    }

    try {
      setCreating(true);
      await createLead({
        ...formData,
        leadSourceId: mappedLeadSourceId,
        notes: notesParts.join('\n') || null,
      });
      toast.success('Lead created successfully');
      navigate('/leads', { replace: true });
      resetForm();
      fetchLeads(page, search, {
        status: statusFilter,
        leadSourceId: leadSourceFilter,
        assignedToUserId: assignedToFilter,
        includeArchived,
      });
      fetchPipelineLeads();
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
    setCreateLeadSourceOption('');
    setOtherLeadSource('');
  };

  const clearFilters = () => {
    setStatusFilterWithRoute('');
    setLeadSourceFilter('');
    setAssignedToFilter('');
    setIncludeArchived(false);
    setPage(1);
  };

  const closeCreateModal = () => {
    resetForm();
    navigate('/leads');
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
      fetchPipelineLeads();
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
      fetchPipelineLeads();
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
      facilityOption: 'new',
      existingFacilityId: null,
      facilityData: {
        name: lead.companyName || lead.contactName,
        address: {
          street: lead.address?.street || '',
          city: lead.address?.city || '',
          state: lead.address?.state || '',
          postalCode: lead.address?.postalCode || '',
          country: lead.address?.country || '',
        },
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

    if (
      conversionFormData.facilityOption === 'new'
      && !conversionFormData.facilityData?.address?.street?.trim()
    ) {
      toast.error('Facility address is required before converting this lead');
      return;
    }

    if (conversionFormData.facilityOption === 'existing' && !conversionFormData.existingFacilityId) {
      toast.error('Please select an existing facility');
      return;
    }

    if (conversionFormData.facilityOption === 'existing') {
      const selectedFacility = facilities.find(
        (facility) => facility.id === conversionFormData.existingFacilityId
      );
      if (!hasFacilityStreetAddress(selectedFacility)) {
        toast.error('Selected facility must have an address before converting this lead');
        return;
      }
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
      fetchPipelineLeads();
    } catch (error) {
      console.error('Failed to convert lead:', error);
      const errorMessage = (error as { response?: { data?: { message?: string; error?: { message?: string } } } })
        ?.response?.data?.message
        || (error as { response?: { data?: { message?: string; error?: { message?: string } } } })
          ?.response?.data?.error?.message
        || 'Failed to convert lead. Please try again.';
      toast.error(errorMessage);
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

  const pipelineStages = useMemo(
    () => LEAD_STATUSES.map((stage) => ({
      ...stage,
      leads: pipelineLeads.filter((lead) => lead.status === stage.value && !lead.archivedAt),
    })),
    [pipelineLeads]
  );

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
      cell: (item: Lead) => {
        const sourceDisplay = getLeadSourceDisplay(item);
        return (
          <Badge
            variant="default"
            style={
              item.leadSource
                ? { backgroundColor: `${item.leadSource.color}20`, color: item.leadSource.color }
                : undefined
            }
          >
            {sourceDisplay}
          </Badge>
        );
      },
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
          {!item.archivedAt && !item.convertedAt && canWriteLeads && (
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
          {item.archivedAt && canAdminLeads ? (
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
          ) : !item.archivedAt && canAdminLeads ? (
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
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Leads</h1>
        {canWriteLeads && (
          <Button onClick={() => navigate('/leads/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Lead
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Lead Pipeline</h2>
          {pipelineLoading ? (
            <span className="text-sm text-surface-500 dark:text-surface-400">Loading pipeline...</span>
          ) : (
            <span className="text-sm text-surface-500 dark:text-surface-400">
              {pipelineLeads.length} active leads
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          {pipelineStages.map((stage) => (
            <div
              key={stage.value}
              className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50"
            >
              <button
                type="button"
                className="mb-3 flex w-full items-center justify-between text-left"
                onClick={() => setStatusFilterWithRoute(stage.value)}
              >
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {stage.label}
                </span>
                <Badge variant="default">{stage.leads.length}</Badge>
              </button>

              <div className="space-y-2">
                {stage.leads.slice(0, 6).map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className="w-full rounded-md border border-surface-200 bg-white p-2 text-left transition hover:border-primary-400 hover:bg-primary-50/50 dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <div className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                      {lead.companyName || lead.contactName}
                    </div>
                    <div className="truncate text-xs text-surface-500 dark:text-surface-400">
                      {lead.contactName}
                    </div>
                  </button>
                ))}
                {stage.leads.length === 0 && (
                  <p className="text-xs text-surface-500 dark:text-surface-400">No leads</p>
                )}
                {stage.leads.length > 6 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                    onClick={() => setStatusFilterWithRoute(stage.value)}
                  >
                    +{stage.leads.length - 6} more
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

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
                onChange={setStatusFilterWithRoute}
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
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
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
              options={CREATE_LEAD_SOURCE_OPTIONS}
              value={createLeadSourceOption}
              onChange={setCreateLeadSourceOption}
            />
            <Select
              label="Status"
              options={LEAD_STATUSES}
              value={formData.status || 'lead'}
              onChange={(value) => setFormData({ ...formData, status: value })}
            />
          </div>

          {createLeadSourceOption === OTHER_LEAD_SOURCE_VALUE && (
            <Input
              label="Where did this lead come from?"
              placeholder="Type lead source"
              value={otherLeadSource}
              onChange={(e) => setOtherLeadSource(e.target.value)}
              maxLength={maxLengths.companyName}
            />
          )}

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
              options={leadAssignableUsers.map((u) => ({
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
              onClick={closeCreateModal}
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
                    <Select
                      label="Industry"
                      placeholder="Select industry"
                      options={FACILITY_BUILDING_TYPE_OPTIONS}
                      value={
                        isKnownIndustryValue(conversionFormData.accountData?.industry)
                          ? conversionFormData.accountData?.industry || ''
                          : conversionFormData.accountData?.industry
                            ? OTHER_INDUSTRY_VALUE
                            : ''
                      }
                      onChange={(value) =>
                        setConversionFormData({
                          ...conversionFormData,
                          accountData: {
                            ...conversionFormData.accountData!,
                            industry: value
                              ? (value === OTHER_INDUSTRY_VALUE ? '' : value)
                              : null,
                          },
                        })
                      }
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
                  {!isKnownIndustryValue(conversionFormData.accountData?.industry)
                    && conversionFormData.accountData?.industry !== null
                    && (
                      <Input
                        label="Specify Industry"
                        placeholder="Type industry"
                        value={conversionFormData.accountData?.industry || ''}
                        onChange={(e) =>
                          setConversionFormData({
                            ...conversionFormData,
                            accountData: {
                              ...conversionFormData.accountData!,
                              industry: e.target.value || '',
                            },
                          })
                        }
                        maxLength={maxLengths.industry}
                      />
                    )}
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
                  <div>
                    <h5 className="mb-3 text-sm font-medium text-gray-300">Facility Address</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Street Address"
                        required
                        value={conversionFormData.facilityData?.address?.street || ''}
                        onChange={(e) =>
                          setConversionFormData({
                            ...conversionFormData,
                            facilityData: {
                              ...conversionFormData.facilityData!,
                              address: {
                                ...conversionFormData.facilityData?.address,
                                street: e.target.value,
                              },
                            },
                          })
                        }
                        maxLength={maxLengths.street}
                      />
                      <Input
                        label="City"
                        value={conversionFormData.facilityData?.address?.city || ''}
                        onChange={(e) =>
                          setConversionFormData({
                            ...conversionFormData,
                            facilityData: {
                              ...conversionFormData.facilityData!,
                              address: {
                                ...conversionFormData.facilityData?.address,
                                city: e.target.value || null,
                              },
                            },
                          })
                        }
                        maxLength={maxLengths.city}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="State"
                        value={conversionFormData.facilityData?.address?.state || ''}
                        onChange={(e) =>
                          setConversionFormData({
                            ...conversionFormData,
                            facilityData: {
                              ...conversionFormData.facilityData!,
                              address: {
                                ...conversionFormData.facilityData?.address,
                                state: e.target.value || null,
                              },
                            },
                          })
                        }
                        maxLength={maxLengths.state}
                      />
                      <Input
                        label="Postal Code"
                        value={conversionFormData.facilityData?.address?.postalCode || ''}
                        onChange={(e) =>
                          setConversionFormData({
                            ...conversionFormData,
                            facilityData: {
                              ...conversionFormData.facilityData!,
                              address: {
                                ...conversionFormData.facilityData?.address,
                                postalCode: e.target.value || null,
                              },
                            },
                          })
                        }
                        maxLength={maxLengths.postalCode}
                      />
                      <Input
                        label="Country"
                        value={conversionFormData.facilityData?.address?.country || ''}
                        onChange={(e) =>
                          setConversionFormData({
                            ...conversionFormData,
                            facilityData: {
                              ...conversionFormData.facilityData!,
                              address: {
                                ...conversionFormData.facilityData?.address,
                                country: e.target.value || null,
                              },
                            },
                          })
                        }
                        maxLength={maxLengths.country}
                      />
                    </div>
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
                  hint="Selected facility must already have an address."
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


