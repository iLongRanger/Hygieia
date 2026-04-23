import { CalendarClock, History } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatShortDate } from './account-constants';
import type { Job } from '../../types/job';
import type { Contract } from '../../types/contract';
import type { Appointment } from '../../types/crm';

interface AccountServiceTabProps {
  accountType: string;
  activeContract: Contract | null;
  appointments: Appointment[];
  recentJobs: Job[];
  onNavigate: (path: string) => void;
}

type TimelineItem =
  | { kind: 'job'; job: Job; date: Date }
  | { kind: 'appointment'; appointment: Appointment; date: Date };

function itemDate(item: TimelineItem): Date {
  return item.date;
}

function getTimelineEntries(input: { jobs: Job[]; appointments: Appointment[]; past: boolean }): TimelineItem[] {
  const now = Date.now();
  const items: TimelineItem[] = [];

  for (const job of input.jobs) {
    const date = new Date(job.scheduledDate);
    const isPast = job.status === 'completed' || job.status === 'canceled' || date.getTime() < now - 1000;
    const isUpcoming = (job.status === 'scheduled' || job.status === 'in_progress') && date.getTime() >= now - 1000;
    if (input.past ? isPast : isUpcoming) {
      items.push({ kind: 'job', job, date });
    }
  }

  for (const appointment of input.appointments) {
    const date = new Date(appointment.scheduledStart);
    const isCompleted = appointment.status === 'completed' || appointment.status === 'rescheduled';
    const isCanceled = appointment.status === 'canceled';
    const isUpcoming = !isCompleted && !isCanceled;
    if (input.past ? (isCompleted || isCanceled) : isUpcoming) {
      items.push({ kind: 'appointment', appointment, date });
    }
  }

  items.sort((a, b) => {
    return input.past
      ? itemDate(b).getTime() - itemDate(a).getTime()
      : itemDate(a).getTime() - itemDate(b).getTime();
  });
  return items;
}

function groupUpcoming(items: TimelineItem[]): { label: string; items: TimelineItem[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const endOfTomorrow = startOfToday + 2 * oneDay;
  const endOfWeek = startOfToday + 7 * oneDay;

  const buckets: Record<string, TimelineItem[]> = { Today: [], Tomorrow: [], 'This week': [], Later: [] };
  for (const item of items) {
    const t = itemDate(item).getTime();
    if (t < startOfToday + oneDay) buckets.Today.push(item);
    else if (t < endOfTomorrow) buckets.Tomorrow.push(item);
    else if (t < endOfWeek) buckets['This week'].push(item);
    else buckets.Later.push(item);
  }
  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

function formatClock(value: string | null | undefined): string | null {
  if (!value) return null;
  const [h = '', m = '0'] = value.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const period = hours >= 12 ? 'PM' : 'AM';
  const normalized = hours % 12 || 12;
  return `${normalized}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatTimeWindow(item: TimelineItem): string | null {
  if (item.kind === 'job') {
    const start = formatClock(item.job.scheduledStartTime);
    const end = formatClock(item.job.scheduledEndTime);
    if (start && end) return `${start} – ${end}`;
    return start || null;
  }
  const start = item.appointment.scheduledStart
    ? new Date(item.appointment.scheduledStart).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
  const end = item.appointment.scheduledEnd
    ? new Date(item.appointment.scheduledEnd).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
  if (start && end) return `${start} – ${end}`;
  return start || null;
}

function typeBadge(item: TimelineItem): { label: string; variant: 'info' | 'warning' | 'default' } {
  if (item.kind === 'job') return { label: 'Job', variant: 'info' };
  if (item.appointment.type === 'walk_through') return { label: 'Walkthrough', variant: 'warning' };
  if (item.appointment.type === 'inspection') return { label: 'Inspection', variant: 'warning' };
  return { label: 'Visit', variant: 'default' };
}

function statusBadge(item: TimelineItem) {
  if (item.kind === 'job') {
    const status = item.job.status;
    const variant =
      status === 'completed'
        ? 'success'
        : status === 'canceled'
          ? 'error'
          : status === 'in_progress'
            ? 'warning'
            : 'info';
    return { label: status.replace(/_/g, ' '), variant } as const;
  }
  const status = item.appointment.status;
  const variant =
    status === 'completed'
      ? 'success'
      : status === 'canceled'
        ? 'error'
        : status === 'rescheduled'
          ? 'warning'
          : 'info';
  return { label: status.replace(/_/g, ' '), variant } as const;
}

function assigneeLabel(item: TimelineItem): string {
  if (item.kind === 'job') {
    return (
      item.job.assignedToUser?.fullName || item.job.assignedTeam?.name || 'Unassigned'
    );
  }
  return (
    item.appointment.assignedToUser?.fullName ||
    item.appointment.assignedTeam?.name ||
    'Unassigned'
  );
}

function locationLabel(item: TimelineItem): string {
  if (item.kind === 'job') {
    return item.job.facility?.name || '—';
  }
  return item.appointment.facility?.name || '—';
}

const residentialServiceTypeLabels: Record<string, string> = {
  recurring_standard: 'Recurring Standard',
  one_time_standard: 'One-Time Standard',
  deep_clean: 'Deep Clean',
  move_in_out: 'Move-In / Move-Out',
  turnover: 'Turnover',
  post_construction: 'Post-Construction',
};

const residentialFrequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  every_4_weeks: 'Every 4 Weeks',
  one_time: 'One-Time',
};

const commercialFrequencyLabels: Record<string, string> = {
  '1x_week': '1x / Week',
  '2x_week': '2x / Week',
  '3x_week': '3x / Week',
  '4x_week': '4x / Week',
  '5x_week': '5x / Week',
  '7x_week': '7x / Week',
  daily: 'Daily',
  weekly: 'Weekly',
  bi_weekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  custom: 'Custom',
};

export function AccountServiceTab({
  accountType,
  activeContract,
  appointments,
  recentJobs,
  onNavigate,
}: AccountServiceTabProps) {
  const upcoming = getTimelineEntries({ jobs: recentJobs, appointments, past: false });
  const recent = getTimelineEntries({ jobs: recentJobs, appointments, past: true });
  const upcomingGrouped = groupUpcoming(upcoming);
  const recentPreview = recent.slice(0, 10);

  const isResidential = accountType === 'residential';
  const serviceShape = (() => {
    if (!activeContract) return null;
    if (isResidential) {
      return [
        {
          label: 'Service Type',
          value: activeContract.residentialServiceType
            ? residentialServiceTypeLabels[activeContract.residentialServiceType] || activeContract.residentialServiceType
            : '—',
        },
        {
          label: 'Frequency',
          value: activeContract.residentialFrequency
            ? residentialFrequencyLabels[activeContract.residentialFrequency] || activeContract.residentialFrequency
            : activeContract.serviceFrequency
              ? commercialFrequencyLabels[activeContract.serviceFrequency] || activeContract.serviceFrequency
              : '—',
        },
        {
          label: 'Monthly Value',
          value: formatCurrency(activeContract.monthlyValue),
        },
        {
          label: 'Assigned Team',
          value: activeContract.assignedTeam?.name || activeContract.assignedToUser?.fullName || 'Unassigned',
        },
      ];
    }
    return [
      {
        label: 'Frequency',
        value: activeContract.serviceFrequency
          ? commercialFrequencyLabels[activeContract.serviceFrequency] || activeContract.serviceFrequency
          : '—',
      },
      {
        label: 'Period',
        value: `${formatShortDate(activeContract.startDate)}${
          activeContract.endDate ? ` – ${formatShortDate(activeContract.endDate)}` : ''
        }`,
      },
      {
        label: 'Monthly Value',
        value: formatCurrency(activeContract.monthlyValue),
      },
      {
        label: 'Assigned Team',
        value: activeContract.assignedTeam?.name || 'Unassigned',
      },
    ];
  })();

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Upcoming work</h3>
            </div>
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
              Scheduled visits and booked appointments for this account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onNavigate('/appointments')}>
              Book appointment
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate('/jobs')}>
              View all jobs
            </Button>
          </div>
        </div>

        {serviceShape && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-100/60 p-3 dark:bg-surface-900/40 sm:grid-cols-4">
            {serviceShape.map((entry) => (
              <div key={entry.label}>
                <div className="text-xs uppercase tracking-wide text-surface-500">{entry.label}</div>
                <div className="mt-0.5 truncate text-sm font-medium text-surface-900 dark:text-white">
                  {entry.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {!activeContract && (
          <div className="rounded-xl border border-dashed border-surface-300 p-3 text-sm text-surface-500 dark:border-surface-700">
            No active contract — proposals drive future service shape.
          </div>
        )}

        {upcomingGrouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 p-8 text-center dark:border-surface-700">
            <CalendarClock className="h-8 w-8 text-surface-400" />
            <div>
              <p className="font-medium text-surface-900 dark:text-white">No upcoming work</p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Schedule a visit or book a walkthrough to populate this list.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingGrouped.map((group) => (
              <div key={group.label}>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500">
                  {group.label}
                </div>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <TimelineRow key={rowKey(item)} item={item} onNavigate={onNavigate} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-surface-500" />
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Recent work</h3>
          <span className="text-sm text-surface-500">({recent.length})</span>
        </div>
        {recentPreview.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-300 p-4 text-center text-sm text-surface-500 dark:border-surface-700">
            No completed visits yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentPreview.map((item) => (
              <TimelineRow key={rowKey(item)} item={item} onNavigate={onNavigate} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function rowKey(item: TimelineItem): string {
  return item.kind === 'job' ? `job-${item.job.id}` : `appt-${item.appointment.id}`;
}

function TimelineRow({
  item,
  onNavigate,
}: {
  item: TimelineItem;
  onNavigate: (path: string) => void;
}) {
  const type = typeBadge(item);
  const status = statusBadge(item);
  const window = formatTimeWindow(item);
  const date = formatShortDate(itemDate(item).toISOString());
  const assignee = assigneeLabel(item);
  const location = locationLabel(item);
  const href = item.kind === 'job' ? `/jobs/${item.job.id}` : `/appointments/${item.appointment.id}`;

  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate(href)}
        className="flex w-full items-center gap-3 rounded-lg border border-surface-200 p-3 text-left transition-colors hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:hover:border-surface-600 dark:hover:bg-surface-900/40"
      >
        <div className="flex flex-col items-center rounded-lg bg-surface-100 px-2 py-1 dark:bg-surface-900/60">
          <span className="text-xs text-surface-500">{date.split(',')[0]}</span>
          <span className="text-sm font-semibold text-surface-900 dark:text-white">
            {date.split(' ').slice(1, 2).join(' ') || date}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={type.variant} size="sm">
              {type.label}
            </Badge>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
            {window && <span className="text-xs text-surface-500">{window}</span>}
          </div>
          <div className="mt-1 truncate text-sm text-surface-900 dark:text-white">{location}</div>
          <div className="truncate text-xs text-surface-500">{assignee}</div>
        </div>
      </button>
    </li>
  );
}
