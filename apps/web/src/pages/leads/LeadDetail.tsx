import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Mail,
  User as UserIcon,
  Clock,
  ClipboardList,
  CheckCircle,
  RotateCcw,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { getLead, listLeadSources, updateLead } from '../../lib/leads';
import { listUsers } from '../../lib/users';
import { listFacilities } from '../../lib/facilities';
import {
  createAppointment,
  listAppointments,
  rescheduleAppointment,
  completeAppointment,
} from '../../lib/appointments';
import type { Appointment, Lead, LeadSource, UpdateLeadInput } from '../../types/crm';
import type { User } from '../../types/user';
import type { Facility } from '../../types/facility';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
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

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdateLeadInput>({});
  const [updating, setUpdating] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [scheduleForm, setScheduleForm] = useState({
    assignedToUserId: '',
    scheduledStart: '',
    scheduledEnd: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    location: '',
    notes: '',
  });

  const [completeForm, setCompleteForm] = useState({
    facilityId: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);

  const canWriteLeads = useMemo(
    () => hasPermission(PERMISSIONS.LEADS_WRITE),
    [hasPermission]
  );
  const leadAssignableUsers = useMemo(
    () => users.filter(isLeadAssignableUser),
    [users]
  );

  const fetchLead = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getLead(id);
      setLead(data);
    } catch (error) {
      console.error('Failed to fetch lead:', error);
      toast.error('Failed to load lead details');
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAppointments = useCallback(async () => {
    if (!id) return;
    try {
      const data = await listAppointments({ leadId: id, includePast: true });
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  }, [id]);

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

  const fetchFacilities = useCallback(async () => {
    if (!lead?.convertedToAccount?.id) {
      setFacilities([]);
      return;
    }
    try {
      const response = await listFacilities({ accountId: lead.convertedToAccount.id, limit: 100 });
      setFacilities(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
    }
  }, [lead?.convertedToAccount?.id]);

  useEffect(() => {
    fetchLead();
    fetchUsers();
    fetchLeadSources();
  }, [fetchLead, fetchUsers, fetchLeadSources]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const formatDateTime = (value: string, timezone: string) => {
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone || undefined,
    });
  };

  const toLocalInputValue = (value: string) => {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const statusBadge = (status: string) => {
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

  const handleSchedule = async () => {
    if (!id) return;
    if (!scheduleForm.assignedToUserId || !scheduleForm.scheduledStart || !scheduleForm.scheduledEnd) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSaving(true);
      await createAppointment({
        leadId: id,
        assignedToUserId: scheduleForm.assignedToUserId,
        type: 'walk_through',
        scheduledStart: new Date(scheduleForm.scheduledStart).toISOString(),
        scheduledEnd: new Date(scheduleForm.scheduledEnd).toISOString(),
        timezone: scheduleForm.timezone,
        location: scheduleForm.location || null,
        notes: scheduleForm.notes || null,
      });
      toast.success('Walkthrough scheduled');
      setShowScheduleModal(false);
      setScheduleForm({
        assignedToUserId: '',
        scheduledStart: '',
        scheduledEnd: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        location: '',
        notes: '',
      });
      fetchAppointments();
      fetchLead();
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      toast.error('Failed to schedule walkthrough');
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    if (!scheduleForm.scheduledStart || !scheduleForm.scheduledEnd) {
      toast.error('Please provide new start and end time');
      return;
    }

    try {
      setSaving(true);
      await rescheduleAppointment(selectedAppointment.id, {
        scheduledStart: new Date(scheduleForm.scheduledStart).toISOString(),
        scheduledEnd: new Date(scheduleForm.scheduledEnd).toISOString(),
        timezone: scheduleForm.timezone,
        location: scheduleForm.location || null,
        notes: scheduleForm.notes || null,
      });
      toast.success('Appointment rescheduled');
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      toast.error('Failed to reschedule');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedAppointment) return;
    if (!completeForm.facilityId) {
      toast.error('Select a facility before completing');
      return;
    }

    try {
      setSaving(true);
      await completeAppointment(selectedAppointment.id, {
        facilityId: completeForm.facilityId,
        notes: completeForm.notes || null,
      });
      toast.success('Walkthrough completed');
      setShowCompleteModal(false);
      setSelectedAppointment(null);
      setCompleteForm({ facilityId: '', notes: '' });
      fetchAppointments();
      fetchLead();
    } catch (error) {
      console.error('Failed to complete appointment:', error);
      toast.error('Failed to complete walkthrough');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = () => {
    if (!lead) return;
    setEditFormData({
      contactName: lead.contactName,
      companyName: lead.companyName,
      primaryEmail: lead.primaryEmail,
      primaryPhone: lead.primaryPhone,
      secondaryEmail: lead.secondaryEmail,
      secondaryPhone: lead.secondaryPhone,
      leadSourceId: lead.leadSource?.id || null,
      status: lead.status,
      estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
      probability: lead.probability ?? null,
      expectedCloseDate: lead.expectedCloseDate || null,
      assignedToUserId: lead.assignedToUser?.id || null,
      notes: lead.notes,
      lostReason: lead.lostReason,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!lead || !editFormData.contactName) {
      toast.error('Contact name is required');
      return;
    }

    try {
      setUpdating(true);
      await updateLead(lead.id, editFormData);
      toast.success('Lead updated successfully');
      setShowEditModal(false);
      fetchLead();
    } catch (error) {
      console.error('Failed to update lead:', error);
      toast.error('Failed to update lead');
    } finally {
      setUpdating(false);
    }
  };

  const latestAppointment = useMemo(() => {
    if (!appointments.length) return null;
    return appointments[appointments.length - 1];
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!lead) {
    return <div className="text-center text-gray-400">Lead not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{lead.contactName}</h1>
          <p className="text-gray-400">{lead.companyName || 'No company name'}</p>
        </div>
        {canWriteLeads && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openEditModal}>
              Edit Lead
            </Button>
            <Button onClick={() => setShowScheduleModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Walkthrough
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                <UserIcon className="h-7 w-7 text-gold" />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {lead.contactName}
                </div>
                <Badge variant="info">{lead.status.replace(/_/g, ' ')}</Badge>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Primary Email</div>
                  <div className="text-white">
                    {lead.primaryEmail || 'Not provided'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Created</div>
                  <div className="text-white">
                    {new Date(lead.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {lead.convertedToAccount && (
                <div className="flex items-start gap-3">
                  <ClipboardList className="mt-1 h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-400">Converted Account</div>
                    <div className="text-white">{lead.convertedToAccount.name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Walkthrough Appointments
              </h3>

              {appointments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No appointments scheduled</p>
                  <p className="text-sm">Schedule a walkthrough to start the process</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appointment) => {
                    const isAssigned = appointment.assignedToUser.id === currentUser?.id;
                    return (
                      <div
                        key={appointment.id}
                        className="flex flex-col gap-3 rounded-lg border border-white/10 bg-navy-darker/30 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm text-gray-400">Scheduled</div>
                            <div className="text-white">
                              {formatDateTime(appointment.scheduledStart, appointment.timezone)} -{' '}
                              {formatDateTime(appointment.scheduledEnd, appointment.timezone)}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              Assigned to {appointment.assignedToUser.fullName}
                            </div>
                          </div>
                          <Badge variant={statusBadge(appointment.status)}>
                            {appointment.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canWriteLeads && appointment.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setScheduleForm({
                                  assignedToUserId: appointment.assignedToUser.id,
                                  scheduledStart: toLocalInputValue(appointment.scheduledStart),
                                  scheduledEnd: toLocalInputValue(appointment.scheduledEnd),
                                  timezone: appointment.timezone,
                                  location: appointment.location || '',
                                  notes: appointment.notes || '',
                                });
                                setShowRescheduleModal(true);
                              }}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Reschedule
                            </Button>
                          )}
                          {(isAssigned || canWriteLeads) && appointment.status === 'scheduled' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowCompleteModal(true);
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Complete Walkthrough
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {latestAppointment && latestAppointment.status !== 'completed' && (
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-4">
                <div className="text-sm font-medium text-gold">Walkthrough not completed</div>
                <p className="mt-1 text-sm text-gray-400">
                  Areas and tasks must be added during the walkthrough before moving to proposal.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Walkthrough"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Assigned Rep"
            placeholder="Select rep"
            options={leadAssignableUsers.map((u) => ({ value: u.id, label: u.fullName }))}
            value={scheduleForm.assignedToUserId}
            onChange={(value) => setScheduleForm({ ...scheduleForm, assignedToUserId: value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start"
              type="datetime-local"
              value={scheduleForm.scheduledStart}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledStart: e.target.value })}
            />
            <Input
              label="End"
              type="datetime-local"
              value={scheduleForm.scheduledEnd}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledEnd: e.target.value })}
            />
          </div>

          <Input
            label="Timezone"
            value={scheduleForm.timezone}
            onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
          />

          <Input
            label="Location"
            placeholder="On-site"
            value={scheduleForm.location}
            onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
          />

          <Textarea
            label="Notes"
            placeholder="Add any instructions for the rep..."
            value={scheduleForm.notes}
            onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} isLoading={saving}>
              Schedule
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Walkthrough"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Start"
              type="datetime-local"
              value={scheduleForm.scheduledStart}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledStart: e.target.value })}
            />
            <Input
              label="New End"
              type="datetime-local"
              value={scheduleForm.scheduledEnd}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledEnd: e.target.value })}
            />
          </div>

          <Input
            label="Timezone"
            value={scheduleForm.timezone}
            onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
          />

          <Input
            label="Location"
            value={scheduleForm.location}
            onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
          />

          <Textarea
            label="Notes"
            value={scheduleForm.notes}
            onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRescheduleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} isLoading={saving}>
              Reschedule
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Walkthrough"
        size="lg"
      >
        <div className="space-y-4">
          {lead.convertedToAccount ? (
            <>
              <Select
                label="Facility"
                placeholder="Select facility"
                options={facilities.map((f) => ({
                  value: f.id,
                  label: `${f.name} (${f._count.areas} areas, ${f._count.facilityTasks} tasks)`,
                }))}
                value={completeForm.facilityId}
                onChange={(value) => setCompleteForm({ ...completeForm, facilityId: value })}
              />
              <Textarea
                label="Completion Notes"
                placeholder="Add walkthrough notes..."
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              />
            </>
          ) : (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-300">
              Convert this lead to an account and add a facility before completing the walkthrough.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              isLoading={saving}
              disabled={!lead.convertedToAccount}
            >
              Complete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Lead"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              placeholder="John Smith"
              value={editFormData.contactName || ''}
              onChange={(e) =>
                setEditFormData({ ...editFormData, contactName: e.target.value })
              }
              maxLength={maxLengths.fullName}
              showCharacterCount
            />
            <Input
              label="Company Name"
              placeholder="Acme Corp"
              value={editFormData.companyName || ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  companyName: e.target.value || null,
                })
              }
              maxLength={maxLengths.companyName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Email"
              type="email"
              placeholder="john@example.com"
              value={editFormData.primaryEmail || ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  primaryEmail: e.target.value || null,
                })
              }
              maxLength={maxLengths.email}
            />
            <Input
              label="Primary Phone"
              placeholder="(555) 123-4567"
              value={editFormData.primaryPhone || ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  primaryPhone: e.target.value || null,
                })
              }
              maxLength={maxLengths.phone}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Secondary Email"
              type="email"
              placeholder="alt@example.com"
              value={editFormData.secondaryEmail || ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  secondaryEmail: e.target.value || null,
                })
              }
              maxLength={maxLengths.email}
            />
            <Input
              label="Secondary Phone"
              placeholder="(555) 987-6543"
              value={editFormData.secondaryPhone || ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  secondaryPhone: e.target.value || null,
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
              value={editFormData.leadSourceId || ''}
              onChange={(value) =>
                setEditFormData({ ...editFormData, leadSourceId: value || null })
              }
            />
            <Select
              label="Status"
              options={LEAD_STATUSES}
              value={editFormData.status || 'lead'}
              onChange={(value) => setEditFormData({ ...editFormData, status: value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Estimated Value"
              type="number"
              placeholder="10000"
              value={editFormData.estimatedValue ?? ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
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
              value={editFormData.assignedToUserId || ''}
              onChange={(value) =>
                setEditFormData({ ...editFormData, assignedToUserId: value || null })
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
              value={editFormData.probability ?? ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  probability: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <Input
              label="Expected Close Date"
              type="date"
              value={editFormData.expectedCloseDate ? editFormData.expectedCloseDate.split('T')[0] : ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  expectedCloseDate: e.target.value || null,
                })
              }
            />
          </div>

          <Textarea
            label="Notes"
            placeholder="Additional notes about this lead..."
            value={editFormData.notes || ''}
            onChange={(e) =>
              setEditFormData({ ...editFormData, notes: e.target.value || null })
            }
            maxLength={maxLengths.notes}
            showCharacterCount
          />

          {editFormData.status === 'lost' && (
            <Textarea
              label="Lost Reason"
              placeholder="Why was this lead lost?"
              value={editFormData.lostReason || ''}
              onChange={(e) =>
                setEditFormData({ ...editFormData, lostReason: e.target.value || null })
              }
              maxLength={maxLengths.lostReason}
              showCharacterCount
            />
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              isLoading={updating}
              disabled={!editFormData.contactName}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeadDetail;
