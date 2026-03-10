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
  CheckCircle,
  Clock,
  CalendarClock,
  User as UserIcon,
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
} from '../../lib/leads';
import { listUsers } from '../../lib/users';
import type { Lead, CreateLeadInput, LeadSource } from '../../types/crm';
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

const STAGE_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  lead: { border: 'border-t-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-400' },
  walk_through_booked: { border: 'border-t-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-400' },
  walk_through_completed: { border: 'border-t-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-400' },
  proposal_sent: { border: 'border-t-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
  negotiation: { border: 'border-t-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-400' },
  won: { border: 'border-t-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-400' },
  lost: { border: 'border-t-red-400', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-400' },
  reopened: { border: 'border-t-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-400' },
};

const DEFAULT_STAGE_COLOR = { border: 'border-t-surface-400', bg: 'bg-surface-50 dark:bg-surface-800/50', text: 'text-surface-700 dark:text-surface-300', dot: 'bg-surface-400' };

const formatCompactCurrency = (value: string | null) => {
  if (!value) return '$0';
  const num = Number(value);
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}k`;
  return `$${num.toLocaleString()}`;
};

const getRelativeTime = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

const getStaleness = (dateStr: string): 'fresh' | 'aging' | 'stale' => {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays > 14) return 'stale';
  if (diffDays > 7) return 'aging';
  return 'fresh';
};

const getCloseDateUrgency = (dateStr: string | null): 'overdue' | 'soon' | 'normal' | null => {
  if (!dateStr) return null;
  const diffDays = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'soon';
  return 'normal';
};

const getProbabilityColor = (probability: number | null): string => {
  if (probability == null) return 'bg-surface-200 dark:bg-surface-700';
  if (probability >= 70) return 'bg-emerald-400';
  if (probability >= 40) return 'bg-amber-400';
  return 'bg-red-400';
};

const getInitials = (name: string): string => {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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

  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userRole = useAuthStore((state) => state.user?.role);
  const canViewPipelines = userRole === 'owner' || userRole === 'admin';
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
      const limit = 100;
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
    if (canViewPipelines) {
      fetchPipelineLeads();
    } else {
      setPipelineLeads([]);
      setPipelineLoading(false);
    }
  }, [fetchLeadSources, fetchUsers, fetchPipelineLeads, canViewPipelines]);

  useEffect(() => {
    if (!canViewPipelines) return;
    const handleWindowFocus = () => {
      fetchPipelineLeads();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPipelineLeads();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPipelineLeads, canViewPipelines]);

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
      if (canViewPipelines) {
        fetchPipelineLeads();
      }
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
      if (canViewPipelines) {
        fetchPipelineLeads();
      }
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
      if (canViewPipelines) {
        fetchPipelineLeads();
      }
    } catch (error) {
      console.error('Failed to restore lead:', error);
      toast.error('Failed to restore lead');
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

      {canViewPipelines && (
      <Card noPadding className="overflow-hidden">
        <div className="border-b border-surface-200 bg-gradient-to-r from-surface-50 to-white p-4 dark:border-surface-700 dark:from-surface-800/60 dark:to-surface-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Lead Pipeline</h2>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {pipelineLoading ? 'Refreshing stage counts...' : `${pipelineLeads.length} active leads`}
              </p>
            </div>
            {statusFilter && (
              <Button variant="secondary" size="sm" onClick={() => setStatusFilterWithRoute('')}>
                <X className="mr-1 h-4 w-4" />
                Clear Stage Filter
              </Button>
            )}
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pipelineStages.map((stage) => {
              const isActiveStage = statusFilter === stage.value;
              const colors = STAGE_COLORS[stage.value] || DEFAULT_STAGE_COLOR;
              const stageTotal = stage.leads.reduce(
                (sum, l) => sum + (l.estimatedValue ? Number(l.estimatedValue) : 0),
                0,
              );
              return (
                <section
                  key={stage.value}
                  className={`flex min-w-0 flex-col rounded-lg border border-t-[3px] ${colors.border} ${
                    isActiveStage
                      ? 'border-primary-400 bg-white/80 shadow-md dark:border-primary-500 dark:bg-surface-800/80'
                      : 'border-surface-200 bg-surface-50/80 dark:border-surface-700 dark:bg-surface-800/40'
                  }`}
                  style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '360px' }}
                >
                  {/* Sticky column header */}
                  <button
                    type="button"
                    className={`sticky top-0 z-10 w-full rounded-t-lg border-b px-3 py-3.5 text-left transition ${colors.bg} hover:brightness-[0.98] dark:hover:brightness-110 ${
                      isActiveStage
                        ? 'border-primary-200 dark:border-primary-800'
                        : 'border-surface-200 dark:border-surface-700'
                    }`}
                    onClick={() => setStatusFilterWithRoute(stage.value)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${colors.dot}`} />
                        <p className={`min-w-0 whitespace-normal break-normal text-[13px] font-semibold leading-4 ${colors.text}`}>
                          {stage.label}
                        </p>
                        <span className="inline-flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-surface-200 px-1.5 text-[11px] font-medium text-surface-700 dark:bg-surface-700 dark:text-surface-300">
                          {stage.leads.length}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-normal break-words pl-[18px] text-xs font-medium leading-4 text-surface-500 dark:text-surface-400">
                        {formatCompactCurrency(String(stageTotal))} total
                      </p>
                    </div>
                  </button>

                  {/* Scrollable cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2">
                    {stage.leads.map((lead) => {
                      const staleness = getStaleness(lead.updatedAt);
                      const closeUrgency = getCloseDateUrgency(lead.expectedCloseDate);
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          className={`group w-full min-w-0 rounded-lg border bg-white p-2.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-surface-900 ${
                            isActiveStage
                              ? 'border-primary-200 hover:border-primary-400 dark:border-primary-800 dark:hover:border-primary-500'
                              : 'border-surface-200 hover:border-surface-300 dark:border-surface-700 dark:hover:border-surface-600'
                          }`}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >
                          {/* Company & contact */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-surface-900 dark:text-surface-100">
                                {lead.companyName || lead.contactName}
                              </p>
                              {lead.companyName && (
                                <p className="truncate text-[11px] text-surface-500 dark:text-surface-400">
                                  {lead.contactName}
                                </p>
                              )}
                            </div>
                            {/* Lead source dot */}
                            <span
                              className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${colors.dot}`}
                              title={getLeadSourceDisplay(lead)}
                            />
                          </div>

                          {/* Value badge */}
                          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-surface-100 px-2 py-0.5 text-[11px] font-semibold text-surface-800 dark:bg-surface-800 dark:text-surface-200">
                              <DollarSign className="h-3 w-3" />
                              {lead.estimatedValue ? Number(lead.estimatedValue).toLocaleString() : '0'}
                            </span>
                            <span
                              className="truncate text-[10px] text-surface-400 dark:text-surface-500"
                              title={getLeadSourceDisplay(lead)}
                            >
                              {getLeadSourceDisplay(lead)}
                            </span>
                          </div>

                          {/* Meta row: activity + close date */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                            <span className={`inline-flex items-center gap-1 ${
                              staleness === 'stale'
                                ? 'text-red-500 dark:text-red-400'
                                : staleness === 'aging'
                                  ? 'text-amber-500 dark:text-amber-400'
                                  : 'text-surface-400 dark:text-surface-500'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {getRelativeTime(lead.updatedAt)}
                              {staleness !== 'fresh' && (
                                <span className={`h-1.5 w-1.5 rounded-full ${staleness === 'stale' ? 'bg-red-400' : 'bg-amber-400'}`} />
                              )}
                            </span>

                            {lead.expectedCloseDate && (
                              <span className={`inline-flex items-center gap-1 ${
                                closeUrgency === 'overdue'
                                  ? 'text-red-500 dark:text-red-400'
                                  : closeUrgency === 'soon'
                                    ? 'text-amber-500 dark:text-amber-400'
                                    : 'text-surface-400 dark:text-surface-500'
                              }`}>
                                <CalendarClock className="h-3 w-3" />
                                {new Date(lead.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>

                          {/* Assigned user */}
                          <div className="mt-2 flex items-center justify-between">
                            {lead.assignedToUser ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                                  {getInitials(lead.assignedToUser.fullName)}
                                </span>
                                <span className="max-w-[88px] truncate text-[10px] text-surface-600 dark:text-surface-400">
                                  {lead.assignedToUser.fullName}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-surface-400 dark:text-surface-500">
                                <UserIcon className="h-3 w-3" />
                                Unassigned
                              </span>
                            )}
                          </div>

                          {/* Probability bar */}
                          <div className="mt-2">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                              <div
                                className={`h-full rounded-full transition-all ${getProbabilityColor(lead.probability)}`}
                                style={{ width: `${Math.max(lead.probability ?? 0, 4)}%` }}
                              />
                            </div>
                            <p className="mt-0.5 text-right text-[10px] text-surface-400 dark:text-surface-500">
                              {lead.probability ?? 0}% probability
                            </p>
                          </div>
                        </button>
                      );
                    })}
                    {stage.leads.length === 0 && (
                      <div className="rounded-lg border border-dashed border-surface-300 p-4 text-center text-xs text-surface-500 dark:border-surface-600 dark:text-surface-400">
                        No leads in this stage
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </Card>
      )}

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

          <Select
            label="Lead Source"
            placeholder="Select source"
            options={CREATE_LEAD_SOURCE_OPTIONS}
            value={createLeadSourceOption}
            onChange={setCreateLeadSourceOption}
          />

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

    </div>
  );
};

export default LeadsList;
