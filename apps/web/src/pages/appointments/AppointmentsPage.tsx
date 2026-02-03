import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Calendar, CalendarPlus, Filter, LayoutGrid, List, Pencil, Search, Trash2, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DayCalendar, MonthCalendar, WeekCalendar } from '../../components/calendar';
import { ClientProfileModal } from '../../components/appointments/ClientProfileModal';
import { listAppointments, createAppointment, updateAppointment, deleteAppointment } from '../../lib/appointments';
import { listLeads } from '../../lib/leads';
import { listUsers } from '../../lib/users';
import { listContracts } from '../../lib/contracts';
import { getDateRange, getDayRange, getWeekRange } from '../../lib/calendar-utils';
import type { Appointment, AppointmentStatus, AppointmentType, Lead } from '../../types/crm';
import type { User } from '../../types/user';
import type { Contract } from '../../types/contract';

type ViewMode = 'table' | 'calendar';
type CalendarView = 'month' | 'week' | 'day';
type CalendarLayout = 'grid' | 'list';

const VIEW_MODE_KEY = 'appointments_view_mode';
const CALENDAR_VIEW_KEY = 'appointments_calendar_view';

const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'walk_through', label: 'Walk Through' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'visit', label: 'Visit' },
];

const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'no_show', label: 'No Show' },
];

const AppointmentsPage = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClientLeadId, setSelectedClientLeadId] = useState<string | null>(null);
  const [selectedClientAccountId, setSelectedClientAccountId] = useState<string | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved === 'calendar' || saved === 'table') ? saved : 'table';
  });

  // Calendar-specific state
  const [calendarView, setCalendarView] = useState<CalendarView>(() => {
    const saved = localStorage.getItem(CALENDAR_VIEW_KEY);
    return (saved === 'month' || saved === 'week' || saved === 'day') ? saved : 'month';
  });
  const [calendarLayout, setCalendarLayout] = useState<CalendarLayout>('grid');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState<AppointmentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [leadFilter, setLeadFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [includePast, setIncludePast] = useState(false);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    leadId: '',
    accountId: '',
    assignedToUserId: '',
    type: 'walk_through' as AppointmentType,
    status: 'scheduled' as AppointmentStatus,
    scheduledStart: '',
    scheduledEnd: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    location: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAppointments({
        leadId: leadFilter || undefined,
        accountId: accountFilter || undefined,
        assignedToUserId: assignedFilter || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        includePast,
      });
      setAppointments(data || []);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [accountFilter, assignedFilter, includePast, leadFilter, statusFilter, typeFilter]);

  const fetchCalendarAppointments = useCallback(async () => {
    try {
      setCalendarLoading(true);
      const { dateFrom, dateTo } =
        calendarView === 'month'
          ? getDateRange(calendarYear, calendarMonth)
          : calendarView === 'week'
            ? getWeekRange(calendarDate)
            : getDayRange(calendarDate);
      const data = await listAppointments({
        dateFrom,
        dateTo,
        leadId: leadFilter || undefined,
        accountId: accountFilter || undefined,
        assignedToUserId: assignedFilter || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        includePast: true, // Always include past for calendar view
      });
      setCalendarAppointments(data || []);
    } catch (error) {
      console.error('Failed to fetch calendar appointments:', error);
      toast.error('Failed to load calendar');
      setCalendarAppointments([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [
    calendarView,
    calendarYear,
    calendarMonth,
    calendarDate,
    leadFilter,
    accountFilter,
    assignedFilter,
    typeFilter,
    statusFilter,
  ]);

  const fetchLeads = useCallback(async () => {
    try {
      const response = await listLeads({ limit: 100, includeArchived: false });
      setLeads(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
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

  const fetchActiveContracts = useCallback(async () => {
    try {
      const response = await listContracts({ status: 'active', limit: 100, includeArchived: false });
      setActiveContracts(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'table') {
      fetchAppointments();
    }
  }, [fetchAppointments, viewMode]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarAppointments();
    }
  }, [fetchCalendarAppointments, viewMode]);

  useEffect(() => {
    if (typeFilter === 'walk_through') {
      setAccountFilter('');
    } else if (typeFilter) {
      setLeadFilter('');
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchLeads();
    fetchUsers();
    fetchActiveContracts();
  }, [fetchLeads, fetchUsers, fetchActiveContracts]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(CALENDAR_VIEW_KEY, calendarView);
  }, [calendarView]);

  useEffect(() => {
    if (calendarView === 'month') {
      setCalendarYear(calendarDate.getFullYear());
      setCalendarMonth(calendarDate.getMonth());
    }
  }, [calendarDate, calendarView]);

  const activeAccounts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string }>();
    activeContracts.forEach((contract) => {
      if (contract.account?.id) {
        map.set(contract.account.id, contract.account);
      }
    });
    return Array.from(map.values());
  }, [activeContracts]);

  const statusVariant = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'rescheduled':
        return 'warning';
      case 'canceled':
        return 'default';
      case 'no_show':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredAppointments = useMemo(() => {
    if (!search) return appointments;
    const term = search.toLowerCase();
    return appointments.filter((appointment) => {
      const leadName = appointment.lead?.companyName || appointment.lead?.contactName || '';
      const accountName = appointment.account?.name || '';
      const assignee = appointment.assignedToUser.fullName || '';
      return (
        leadName.toLowerCase().includes(term) ||
        accountName.toLowerCase().includes(term) ||
        assignee.toLowerCase().includes(term)
      );
    });
  }, [appointments, search]);

  const clearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setAssignedFilter('');
    setLeadFilter('');
    setAccountFilter('');
    setIncludePast(false);
  };

  const hasActiveFilters =
    typeFilter || statusFilter || assignedFilter || leadFilter || accountFilter || includePast;

  const handleCreate = async () => {
    if (!formData.assignedToUserId || !formData.scheduledStart || !formData.scheduledEnd) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.type === 'walk_through' && !formData.leadId) {
      toast.error('Please select a lead');
      return;
    }

    if (formData.type !== 'walk_through' && !formData.accountId) {
      toast.error('Please select an account with an active contract');
      return;
    }

    if (!formData.assignedToUserId || !formData.scheduledStart || !formData.scheduledEnd) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setCreating(true);
      await createAppointment({
        leadId: formData.type === 'walk_through' ? formData.leadId : undefined,
        accountId: formData.type !== 'walk_through' ? formData.accountId : undefined,
        assignedToUserId: formData.assignedToUserId,
        type: formData.type,
        scheduledStart: new Date(formData.scheduledStart).toISOString(),
        scheduledEnd: new Date(formData.scheduledEnd).toISOString(),
        timezone: formData.timezone,
        location: formData.location || null,
        notes: formData.notes || null,
      });
      toast.success('Appointment scheduled');
      setShowCreateModal(false);
      setFormData({
        leadId: '',
        accountId: '',
        assignedToUserId: '',
        type: 'walk_through',
        status: 'scheduled',
        scheduledStart: '',
        scheduledEnd: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        location: '',
        notes: '',
      });
      if (viewMode === 'calendar') {
        fetchCalendarAppointments();
      } else {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Failed to create appointment:', error);
      toast.error('Failed to schedule appointment');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    const startLocal = new Date(appointment.scheduledStart);
    const endLocal = new Date(appointment.scheduledEnd);
    setFormData({
      leadId: appointment.lead?.id || '',
      accountId: appointment.account?.id || '',
      assignedToUserId: appointment.assignedToUser.id,
      type: appointment.type,
      status: appointment.status,
      scheduledStart: new Date(startLocal.getTime() - startLocal.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      scheduledEnd: new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      timezone: appointment.timezone,
      location: appointment.location || '',
      notes: appointment.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedAppointment) return;
    if (!formData.leadId || !formData.assignedToUserId || !formData.scheduledStart || !formData.scheduledEnd) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setUpdating(true);
      await updateAppointment(selectedAppointment.id, {
        assignedToUserId: formData.assignedToUserId,
        status: formData.status,
        scheduledStart: new Date(formData.scheduledStart).toISOString(),
        scheduledEnd: new Date(formData.scheduledEnd).toISOString(),
        timezone: formData.timezone,
        location: formData.location || null,
        notes: formData.notes || null,
      });
      toast.success('Appointment updated');
      setShowEditModal(false);
      setSelectedAppointment(null);
      if (viewMode === 'calendar') {
        fetchCalendarAppointments();
      } else {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Failed to update appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    try {
      setDeleting(true);
      await deleteAppointment(selectedAppointment.id);
      toast.success('Appointment deleted');
      setShowDeleteDialog(false);
      setSelectedAppointment(null);
      if (viewMode === 'calendar') {
        fetchCalendarAppointments();
      } else {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      toast.error('Failed to delete appointment');
    } finally {
      setDeleting(false);
    }
  };

  // Calendar handlers
  const handleMonthChange = (year: number, month: number) => {
    setCalendarYear(year);
    setCalendarMonth(month);
    setCalendarDate(new Date(year, month, 1));
  };

  const handleCalendarCreateClick = (date: Date) => {
    // Pre-fill the form with the selected date
    const startDate = new Date(date);
    const hasTime = startDate.getHours() !== 0 || startDate.getMinutes() !== 0;
    if (!hasTime) {
      startDate.setHours(9, 0, 0, 0);
    }
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 60);

    setFormData({
      leadId: '',
      accountId: '',
      assignedToUserId: '',
      type: 'walk_through',
      status: 'scheduled',
      scheduledStart: new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      scheduledEnd: new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      location: '',
      notes: '',
    });
    setShowCreateModal(true);
  };

  const handleCustomerClick = (appointment: Appointment) => {
    if (appointment.lead?.id) {
      setSelectedClientLeadId(appointment.lead.id);
      setSelectedClientAccountId(null);
    } else if (appointment.account?.id) {
      setSelectedClientAccountId(appointment.account.id);
      setSelectedClientLeadId(null);
    }
    setShowClientModal(true);
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setSelectedClientLeadId(null);
    setSelectedClientAccountId(null);
  };

  const columns = [
    {
      header: 'Lead / Account',
      cell: (item: Appointment) => (
        <div
          className="cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
          onClick={(e) => {
            e.stopPropagation();
            handleCustomerClick(item);
          }}
        >
          <div className="font-medium text-surface-900 dark:text-surface-100 hover:text-primary-600 dark:hover:text-primary-400">
            {item.lead?.companyName || item.lead?.contactName || item.account?.name || 'Unknown'}
          </div>
          <div className="text-sm text-surface-500 dark:text-surface-400">
            {item.lead?.contactName || item.account?.type || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (item: Appointment) => (
        <span className="text-surface-700 dark:text-surface-300">
          {item.type.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Scheduled',
      cell: (item: Appointment) => (
        <div className="text-surface-700 dark:text-surface-300">
          {new Date(item.scheduledStart).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </div>
      ),
    },
    {
      header: 'Assigned To',
      cell: (item: Appointment) => (
        <span className="text-surface-700 dark:text-surface-300">
          {item.assignedToUser.fullName}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (item: Appointment) => (
        <Badge variant={statusVariant(item.status)}>
          {item.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: Appointment) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedAppointment(item);
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Appointments
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Schedule and track walkthroughs, inspections, and visits
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-surface-200 p-0.5 dark:border-surface-700">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700'
              }`}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Schedule Appointment
          </Button>
        </div>
      </div>

            {viewMode === 'table' ? (
        <Card noPadding className="overflow-hidden">
          <div className="border-b border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search appointments..."
                  icon={<Search className="h-4 w-4" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                  label="Type"
                  placeholder="All Types"
                  options={APPOINTMENT_TYPES}
                  value={typeFilter}
                  onChange={(value) => setTypeFilter(value as AppointmentType)}
                />
                <Select
                  label="Status"
                  placeholder="All Statuses"
                  options={APPOINTMENT_STATUSES}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as AppointmentStatus)}
                />
                <Select
                  label="Assigned To"
                  placeholder="All Reps"
                  options={users.map((u) => ({ value: u.id, label: u.fullName }))}
                  value={assignedFilter}
                  onChange={setAssignedFilter}
                />
                {(typeFilter === '' || typeFilter === 'walk_through') ? (
                  <Select
                    label="Lead"
                    placeholder="All Leads"
                    options={leads.map((lead) => ({
                      value: lead.id,
                      label: lead.companyName || lead.contactName,
                    }))}
                    value={leadFilter}
                    onChange={(value) => {
                      setLeadFilter(value);
                      if (!typeFilter) setAccountFilter('');
                    }}
                  />
                ) : null}
                {(typeFilter === '' || typeFilter !== 'walk_through') ? (
                  <Select
                    label="Account"
                    placeholder="All Accounts"
                    options={activeAccounts.map((account) => ({
                      value: account.id,
                      label: account.name,
                    }))}
                    value={accountFilter}
                    onChange={(value) => {
                      setAccountFilter(value);
                      if (!typeFilter) setLeadFilter('');
                    }}
                  />
                ) : null}
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                    <input
                      type="checkbox"
                      checked={includePast}
                      onChange={(e) => setIncludePast(e.target.checked)}
                      className="rounded border-surface-300 bg-white text-primary-600 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-700"
                    />
                    Include past appointments
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

          <Table data={filteredAppointments} columns={columns} isLoading={loading} />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-surface-200 p-0.5 dark:border-surface-700">
              <button
                onClick={() => setCalendarView('month')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  calendarView === 'month'
                    ? 'bg-primary-600 text-white'
                    : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setCalendarView('week')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  calendarView === 'week'
                    ? 'bg-primary-600 text-white'
                    : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarView('day')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  calendarView === 'day'
                    ? 'bg-primary-600 text-white'
                    : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700'
                }`}
              >
                Day
              </button>
            </div>

            {calendarView !== 'month' && (
              <div className="flex rounded-lg border border-surface-200 p-0.5 dark:border-surface-700">
                <button
                  onClick={() => setCalendarLayout('grid')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    calendarLayout === 'grid'
                      ? 'bg-primary-600 text-white'
                      : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setCalendarLayout('list')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    calendarLayout === 'list'
                      ? 'bg-primary-600 text-white'
                      : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700'
                  }`}
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            )}
          </div>

          {calendarView === 'month' ? (
            <MonthCalendar
              year={calendarYear}
              month={calendarMonth}
              appointments={calendarAppointments}
              onMonthChange={handleMonthChange}
              onEdit={openEditModal}
              onCustomerClick={handleCustomerClick}
              onCreateClick={handleCalendarCreateClick}
              isLoading={calendarLoading}
            />
          ) : calendarView === 'week' ? (
            <WeekCalendar
              date={calendarDate}
              appointments={calendarAppointments}
              onDateChange={setCalendarDate}
              onEdit={openEditModal}
              onCustomerClick={handleCustomerClick}
              onCreateClick={handleCalendarCreateClick}
              layout={calendarLayout}
              isLoading={calendarLoading}
            />
          ) : (
            <DayCalendar
              date={calendarDate}
              appointments={calendarAppointments}
              onDateChange={setCalendarDate}
              onEdit={openEditModal}
              onCustomerClick={handleCustomerClick}
              onCreateClick={handleCalendarCreateClick}
              layout={calendarLayout}
              isLoading={calendarLoading}
            />
          )}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Appointment"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Appointment Type"
            options={APPOINTMENT_TYPES}
            value={formData.type}
            onChange={(value) =>
              setFormData({
                ...formData,
                type: value as AppointmentType,
                leadId: '',
                accountId: '',
              })
            }
          />

          {formData.type === 'walk_through' ? (
            <Select
              label="Lead"
              placeholder="Select lead"
              options={leads.map((lead) => ({
                value: lead.id,
                label: lead.companyName || lead.contactName,
              }))}
              value={formData.leadId}
              onChange={(value) => setFormData({ ...formData, leadId: value })}
            />
          ) : (
            <Select
              label="Account (Active Contract)"
              placeholder="Select account"
              options={activeAccounts.map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              value={formData.accountId}
              onChange={(value) => setFormData({ ...formData, accountId: value })}
            />
          )}

          <Select
            label="Assigned Rep"
            placeholder="Select rep"
            options={users.map((u) => ({ value: u.id, label: u.fullName }))}
            value={formData.assignedToUserId}
            onChange={(value) => setFormData({ ...formData, assignedToUserId: value })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Start"
              type="datetime-local"
              value={formData.scheduledStart}
              onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
            />
            <Input
              label="End"
              type="datetime-local"
              value={formData.scheduledEnd}
              onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
            />
          </div>

          <Input
            label="Timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          />

          <Input
            label="Location"
            placeholder="On-site"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <Textarea
            label="Notes"
            placeholder="Add notes or instructions..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={creating}>
              Schedule
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Appointment"
        size="lg"
      >
        <div className="space-y-4">
          {formData.type === 'walk_through' ? (
            <Select
              label="Lead"
              placeholder="Select lead"
              options={leads.map((lead) => ({
                value: lead.id,
                label: lead.companyName || lead.contactName,
              }))}
              value={formData.leadId}
              onChange={(value) => setFormData({ ...formData, leadId: value })}
              disabled
            />
          ) : (
            <Select
              label="Account (Active Contract)"
              placeholder="Select account"
              options={activeAccounts.map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              value={formData.accountId}
              onChange={(value) => setFormData({ ...formData, accountId: value })}
              disabled
            />
          )}

          <Select
            label="Assigned Rep"
            placeholder="Select rep"
            options={users.map((u) => ({ value: u.id, label: u.fullName }))}
            value={formData.assignedToUserId}
            onChange={(value) => setFormData({ ...formData, assignedToUserId: value })}
          />

          <Select
            label="Appointment Type"
            options={APPOINTMENT_TYPES}
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as AppointmentType })}
            disabled
          />

          <Select
            label="Status"
            options={APPOINTMENT_STATUSES}
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value as AppointmentStatus })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Start"
              type="datetime-local"
              value={formData.scheduledStart}
              onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
            />
            <Input
              label="End"
              type="datetime-local"
              value={formData.scheduledEnd}
              onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
            />
          </div>

          <Input
            label="Timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          />

          <Input
            label="Location"
            placeholder="On-site"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <Textarea
            label="Notes"
            placeholder="Add notes or instructions..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={updating}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Appointment"
        message="This appointment will be permanently removed."
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />

      <ClientProfileModal
        isOpen={showClientModal}
        onClose={handleCloseClientModal}
        leadId={selectedClientLeadId}
        accountId={selectedClientAccountId}
      />
    </div>
  );
};

export default AppointmentsPage;

