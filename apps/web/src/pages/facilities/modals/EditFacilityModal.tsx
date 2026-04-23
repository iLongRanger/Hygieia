import type { UpdateFacilityInput } from '../../../types/facility';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Drawer } from '../../../components/ui/Drawer';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { BUILDING_TYPES, RESIDENTIAL_BUILDING_TYPES } from '../facility-constants';
import { FacilityServiceScheduleFields } from './FacilityServiceScheduleFields';

interface EditFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityForm: UpdateFacilityInput;
  setFacilityForm: React.Dispatch<React.SetStateAction<UpdateFacilityInput>>;
  onSave: () => void;
  saving: boolean;
  locationLabel?: string;
  accountType?: 'commercial' | 'residential' | 'government' | 'strata' | 'industrial';
}

export function EditFacilityModal({
  isOpen,
  onClose,
  facilityForm,
  setFacilityForm,
  onSave,
  saving,
  locationLabel = 'Service Location',
  accountType,
}: EditFacilityModalProps): React.JSX.Element {
  const isResidentialAccount = accountType === 'residential';
  const buildingTypeOptions = isResidentialAccount
    ? RESIDENTIAL_BUILDING_TYPES
    : BUILDING_TYPES;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${locationLabel}`}
      size="lg"
    >
      <div className="space-y-4">
        <Input
          label={`${locationLabel} Name`}
          value={facilityForm.name || ''}
          onChange={(e) =>
            setFacilityForm({ ...facilityForm, name: e.target.value })
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Street Address"
            value={facilityForm.address?.street || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                address: { ...facilityForm.address, street: e.target.value },
              })
            }
          />
          <Input
            label="City"
            value={facilityForm.address?.city || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                address: { ...facilityForm.address, city: e.target.value },
              })
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="State/Province"
            value={facilityForm.address?.state || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                address: { ...facilityForm.address, state: e.target.value },
              })
            }
          />
          <Input
            label="Postal Code"
            value={facilityForm.address?.postalCode || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                address: {
                  ...facilityForm.address,
                  postalCode: e.target.value,
                },
              })
            }
          />
          <Input
            label="Country"
            value={facilityForm.address?.country || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                address: { ...facilityForm.address, country: e.target.value },
              })
            }
          />
        </div>

        <Select
          label={isResidentialAccount ? 'Home Type' : 'Building Type'}
          options={buildingTypeOptions}
          value={facilityForm.buildingType || ''}
          onChange={(value) =>
            setFacilityForm({
              ...facilityForm,
              buildingType: value || null,
            })
          }
          hint={
            isResidentialAccount
              ? 'Choose the residential building style for this property.'
              : undefined
          }
        />

        <FacilityServiceScheduleFields
          address={facilityForm.address}
          onChange={(nextAddress) =>
            setFacilityForm({
              ...facilityForm,
              address: nextAddress,
            })
          }
        />

        <Textarea
          label="Access Instructions"
          value={facilityForm.accessInstructions || ''}
          onChange={(e) =>
            setFacilityForm({
              ...facilityForm,
              accessInstructions: e.target.value || null,
            })
          }
        />

        <Textarea
          label="Parking Info"
          value={facilityForm.parkingInfo || ''}
          onChange={(e) =>
            setFacilityForm({
              ...facilityForm,
              parkingInfo: e.target.value || null,
            })
          }
        />

        <Textarea
          label="Special Requirements"
          value={facilityForm.specialRequirements || ''}
          onChange={(e) =>
            setFacilityForm({
              ...facilityForm,
              specialRequirements: e.target.value || null,
            })
          }
        />

        <Textarea
          label="Notes"
          value={facilityForm.notes || ''}
          onChange={(e) =>
            setFacilityForm({
              ...facilityForm,
              notes: e.target.value || null,
            })
          }
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
