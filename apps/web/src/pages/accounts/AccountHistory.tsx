import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import type { AccountActivity, AccountActivityEntryType } from '../../types/crm';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import type { Appointment } from '../../types/crm';

type NoteTarget = 'account' | 'appointment';

interface AccountHistoryProps {
  activities: AccountActivity[];
  activitiesLoading: boolean;
  canWriteAccounts: boolean;
  appointments: Appointment[];
  activityNote: string;
  setActivityNote: (note: string) => void;
  activityType: AccountActivityEntryType;
  setActivityType: (type: AccountActivityEntryType) => void;
  onAddActivity: () => void;
  addingActivity: boolean;
  appointmentNote: string;
  setAppointmentNote: (note: string) => void;
  selectedAppointmentId: string;
  setSelectedAppointmentId: (id: string) => void;
  onAddAppointmentNote: () => void;
  addingAppointmentNote: boolean;
}

function groupByBucket(activities: AccountActivity[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - oneDay;
  const startOfWeek = startOfToday - 6 * oneDay;

  const buckets: { key: string; label: string; items: AccountActivity[] }[] = [];
  const monthBuckets = new Map<string, AccountActivity[]>();

  const pushBucket = (key: string, label: string) => {
    if (!buckets.find((b) => b.key === key)) {
      buckets.push({ key, label, items: [] });
    }
  };

  for (const activity of activities) {
    const created = new Date(activity.createdAt).getTime();
    if (created >= startOfToday) {
      pushBucket('today', 'Today');
      buckets.find((b) => b.key === 'today')!.items.push(activity);
    } else if (created >= startOfYesterday) {
      pushBucket('yesterday', 'Yesterday');
      buckets.find((b) => b.key === 'yesterday')!.items.push(activity);
    } else if (created >= startOfWeek) {
      pushBucket('this_week', 'This week');
      buckets.find((b) => b.key === 'this_week')!.items.push(activity);
    } else {
      const date = new Date(activity.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!monthBuckets.has(key)) {
        monthBuckets.set(key, []);
        buckets.push({ key, label, items: monthBuckets.get(key)! });
      } else {
        monthBuckets.get(key)!.push(activity);
      }
    }
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAppointmentOption(appointment: Appointment): string {
  const type = appointment.type.replace(/_/g, ' ');
  const date = new Date(appointment.scheduledStart).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const location = appointment.facility?.name ? ` - ${appointment.facility.name}` : '';

  return `${type} - ${date}${location} (${appointment.status.replace(/_/g, ' ')})`;
}

export function AccountHistory({
  activities,
  activitiesLoading,
  canWriteAccounts,
  appointments,
  activityNote,
  setActivityNote,
  activityType,
  setActivityType,
  onAddActivity,
  addingActivity,
  appointmentNote,
  setAppointmentNote,
  selectedAppointmentId,
  setSelectedAppointmentId,
  onAddAppointmentNote,
  addingAppointmentNote,
}: AccountHistoryProps) {
  const [noteTarget, setNoteTarget] = useState<NoteTarget>('account');
  const grouped = useMemo(() => groupByBucket(activities), [activities]);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Record<string, boolean>>({});
  const totalEntries = activities.length;
  const latestEntry = activities[0] ?? null;
  const appointmentOptions = appointments.map((appointment) => ({
    value: appointment.id,
    label: formatAppointmentOption(appointment),
  }));
  const isAppointmentNote = noteTarget === 'appointment';
  const noteValue = isAppointmentNote ? appointmentNote : activityNote;
  const setNoteValue = isAppointmentNote ? setAppointmentNote : setActivityNote;
  const isSaving = isAppointmentNote ? addingAppointmentNote : addingActivity;
  const submitLabel = isAppointmentNote ? 'Add Appointment Note' : 'Add History Note';
  const notePlaceholder = isAppointmentNote
    ? 'Example: Walkthrough completed, client requested weekly service and asked for kitchen deep-clean add-on...'
    : 'Log customer call, request, complaint, or other account note...';
  const noteHelpText = isAppointmentNote
    ? 'This updates the selected appointment notes and records the event in account history.'
    : 'This records a general account history entry without changing an appointment.';
  const disableSubmit = isSaving || (isAppointmentNote && appointmentOptions.length === 0);
  const handleSubmit = isAppointmentNote ? onAddAppointmentNote : onAddActivity;
  const jumpToHistoryBucket = (bucketKey: string) => {
    const element = document.getElementById(`account-history-${bucketKey}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const toggleBucket = (bucketKey: string) => {
    setCollapsedBuckets((current) => ({ ...current, [bucketKey]: !current[bucketKey] }));
  };

  useEffect(() => {
    setCollapsedBuckets((current) => {
      const nextState: Record<string, boolean> = {};
      grouped.forEach((bucket, index) => {
        nextState[bucket.key] = current[bucket.key] ?? index >= 2;
      });
      return nextState;
    });
  }, [grouped]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-primary-500" />
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Account History</h3>
      </div>

      {canWriteAccounts && (
        <div className="sticky top-0 z-10 mb-4 space-y-3 rounded-xl border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900/70">
          <div>
            <p className="text-sm font-medium text-surface-900 dark:text-white">Add Note</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Choose whether this note is a general account entry or tied to a specific appointment.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Note For"
              value={noteTarget}
              onChange={(value) => setNoteTarget(value as NoteTarget)}
              options={[
                { value: 'account', label: 'Account History' },
                { value: 'appointment', label: 'Specific Appointment' },
              ]}
            />
            {isAppointmentNote ? (
              appointmentOptions.length > 0 ? (
                <Select
                  label="Appointment"
                  placeholder="Select appointment"
                  value={selectedAppointmentId}
                  onChange={setSelectedAppointmentId}
                  options={appointmentOptions}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-surface-300 p-3 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
                  No appointments found for this account yet.
                </div>
              )
            ) : (
              <Select
                label="Entry Type"
                value={activityType}
                onChange={(value) => setActivityType(value as AccountActivityEntryType)}
                options={[
                  { value: 'note', label: 'General Note' },
                  { value: 'request', label: 'Customer Request' },
                  { value: 'complaint', label: 'Customer Complaint' },
                ]}
              />
            )}
          </div>

          <Textarea
            label={isAppointmentNote ? 'Appointment Note' : 'History Note'}
            placeholder={notePlaceholder}
            value={noteValue}
            onChange={(event) => setNoteValue(event.target.value)}
            rows={4}
          />
          <p className="text-xs text-surface-500 dark:text-surface-400">{noteHelpText}</p>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmit} disabled={disableSubmit}>
              {isSaving ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </div>
      )}

      {activitiesLoading ? (
        <div className="text-sm text-surface-500 dark:text-surface-400">Loading history...</div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 p-6 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
          No account history yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px,minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">
                Navigate History
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
                <div className="rounded-lg border border-surface-200 bg-white px-3 py-2 dark:border-surface-700 dark:bg-surface-950/40">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Entries</div>
                  <div className="mt-1 text-sm font-semibold text-surface-900 dark:text-white">
                    {totalEntries}
                  </div>
                </div>
                <div className="rounded-lg border border-surface-200 bg-white px-3 py-2 dark:border-surface-700 dark:bg-surface-950/40">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Latest</div>
                  <div className="mt-1 text-sm font-semibold text-surface-900 dark:text-white">
                    {latestEntry ? formatTimestamp(latestEntry.createdAt) : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {grouped.map((bucket) => (
                  <button
                    key={bucket.key}
                    type="button"
                    onClick={() => {
                      jumpToHistoryBucket(bucket.key);
                      setCollapsedBuckets((current) => ({ ...current, [bucket.key]: false }));
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-surface-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-surface-300 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-950/40 dark:hover:border-surface-600 dark:hover:bg-surface-800"
                  >
                    <span className="font-medium text-surface-900 dark:text-white">{bucket.label}</span>
                    <span className="text-xs text-surface-500">{bucket.items.length}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            {grouped.map((bucket) => (
              <section key={bucket.key} id={`account-history-${bucket.key}`} className="scroll-mt-24">
                <button
                  type="button"
                  onClick={() => toggleBucket(bucket.key)}
                  className="mb-2 flex w-full items-center justify-between gap-3 rounded-lg border border-surface-200 px-3 py-2 text-left transition-colors hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:hover:border-surface-600 dark:hover:bg-surface-900/40"
                >
                  <div className="flex items-center gap-2">
                    {collapsedBuckets[bucket.key] ? (
                      <ChevronRight className="h-4 w-4 text-surface-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-surface-500" />
                    )}
                    <div className="text-xs font-medium uppercase tracking-wide text-surface-500">
                      {bucket.label}
                    </div>
                  </div>
                  <div className="text-xs text-surface-500">{bucket.items.length} entries</div>
                </button>
                {!collapsedBuckets[bucket.key] ? (
                  <div className="space-y-2">
                    {bucket.items.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Badge
                            variant={
                              activity.entryType === 'complaint'
                                ? 'error'
                                : activity.entryType === 'request'
                                  ? 'warning'
                                  : 'info'
                            }
                          >
                            {activity.entryType}
                          </Badge>
                          <span className="text-xs text-surface-500">
                            {formatTimestamp(activity.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-surface-700 dark:text-surface-200">
                          {activity.note}
                        </p>
                        <p className="mt-2 text-xs text-surface-500">
                          Logged by {activity.performedByUser?.fullName || 'System'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
