import { User as UserIcon, Users, Wrench } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import type { Account } from '../../types/crm';
import type { Contract } from '../../types/contract';
import type { Job } from '../../types/job';
import type { User } from '../../types/user';
const ACCOUNT_MANAGER_ROLE_KEYS = new Set(['owner', 'admin', 'manager']);

interface AccountAssignmentProps {
  account: Account;
  activeContract: Contract | null;
  recentJobs: Job[];
  users: User[];
  canEditAccountAssignment: boolean;
  saving: boolean;
  accountManagerId: string;
  onAccountManagerChange: (value: string) => void;
  onSave: () => void;
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

function getNextUpcomingJob(jobs: Job[]): Job | null {
  const now = Date.now();
  return (
    [...jobs]
      .filter(
        (job) =>
          (job.status === 'scheduled' || job.status === 'in_progress') &&
          new Date(job.scheduledDate).getTime() >= now
      )
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0] ?? null
  );
}

function canBeAccountManager(user: User): boolean {
  const primaryRoleKey = typeof user.role === 'string' ? user.role : user.roles[0]?.role.key;
  if (primaryRoleKey && ACCOUNT_MANAGER_ROLE_KEYS.has(primaryRoleKey)) {
    return true;
  }
  return user.roles.some(({ role }) => ACCOUNT_MANAGER_ROLE_KEYS.has(role.key));
}

export function AccountAssignment({
  account,
  activeContract,
  recentJobs,
  users,
  canEditAccountAssignment,
  saving,
  accountManagerId,
  onAccountManagerChange,
  onSave,
}: AccountAssignmentProps) {
  const accountManager = account.accountManager;
  const nextJob = getNextUpcomingJob(recentJobs);

  const teamName = activeContract?.assignedTeam?.name ?? nextJob?.assignedTeam?.name ?? null;
  const teamSource = !activeContract?.assignedTeam?.name && nextJob?.assignedTeam?.name
    ? 'via upcoming job'
    : null;

  const leadName =
    activeContract?.assignedToUser?.fullName ?? nextJob?.assignedToUser?.fullName ?? null;
  const leadSource =
    !activeContract?.assignedToUser?.fullName && nextJob?.assignedToUser?.fullName
      ? 'via upcoming job'
      : null;
  const accountManagerUsers = users.filter(canBeAccountManager);
  const accountManagerOptions = [
    { value: '', label: 'Unassigned' },
    ...accountManagerUsers.map((user) => ({ value: user.id, label: user.fullName })),
  ];

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-surface-900 dark:text-white">Assignment</h3>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            Set account ownership. Team and service lead assignment are managed per service location or contract.
          </p>
        </div>
        {canEditAccountAssignment ? (
          <Button size="sm" onClick={onSave} isLoading={saving}>
            Save
          </Button>
        ) : null}
      </div>

      <div className="space-y-4">
        {canEditAccountAssignment ? (
          <Select
            label="Account Manager"
            options={accountManagerOptions}
            value={accountManagerId}
            onChange={onAccountManagerChange}
          />
        ) : (
          <Row
            icon={<UserIcon className="h-4 w-4" />}
            label="Account Manager"
            value={accountManager?.fullName ?? 'Unassigned'}
            detail={accountManager?.email}
            initials={accountManager?.fullName ? getInitials(accountManager.fullName) : null}
            detailHref={accountManager?.email ? `mailto:${accountManager.email}` : undefined}
          />
        )}

        <Row
          icon={<Users className="h-4 w-4" />}
          label="Assigned Team"
          value={teamName ?? 'Managed per service location'}
          detail={teamSource || (teamName ? 'from active contract or upcoming job' : undefined)}
        />
        <Row
          icon={<Wrench className="h-4 w-4" />}
          label="Service Lead"
          value={leadName ?? 'Managed per service location'}
          detail={leadSource || (leadName ? 'from active contract or upcoming job' : undefined)}
        />
      </div>
    </Card>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  detailHref?: string;
  initials?: string | null;
}

function Row({ icon, label, value, detail, detailHref, initials }: RowProps) {
  return (
    <div className="flex items-start gap-3">
      {initials ? (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {initials}
        </span>
      ) : (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-surface-500">{label}</div>
        <div className="truncate text-sm font-medium text-surface-900 dark:text-white">{value}</div>
        {detail ? (
          detailHref ? (
            <a
              href={detailHref}
              className="block truncate text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {detail}
            </a>
          ) : (
            <div className="truncate text-xs text-surface-500 dark:text-surface-400">{detail}</div>
          )
        ) : null}
      </div>
    </div>
  );
}
