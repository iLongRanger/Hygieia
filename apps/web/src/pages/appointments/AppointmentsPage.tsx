import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarPlus, Pencil, Search, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { listAppointments, createAppointment, updateAppointment, deleteAppointment } from '../../lib/appointments';
import { listLeads } from '../../lib/leads';
import { listUsers } from '../../lib/users';
import type { Appointment, AppointmentStatus, AppointmentType, Lead } from '../../types/crm';
import type { User } from '../../types/user';

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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [typeFilter, setTypeFilter] = useState<AppointmentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [leadFilter, setLeadFilter] = useState('');
  const [includePast, setIncludePast] = useState(false);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    leadId: '',
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
  }, [assignedFilter, includePast, leadFilter, statusFilter, typeFilter]);

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

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, [fetchLeads, fetchUsers]);

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
      const leadName = appointment.lead.companyName || appointment.lead.contactName || '';
      const assignee = appointment.assignedToUser.fullName || '';
      return (
        leadName.toLowerCase().includes(term) ||
        assignee.toLowerCase().includes(term)
      );
    });
  }, [appointments, search]);

  const handleCreate = async () => {
    if (!formData.leadId || !formData.assignedToUserId || !formData.scheduledStart || !formData.scheduledEnd) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setCreating(true);
      await createAppointment({
        leadId: formData.leadId,
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
        assignedToUserId: '',
        type: 'walk_through',
        status: 'scheduled',
        scheduledStart: '',
        scheduledEnd: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        location: '',
        notes: '',
      });
      fetchAppointments();
    } catch (error) {
      console.error('Failed to create appointment:', error);
      toast.error('Failed to schedule appointment');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      leadId: appointment.lead.id,
      assignedToUserId: appointment.assignedToUser.id,
      type: appointment.type,
      status: appointment.status,
      scheduledStart: new Date(appointment.scheduledStart).toISOString().slice(0, 16),
      scheduledEnd: new Date(appointment.scheduledEnd).toISOString().slice(0, 16),
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
      fetchAppointments();
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
      fetchAppointments();
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      toast.error('Failed to delete appointment');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Lead',
      cell: (item: Appointment) => (
        <div>
          <div className="font-medium text-surface-900 dark:text-surface-100">
            {item.lead.companyName || item.lead.contactName}
          </div>
          <div className="text-sm text-surface-500 dark:text-surface-400">
            {item.lead.contactName}
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
        <Button onClick={() => setShowCreateModal(true)}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search by lead or rep..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <Select
                label="Lead"
                placeholder="All Leads"
                options={leads.map((lead) => ({
                  value: lead.id,
                  label: lead.companyName || lead.contactName,
                }))}
                value={leadFilter}
                onChange={setLeadFilter}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
              <input
                type="checkbox"
                checked={includePast}
                onChange={(e) => setIncludePast(e.target.checked)}
                className="rounded border-surface-300 bg-white text-primary-600 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-700"
              />
              Include past appointments
            </label>
          </div>
        </div>

        <Table data={filteredAppointments} columns={columns} isLoading={loading} />
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Appointment"
        size="lg"
      >
        <div className="space-y-4">
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
    </div>
  );
};

export default AppointmentsPage;
