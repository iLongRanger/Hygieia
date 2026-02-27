import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Users,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  AlertTriangle,
  Edit2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  getJob,
  startJob,
  completeJob,
  cancelJob,
  createJobTask,
  updateJobTask,
  deleteJobTask,
  createJobNote,
} from '../../lib/jobs';
import { requestGeolocation } from '../../lib/geolocation';
import type { JobDetail as JobDetailType, JobStatus, JobTask, JobNote } from '../../types/job';
import { useAuthStore } from '../../stores/authStore';

const getStatusVariant = (status: JobStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const map: Record<JobStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    scheduled: 'info',
    in_progress: 'warning',
    completed: 'success',
    canceled: 'error',
    missed: 'default',
  };
  return map[status];
};

const getWorkforceIndicator = (job: JobDetailType): {
  label: string;
  badgeVariant: 'default' | 'info' | 'warning';
} => {
  const assignmentType =
    job.workforceAssignmentType ||
    (job.assignedToUser ? 'internal_employee' : job.assignedTeam ? 'subcontractor_team' : 'unassigned');

  if (assignmentType === 'internal_employee') {
    return { label: 'Internal Employee', badgeVariant: 'info' };
  }
  if (assignmentType === 'subcontractor_team') {
    return { label: 'Subcontractor Team', badgeVariant: 'warning' };
  }
  return { label: 'Unassigned', badgeVariant: 'default' };
};

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  // Task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  // Note form
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<'general' | 'issue'>('general');

  // Complete form
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const userRole = useAuthStore((state) => state.user?.role);
  const isSubcontractor = userRole === 'subcontractor';
  const requiresGeofence = userRole === 'cleaner' || userRole === 'subcontractor';
  const [gettingLocation, setGettingLocation] = useState(false);

  const fetchJob = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getJob(id);
      setJob(data);
    } catch {
      toast.error('Failed to load job');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handleStart = async () => {
    if (!id) return;
    try {
      let geoLocation = null;
      if (requiresGeofence) {
        setGettingLocation(true);
        try {
          geoLocation = await requestGeolocation();
        } catch (geoError: any) {
          toast.error(geoError.message || 'Failed to get location');
          return;
        } finally {
          setGettingLocation(false);
        }
      }

      await startJob(id, { geoLocation });
      toast.success('Job started & clocked in');
      fetchJob();
    } catch (error: any) {
      const details = error?.response?.data?.error?.details;
      if (details?.code === 'OUTSIDE_FACILITY_GEOFENCE') {
        toast.error('You must be at the facility to start this job');
        return;
      }
      if (details?.code === 'ACTIVE_CLOCK_IN_EXISTS') {
        toast.error('You already have an active clock-in. Clock out first.');
        return;
      }
      const canManagerOverride = ['owner', 'admin', 'manager'].includes(userRole || '');
      if (details?.code === 'OUTSIDE_SERVICE_WINDOW' && canManagerOverride) {
        const confirmed = confirm(
          `Outside allowed service window (${details.allowedWindowStart}-${details.allowedWindowEnd}, ` +
          `${details.timezone}). Apply manager override?`
        );
        if (confirmed) {
          await startJob(id, {
            managerOverride: true,
            overrideReason: 'Manager override from Job detail',
            geoLocation: null,
          });
          toast.success('Job started with manager override');
          fetchJob();
          return;
        }
      }
      toast.error(
        details?.code === 'OUTSIDE_SERVICE_WINDOW'
          ? 'Outside allowed service window'
          : 'Failed to start job'
      );
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      let geoLocation = null;
      if (requiresGeofence) {
        setGettingLocation(true);
        try {
          geoLocation = await requestGeolocation();
        } catch (geoError: any) {
          toast.error(geoError.message || 'Failed to get location');
          return;
        } finally {
          setGettingLocation(false);
        }
      }

      await completeJob(id, {
        completionNotes: completionNotes || null,
        geoLocation,
      });
      toast.success('Job completed & clocked out');
      setShowCompleteForm(false);
      fetchJob();
    } catch (error: any) {
      const details = error?.response?.data?.error?.details;
      if (details?.code === 'OUTSIDE_FACILITY_GEOFENCE') {
        toast.error('You must be at the facility to complete this job');
        return;
      }
      if (details?.code === 'ACTIVE_CLOCK_IN_REQUIRED') {
        toast.error('Clock in to this job first, then complete it.');
        return;
      }
      toast.error('Failed to complete job');
    }
  };

  const handleCancel = async () => {
    if (!id || !confirm('Are you sure you want to cancel this job?')) return;
    try {
      await cancelJob(id);
      toast.success('Job canceled');
      fetchJob();
    } catch {
      toast.error('Failed to cancel job');
    }
  };

  const handleAddTask = async () => {
    if (!id || !newTaskName.trim()) return;
    try {
      await createJobTask(id, { taskName: newTaskName.trim() });
      setNewTaskName('');
      setShowAddTask(false);
      toast.success('Task added');
      fetchJob();
    } catch {
      toast.error('Failed to add task');
    }
  };

  const handleToggleTask = async (task: JobTask) => {
    if (!id) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateJobTask(id, task.id, { status: newStatus });
      fetchJob();
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!id) return;
    try {
      await deleteJobTask(id, taskId);
      fetchJob();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNoteContent.trim()) return;
    try {
      await createJobNote(id, {
        noteType: newNoteType,
        content: newNoteContent.trim(),
      });
      setNewNoteContent('');
      setShowAddNote(false);
      toast.success('Note added');
      fetchJob();
    } catch {
      toast.error('Failed to add note');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-surface-200 dark:bg-surface-700" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 rounded-xl bg-surface-200 dark:bg-surface-700" />
            <div className="h-64 rounded-xl bg-surface-200 dark:bg-surface-700" />
          </div>
          <div className="h-96 rounded-xl bg-surface-200 dark:bg-surface-700" />
        </div>
      </div>
    );
  }

  if (!job) return null;

  const tasksDone = job.tasks.filter((t) => t.status === 'completed').length;
  const tasksTotal = job.tasks.length;
  const workforce = getWorkforceIndicator(job);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
            <Briefcase className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
                {job.jobNumber}
              </h1>
              <Badge variant={job.jobType === 'special_job' ? 'warning' : 'default'}>
                {job.jobType === 'special_job' ? 'Special Job' : 'Scheduled Service'}
              </Badge>
              <Badge variant={job.jobCategory === 'recurring' ? 'info' : 'default'}>
                {job.jobCategory === 'recurring' ? 'Recurring' : 'One-Time'}
              </Badge>
              <Badge variant={getStatusVariant(job.status)}>
                {job.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
              <Badge variant={workforce.badgeVariant}>{workforce.label}</Badge>
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {job.facility.name} &mdash; {job.account.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.status === 'scheduled' && (
            <Button size="sm" onClick={handleStart} disabled={gettingLocation}>
              {gettingLocation ? (
                <>
                  <MapPin className="mr-1.5 h-4 w-4 animate-pulse" />
                  Verifying location...
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" />
                  Start Job
                </>
              )}
            </Button>
          )}
          {job.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => setShowCompleteForm(!showCompleteForm)}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Complete
            </Button>
          )}
          {!isSubcontractor && ['scheduled', 'in_progress'].includes(job.status) && (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/jobs/${id}/edit`)}>
              <Edit2 className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          )}
          {!isSubcontractor && ['scheduled', 'in_progress'].includes(job.status) && (
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              <XCircle className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Complete form */}
      {showCompleteForm && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">
            Complete Job
          </h3>
          <textarea
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="Completion notes (optional)"
            className="w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
            rows={3}
          />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleComplete}>
              Confirm Complete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCompleteForm(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100">
              Job Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-surface-500 dark:text-surface-400">Scheduled Date</span>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {new Date(job.scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </p>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Contract</span>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {job.contract ? (
                    <button
                      onClick={() => navigate(`/contracts/${job.contract!.id}`)}
                      className="text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {job.contract.contractNumber}
                    </button>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Quotation</span>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {job.quotation ? (
                    <button
                      onClick={() => navigate(`/quotations/${job.quotation!.id}`)}
                      className="text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {job.quotation.quotationNumber}
                    </button>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Internal Employee</span>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {job.assignedToUser?.fullName || '-'}
                </p>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Subcontractor Team</span>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {job.assignedTeam?.name || '-'}
                </p>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Est. Hours</span>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {job.estimatedHours ? `${Number(job.estimatedHours).toFixed(1)}h` : '-'}
                </p>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Actual Hours</span>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {job.actualHours ? `${Number(job.actualHours).toFixed(1)}h` : '-'}
                </p>
              </div>
            </div>
            {job.notes && (
              <div className="mt-4 rounded-lg bg-surface-50 p-3 text-sm text-surface-700 dark:bg-surface-800/50 dark:text-surface-300">
                {job.notes}
              </div>
            )}
            {job.completionNotes && (
              <div className="mt-4 rounded-lg bg-success-50 p-3 text-sm text-success-800 dark:bg-success-900/20 dark:text-success-300">
                <strong>Completion Notes:</strong> {job.completionNotes}
              </div>
            )}
          </Card>

          {/* Task Checklist */}
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Tasks {tasksTotal > 0 && (
                  <span className="ml-1 text-surface-400">
                    ({tasksDone}/{tasksTotal})
                  </span>
                )}
              </h3>
              {!isSubcontractor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddTask(!showAddTask)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Task
                </Button>
              )}
            </div>

            {showAddTask && (
              <div className="mt-3 flex gap-2">
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Task name"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <Button size="sm" onClick={handleAddTask}>
                  Add
                </Button>
              </div>
            )}

            {/* Progress bar */}
            {tasksTotal > 0 && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
                <div
                  className="h-full rounded-full bg-success-500 transition-all"
                  style={{ width: `${(tasksDone / tasksTotal) * 100}%` }}
                />
              </div>
            )}

            <div className="mt-3 space-y-1">
              {job.tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-surface-400">
                  No tasks yet
                </p>
              ) : (
                job.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                  >
                    <button
                      onClick={() => !isSubcontractor && handleToggleTask(task)}
                      disabled={isSubcontractor}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        task.status === 'completed'
                          ? 'border-success-500 bg-success-500 text-white'
                          : 'border-surface-300 dark:border-surface-600'
                      }`}
                    >
                      {task.status === 'completed' && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        task.status === 'completed'
                          ? 'text-surface-400 line-through'
                          : 'text-surface-900 dark:text-surface-100'
                      }`}
                    >
                      {task.taskName}
                    </span>
                    {task.estimatedMinutes && (
                      <span className="text-xs text-surface-400">
                        {task.estimatedMinutes}min
                      </span>
                    )}
                    {!isSubcontractor && (
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-surface-400 hover:text-danger-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Notes
              </h3>
              {!isSubcontractor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddNote(!showAddNote)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Note
                </Button>
              )}
            </div>

            {showAddNote && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewNoteType('general')}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      newNoteType === 'general'
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                    }`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setNewNoteType('issue')}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      newNoteType === 'issue'
                        ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
                        : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                    }`}
                  >
                    Issue
                  </button>
                </div>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write a note..."
                  className="w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                  rows={3}
                />
                <Button size="sm" onClick={handleAddNote}>
                  Add Note
                </Button>
              </div>
            )}

            <div className="mt-3 space-y-3">
              {job.notes_.length === 0 ? (
                <p className="py-4 text-center text-sm text-surface-400">
                  No notes yet
                </p>
              ) : (
                job.notes_.map((note) => (
                  <div
                    key={note.id}
                    className={`rounded-lg p-3 text-sm ${
                      note.noteType === 'issue'
                        ? 'border border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-900/20'
                        : 'bg-surface-50 dark:bg-surface-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {note.noteType === 'issue' && (
                          <AlertTriangle className="h-3.5 w-3.5 text-danger-500" />
                        )}
                        <span className="font-medium text-surface-900 dark:text-surface-100">
                          {note.createdByUser.fullName}
                        </span>
                      </div>
                      <span className="text-xs text-surface-400">
                        {new Date(note.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-surface-700 dark:text-surface-300">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar - Activity */}
        <div>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">
              Activity
            </h3>
            <div className="space-y-3">
              {job.activities.length === 0 ? (
                <p className="text-sm text-surface-400">No activity yet</p>
              ) : (
                job.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-surface-900 dark:text-surface-100">
                        <span className="font-medium">
                          {activity.performedByUser?.fullName || 'System'}
                        </span>{' '}
                        {activity.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-surface-400">
                        {new Date(activity.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
