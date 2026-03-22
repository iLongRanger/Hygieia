import React from 'react';
import { Users, Calendar, Clock, BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { formatShortDate } from './account-constants';
import type { Contract } from '../../types/contract';
import type { Job } from '../../types/job';

interface AccountServiceOverviewProps {
  activeContract: Contract | null;
  recentJobs: Job[];
  onNavigate: (path: string) => void;
}

function formatServiceFrequency(freq: string | null | undefined): string {
  if (!freq) return 'N/A';
  const map: Record<string, string> = {
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
  return map[freq] || freq;
}

export function AccountServiceOverview({
  activeContract,
  recentJobs,
  onNavigate: _onNavigate,
}: AccountServiceOverviewProps) {
  const assignedTeamName = activeContract?.assignedTeam?.name || 'Unassigned';

  const lastCompletedJob = recentJobs
    .filter((job) => job.status === 'completed')
    .sort(
      (a, b) =>
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    )[0];
  const lastServiceDate = lastCompletedJob
    ? formatShortDate(lastCompletedJob.scheduledDate)
    : 'No services yet';

  const upcomingJobsCount = recentJobs.filter(
    (job) => job.status === 'scheduled' || job.status === 'in_progress'
  ).length;

  const serviceFrequency = formatServiceFrequency(
    activeContract?.serviceFrequency
  );

  return (
    <Card
      noPadding
      className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-5"
    >
      <h3 className="text-lg font-semibold text-white">Service Overview</h3>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Assigned Team */}
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
          <div>
            <p className="text-xs uppercase tracking-wide text-surface-500">
              Assigned Team
            </p>
            <p className="text-white font-medium">{assignedTeamName}</p>
          </div>
        </div>

        {/* Last Service */}
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
          <div>
            <p className="text-xs uppercase tracking-wide text-surface-500">
              Last Service
            </p>
            <p className="text-white font-medium">{lastServiceDate}</p>
          </div>
        </div>

        {/* Upcoming Jobs */}
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
          <div>
            <p className="text-xs uppercase tracking-wide text-surface-500">
              Upcoming Jobs
            </p>
            <p className="text-white font-medium">{upcomingJobsCount}</p>
          </div>
        </div>

        {/* Service Frequency */}
        <div className="flex items-start gap-2">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
          <div>
            <p className="text-xs uppercase tracking-wide text-surface-500">
              Service Frequency
            </p>
            <p className="text-white font-medium">{serviceFrequency}</p>
          </div>
        </div>
      </div>

      {/* Quality Metrics Placeholder */}
      <div className="mt-4 rounded-md border border-surface-200 dark:border-surface-700 p-3">
        <p className="text-sm italic text-surface-500">
          Quality metrics coming soon
        </p>
      </div>
    </Card>
  );
}
