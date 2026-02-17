import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as appointmentService from '../appointmentService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    contract: {
      findFirst: jest.fn(),
    },
    facility: {
      findFirst: jest.fn(),
    },
    area: {
      count: jest.fn(),
    },
    facilityTask: {
      count: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
  },
}));

describe('appointmentService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);
  });

  it('listAppointments should default to future appointments when includePast is false', async () => {
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    await appointmentService.listAppointments({});

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledEnd: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('createAppointment should require lead for walkthrough', async () => {
    await expect(
      appointmentService.createAppointment({
        assignedToUserId: 'user-1',
        type: 'walk_through',
        status: 'scheduled',
        scheduledStart: new Date('2026-02-01T10:00:00.000Z'),
        scheduledEnd: new Date('2026-02-01T11:00:00.000Z'),
        timezone: 'America/New_York',
        createdByUserId: 'admin-1',
      })
    ).rejects.toThrow('Lead is required for walkthrough appointments');
  });

  it('createAppointment should require active contract for non-walkthrough', async () => {
    (prisma.account.findUnique as jest.Mock).mockResolvedValue({ id: 'account-1', archivedAt: null });
    (prisma.contract.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      appointmentService.createAppointment({
        accountId: 'account-1',
        assignedToUserId: 'user-1',
        type: 'visit',
        status: 'scheduled',
        scheduledStart: new Date('2026-02-01T10:00:00.000Z'),
        scheduledEnd: new Date('2026-02-01T11:00:00.000Z'),
        timezone: 'America/New_York',
        createdByUserId: 'admin-1',
      })
    ).rejects.toThrow('Account must have an active contract');
  });

  it('createAppointment should execute transaction for valid walkthrough input', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue({ id: 'lead-1', archivedAt: null });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      type: 'walk_through',
      lead: { id: 'lead-1' },
      account: null,
      scheduledStart: new Date('2026-02-01T10:00:00.000Z'),
    });

    await appointmentService.createAppointment({
      leadId: 'lead-1',
      assignedToUserId: 'user-1',
      type: 'walk_through',
      status: 'scheduled',
      scheduledStart: new Date('2026-02-01T10:00:00.000Z'),
      scheduledEnd: new Date('2026-02-01T11:00:00.000Z'),
      timezone: 'America/New_York',
      createdByUserId: 'admin-1',
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('completeAppointment should reject when no tasks exist for facility', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      type: 'walk_through',
      status: 'scheduled',
      leadId: 'lead-1',
      assignedToUserId: 'user-1',
    });
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
      id: 'lead-1',
      convertedToAccountId: 'account-1',
    });
    (prisma.facility.findFirst as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (prisma.area.count as jest.Mock).mockResolvedValue(1);
    (prisma.facilityTask.count as jest.Mock).mockResolvedValue(0);

    await expect(
      appointmentService.completeAppointment('appt-1', {
        facilityId: 'facility-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('Add at least one task before completing walkthrough');
  });
});
