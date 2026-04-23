import type { Account } from '../../types/crm';
import type { Contract } from '../../types/contract';
import type { Job } from '../../types/job';
import { formatCurrency, formatShortDate, getTypeVariant } from './account-constants';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Edit2, Archive, RotateCcw, DollarSign, Building, Calendar, UserCircle2 } from 'lucide-react';

interface AccountHeroProps {
  account: Account;
  activeContract: Contract | null;
  contractTotal: number;
  recentJobs: Job[];
  canAdminAccounts: boolean;
  facilitiesCount: number;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onNavigate: (path: string) => void;
  onScrollToLocations: () => void;
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

function getShortLocation(account: Account): string | null {
  const address = account.serviceAddress ?? account.billingAddress;
  if (!address) return null;
  const city = address.city?.trim();
  const state = address.state?.trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || null;
}

export function AccountHero({
  account,
  activeContract,
  contractTotal,
  recentJobs,
  canAdminAccounts,
  facilitiesCount,
  onEdit,
  onArchive,
  onRestore,
  onNavigate,
  onScrollToLocations,
}: AccountHeroProps) {
  const isArchived = !!account.archivedAt;
  const nextService = getNextService(recentJobs);
  const health = getAccountHealth(activeContract, contractTotal);
  const shortLocation = getShortLocation(account);
  const accountManager = account.accountManager;

  const metaParts = [account.industry, shortLocation].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-surface-900 dark:text-white">{account.name}</h1>
            <Badge variant={getTypeVariant(account.type)} size="sm">
              {account.type}
            </Badge>
            <Badge variant={health.variant} size="sm">
              {health.label}
            </Badge>
            {isArchived ? (
              <Badge variant="default" size="sm">
                Archived
              </Badge>
            ) : null}
          </div>
          {metaParts.length > 0 && (
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{metaParts.join(' · ')}</p>
          )}
        </div>

        {canAdminAccounts && (
          <div className="flex flex-shrink-0 items-center gap-2">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          icon={<DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />}
          label="Monthly Value"
          value={activeContract ? formatCurrency(activeContract.monthlyValue) : '—'}
          subtitle={
            activeContract ? `Active · ${activeContract.contractNumber}` : 'No active contract'
          }
          onClick={activeContract ? () => onNavigate(`/contracts/${activeContract.id}`) : undefined}
        />
        <KpiTile
          icon={<Building className="h-4 w-4 text-amber-500 dark:text-amber-400" />}
          label="Service Locations"
          value={String(facilitiesCount)}
          subtitle={facilitiesCount === 0 ? 'None yet' : 'Tap to view'}
          onClick={onScrollToLocations}
        />
        <KpiTile
          icon={<Calendar className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />}
          label="Next Service"
          value={nextService}
          subtitle={nextService === 'None scheduled' ? undefined : 'Upcoming visit'}
        />
        <KpiTile
          icon={<UserCircle2 className="h-4 w-4 text-primary-500 dark:text-primary-400" />}
          label="Account Manager"
          value={accountManager?.fullName || 'Unassigned'}
          subtitle={accountManager?.email || undefined}
        />
      </div>
    </div>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  onClick?: () => void;
}

function KpiTile({ icon, label, value, subtitle, onClick }: KpiTileProps) {
  const interactive = Boolean(onClick);
  return (
    <Card
      noPadding
      hover={interactive}
      onClick={onClick}
      className={`!rounded-xl ${interactive ? 'cursor-pointer' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-2 truncate text-lg font-semibold text-surface-900 dark:text-white">{value}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>
        ) : null}
      </div>
    </Card>
  );
}
