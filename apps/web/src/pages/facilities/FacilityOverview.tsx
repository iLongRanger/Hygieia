import { Building2, CalendarClock, MapPin } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import type { Facility } from '../../types/facility';

interface FacilityOverviewProps {
  facility: Facility;
  totalSquareFeet: number;
  activeAreasCount: number;
  activeTasksCount: number;
}

function getStatusBadgeVariant(
  facility: Facility
): 'error' | 'success' | 'warning' | 'default' {
  if (facility.archivedAt) return 'error';
  if (facility.status === 'active') return 'success';
  if (facility.status === 'pending') return 'warning';
  return 'default';
}

export function FacilityOverview({
  facility,
  totalSquareFeet,
  activeAreasCount,
  activeTasksCount,
}: FacilityOverviewProps): React.JSX.Element {
  const DEFAULT_GEOFENCE_RADIUS_METERS = 100;
  const addressRecord = (facility.address || {}) as Record<string, unknown>;
  const scheduleRecord =
    (addressRecord.serviceSchedule as Record<string, unknown> | undefined) ||
    (addressRecord.clientServiceSchedule as Record<string, unknown> | undefined) ||
    undefined;

  const formatAddress = (address: Facility['address']): string => {
    const lines = [];
    if (address.street) lines.push(address.street);
    const cityLine = [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(', ');
    if (cityLine) lines.push(cityLine);
    if (address.country) lines.push(address.country);
    return lines.length > 0 ? lines.join('\n') : 'No address';
  };

  const formatDateTime = (value: string | null): string => {
    if (!value) return 'Not available';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const latitude = toNumber(addressRecord.latitude) ?? toNumber(addressRecord.lat);
  const longitude = toNumber(addressRecord.longitude) ?? toNumber(addressRecord.lng);
  const geofenceRadiusMeters = (() => {
    const storedRadius = toNumber(addressRecord.geofenceRadiusMeters);
    if (storedRadius && storedRadius > 0) return storedRadius;
    if (latitude !== null && longitude !== null) return DEFAULT_GEOFENCE_RADIUS_METERS;
    return null;
  })();

  const frequency =
    (scheduleRecord?.frequency as string | undefined) ||
    (addressRecord.serviceFrequency as string | undefined) ||
    'Not specified';

  const scheduleDays = (
    ((scheduleRecord?.days as string[] | undefined) ||
      (addressRecord.serviceDays as string[] | undefined) ||
      []) as string[]
  )
    .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
    .join(', ');

  const allowedWindowStart =
    (scheduleRecord?.allowedWindowStart as string | undefined) ||
    (addressRecord.allowedWindowStart as string | undefined) ||
    'Not specified';
  const allowedWindowEnd =
    (scheduleRecord?.allowedWindowEnd as string | undefined) ||
    (addressRecord.allowedWindowEnd as string | undefined) ||
    'Not specified';

  const hasDetails =
    facility.accessInstructions ||
    facility.parkingInfo ||
    facility.specialRequirements ||
    facility.notes;

  const statusLabel = facility.archivedAt ? 'Archived' : facility.status;

  return (
    <div className="space-y-6">
      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4">
          <div className="text-sm text-surface-500 dark:text-surface-400">Total Sq Ft</div>
          <div className="font-medium text-white">
            {totalSquareFeet > 0 ? totalSquareFeet.toLocaleString() : '-'}
          </div>
        </div>

        <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4">
          <div className="text-sm text-surface-500 dark:text-surface-400">Active Areas</div>
          <div className="font-medium text-white">{activeAreasCount}</div>
        </div>

        <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4">
          <div className="text-sm text-surface-500 dark:text-surface-400">Total Tasks</div>
          <div className="font-medium text-white">{activeTasksCount}</div>
        </div>

        <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4">
          <div className="text-sm text-surface-500 dark:text-surface-400">Status</div>
          <div className="mt-1">
            <Badge variant={getStatusBadgeVariant(facility)}>
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Facility Info Card */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10">
              <Building2 className="h-6 w-6 text-emerald" />
            </div>
            <div>
              <div className="text-sm text-surface-500 dark:text-surface-400">Building Type</div>
              <div className="font-medium capitalize text-white">
                {facility.buildingType || 'Not specified'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
              <MapPin className="h-6 w-6 text-gold" />
            </div>
            <div>
              <div className="text-sm text-surface-500 dark:text-surface-400">Address</div>
              <div className="whitespace-pre-line font-medium text-white">
                {formatAddress(facility.address)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Account</div>
            <div className="text-sm text-white">{facility.account.name || 'Not specified'}</div>
            <div className="text-xs text-surface-500 dark:text-surface-400 capitalize">{facility.account.type || 'Not specified'}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Facility Manager</div>
            <div className="text-sm text-white">{facility.facilityManager?.fullName || 'Not assigned'}</div>
            <div className="text-xs text-surface-500 dark:text-surface-400">{facility.facilityManager?.email || 'No email'}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Created By</div>
            <div className="text-sm text-white">{facility.createdByUser?.fullName || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Created At</div>
            <div className="text-sm text-white">{formatDateTime(facility.createdAt)}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Last Updated</div>
            <div className="text-sm text-white">{formatDateTime(facility.updatedAt)}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Archived At</div>
            <div className="text-sm text-white">{formatDateTime(facility.archivedAt)}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Timezone</div>
            <div className="text-sm text-white">
              {(addressRecord.timezone as string | undefined) ||
                (addressRecord.timeZone as string | undefined) ||
                'Not specified'}
            </div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Geofence Radius</div>
            <div className="text-sm text-white">
              {geofenceRadiusMeters
                ? `${geofenceRadiusMeters.toLocaleString()} m`
                : 'Not specified'}
            </div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Facility Sq Ft Field</div>
            <div className="text-sm text-white">
              {facility.squareFeet ? Number(facility.squareFeet).toLocaleString() : 'Not specified'}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-4 w-4 text-gold" />
          <div className="text-sm font-medium text-white">Client Service Schedule</div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Frequency</div>
            <div className="text-sm text-white">{frequency}</div>
          </div>
          <div>
            <div className="text-xs text-surface-500 uppercase tracking-wide">Service Window</div>
            <div className="text-sm text-white">{allowedWindowStart} - {allowedWindowEnd}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs text-surface-500 uppercase tracking-wide">Days</div>
            <div className="text-sm text-white">{scheduleDays || 'Not specified'}</div>
          </div>
        </div>
      </Card>

      {/* Details Section */}
      {hasDetails && (
        <Card>
          <div className="space-y-4">
            {facility.accessInstructions && (
              <div>
                <div className="text-sm text-surface-500 dark:text-surface-400">
                  Access Instructions
                </div>
                <div className="text-sm text-white">
                  {facility.accessInstructions}
                </div>
              </div>
            )}

            {facility.parkingInfo && (
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                <div className="text-sm text-surface-500 dark:text-surface-400">Parking Info</div>
                <div className="text-sm text-white">
                  {facility.parkingInfo}
                </div>
              </div>
            )}

            {facility.specialRequirements && (
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                <div className="text-sm text-surface-500 dark:text-surface-400">
                  Special Requirements
                </div>
                <div className="text-sm text-white">
                  {facility.specialRequirements}
                </div>
              </div>
            )}

            {facility.notes && (
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                <div className="text-sm text-surface-500 dark:text-surface-400">Notes</div>
                <div className="text-sm text-white">{facility.notes}</div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
