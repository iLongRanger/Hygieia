import React from 'react';
import type { Account } from '../../types/crm';
import type { Contract } from '../../types/contract';
import type { Contact } from '../../types/contact';
import type { Job } from '../../types/job';
import { formatCurrency, formatShortDate, getTypeVariant } from './account-constants';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import {
  ArrowLeft,
  Edit2,
  Archive,
  RotateCcw,
  DollarSign,
  Building,
  Calendar,
  Activity,
  ExternalLink,
} from 'lucide-react';

interface AccountHeroProps {
  account: Account;
  activeContract: Contract | null;
  proposalTotal: number;
  contractTotal: number;
  contacts: Contact[];
  recentJobs: Job[];
  canAdminAccounts: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onNavigate: (path: string) => void;
}

function getNextService(recentJobs: Job[]): string {
  const now = new Date();
  const upcoming = recentJobs
    .filter(
      (job) =>
        (job.status === 'scheduled' || job.status === 'in_progress') &&
        new Date(job.scheduledDate) >= now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  return upcoming.length > 0 ? formatShortDate(upcoming[0].scheduledDate) : 'None scheduled';
}

function getAccountHealth(
  activeContract: Contract | null,
  contractTotal: number
): { label: string; variant: 'success' | 'warning' | 'info' | 'default' } {
  if (!activeContract && contractTotal === 0) {
    return { label: 'New', variant: 'info' };
  }
  if (activeContract) {
    if (activeContract.endDate) {
      const daysUntilEnd =
        (new Date(activeContract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilEnd <= 30) {
        return { label: 'At Risk', variant: 'warning' };
      }
    }
    return { label: 'Active', variant: 'success' };
  }
  return { label: 'Inactive', variant: 'default' };
}

export function AccountHero({
  account,
  activeContract,
  proposalTotal,
  contractTotal,
  contacts,
  recentJobs,
  canAdminAccounts,
  onEdit,
  onArchive,
  onRestore,
  onNavigate,
}: AccountHeroProps) {
  const isArchived = !!account.archivedAt;
  const nextService = getNextService(recentJobs);
  const health = getAccountHealth(activeContract, contractTotal);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('/accounts')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-white">{account.name}</h1>
              <Badge variant={getTypeVariant(account.type)} size="sm">
                {account.type}
              </Badge>
            </div>
            {account.industry && (
              <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{account.industry}</p>
            )}
          </div>
        </div>

        {canAdminAccounts && (
          <div className="flex items-center gap-2">
            {!isArchived && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            )}
            {isArchived ? (
              <Button variant="ghost" size="sm" onClick={onRestore}>
                <RotateCcw className="h-4 w-4" />
                Restore
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onArchive}>
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Active Contract Banner */}
      {activeContract ? (
        <Card
          className="!border-emerald-500/20 !bg-emerald-500/5"
          noPadding
        >
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-emerald-400">
                Active Contract &middot; {activeContract.contractNumber}
              </p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(activeContract.monthlyValue)}
                <span className="text-sm font-normal text-surface-500 dark:text-surface-400">/mo</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-surface-500 dark:text-surface-400">
              {activeContract.assignedTeam && (
                <div>
                  <span className="text-surface-500">Team</span>{' '}
                  <span className="text-white">{activeContract.assignedTeam.name}</span>
                </div>
              )}
              {activeContract.endDate && (
                <div>
                  <span className="text-surface-500">Ends</span>{' '}
                  <span className="text-white">{formatShortDate(activeContract.endDate)}</span>
                </div>
              )}
              <button
                onClick={() => onNavigate(`/contracts/${activeContract.id}`)}
                className="inline-flex items-center gap-1 text-emerald-400 transition-colors hover:text-emerald-300"
              >
                View Contract
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="!border-surface-200 dark:!border-surface-700 !bg-surface-100 dark:!bg-surface-800/30" noPadding>
          <div className="p-5">
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">No active contract</p>
            <p className="mt-0.5 text-xs text-surface-500">
              Create a proposal or contract to get started.
            </p>
          </div>
        </Card>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Monthly Value */}
        <Card className="!rounded-lg !border-surface-200 dark:!border-surface-700 !bg-surface-100 dark:!bg-surface-800/30" noPadding>
          <div className="p-4">
            <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium">Monthly Value</span>
            </div>
            <p className="mt-2 text-lg font-semibold text-white">
              {activeContract ? formatCurrency(activeContract.monthlyValue) : '$0.00'}
            </p>
          </div>
        </Card>

        {/* Facilities */}
        <Card
          className="!rounded-lg !border-surface-200 dark:!border-surface-700 !bg-surface-100 dark:!bg-surface-800/30 cursor-pointer"
          noPadding
          hover
          onClick={() => onNavigate(`/accounts/${account.id}/facilities`)}
        >
          <div className="p-4">
            <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
              <Building className="h-4 w-4 text-gold-400" />
              <span className="text-xs font-medium">Facilities</span>
            </div>
            <p className="mt-2 text-lg font-semibold text-white">
              {account._count.facilities}
            </p>
          </div>
        </Card>

        {/* Next Service */}
        <Card className="!rounded-lg !border-surface-200 dark:!border-surface-700 !bg-surface-100 dark:!bg-surface-800/30" noPadding>
          <div className="p-4">
            <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium">Next Service</span>
            </div>
            <p className="mt-2 text-lg font-semibold text-white">{nextService}</p>
          </div>
        </Card>

        {/* Account Health */}
        <Card className="!rounded-lg !border-surface-200 dark:!border-surface-700 !bg-surface-100 dark:!bg-surface-800/30" noPadding>
          <div className="p-4">
            <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium">Account Health</span>
            </div>
            <div className="mt-2">
              <Badge variant={health.variant} size="sm">
                {health.label}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
