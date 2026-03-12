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
            onChange={(value) => setFormData({ ...formData, type: value })}
          />
          <Select
            label="Industry"
            placeholder="Select industry"
            options={INDUSTRIES}
            value={formData.industry || ''}
            onChange={(value) => setFormData({ ...formData, industry: value || null })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Website"
            placeholder="https://example.com"
            value={formData.website || ''}
            onChange={(e) => setFormData({ ...formData, website: e.target.value || null })}
          />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Payment Terms"
            options={PAYMENT_TERMS}
            value={formData.paymentTerms || 'NET30'}
            onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
          />
          <Input
            label="Credit Limit"
            type="number"
            placeholder="10000"
            value={formData.creditLimit || ''}
            onChange={(e) =>
              setFormData({ ...formData, creditLimit: e.target.value ? Number(e.target.value) : null })
            }
          />
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
