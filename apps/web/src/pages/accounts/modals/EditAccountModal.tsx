import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { ACCOUNT_TYPES, INDUSTRIES, PAYMENT_TERMS } from '../account-constants';
import type { UpdateAccountInput } from '../../../types/crm';
import type { User } from '../../../types/user';
import type { Contract } from '../../../types/contract';

const ACCOUNT_MANAGER_ROLE_KEYS = new Set(['owner', 'admin', 'manager']);
const RESIDENTIAL_HOME_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'single_family', label: 'Single Family' },
];

const DEFAULT_RESIDENTIAL_PROFILE = {
  homeType: 'single_family' as const,
  squareFeet: null,
  bedrooms: 0,
  fullBathrooms: 1,
  halfBathrooms: 0,
  levels: 1,
  occupiedStatus: 'occupied' as const,
  condition: 'standard' as const,
  hasPets: false,
  lastProfessionalCleaning: null,
  parkingAccess: null,
  entryNotes: null,
  specialInstructions: null,
  isFirstVisit: false,
};

function canBeAccountManager(user: User): boolean {
  const primaryRoleKey =
    typeof user.role === 'string'
      ? user.role
      : user.roles[0]?.role.key;

  if (primaryRoleKey && ACCOUNT_MANAGER_ROLE_KEYS.has(primaryRoleKey)) {
    return true;
  }

  return user.roles.some(({ role }) => ACCOUNT_MANAGER_ROLE_KEYS.has(role.key));
}

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: UpdateAccountInput;
  setFormData: React.Dispatch<React.SetStateAction<UpdateAccountInput>>;
  users: User[];
  activeContract: Contract | null;
  onSave: () => void;
  saving: boolean;
}

export function EditAccountModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  users,
  activeContract,
  onSave,
  saving,
}: EditAccountModalProps) {
  const assignableAccountManagers = users.filter(canBeAccountManager);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Account" size="lg">
      <div className="space-y-4">
        <Input
          label="Account Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Account Type"
            options={ACCOUNT_TYPES}
            value={formData.type}
            onChange={(value) =>
              setFormData({
                ...formData,
                type: value,
                industry: value === 'residential' ? null : formData.industry,
                website: value === 'residential' ? null : formData.website,
                creditLimit: value === 'residential' ? null : formData.creditLimit,
                residentialProfile:
                  value === 'residential'
                    ? formData.residentialProfile ?? DEFAULT_RESIDENTIAL_PROFILE
                    : null,
              })}
          />
          {formData.type === 'residential' ? (
            <Select
              label="Home Type"
              placeholder="Select home type"
              options={RESIDENTIAL_HOME_TYPES}
              value={formData.residentialProfile?.homeType || ''}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  residentialProfile: {
                    ...DEFAULT_RESIDENTIAL_PROFILE,
                    ...(formData.residentialProfile ?? {}),
                    homeType: value as typeof DEFAULT_RESIDENTIAL_PROFILE.homeType,
                  },
                })}
            />
          ) : (
            <Select
              label="Industry"
              placeholder="Select industry"
              options={INDUSTRIES}
              value={formData.industry || ''}
              onChange={(value) => setFormData({ ...formData, industry: value || null })}
            />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {formData.type === 'residential' ? (
            <Input
              label="Service Street"
              placeholder="123 Main St"
              value={formData.serviceAddress?.street || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  serviceAddress: {
                    ...(formData.serviceAddress ?? {}),
                    street: e.target.value || undefined,
                  },
                })}
            />
          ) : (
            <Input
              label="Website"
              placeholder="https://example.com"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value || null })}
            />
          )}
          <Select
            label="Account Manager"
            placeholder="Select manager"
            options={assignableAccountManagers.map((u) => ({ value: u.id, label: u.fullName }))}
            value={formData.accountManagerId || ''}
            onChange={(value) => setFormData({ ...formData, accountManagerId: value || null })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Assigned Team"
            value={activeContract ? activeContract.assignedTeam?.name || 'Unassigned' : 'No active contract'}
            readOnly
            disabled
            hint="Update team assignment from the active contract."
          />
          <Input
            label="Billing Email"
            type="email"
            placeholder="billing@example.com"
            value={formData.billingEmail || ''}
            onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value || null })}
          />
          <Input
            label="Billing Phone"
            placeholder="(555) 123-4567"
            value={formData.billingPhone || ''}
            onChange={(e) => setFormData({ ...formData, billingPhone: e.target.value || null })}
          />
        </div>
        {formData.type === 'residential' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Service City"
                placeholder="City"
                value={formData.serviceAddress?.city || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceAddress: {
                      ...(formData.serviceAddress ?? {}),
                      city: e.target.value || undefined,
                    },
                  })}
              />
              <Input
                label="Service State"
                placeholder="State"
                value={formData.serviceAddress?.state || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceAddress: {
                      ...(formData.serviceAddress ?? {}),
                      state: e.target.value || undefined,
                    },
                  })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Input
                label="Sq Ft"
                type="number"
                value={formData.residentialProfile?.squareFeet || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    residentialProfile: {
                      ...DEFAULT_RESIDENTIAL_PROFILE,
                      ...(formData.residentialProfile ?? {}),
                      squareFeet: e.target.value ? Number(e.target.value) : null,
                    },
                  })}
              />
              <Input
                label="Bedrooms"
                type="number"
                value={formData.residentialProfile?.bedrooms ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    residentialProfile: {
                      ...DEFAULT_RESIDENTIAL_PROFILE,
                      ...(formData.residentialProfile ?? {}),
                      bedrooms: e.target.value ? Number(e.target.value) : 0,
                    },
                  })}
              />
              <Input
                label="Full Baths"
                type="number"
                value={formData.residentialProfile?.fullBathrooms ?? 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    residentialProfile: {
                      ...DEFAULT_RESIDENTIAL_PROFILE,
                      ...(formData.residentialProfile ?? {}),
                      fullBathrooms: e.target.value ? Number(e.target.value) : 0,
                    },
                  })}
              />
              <Input
                label="Levels"
                type="number"
                value={formData.residentialProfile?.levels ?? 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    residentialProfile: {
                      ...DEFAULT_RESIDENTIAL_PROFILE,
                      ...(formData.residentialProfile ?? {}),
                      levels: e.target.value ? Number(e.target.value) : 1,
                    },
                  })}
              />
            </div>
            <Textarea
              label="Access Notes"
              placeholder="Gate code, parking, entry instructions, pet notes..."
              value={formData.residentialProfile?.entryNotes || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  residentialProfile: {
                    ...DEFAULT_RESIDENTIAL_PROFILE,
                    ...(formData.residentialProfile ?? {}),
                    entryNotes: e.target.value || null,
                  },
                })}
            />
          </>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Payment Terms"
            options={PAYMENT_TERMS}
            value={formData.paymentTerms || 'NET30'}
            onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
          />
          {formData.type === 'commercial' ? (
            <Input
              label="Credit Limit"
              type="number"
              placeholder="10000"
              value={formData.creditLimit || ''}
              onChange={(e) =>
                setFormData({ ...formData, creditLimit: e.target.value ? Number(e.target.value) : null })
              }
            />
          ) : (
            <Input
              label="Service Postal Code"
              placeholder="Postal / ZIP"
              value={formData.serviceAddress?.postalCode || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  serviceAddress: {
                    ...(formData.serviceAddress ?? {}),
                    postalCode: e.target.value || undefined,
                  },
                })}
            />
          )}
        </div>
        <Textarea
          label="Notes"
          placeholder="Additional notes about this account..."
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} isLoading={saving} disabled={!formData.name}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
