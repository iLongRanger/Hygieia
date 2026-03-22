import { Building, MapPin, Plus } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Facility } from '../../types/facility';

interface AccountFacilitiesProps {
  facilities: Facility[];
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

export function AccountFacilities({
  facilities,
  canWriteFacilities,
  onAddFacility,
  onNavigate,
}: AccountFacilitiesProps) {
  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Facilities</h3>
        {canWriteFacilities && (
          <Button variant="ghost" size="sm" onClick={onAddFacility}>
            <Plus className="h-4 w-4" />
            Add Facility
          </Button>
        )}
      </div>

      {facilities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Building className="mb-2 h-8 w-8 text-surface-500" />
          <p className="text-sm text-surface-500 dark:text-surface-400">No facilities yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {facilities.map((facility) => {
            const address = formatAddress(facility.address);
            return (
              <div
                key={facility.id}
                className="cursor-pointer rounded-lg bg-surface-100 dark:bg-surface-800/10 p-3 transition-colors hover:bg-surface-100 dark:bg-surface-800/20"
                onClick={() => onNavigate(`/facilities/${facility.id}`)}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-white">
                    {facility.name}
                  </span>
                  <Badge variant={statusVariant(facility.status)} size="sm">
                    {facility.status}
                  </Badge>
                </div>

                {address && (
                  <div className="mb-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-surface-500" />
                    <span className="truncate text-sm text-surface-500 dark:text-surface-400">
                      {address}
                    </span>
                  </div>
                )}

                {facility.buildingType && (
                  <Badge variant="info" size="sm">
                    {facility.buildingType}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
