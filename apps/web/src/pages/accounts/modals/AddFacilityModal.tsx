import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { BUILDING_TYPES, FACILITY_STATUSES } from '../account-constants';
import type { CreateFacilityInput } from '../../../types/facility';
import { FacilityServiceScheduleFields } from '../../facilities/modals/FacilityServiceScheduleFields';

interface AddFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityFormData: Omit<CreateFacilityInput, 'accountId'>;
  setFacilityFormData: React.Dispatch<React.SetStateAction<Omit<CreateFacilityInput, 'accountId'>>>;
  onSave: () => void;
  saving: boolean;
}

export function AddFacilityModal({
  isOpen,
  onClose,
  facilityFormData,
  setFacilityFormData,
  onSave,
  saving,
}: AddFacilityModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Facility" size="lg">
      <div className="space-y-4">
        <Input
          label="Facility Name"
          required
          placeholder="Main Office Building"
          value={facilityFormData.name}
          onChange={(e) => setFacilityFormData({ ...facilityFormData, name: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Building Type"
            placeholder="Select type"
            options={BUILDING_TYPES}
            value={facilityFormData.buildingType || ''}
            onChange={(value) => setFacilityFormData({ ...facilityFormData, buildingType: value || null })}
          />
          <Select
            label="Status"
            options={FACILITY_STATUSES}
            value={facilityFormData.status || 'active'}
            onChange={(value) =>
              setFacilityFormData({
                ...facilityFormData,
                status: value as 'active' | 'inactive' | 'pending',
              })
            }
          />
        </div>
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Total square feet will be auto-calculated from the areas added to this facility.
        </p>
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="text-sm font-medium text-white mb-3">Address</h4>
          <div className="space-y-4">
            <Input
              label="Street Address"
              placeholder="123 Main St"
              value={facilityFormData.address?.street || ''}
              onChange={(e) =>
                setFacilityFormData({
                  ...facilityFormData,
                  address: { ...facilityFormData.address, street: e.target.value || undefined },
                })
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="City"
                placeholder="New York"
                value={facilityFormData.address?.city || ''}
                onChange={(e) =>
                  setFacilityFormData({
                    ...facilityFormData,
                    address: { ...facilityFormData.address, city: e.target.value || undefined },
                  })
                }
              />
              <Input
                label="State"
                placeholder="NY"
                value={facilityFormData.address?.state || ''}
                onChange={(e) =>
                  setFacilityFormData({
                    ...facilityFormData,
                    address: { ...facilityFormData.address, state: e.target.value || undefined },
                  })
                }
              />
              <Input
                label="Postal Code"
                placeholder="10001"
                value={facilityFormData.address?.postalCode || ''}
                onChange={(e) =>
                  setFacilityFormData({
                    ...facilityFormData,
                    address: { ...facilityFormData.address, postalCode: e.target.value || undefined },
                  })
                }
              />
            </div>
          </div>
        </div>
        <FacilityServiceScheduleFields
          address={facilityFormData.address}
          onChange={(nextAddress) =>
            setFacilityFormData({
              ...facilityFormData,
              address: nextAddress,
            })
          }
        />
        <Textarea
          label="Access Instructions"
          placeholder="Enter through the loading dock on the west side..."
          value={facilityFormData.accessInstructions || ''}
          onChange={(e) =>
            setFacilityFormData({ ...facilityFormData, accessInstructions: e.target.value || null })
          }
        />
        <Textarea
          label="Parking Info"
          placeholder="Visitor parking available in lot B..."
          value={facilityFormData.parkingInfo || ''}
          onChange={(e) =>
            setFacilityFormData({ ...facilityFormData, parkingInfo: e.target.value || null })
          }
        />
        <Textarea
          label="Notes"
          placeholder="Additional notes about this facility..."
          value={facilityFormData.notes || ''}
          onChange={(e) =>
            setFacilityFormData({ ...facilityFormData, notes: e.target.value || null })
          }
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} isLoading={saving} disabled={!facilityFormData.name}>
            Create Facility
          </Button>
        </div>
      </div>
    </Modal>
  );
}
