import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  approveTimeEntry,
  clockIn,
  clockOut,
  editTimeEntry,
  endBreak,
  getUserTimeSummary,
  startBreak,
} from '../timeTrackingService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    timeEntry: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('timeTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clockIn rejects when user already has an active entry', async () => {
    (prisma.timeEntry.findFirst as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      status: 'active',
    });

    await expect(clockIn({ userId: 'user-1' })).rejects.toThrow(
      'Already clocked in. Please clock out first.'
    );
  });

  it('clockOut computes totalHours using elapsed time and break minutes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-01T12:30:00.000Z'));
    (prisma.timeEntry.findFirst as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      clockIn: new Date('2026-02-01T09:00:00.000Z'),
      breakMinutes: 30,
      notes: null,
      status: 'active',
    });
    (prisma.timeEntry.update as jest.Mock).mockResolvedValue({ id: 'entry-1' });

    await clockOut('user-1');

    const updateArg = (prisma.timeEntry.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.data.status).toBe('completed');
    expect(updateArg.data.totalHours.toString()).toBe('3');
  });

  it('startBreak rejects when break is already active', async () => {
    (prisma.timeEntry.findFirst as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      status: 'active',
      geoLocation: { breakStartedAt: '2026-02-01T10:00:00.000Z' },
    });

    await expect(startBreak('user-1')).rejects.toThrow('Already on break');
  });

  it('endBreak increments break minutes and clears breakStartedAt metadata', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-01T10:15:00.000Z'));
    (prisma.timeEntry.findFirst as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      status: 'active',
      breakMinutes: 10,
      geoLocation: {
        breakStartedAt: '2026-02-01T10:10:00.000Z',
        source: 'mobile',
      },
    });
    (prisma.timeEntry.update as jest.Mock).mockResolvedValue({ id: 'entry-1' });

    await endBreak('user-1');

    expect(prisma.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'entry-1' },
        data: expect.objectContaining({
          breakMinutes: 15,
          geoLocation: { source: 'mobile' },
        }),
      })
    );
  });

  it('editTimeEntry recalculates hours and marks entry as edited', async () => {
    (prisma.timeEntry.findUnique as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      clockIn: new Date('2026-02-01T08:00:00.000Z'),
      clockOut: new Date('2026-02-01T12:00:00.000Z'),
      breakMinutes: 0,
    });
    (prisma.timeEntry.update as jest.Mock).mockResolvedValue({ id: 'entry-1' });

    await editTimeEntry('entry-1', {
      clockOut: new Date('2026-02-01T13:00:00.000Z'),
      editedByUserId: 'manager-1',
      editReason: 'Corrected end time',
    });

    const updateArg = (prisma.timeEntry.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.data.status).toBe('edited');
    expect(updateArg.data.editedByUserId).toBe('manager-1');
    expect(updateArg.data.totalHours.toString()).toBe('5');
  });

  it('approveTimeEntry rejects active entries', async () => {
    (prisma.timeEntry.findUnique as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      status: 'active',
    });

    await expect(approveTimeEntry('entry-1', 'manager-1')).rejects.toThrow(
      'Cannot approve an active entry'
    );
  });

  it('getUserTimeSummary calculates regular and overtime hours', async () => {
    (prisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
      {
        totalHours: { toString: () => '22.5' },
        clockIn: new Date('2026-02-01T08:00:00.000Z'),
        facility: { id: 'f-1', name: 'HQ' },
        job: { id: 'j-1', jobNumber: 'WO-1' },
      },
      {
        totalHours: { toString: () => '25' },
        clockIn: new Date('2026-02-02T08:00:00.000Z'),
        facility: { id: 'f-1', name: 'HQ' },
        job: { id: 'j-2', jobNumber: 'WO-2' },
      },
    ]);

    const result = await getUserTimeSummary(
      'user-1',
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-07T23:59:59.000Z')
    );

    expect(result.totalHours).toBe(47.5);
    expect(result.regularHours).toBe(40);
    expect(result.overtimeHours).toBe(7.5);
    expect(result.entryCount).toBe(2);
  });
});
