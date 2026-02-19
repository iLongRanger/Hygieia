import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  approveTimesheet,
  deleteTimesheet,
  generateTimesheet,
  submitTimesheet,
} from '../timesheetService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    timesheet: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    timeEntry: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
  },
}));

describe('timesheetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
  });

  it('generateTimesheet rejects duplicate period for same user', async () => {
    (prisma.timesheet.findFirst as jest.Mock).mockResolvedValue({ id: 'ts-existing' });

    await expect(
      generateTimesheet({
        userId: 'user-1',
        periodStart: new Date('2026-02-01T00:00:00.000Z'),
        periodEnd: new Date('2026-02-07T23:59:59.000Z'),
      })
    ).rejects.toThrow('Timesheet already exists for this period');
  });

  it('generateTimesheet computes totals and links entries', async () => {
    (prisma.timesheet.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
      { id: 'te-1', totalHours: { toString: () => '22.5' } },
      { id: 'te-2', totalHours: { toString: () => '25' } },
    ]);
    (prisma.timesheet.create as jest.Mock).mockResolvedValue({ id: 'ts-1' });
    (prisma.timeEntry.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prisma.timesheet.findUnique as jest.Mock).mockResolvedValue({
      id: 'ts-1',
      totalHours: { toString: () => '47.5' },
      regularHours: { toString: () => '40' },
      overtimeHours: { toString: () => '7.5' },
      entries: [],
    });

    const result = await generateTimesheet({
      userId: 'user-1',
      periodStart: new Date('2026-02-01T00:00:00.000Z'),
      periodEnd: new Date('2026-02-07T23:59:59.000Z'),
    });

    const createArg = (prisma.timesheet.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.totalHours.toString()).toBe('47.5');
    expect(createArg.data.regularHours.toString()).toBe('40');
    expect(createArg.data.overtimeHours.toString()).toBe('7.5');
    expect(prisma.timeEntry.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['te-1', 'te-2'] } },
      data: { timesheetId: 'ts-1' },
    });
    expect(result.id).toBe('ts-1');
  });

  it('submitTimesheet only allows draft status', async () => {
    (prisma.timesheet.findUnique as jest.Mock).mockResolvedValue({
      id: 'ts-1',
      status: 'submitted',
    });

    await expect(submitTimesheet('ts-1')).rejects.toThrow(
      'Timesheet can only be submitted from draft status'
    );
  });

  it('approveTimesheet requires submitted status', async () => {
    (prisma.timesheet.findUnique as jest.Mock).mockResolvedValue({
      id: 'ts-1',
      status: 'submitted',
    });
    (prisma.timesheet.update as jest.Mock).mockResolvedValue({ id: 'ts-1', status: 'approved' });

    await approveTimesheet('ts-1', 'manager-1');

    expect(prisma.timesheet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ts-1' },
        data: expect.objectContaining({
          status: 'approved',
          approvedByUserId: 'manager-1',
          approvedAt: expect.any(Date),
        }),
      })
    );
  });

  it('deleteTimesheet unlinks entries before deletion', async () => {
    (prisma.timesheet.findUnique as jest.Mock).mockResolvedValue({
      id: 'ts-1',
      status: 'draft',
    });
    (prisma.timeEntry.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
    (prisma.timesheet.delete as jest.Mock).mockResolvedValue({ id: 'ts-1' });

    await deleteTimesheet('ts-1');

    expect(prisma.timeEntry.updateMany).toHaveBeenCalledWith({
      where: { timesheetId: 'ts-1' },
      data: { timesheetId: null },
    });
    expect(prisma.timesheet.delete).toHaveBeenCalledWith({ where: { id: 'ts-1' } });
  });

  it('deleteTimesheet rejects approved records', async () => {
    (prisma.timesheet.findUnique as jest.Mock).mockResolvedValue({
      id: 'ts-1',
      status: 'approved',
    });

    await expect(deleteTimesheet('ts-1')).rejects.toThrow(
      'Cannot delete an approved timesheet'
    );
  });
});
