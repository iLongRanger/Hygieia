import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Play,
  Square,
  Coffee,
  Filter,
  Plus,
  Check,
  X,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import {
  listTimeEntries,
  getActiveEntry,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  approveTimeEntry,
} from '../../lib/timeTracking';
import { completeJob, getJob, listJobs } from '../../lib/jobs';
import type { TimeEntry, TimeEntryStatus } from '../../types/timeTracking';
import type { Pagination } from '../../types/crm';
import type { Job } from '../../types/job';
import { useAuthStore } from '../../stores/authStore';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'edited', label: 'Edited' },
  { value: 'approved', label: 'Approved' },
];

const getStatusVariant = (status: TimeEntryStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const map: Record<TimeEntryStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    active: 'warning',
    completed: 'info',
    edited: 'default',
    approved: 'success',
    rejected: 'error',
  };
  return map[status];
};

const formatDuration = (hours: string | null) => {
  if (!hours) return '—';
  const h = parseFloat(hours);
  const wholeH = Math.floor(h);
  const mins = Math.round((h - wholeH) * 60);
  return `${wholeH}h ${mins}m`;
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString();
};

const TimeTrackingPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInJobs, setClockInJobs] = useState<Job[]>([]);
  const [loadingClockInJobs, setLoadingClockInJobs] = useState(false);
  const [selectedClockInJobId, setSelectedClockInJobId] = useState('');
  const [clockInNotes, setClockInNotes] = useState('');
  const [showClockOutCompleteModal, setShowClockOutCompleteModal] = useState(false);
  const [jobCompletionNotes, setJobCompletionNotes] = useState('');
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [clockingOut, setClockingOut] = useState(false);
  const userRole = useAuthStore((state) => state.user?.role);

  const page = Number(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listTimeEntries({
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });
      setEntries(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [page, status, dateFrom, dateTo]);

  const fetchActive = useCallback(async () => {
    try {
      const entry = await getActiveEntry();
      setActiveEntry(entry);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchActive();
  }, [fetchEntries, fetchActive]);

  const getCurrentPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const openClockInModal = async () => {
    try {
      setLoadingClockInJobs(true);
      const [scheduled, inProgress] = await Promise.all([
        listJobs({ status: 'scheduled', page: 1, limit: 100 }),
        listJobs({ status: 'in_progress', page: 1, limit: 100 }),
      ]);
      const merged = [...(scheduled.data || []), ...(inProgress.data || [])];
      const deduped = Array.from(new Map(merged.map((job) => [job.id, job])).values());
      setClockInJobs(deduped);
      setSelectedClockInJobId(deduped[0]?.id || '');
      setShowClockInModal(true);
    } catch {
      toast.error('Failed to load assigned jobs for clock-in');
    } finally {
      setLoadingClockInJobs(false);
    }
  };

  const handleClockIn = async () => {
    if (!selectedClockInJobId) {
      toast.error('Select the job you are clocking in for');
      return;
    }
    const selectedJob = clockInJobs.find((job) => job.id === selectedClockInJobId);
    if (!selectedJob?.facility?.id) {
      toast.error('Selected job has no facility assigned');
      return;
    }

    try {
      setClockingIn(true);
      const position = await getCurrentPosition();
      const entry = await clockIn({
        jobId: selectedClockInJobId,
        facilityId: selectedJob.facility.id,
        notes: clockInNotes || null,
        geoLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
          source: 'browser_geolocation',
        },
      });
      setActiveEntry(entry);
      setShowClockInModal(false);
      setClockInNotes('');
      toast.success('Clocked in!');
      fetchEntries();
    } catch (err: any) {
      const details = err?.response?.data?.error?.details;
      const canManagerOverride = ['owner', 'admin', 'manager'].includes(userRole || '');
      if (details?.code === 'OUTSIDE_SERVICE_WINDOW' && canManagerOverride) {
        const confirmed = confirm(
          `Outside allowed service window (${details.allowedWindowStart}-${details.allowedWindowEnd}, ` +
          `${details.timezone}). Apply manager override?`
        );
        if (confirmed) {
          const position = await getCurrentPosition();
          const entry = await clockIn({
            jobId: selectedClockInJobId,
            facilityId: selectedJob.facility.id,
            notes: clockInNotes || null,
            geoLocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              capturedAt: new Date().toISOString(),
              source: 'browser_geolocation',
            },
            managerOverride: true,
            overrideReason: 'Manager override from Time Tracking',
          });
          setActiveEntry(entry);
          setShowClockInModal(false);
          setClockInNotes('');
          toast.success('Clocked in with manager override');
          fetchEntries();
          return;
        }
      }
      const message = err instanceof Error ? err.message : 'Failed to clock in';
      toast.error(
        details?.code === 'OUTSIDE_SERVICE_WINDOW'
          ? 'Outside allowed service window'
          : details?.code === 'OUTSIDE_FACILITY_GEOFENCE'
            ? 'You are too far from the facility to clock in'
            : details?.code === 'CLOCK_IN_LOCATION_REQUIRED'
              ? 'Location access is required to clock in'
          : message
      );
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (activeEntry?.job?.id) {
      try {
        const job = await getJob(activeEntry.job.id);
        if (job.status === 'in_progress') {
          setShowClockOutCompleteModal(true);
          return;
        }
      } catch {
        // fallback to clock out even if job lookup fails
      }
    }
    try {
      setClockingOut(true);
      await clockOut();
      setActiveEntry(null);
      toast.success('Clocked out!');
      fetchEntries();
    } catch {
      toast.error('Failed to clock out');
    } finally {
      setClockingOut(false);
    }
  };

  const handleCompleteAndClockOut = async () => {
    if (!activeEntry?.job?.id) return;

    try {
      setClockingOut(true);
      await completeJob(activeEntry.job.id, {
        completionNotes: jobCompletionNotes || null,
      });
      await clockOut(clockOutNotes || undefined);
      setActiveEntry(null);
      setShowClockOutCompleteModal(false);
      setJobCompletionNotes('');
      setClockOutNotes('');
      toast.success('Job completed and clocked out');
      fetchEntries();
    } catch {
      toast.error('Failed to complete job and clock out');
    } finally {
      setClockingOut(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      const entry = await startBreak();
      setActiveEntry(entry);
      toast.success('Break started');
    } catch {
      toast.error('Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      const entry = await endBreak();
      setActiveEntry(entry);
      toast.success('Break ended');
    } catch {
      toast.error('Failed to end break');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveTimeEntry(id);
      toast.success('Entry approved');
      fetchEntries();
    } catch {
      toast.error('Failed to approve entry');
    }
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const isOnBreak = !!(activeEntry?.geoLocation && (activeEntry.geoLocation as Record<string, unknown>).breakStartedAt);

  const columns = [
    {
      header: 'Employee',
      cell: (row: TimeEntry) => (
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
          {row.user.fullName}
        </span>
      ),
    },
    {
      header: 'Date',
      cell: (row: TimeEntry) => (
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {formatDate(row.clockIn)}
        </span>
      ),
    },
    {
      header: 'Clock In',
      cell: (row: TimeEntry) => (
        <span className="text-sm font-mono text-surface-600 dark:text-surface-400">
          {formatTime(row.clockIn)}
        </span>
      ),
    },
    {
      header: 'Clock Out',
      cell: (row: TimeEntry) => (
        <span className="text-sm font-mono text-surface-600 dark:text-surface-400">
          {row.clockOut ? formatTime(row.clockOut) : '—'}
        </span>
      ),
    },
    {
      header: 'Hours',
      cell: (row: TimeEntry) => (
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
          {formatDuration(row.totalHours)}
        </span>
      ),
    },
    {
      header: 'Location',
      cell: (row: TimeEntry) => (
        <span className="text-sm text-surface-500">
          {row.facility?.name || row.job?.jobNumber || '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: TimeEntry) => (
        <Badge variant={getStatusVariant(row.status)} size="sm">
          {row.status}
        </Badge>
      ),
    },
    {
      header: '',
      cell: (row: TimeEntry) =>
        (row.status === 'completed' || row.status === 'edited') ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleApprove(row.id); }}
            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Approve
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <Clock className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Time Tracking
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Clock in/out and manage time entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/timesheets')}
          >
            Timesheets
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Clock In/Out Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                {activeEntry ? 'Currently Clocked In' : 'Not Clocked In'}
              </h3>
              {activeEntry && (
                <p className="text-sm text-surface-500 mt-1">
                  Since {formatTime(activeEntry.clockIn)} &middot; {formatDate(activeEntry.clockIn)}
                  {activeEntry.facility && ` &middot; ${activeEntry.facility.name}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeEntry ? (
                <>
                  {isOnBreak ? (
                    <Button variant="secondary" size="sm" onClick={handleEndBreak}>
                      <Coffee className="mr-1.5 h-4 w-4" />
                      End Break
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={handleStartBreak}>
                      <Coffee className="mr-1.5 h-4 w-4" />
                      Break
                    </Button>
                  )}
                  <Button variant="danger" onClick={handleClockOut}>
                    <Square className="mr-1.5 h-4 w-4" />
                    Clock Out
                  </Button>
                </>
              ) : (
                <Button onClick={openClockInModal} disabled={clockingIn || loadingClockInJobs}>
                  <Play className="mr-1.5 h-4 w-4" />
                  Clock In
                </Button>
              )}
            </div>
          </div>
          {activeEntry && isOnBreak && (
            <div className="mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                On break since {formatTime((activeEntry.geoLocation as Record<string, unknown>).breakStartedAt as string)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="flex flex-wrap items-end gap-4 p-4">
            <div className="w-full sm:w-48">
              <Select
                label="Status"
                options={STATUSES}
                value={status}
                onChange={(val) => updateParam('status', val)}
              />
            </div>
            <div className="w-40">
              <Input
                label="From"
                type="date"
                value={dateFrom}
                onChange={(e) => updateParam('dateFrom', e.target.value)}
              />
            </div>
            <div className="w-40">
              <Input
                label="To"
                type="date"
                value={dateTo}
                onChange={(e) => updateParam('dateTo', e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Entries Table */}
      <Card>
        <Table
          columns={columns}
          data={entries}
          isLoading={loading}
        />
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => updateParam('page', String(pagination.page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParam('page', String(pagination.page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showClockInModal}
        onClose={() => setShowClockInModal(false)}
        title="Clock In"
      >
        <div className="space-y-4">
          <Select
            label="Job *"
            value={selectedClockInJobId}
            onChange={setSelectedClockInJobId}
            options={[
              { value: '', label: loadingClockInJobs ? 'Loading jobs...' : 'Select assigned job' },
              ...clockInJobs.map((job) => ({
                value: job.id,
                label: `${job.jobNumber} - ${job.facility.name}`,
              })),
            ]}
            disabled={loadingClockInJobs || clockingIn}
          />
          <Textarea
            label="Clock-In Notes (Optional)"
            value={clockInNotes}
            onChange={(e) => setClockInNotes(e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Location verification is required. You must be within the facility geofence to clock in.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowClockInModal(false)}
              disabled={clockingIn}
            >
              Cancel
            </Button>
            <Button onClick={handleClockIn} isLoading={clockingIn}>
              Confirm Clock In
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showClockOutCompleteModal}
        onClose={() => setShowClockOutCompleteModal(false)}
        title="Complete Job Before Clock-Out"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            This shift is linked to an in-progress job. Complete the job before clocking out.
          </p>
          <Textarea
            label="Job Completion Notes (Optional)"
            value={jobCompletionNotes}
            onChange={(e) => setJobCompletionNotes(e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <Textarea
            label="Clock-Out Notes (Optional)"
            value={clockOutNotes}
            onChange={(e) => setClockOutNotes(e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowClockOutCompleteModal(false)}
              disabled={clockingOut}
            >
              Cancel
            </Button>
            <Button onClick={handleCompleteAndClockOut} isLoading={clockingOut}>
              Complete Job + Clock Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimeTrackingPage;
