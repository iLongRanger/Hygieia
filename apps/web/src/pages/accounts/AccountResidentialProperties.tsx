import { forwardRef, useMemo, useState } from 'react';
import { Home, Plus, ChevronRight, Bed, Bath, Layers, Ruler, DoorOpen, Car, PawPrint, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatShortDate } from './account-constants';
import type { ResidentialPropertySummary } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { Contract } from '../../types/contract';
import type { Job } from '../../types/job';
import type { ResidentialQuote } from '../../types/residential';
import { getResidentialPropertyJourneyState } from '../../lib/accountPipeline';

interface AccountResidentialPropertiesProps {
  properties: ResidentialPropertySummary[];
  facilities: Facility[];
  contracts: Contract[];
  recentJobs: Job[];
  residentialQuotes: ResidentialQuote[];
  focusedPropertyId: string | null;
  onAddProperty: () => void;
  onEditProperty: (property: ResidentialPropertySummary) => void;
  onOpenFacility: (facilityId: string) => void;
}

function homeTypeLabel(homeType: string | null | undefined): string {
  if (!homeType) return 'Home';
  return homeType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function stageVariant(stage: string): 'success' | 'warning' | 'info' | 'default' | 'error' {
  if (stage === 'Scheduled Service' || stage === 'Active Contract') return 'success';
  if (stage === 'Account Created') return 'info';
  if (stage === 'Proposal Declined') return 'error';
  return 'warning';
}

function getNextJobForFacility(facilityId: string | null | undefined, jobs: Job[]): Job | null {
  if (!facilityId) return null;
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

export const AccountResidentialProperties = forwardRef<HTMLDivElement, AccountResidentialPropertiesProps>(
  (
    {
      properties,
      facilities,
      contracts,
      recentJobs,
      residentialQuotes,
      focusedPropertyId,
      onAddProperty,
      onEditProperty,
      onOpenFacility,
    },
    ref
  ) => {
    const sortedProperties = useMemo(() => {
      return [...properties].sort((a, b) => {
        if (a.id === focusedPropertyId) return -1;
        if (b.id === focusedPropertyId) return 1;
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }, [properties, focusedPropertyId]);

    const [expandedId, setExpandedId] = useState<string | null>(() => {
      return focusedPropertyId ?? sortedProperties[0]?.id ?? null;
    });
    const linkedFacilityIds = useMemo(
      () => new Set(sortedProperties.map((property) => property.facility?.id).filter(Boolean)),
      [sortedProperties]
    );
    const unlinkedFacilities = useMemo(
      () => facilities.filter((facility) => !linkedFacilityIds.has(facility.id)),
      [facilities, linkedFacilityIds]
    );
    const serviceLocationCount = sortedProperties.length + unlinkedFacilities.length;

    return (
      <Card ref={ref} className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Service Locations</h3>
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
              Homes this residential account receives service at.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onAddProperty}>
            <Plus className="h-4 w-4" />
            Add Service Location
          </Button>
        </div>

        {serviceLocationCount === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 p-8 text-center dark:border-surface-700">
            <Home className="h-8 w-8 text-surface-400" />
            <div>
              <p className="font-medium text-surface-900 dark:text-white">No service locations yet</p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Add the first service location to start quoting and scheduling residential service.
              </p>
            </div>
            <Button size="sm" onClick={onAddProperty}>
              <Plus className="h-4 w-4" />
              Add service location
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedProperties.map((property) => {
              const journey = getResidentialPropertyJourneyState({
                property,
                residentialQuotes,
                contracts,
                recentJobs,
              });
              const facility =
                property.facility?.id
                  ? facilities.find((f) => f.id === property.facility?.id) ?? null
                  : null;
              const nextJob = getNextJobForFacility(property.facility?.id, recentJobs);
              const isExpanded = expandedId === property.id || sortedProperties.length === 1;
              const address = property.serviceAddress ?? facility?.address ?? null;
              const addressString = address
                ? [address.street, address.city, address.state, address.postalCode].filter(Boolean).join(', ')
                : null;

              return (
                <PropertyItem
                  key={property.id}
                  property={property}
                  facility={facility}
                  journeyLabel={journey.currentStage}
                  journeyVariant={stageVariant(journey.currentStage)}
                  addressString={addressString}
                  nextJob={nextJob}
                  isExpanded={isExpanded}
                  canCollapse={sortedProperties.length > 1}
                  onToggle={() =>
                    setExpandedId((current) => (current === property.id ? null : property.id))
                  }
                  onEdit={() => onEditProperty(property)}
                  onOpenFacility={() => property.facility?.id && onOpenFacility(property.facility.id)}
                />
              );
            })}
            {unlinkedFacilities.map((facility) => {
              const addressString = facility.address
                ? [facility.address.street, facility.address.city, facility.address.state, facility.address.postalCode]
                    .filter(Boolean)
                    .join(', ')
                : null;
              const nextJob = getNextJobForFacility(facility.id, recentJobs);

              return (
                <FacilityOnlyItem
                  key={facility.id}
                  facility={facility}
                  addressString={addressString}
                  nextJob={nextJob}
                  onOpenFacility={() => onOpenFacility(facility.id)}
                />
              );
            })}
          </div>
        )}
      </Card>
    );
  }
);

AccountResidentialProperties.displayName = 'AccountResidentialProperties';

interface PropertyItemProps {
  property: ResidentialPropertySummary;
  facility: Facility | null;
  journeyLabel: string;
  journeyVariant: 'success' | 'warning' | 'info' | 'default' | 'error';
  addressString: string | null;
  nextJob: Job | null;
  isExpanded: boolean;
  canCollapse: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onOpenFacility: () => void;
}

function PropertyItem({
  property,
  facility,
  journeyLabel,
  journeyVariant,
  addressString,
  nextJob,
  isExpanded,
  canCollapse,
  onToggle,
  onEdit,
  onOpenFacility,
}: PropertyItemProps) {
  const profile = property.homeProfile;
  const facilityNameDiffers = facility && facility.name && facility.name !== property.name;

  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700">
      <button
        type="button"
        onClick={canCollapse ? onToggle : undefined}
        className={`flex w-full items-start gap-3 p-4 text-left ${canCollapse ? 'hover:bg-surface-50 dark:hover:bg-surface-900/40' : 'cursor-default'}`}
      >
        <Home className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-surface-900 dark:text-white">{property.name}</span>
            {property.isPrimary && (
              <Badge variant="success" size="sm">
                Primary
              </Badge>
            )}
            <Badge variant={journeyVariant} size="sm">
              {journeyLabel}
            </Badge>
          </div>
          {addressString && (
            <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">{addressString}</p>
          )}
          {facilityNameDiffers && (
            <p className="mt-0.5 truncate text-xs text-surface-500">linked to service location: {facility!.name}</p>
          )}
        </div>
        {canCollapse && (
          <ChevronRight
            className={`mt-1 h-4 w-4 flex-shrink-0 text-surface-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-surface-200 p-4 dark:border-surface-700">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <DetailItem icon={<Home className="h-3.5 w-3.5" />} label="Home Type" value={homeTypeLabel(profile?.homeType)} />
            <DetailItem
              icon={<Ruler className="h-3.5 w-3.5" />}
              label="Square Feet"
              value={profile?.squareFeet ? `${profile.squareFeet.toLocaleString()} sq ft` : 'Not set'}
            />
            <DetailItem
              icon={<Bed className="h-3.5 w-3.5" />}
              label="Bedrooms"
              value={String(profile?.bedrooms ?? 0)}
            />
            <DetailItem
              icon={<Bath className="h-3.5 w-3.5" />}
              label="Bathrooms"
              value={`${profile?.fullBathrooms ?? 0}${profile?.halfBathrooms ? ` + ${profile.halfBathrooms} half` : ''}`}
            />
            <DetailItem
              icon={<Layers className="h-3.5 w-3.5" />}
              label="Levels"
              value={String(profile?.levels ?? 1)}
            />
            <DetailItem
              icon={<PawPrint className="h-3.5 w-3.5" />}
              label="Pets"
              value={property.pets || profile?.hasPets ? 'Yes' : 'No'}
            />
            {nextJob && (
              <DetailItem
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Next Visit"
                value={formatShortDate(nextJob.scheduledDate)}
              />
            )}
          </dl>

          {(property.entryNotes || property.parkingAccess || property.accessNotes) && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {property.entryNotes && (
                <AccessCard
                  icon={<DoorOpen className="h-3.5 w-3.5" />}
                  label="Entry"
                  value={property.entryNotes}
                />
              )}
              {property.parkingAccess && (
                <AccessCard
                  icon={<Car className="h-3.5 w-3.5" />}
                  label="Parking"
                  value={property.parkingAccess}
                />
              )}
              {property.accessNotes && (
                <AccessCard
                  icon={<DoorOpen className="h-3.5 w-3.5" />}
                  label="Access Notes"
                  value={property.accessNotes}
                />
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit service location details
            </Button>
            {property.facility?.id && (
              <Button size="sm" variant="ghost" onClick={onOpenFacility}>
                Open service location
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FacilityOnlyItem({
  facility,
  addressString,
  nextJob,
  onOpenFacility,
}: {
  facility: Facility;
  addressString: string | null;
  nextJob: Job | null;
  onOpenFacility: () => void;
}) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700">
      <div className="flex w-full items-start gap-3 p-4 text-left">
        <Home className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-surface-900 dark:text-white">{facility.name}</span>
            <Badge variant="info" size="sm">
              Service Location
            </Badge>
          </div>
          {addressString && (
            <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">{addressString}</p>
          )}
          <p className="mt-0.5 text-xs text-surface-500">
            Residential details have not been added yet.
          </p>
        </div>
      </div>

      <div className="border-t border-surface-200 p-4 dark:border-surface-700">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <DetailItem icon={<Home className="h-3.5 w-3.5" />} label="Building Type" value={homeTypeLabel(facility.buildingType)} />
          <DetailItem
            icon={<Ruler className="h-3.5 w-3.5" />}
            label="Square Feet"
            value={facility.squareFeet ? `${Number(facility.squareFeet).toLocaleString()} sq ft` : 'Not set'}
          />
          <DetailItem icon={<Layers className="h-3.5 w-3.5" />} label="Areas" value={String(facility._count?.areas ?? 0)} />
          {nextJob && (
            <DetailItem
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Next Visit"
              value={formatShortDate(nextJob.scheduledDate)}
            />
          )}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={onOpenFacility}>
            Open service location
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-surface-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-surface-900 dark:text-white">{value}</dd>
    </div>
  );
}

function AccessCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-100 p-3 dark:bg-surface-900/40">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-surface-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm text-surface-900 dark:text-white whitespace-pre-wrap">{value}</p>
    </div>
  );
}
