import { Building2, MapPin } from 'lucide-react';

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

  const hasDetails =
    facility.accessInstructions ||
    facility.parkingInfo ||
    facility.specialRequirements ||
    facility.notes;

  const statusLabel = facility.archivedAt ? 'Archived' : facility.status;

  return (
    <div className="space-y-6">
      {/* Facility Info Card */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10">
              <Building2 className="h-6 w-6 text-emerald" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Building Type</div>
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
              <div className="text-sm text-gray-400">Address</div>
              <div className="whitespace-pre-line font-medium text-white">
                {formatAddress(facility.address)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-navy-dark/30 p-4">
          <div className="text-sm text-gray-400">Total Sq Ft</div>
          <div className="font-medium text-white">
            {totalSquareFeet > 0 ? totalSquareFeet.toLocaleString() : '-'}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-navy-dark/30 p-4">
          <div className="text-sm text-gray-400">Active Areas</div>
          <div className="font-medium text-white">{activeAreasCount}</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-navy-dark/30 p-4">
          <div className="text-sm text-gray-400">Total Tasks</div>
          <div className="font-medium text-white">{activeTasksCount}</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-navy-dark/30 p-4">
          <div className="text-sm text-gray-400">Status</div>
          <div className="mt-1">
            <Badge variant={getStatusBadgeVariant(facility)}>
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Details Section */}
      {hasDetails && (
        <Card>
          <div className="space-y-4">
            {facility.accessInstructions && (
              <div>
                <div className="text-sm text-gray-400">
                  Access Instructions
                </div>
                <div className="text-sm text-white">
                  {facility.accessInstructions}
                </div>
              </div>
            )}

            {facility.parkingInfo && (
              <div className="border-t border-white/10 pt-4">
                <div className="text-sm text-gray-400">Parking Info</div>
                <div className="text-sm text-white">
                  {facility.parkingInfo}
                </div>
              </div>
            )}

            {facility.specialRequirements && (
              <div className="border-t border-white/10 pt-4">
                <div className="text-sm text-gray-400">
                  Special Requirements
                </div>
                <div className="text-sm text-white">
                  {facility.specialRequirements}
                </div>
              </div>
            )}

            {facility.notes && (
              <div className="border-t border-white/10 pt-4">
                <div className="text-sm text-gray-400">Notes</div>
                <div className="text-sm text-white">{facility.notes}</div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
