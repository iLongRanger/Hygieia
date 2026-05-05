import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { generatePayrollRun } from '../payrollService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    payrollRun: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    pricingSettings: {
      findFirst: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
    },
    payrollEntry: {
      create: jest.fn(),
    },
    payrollJobAllocation: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
  },
}));

describe('payrollService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
    (prisma.payrollRun.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.pricingSettings.findFirst as jest.Mock).mockResolvedValue({
      laborCostPerHour: { toString: () => '20' },
    });
    (prisma.payrollRun.create as jest.Mock).mockResolvedValue({
      id: 'run-1',
      periodStart: new Date('2026-02-01T00:00:00.000Z'),
      periodEnd: new Date('2026-02-15T00:00:00.000Z'),
    });
    (prisma.payrollEntry.create as jest.Mock).mockResolvedValue({ id: 'entry-1' });
    (prisma.payrollJobAllocation.create as jest.Mock).mockResolvedValue({ id: 'allocation-1' });
    (prisma.payrollRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'run-1',
      entries: [],
    });
  });

  it('generates percentage payroll from completed job revenue snapshots without payable hours', async () => {
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'job-1',
        contractId: 'contract-1',
        compensationType: 'percentage',
        subcontractorPercentageSnapshot: { toString: () => '0.65' },
        jobRevenueSnapshot: { toString: () => '200' },
        contract: {
          id: 'contract-1',
          monthlyValue: { toString: () => '1000' },
          subcontractorTier: 'premium',
          subcontractorPercentage: { toString: () => '0.6' },
          serviceFrequency: 'weekly',
          assignedToUser: null,
          assignedTeam: {
            users: [
              {
                id: 'sub-1',
                payType: 'percentage',
                hourlyPayRate: null,
                roles: [{ role: { key: 'subcontractor' } }],
              },
            ],
          },
        },
        timeEntries: [
          {
            id: 'time-1',
            userId: 'sub-1',
            contractId: 'contract-1',
            entryType: 'attendance',
            clockIn: new Date('2026-02-02T09:00:00.000Z'),
            clockOut: new Date('2026-02-02T10:00:00.000Z'),
            totalHours: null,
            user: {
              id: 'sub-1',
              payType: 'percentage',
              hourlyPayRate: null,
              roles: [{ role: { key: 'subcontractor' } }],
            },
          },
        ],
      },
    ]);

    await generatePayrollRun('2026-02-01', '2026-02-15');

    expect(prisma.payrollEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'sub-1',
          payType: 'percentage',
          scheduledHours: null,
          grossPay: expect.objectContaining({ toString: expect.any(Function) }),
        }),
      })
    );
    const entryArg = (prisma.payrollEntry.create as jest.Mock).mock.calls[0][0];
    expect(entryArg.data.tierPercentage.toString()).toBe('65');
    expect(entryArg.data.grossPay.toString()).toBe('130');
    expect(prisma.payrollJobAllocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: 'job-1',
          allocatedHours: null,
        }),
      })
    );
  });
});
