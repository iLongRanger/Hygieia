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
  },
}));

describe('invoiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.invoice.create as jest.Mock).mockResolvedValue({ id: 'inv-1' });
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

  it('generateInvoiceFromContract rejects overlapping period for same contract', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      id: 'inv-existing',
      invoiceNumber: 'INV-2026-0005',
    });

    await expect(
      generateInvoiceFromContract(
        'contract-1',
        new Date('2026-02-01T00:00:00.000Z'),
        new Date('2026-02-28T00:00:00.000Z'),
        'user-1'
      )
    ).rejects.toThrow('already covers an overlapping billing period');
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
    (prisma.contract.findMany as jest.Mock).mockResolvedValue([
      { id: 'contract-1' },
      { id: 'contract-2' },
    ]);

    (prisma.invoice.findFirst as jest.Mock)
      .mockResolvedValueOnce({
        id: 'inv-existing',
        invoiceNumber: 'INV-2026-0002',
      }) // batch duplicate check for contract-1
      .mockResolvedValueOnce(null) // batch duplicate check for contract-2
      .mockResolvedValueOnce(null); // generate overlap check for contract-2

    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-2',
      contractNumber: 'CT-2',
      title: 'Contract Two',
      accountId: 'account-2',
      facilityId: 'facility-2',
      paymentTerms: 'Net 30',
      monthlyValue: { toString: () => '900' },
      facility: { address: { timezone: 'UTC' } },
    });

    const result = await batchGenerateInvoices(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z'),
      'user-1'
    );

    expect(result.generated).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ contractId: 'contract-1', status: 'skipped_duplicate' }),
        expect.objectContaining({ contractId: 'contract-2', status: 'generated', invoiceId: 'inv-1' }),
      ])
    );
  });
});
