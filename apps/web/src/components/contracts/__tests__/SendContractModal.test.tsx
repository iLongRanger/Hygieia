import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import SendContractModal from '../SendContractModal';
import type { Contract } from '../../../types/contract';

const baseContract: Contract = {
  id: 'contract-1',
  contractNumber: 'CONT-202602-0001',
  title: 'Office Cleaning Agreement',
  status: 'draft',
  contractSource: 'proposal',
  renewedFromContractId: null,
  renewalNumber: 0,
  startDate: '2026-02-01',
  endDate: null,
  serviceFrequency: 'monthly',
  serviceSchedule: null,
  autoRenew: false,
  renewalNoticeDays: 30,
  monthlyValue: 2500,
  totalValue: null,
  billingCycle: 'monthly',
  paymentTerms: 'Net 30',
  termsAndConditions: null,
  specialInstructions: null,
  sentAt: null,
  viewedAt: null,
  publicToken: null,
  signedDocumentUrl: null,
  signedDate: null,
  signedByName: null,
  signedByEmail: null,
  approvedAt: null,
  terminationReason: null,
  terminatedAt: null,
  includesInitialClean: false,
  initialCleanCompleted: false,
  initialCleanCompletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
    type: 'commercial',
    contacts: [],
  },
  facility: null,
  proposal: null,
  assignedTeam: null,
  renewedFromContract: null,
  renewedToContract: null,
  approvedByUser: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
  },
};

describe('SendContractModal', () => {
  it('auto-populates primary contact email and greets by first name', () => {
    const contract: Contract = {
      ...baseContract,
      account: {
        ...baseContract.account,
        contacts: [
          { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', isPrimary: true },
          { name: 'Ops Team', email: 'ops@example.com', isPrimary: false },
        ],
      },
    };

    render(
      <SendContractModal
        isOpen
        onClose={vi.fn()}
        contract={contract}
        onSend={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByLabelText('Send To')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('CC (comma separated)')).toHaveValue('ops@example.com');
    expect((screen.getByPlaceholderText('Add a personal message...') as HTMLTextAreaElement).value)
      .toContain('Dear Jane,');
  });

  it('falls back to account name when no contact email exists', () => {
    const contract: Contract = {
      ...baseContract,
      account: {
        ...baseContract.account,
        contacts: [{ name: 'No Email Contact', email: null, isPrimary: true }],
      },
    };

    render(
      <SendContractModal
        isOpen
        onClose={vi.fn()}
        contract={contract}
        onSend={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByLabelText('Send To')).toHaveValue('');
    expect((screen.getByPlaceholderText('Add a personal message...') as HTMLTextAreaElement).value)
      .toContain('Dear Acme Corporation,');
  });
});
