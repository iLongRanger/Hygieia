import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestError } from '../../middleware/errorHandler';
import { prisma } from '../../lib/prisma';
import { getRevenueReport } from '../financeReportService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    invoice: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('financeReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects report date ranges longer than one year', async () => {
    await expect(
      getRevenueReport(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2026-02-01T00:00:00.000Z')
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(prisma.invoice.count).not.toHaveBeenCalled();
  });

  it('rejects revenue reports that would load too many rows', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(5001);

    await expect(
      getRevenueReport(
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-01-31T00:00:00.000Z')
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });
});
