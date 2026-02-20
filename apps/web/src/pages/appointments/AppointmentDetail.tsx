import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Building2,
  FileText,
  Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { getAppointment } from '../../lib/appointments';
import type { Appointment, AppointmentStatus } from '../../types/crm';

const getStatusVariant = (status: AppointmentStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
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

const getTypeLabel = (type: string) => type.replace(/_/g, ' ');

const getTypeVariant = (type: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (type) {
    case 'walk_through':
      return 'info';
    case 'inspection':
      return 'warning';
    case 'visit':
      return 'default';
    default:
      return 'default';
  }
};

const AppointmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppointment = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getAppointment(id);
      setAppointment(data);
    } catch {
      toast.error('Failed to load appointment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton rounded" />
        <div className="h-48 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-16">
        <p className="text-surface-500">Appointment not found</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/appointments')}>
          Back to Appointments
        </Button>
      </div>
    );
  }

  const entityName =
    appointment.lead?.companyName ||
    appointment.lead?.contactName ||
    appointment.account?.name ||
    'Unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <Calendar className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                {entityName}
              </h1>
              <Badge variant={getTypeVariant(appointment.type)}>
                {getTypeLabel(appointment.type)}
              </Badge>
              <Badge variant={getStatusVariant(appointment.status)}>
                {appointment.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {new Date(appointment.scheduledStart).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Schedule & Location */}
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400">Schedule</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-surface-400" />
                <span className="text-surface-700 dark:text-surface-300">
                  {new Date(appointment.scheduledStart).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                  {' — '}
                  {new Date(appointment.scheduledEnd).toLocaleString('en-US', {
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-surface-400" />
                <span className="text-surface-500 dark:text-surface-400">
                  Timezone: {appointment.timezone}
                </span>
              </div>
              {appointment.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-surface-400" />
                  <span className="text-surface-700 dark:text-surface-300">
                    {appointment.location}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-surface-400" />
                <span className="text-surface-500 dark:text-surface-400">Assigned to: </span>
                <span className="text-surface-700 dark:text-surface-300">
                  {appointment.assignedToUser.fullName}
                </span>
              </div>
              {appointment.assignedTeam && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-surface-400" />
                  <span className="text-surface-500 dark:text-surface-400">Team: </span>
                  <span className="text-surface-700 dark:text-surface-300">
                    {appointment.assignedTeam.name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-surface-400" />
                <span className="text-surface-500 dark:text-surface-400">Created by: </span>
                <span className="text-surface-700 dark:text-surface-300">
                  {appointment.createdByUser.fullName}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Linked Entity */}
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400">Linked Entity</h3>
            <div className="space-y-2">
              {appointment.lead && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-surface-400" />
                  <button
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                    onClick={() => navigate(`/leads/${appointment.lead!.id}`)}
                  >
                    {appointment.lead.companyName || appointment.lead.contactName}
                  </button>
                  <Badge variant="info" size="sm">{appointment.lead.status.replace(/_/g, ' ')}</Badge>
                </div>
              )}
              {appointment.account && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-surface-400" />
                  <button
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                    onClick={() => navigate(`/accounts/${appointment.account!.id}`)}
                  >
                    {appointment.account.name}
                  </button>
                  <Badge variant="default" size="sm">{appointment.account.type}</Badge>
                </div>
              )}
              {appointment.inspection && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-surface-400" />
                  <button
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                    onClick={() => navigate(`/inspections/${appointment.inspection!.id}`)}
                  >
                    Inspection {appointment.inspection.inspectionNumber}
                  </button>
                  <Badge variant="info" size="sm">{appointment.inspection.status.replace(/_/g, ' ')}</Badge>
                </div>
              )}
              {appointment.rescheduledFromId && (
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="h-4 w-4 text-surface-400" />
                  <button
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                    onClick={() => navigate(`/appointments/${appointment.rescheduledFromId}`)}
                  >
                    View previous appointment
                  </button>
                </div>
              )}
              {!appointment.lead && !appointment.account && !appointment.inspection && !appointment.rescheduledFromId && (
                <p className="text-sm text-surface-400">No linked entities</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Notes */}
      {appointment.notes && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">Notes</h3>
            <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{appointment.notes}</p>
          </div>
        </Card>
      )}

      {/* Completion Info */}
      {appointment.status === 'completed' && (
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400">Completion</h3>
            <div className="space-y-2">
              {appointment.completedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-surface-400" />
                  <span className="text-surface-500 dark:text-surface-400">Completed: </span>
                  <span className="text-surface-700 dark:text-surface-300">
                    {new Date(appointment.completedAt).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              )}
              {appointment.actualDuration != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-surface-400" />
                  <span className="text-surface-500 dark:text-surface-400">Duration: </span>
                  <span className="text-surface-700 dark:text-surface-300">
                    {appointment.actualDuration} minutes
                  </span>
                </div>
              )}
              {appointment.completionNotes && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">Completion Notes</p>
                  <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
                    {appointment.completionNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Activity Info */}
      <Card>
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400">Activity</h3>
          <div className="text-sm text-surface-500 dark:text-surface-400">
            Created {new Date(appointment.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AppointmentDetail;
