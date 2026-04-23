import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  batchGenerateInvoices,
  generateInvoiceFromContract,
} from '../invoiceService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contract: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    invoiceItem: {
      create: jest.fn(),
    },
    invoiceJobAllocation: {
      create: jest.fn(),
    },
    invoiceActivity: {
      create: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
  },
}));

describe('invoiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.invoice.create as jest.Mock).mockResolvedValue({ id: 'inv-1' });
    (prisma.invoiceItem.create as jest.Mock).mockResolvedValue({ id: 'item-1' });
    (prisma.invoiceJobAllocation.create as jest.Mock).mockResolvedValue({ id: 'allocation-1' });
    (prisma.invoiceActivity.create as jest.Mock).mockResolvedValue({ id: 'activity-1' });
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      items: [{ id: 'item-1' }],
    });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CT-1',
      title: 'Monthly Cleaning',
      accountId: 'account-1',
      facilityId: 'facility-1',
      paymentTerms: 'Net 45',
      monthlyValue: { toString: () => '1200' },
      facility: { address: { timezone: 'UTC' } },
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      createJobCandidate({
        id: 'job-1',
        jobNumber: 'JOB-1',
        accountId: 'account-1',
        contractId: 'contract-1',
        facilityId: 'facility-1',
        facilityName: 'HQ',
        contractTitle: 'Monthly Cleaning',
        monthlyValue: '1200',
      }),
    ]);
  });

  it('generateInvoiceFromContract normalizes period and derives due date from payment terms', async () => {
    await generateInvoiceFromContract(
      'contract-1',
      new Date('2026-02-01T13:14:00.000Z'),
      new Date('2026-02-28T06:30:00.000Z'),
      'user-1'
    );

    const createArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.periodStart.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(createArg.data.periodEnd.toISOString()).toBe('2026-02-28T23:59:59.999Z');
    expect(createArg.data.issueDate.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(createArg.data.dueDate.toISOString()).toBe('2026-04-14T00:00:00.000Z');
  });

  it('generateInvoiceFromContract prorates monthly value for a partial period by default', async () => {
    await generateInvoiceFromContract(
      'contract-1',
      new Date('2026-02-15T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z'),
      'user-1'
    );

    const itemCreateArg = (prisma.invoiceItem.create as jest.Mock).mock.calls[0][0];
    expect(Number(itemCreateArg.data.unitPrice.toString())).toBe(600);
  });

  it('generateInvoiceFromContract can disable proration and charge full monthly value', async () => {
    await generateInvoiceFromContract(
      'contract-1',
      new Date('2026-02-15T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z'),
      'user-1',
      false
    );

    const itemCreateArg = (prisma.invoiceItem.create as jest.Mock).mock.calls[0][0];
    expect(Number(itemCreateArg.data.unitPrice.toString())).toBe(1200);
  });

  it('generateInvoiceFromContract rejects when no eligible completed jobs exist', async () => {
    (prisma.job.findMany as jest.Mock).mockResolvedValue([]);

    await expect(
      generateInvoiceFromContract(
        'contract-1',
        new Date('2026-02-01T00:00:00.000Z'),
        new Date('2026-02-28T00:00:00.000Z'),
        'user-1'
      )
    ).rejects.toThrow('No eligible completed jobs found for this contract and period');
  });

  it('batchGenerateInvoices enforces max period length validation', async () => {
    await expect(
      batchGenerateInvoices(
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-02-15T00:00:00.000Z'),
        'user-1'
      )
    ).rejects.toThrow('Billing period cannot exceed 31 days');
  });

  it('batchGenerateInvoices returns detailed statuses for generated and duplicates', async () => {
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      items: [{ id: 'item-1' }, { id: 'item-2' }],
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      createJobCandidate({
        id: 'job-1',
        jobNumber: 'JOB-1',
        accountId: 'account-1',
        contractId: 'contract-1',
        facilityId: 'facility-1',
        facilityName: 'HQ',
        contractTitle: 'Contract One',
        monthlyValue: '100',
      }),
      createJobCandidate({
        id: 'job-2',
        jobNumber: 'JOB-2',
        accountId: 'account-1',
        contractId: 'contract-2',
        facilityId: 'facility-2',
        facilityName: 'Annex',
        contractTitle: 'Contract Two',
        monthlyValue: '200',
      }),
    ]);

    const result = await batchGenerateInvoices(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z'),
      'user-1'
    );

    expect(result.generated).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: 'account-1',
          status: 'generated',
          invoiceId: 'inv-1',
          lineItems: 2,
        }),
      ])
    );

    const createArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.accountId).toBe('account-1');
    const itemDescriptions = (prisma.invoiceItem.create as jest.Mock).mock.calls.map(
      (call) => call[0].data.description
    );
    expect(itemDescriptions).toHaveLength(2);
    expect(itemDescriptions[0]).toContain('HQ');
    expect(itemDescriptions[1]).toContain('Annex');
  });
});

function createJobCandidate(input: {
  id: string;
  jobNumber: string;
  accountId: string;
  contractId: string;
  facilityId: string;
  facilityName: string;
  contractTitle: string;
  monthlyValue: string;
}) {
  return {
    id: input.id,
    jobNumber: input.jobNumber,
    accountId: input.accountId,
    contractId: input.contractId,
    facilityId: input.facilityId,
    scheduledDate: new Date('2026-02-15T00:00:00.000Z'),
    facility: {
      id: input.facilityId,
      name: input.facilityName,
    },
    contract: {
      id: input.contractId,
      contractNumber: input.contractId,
      title: input.contractTitle,
      monthlyValue: { toString: () => input.monthlyValue },
      taxRate: { toString: () => '0' },
      paymentTerms: 'Net 30',
      serviceFrequency: 'monthly',
    },
  };
}
