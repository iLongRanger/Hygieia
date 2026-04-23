import { forwardRef } from 'react';
import { Building, MapPin, Plus, ChevronRight, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatShortDate } from './account-constants';
import type { Facility } from '../../types/facility';
import type { Job } from '../../types/job';

interface AccountFacilitiesProps {
  facilities: Facility[];
  recentJobs: Job[];
  canWriteFacilities: boolean;
  onAddFacility: () => void;
  onNavigate: (path: string) => void;
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'pending':
      return 'warning' as const;
    default:
      return 'default' as const;
  }
};

const formatAddress = (address: Facility['address']) => {
  if (!address) return null;
  const parts = [address.street, address.city, address.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

function getNextJobForFacility(facilityId: string, jobs: Job[]): Job | null {
  const now = Date.now();
  return (
    [...jobs]
      .filter(
        (job) =>
          job.facility?.id === facilityId &&
          (job.status === 'scheduled' || job.status === 'in_progress') &&
          new Date(job.scheduledDate).getTime() >= now
      )
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0] ?? null
  );
}

export const AccountFacilities = forwardRef<HTMLDivElement, AccountFacilitiesProps>(
  ({ facilities, recentJobs, canWriteFacilities, onAddFacility, onNavigate }, ref) => {
    return (
      <Card ref={ref} className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Service Locations</h3>
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
              Buildings and sites this account is contracted to service.
            </p>
          </div>
          {canWriteFacilities && (
            <Button size="sm" variant="outline" onClick={onAddFacility}>
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          )}
        </div>

        {facilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 p-8 text-center dark:border-surface-700">
            <Building className="h-8 w-8 text-surface-400" />
            <div>
              <p className="font-medium text-surface-900 dark:text-white">No service locations yet</p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Add the first location to start planning walkthroughs and service.
              </p>
            </div>
            {canWriteFacilities && (
              <Button size="sm" onClick={onAddFacility}>
                <Plus className="h-4 w-4" />
                Add service location
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {facilities.map((facility) => {
              const address = formatAddress(facility.address);
              const nextJob = getNextJobForFacility(facility.id, recentJobs);
              return (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => onNavigate(`/service-locations/${facility.id}`)}
                  className="group rounded-xl border border-surface-200 p-4 text-left transition-colors hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:hover:border-surface-600 dark:hover:bg-surface-900/40"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="font-medium text-surface-900 dark:text-white">{facility.name}</span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-surface-400 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <div className="space-y-1.5">
                    {address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-400">{address}</span>
                      </div>
                    )}
                    {nextJob && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                        <span className="text-xs text-surface-600 dark:text-surface-400">
                          Next visit: {formatShortDate(nextJob.scheduledDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant={statusVariant(facility.status)} size="sm">
                      {facility.status}
                    </Badge>
                    {facility.buildingType && (
                      <Badge variant="info" size="sm">
                        {facility.buildingType}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    );
  }
);

AccountFacilities.displayName = 'AccountFacilities';
