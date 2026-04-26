import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,

  Play,
  CheckCircle,
  XCircle,
  MapPin,
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
import { Select } from '../../components/ui/Select';
import {
  getJob,
  startJob,
  completeJob,
  completeInitialCleanForJob,
  cancelJob,
  createJobTask,
  updateJobTask,
  deleteJobTask,
  createJobNote,
  submitJobSettlementExplanation,
  reviewJobSettlement,
} from '../../lib/jobs';
import { requestGeolocation } from '../../lib/geolocation';
import { extractApiErrorMessage } from '../../lib/api';
import type {
  JobDetail as JobDetailType,
  JobSettlementStatus,
  JobStatus,
  JobTask,
} from '../../types/job';
import { useAuthStore } from '../../stores/authStore';

interface JobActionErrorDetails {
  code?: string;
  allowedWindowStart?: string;
  allowedWindowEnd?: string;
  timezone?: string;
}

const getJobActionErrorDetails = (error: unknown): JobActionErrorDetails | null => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return null;
  }

  return (
    error as {
      response?: { data?: { error?: { details?: JobActionErrorDetails } } };
    }
  ).response?.data?.error?.details || null;
};

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

const getSettlementVariant = (
  status?: JobSettlementStatus
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'ready':
    case 'approved_both':
      return 'success';
    case 'needs_review':
      return 'warning';
    case 'approved_invoice_only':
    case 'approved_payroll_only':
      return 'info';
    case 'excluded':
      return 'error';
    default:
      return 'default';
  }
};

const formatSettlementLabel = (status?: JobSettlementStatus) => {
  switch (status) {
    case 'approved_both':
      return 'Approved Both';
    case 'approved_invoice_only':
      return 'Invoice Only';
    case 'approved_payroll_only':
      return 'Payroll Only';
    case 'needs_review':
      return 'Needs Review';
    case 'excluded':
      return 'Excluded';
    case 'ready':
    default:
      return 'Ready';
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

const getAccountTypeBadge = (accountType?: string | null) => {
  if (accountType === 'residential') {
    return { label: 'Residential', variant: 'warning' as const };
  }
  return { label: 'Commercial', variant: 'info' as const };
};

const formatAddress = (address?: {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
} | null): string => {
  if (!address) {
    return '-';
  }

  const line1 = address.street?.trim() ?? '';
  const locality = [address.city, address.state, address.postalCode]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(', ');
  const country = address.country?.trim() ?? '';

  return [line1, locality, country]
    .filter((value) => value.length > 0)
    .join('\n') || '-';
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
  const currentUser = useAuthStore((state) => state.user);
  const userRole = currentUser?.role;
  const isFieldWorker = userRole === 'subcontractor' || userRole === 'cleaner';
  const isSubcontractor = userRole === 'subcontractor';
  const requiresGeofence = userRole === 'cleaner' || userRole === 'subcontractor';
  const [gettingLocation, setGettingLocation] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [submittingExplanation, setSubmittingExplanation] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<
    Exclude<JobSettlementStatus, 'ready' | 'needs_review'>
  >('approved_both');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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
        } catch (geoError) {
          toast.error(extractApiErrorMessage(geoError, 'Failed to get location'));
          return;
        } finally {
          setGettingLocation(false);
        }
      }

      await startJob(id, { geoLocation });
      toast.success('Job started & clocked in');
      fetchJob();
    } catch (error) {
      const details = getJobActionErrorDetails(error);
      if (details?.code === 'OUTSIDE_FACILITY_GEOFENCE') {
        toast.error('You must be at the service location to start this job');
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
        } catch (geoError) {
          toast.error(extractApiErrorMessage(geoError, 'Failed to get location'));
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
    } catch (error) {
      const details = getJobActionErrorDetails(error);
      if (details?.code === 'OUTSIDE_FACILITY_GEOFENCE') {
        toast.error('You must be at the service location to complete this job');
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

  const handleCompleteInitialClean = async () => {
    if (!id) return;
    try {
      await completeInitialCleanForJob(id);
      toast.success('Initial clean marked complete');
      fetchJob();
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to mark initial clean complete'));
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
  const accountType = getAccountTypeBadge(job.account.type);
  const primaryContact = job.account.contacts?.[0] ?? null;
  const contactPhone = primaryContact?.mobile || primaryContact?.phone || job.account.billingPhone || null;
  const serviceAddress = formatAddress(job.facility.address);
  const showCommercialLinks = !isFieldWorker;
  const settlement = job.settlement;
  const canReviewSettlement = ['owner', 'admin', 'manager'].includes(userRole || '');
  const isAssignedWorker =
    Boolean(currentUser?.id) &&
    (job.assignedToUser?.id === currentUser?.id ||
      (Boolean(currentUser?.teamId) && job.assignedTeam?.id === currentUser?.teamId));
  const canSubmitSettlementExplanation =
    Boolean(isAssignedWorker) && settlement?.status === 'needs_review';

  const handleSubmitSettlementExplanation = async () => {
    if (!id || !explanation.trim()) {
      toast.error('Explanation is required');
      return;
    }

    try {
      setSubmittingExplanation(true);
      await submitJobSettlementExplanation(id, { explanation: explanation.trim() });
      toast.success('Explanation submitted for review');
      setExplanation('');
      await fetchJob();
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to submit explanation'));
    } finally {
      setSubmittingExplanation(false);
    }
  };

  const handleReviewSettlement = async () => {
    if (!id) return;

    try {
      setSubmittingReview(true);
      await reviewJobSettlement(id, {
        decision: reviewDecision,
        reviewNotes: reviewNotes.trim() || null,
      });
      toast.success('Settlement decision saved');
      await fetchJob();
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to save settlement review'));
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
              <Badge variant={accountType.variant}>{accountType.label}</Badge>
              <Badge variant={getStatusVariant(job.status)}>
                {job.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
              <Badge variant={workforce.badgeVariant}>{workforce.label}</Badge>
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {job.facility.name} - {job.account.name}
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
          {!isFieldWorker && ['scheduled', 'in_progress'].includes(job.status) && (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/jobs/${id}/edit`)}>
              <Edit2 className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          )}
          {job.initialClean.canCompleteOnThisJob && !isFieldWorker && (
            <Button variant="secondary" size="sm" onClick={handleCompleteInitialClean}>
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Mark Initial Clean Complete
            </Button>
          )}
          {!isFieldWorker && ['scheduled', 'in_progress'].includes(job.status) && (
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
            className="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
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
              {showCommercialLinks && (
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
              )}
              {showCommercialLinks && (
                <div>
                  <span className="text-surface-500 dark:text-surface-400">Proposal</span>
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    {job.proposal ? (
                      <button
                        onClick={() => navigate(`/proposals/${job.proposal!.id}`)}
                        className="text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {job.proposal.proposalNumber}
                      </button>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
              )}
              {showCommercialLinks && (
                <div>
                  <span className="text-surface-500 dark:text-surface-400">Legacy Quotation</span>
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
              )}
              {isFieldWorker && (
                <div>
                  <span className="text-surface-500 dark:text-surface-400">
                    Service Location
                  </span>
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    {job.facility.name}
                  </p>
                </div>
              )}
              <div>
                <span className="text-surface-500 dark:text-surface-400">
                  {isSubcontractor ? 'Direct Employee Contact' : 'Internal Employee'}
                </span>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {job.assignedToUser?.fullName || '-'}
                </p>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">
                  {isSubcontractor ? 'Assigned Team' : 'Subcontractor Team'}
                </span>
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
            {isFieldWorker && (
              <div className="mt-4 grid gap-4 rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm dark:border-surface-700 dark:bg-surface-800/40 lg:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-surface-900 dark:text-surface-100">
                      Service Location
                    </p>
                    <p className="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-200">
                      {serviceAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                      Account
                    </p>
                    <p className="mt-1 text-surface-900 dark:text-surface-100">{job.account.name}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-surface-900 dark:text-surface-100">
                      Contact Person
                    </p>
                    <p className="mt-1 text-surface-900 dark:text-surface-100">
                      {primaryContact?.name || 'No contact assigned'}
                    </p>
                    {primaryContact?.title && (
                      <p className="text-surface-500 dark:text-surface-400">{primaryContact.title}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                      Phone
                    </p>
                    <p className="text-surface-900 dark:text-surface-100">
                      {contactPhone ? (
                        <a href={`tel:${contactPhone}`} className="text-primary-600 hover:underline dark:text-primary-400">
                          {contactPhone}
                        </a>
                      ) : (
                        '-'
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                      Email
                    </p>
                    <p className="text-surface-900 dark:text-surface-100">
                      {primaryContact?.email ?? job.account.billingEmail ?? '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    Access Instructions
                  </p>
                  <p className="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-200">
                    {job.facility.accessInstructions || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    Parking
                  </p>
                  <p className="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-200">
                    {job.facility.parkingInfo || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    Special Requirements
                  </p>
                  <p className="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-200">
                    {job.facility.specialRequirements || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    Site Notes
                  </p>
                  <p className="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-200">
                    {job.facility.notes || '-'}
                  </p>
                </div>
              </div>
            )}
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
            {job.initialClean.included && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm ${
                  job.initialClean.completed
                    ? 'border-success-200 bg-success-50 text-success-800 dark:border-success-800 dark:bg-success-900/20 dark:text-success-300'
                    : job.initialClean.canCompleteOnThisJob
                      ? 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'border-surface-200 bg-surface-50 text-surface-700 dark:border-surface-700 dark:bg-surface-800/50 dark:text-surface-300'
                }`}
              >
                <strong>Initial Clean:</strong>{' '}
                {job.initialClean.completed
                  ? `Completed${job.initialClean.completedAt ? ` on ${new Date(job.initialClean.completedAt).toLocaleDateString('en-US')}` : ''}`
                  : job.initialClean.canCompleteOnThisJob
                    ? 'This is the first eligible job for initial clean completion.'
                    : 'Tracked on the first eligible scheduled service job for this contract.'}
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
              {!isFieldWorker && (
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
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-100 dark:hover:bg-surface-800/50"
                  >
                    <button
                      aria-label={`${task.status === 'completed' ? 'Mark task pending' : 'Mark task done'}: ${task.taskName}`}
                      onClick={() => handleToggleTask(task)}
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
                    {!isFieldWorker && (
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
              {!isFieldWorker && (
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
                  className="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
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
        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-100">
              Settlement
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getSettlementVariant(settlement?.status)}>
                  {formatSettlementLabel(settlement?.status)}
                </Badge>
                <Badge variant={settlement?.invoiceEligible ? 'success' : 'default'}>
                  {settlement?.invoiceEligible ? 'Invoice Eligible' : 'Invoice Blocked'}
                </Badge>
                <Badge variant={settlement?.payrollEligible ? 'success' : 'default'}>
                  {settlement?.payrollEligible ? 'Payroll Eligible' : 'Payroll Blocked'}
                </Badge>
              </div>

              {settlement?.issueSummary && (
                <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-warning-900 dark:border-warning-800/60 dark:bg-warning-900/20 dark:text-warning-100">
                  <p className="font-medium">Issue</p>
                  <p className="mt-1">{settlement.issueSummary}</p>
                  {settlement.issueCode && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-warning-700 dark:text-warning-300">
                      {settlement.issueCode.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    Worker Reminder
                  </p>
                  <p className="mt-1 text-surface-900 dark:text-surface-100">
                    {formatDateTime(settlement?.lastWorkerReminderAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    Manager Reminder
                  </p>
                  <p className="mt-1 text-surface-900 dark:text-surface-100">
                    {formatDateTime(settlement?.lastManagerReminderAt)}
                  </p>
                </div>
              </div>

              {settlement?.workerExplanation && (
                <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50">
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    Worker Explanation
                  </p>
                  <p className="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-300">
                    {settlement.workerExplanation}
                  </p>
                  <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                    Submitted {formatDateTime(settlement.workerRespondedAt)}
                  </p>
                </div>
              )}

              {settlement?.reviewNotes && (
                <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50">
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    Review Notes
                  </p>
                  <p className="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-300">
                    {settlement.reviewNotes}
                  </p>
                  <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                    {settlement.reviewedByUser?.fullName || 'Manager'} on {formatDateTime(settlement.reviewedAt)}
                  </p>
                </div>
              )}

              {canSubmitSettlementExplanation && (
                <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    Provide Explanation
                  </p>
                  <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                    Explain the missed logout, incomplete closeout, or any other issue that blocked settlement.
                  </p>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Describe what happened and why the job was not closed properly."
                    className="mt-3 w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                    rows={4}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSubmitSettlementExplanation}
                      isLoading={submittingExplanation}
                    >
                      Submit Explanation
                    </Button>
                  </div>
                </div>
              )}

              {canReviewSettlement && settlement?.requiresManagerReview && (
                <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    Manager Review
                  </p>
                  <div className="mt-3">
                    <Select
                      label="Decision"
                      value={reviewDecision}
                      onChange={(value) =>
                        setReviewDecision(value as Exclude<JobSettlementStatus, 'ready' | 'needs_review'>)
                      }
                      options={[
                        { value: 'approved_both', label: 'Approve for invoice and payroll' },
                        { value: 'approved_invoice_only', label: 'Approve invoice only' },
                        { value: 'approved_payroll_only', label: 'Approve payroll only' },
                        { value: 'excluded', label: 'Exclude from settlement' },
                      ]}
                    />
                  </div>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Review notes"
                    className="mt-3 w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                    rows={4}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleReviewSettlement}
                      isLoading={submittingReview}
                    >
                      Save Review
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

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
