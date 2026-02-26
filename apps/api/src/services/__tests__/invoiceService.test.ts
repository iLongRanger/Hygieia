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

  it('generateInvoiceFromContract prorates monthly value for a partial period by default', async () => {
    await generateInvoiceFromContract(
      'contract-1',
      new Date('2026-02-15T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z'),
      'user-1'
    );

    const createArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    expect(Number(createArg.data.items.create[0].unitPrice.toString())).toBe(600);
  });

  it('generateInvoiceFromContract can disable proration and charge full monthly value', async () => {
    await generateInvoiceFromContract(
      'contract-1',
      new Date('2026-02-15T00:00:00.000Z'),
      new Date('2026-02-28T00:00:00.000Z'),
      'user-1',
      false
    );

    const createArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    expect(Number(createArg.data.items.create[0].unitPrice.toString())).toBe(1200);
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
      {
        id: 'contract-1',
        contractNumber: 'CT-1',
        title: 'Contract One',
        accountId: 'account-1',
        monthlyValue: { toString: () => '100' },
        paymentTerms: 'Net 30',
        facility: { id: 'facility-1', name: 'HQ', status: 'active', archivedAt: null },
      },
      {
        id: 'contract-2',
        contractNumber: 'CT-2',
        title: 'Contract Two',
        accountId: 'account-1',
        monthlyValue: { toString: () => '200' },
        paymentTerms: 'Net 30',
        facility: { id: 'facility-2', name: 'Annex', status: 'active', archivedAt: null },
      },
      {
        id: 'contract-3',
        contractNumber: 'CT-3',
        title: 'Contract Three',
        accountId: 'account-2',
        monthlyValue: { toString: () => '300' },
        paymentTerms: 'Net 30',
        facility: { id: 'facility-3', name: 'Branch', status: 'active', archivedAt: null },
      },
    ]);

    (prisma.invoice.findFirst as jest.Mock)
      .mockResolvedValueOnce(null) // duplicate check for account-1
      .mockResolvedValueOnce(null) // invoice number lookup while creating account-1 invoice
      .mockResolvedValueOnce({
        id: 'inv-existing',
        invoiceNumber: 'INV-2026-0002',
      }); // duplicate check for account-2

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
        expect.objectContaining({
          accountId: 'account-1',
          status: 'generated',
          invoiceId: 'inv-1',
          lineItems: 2,
        }),
        expect.objectContaining({
          accountId: 'account-2',
          status: 'skipped_duplicate',
        }),
      ])
    );

    const createArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.accountId).toBe('account-1');
    expect(createArg.data.items.create).toHaveLength(2);
    expect(createArg.data.items.create[0].description).toContain('HQ');
    expect(createArg.data.items.create[1].description).toContain('Annex');
    expect(result.results).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ accountId: 'account-1', status: 'skipped_duplicate' }),
      ])
    );
  });
});
