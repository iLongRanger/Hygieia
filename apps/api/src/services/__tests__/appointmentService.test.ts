import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as appointmentService from '../appointmentService';
import { prisma } from '../../lib/prisma';
import { createNotification } from '../notificationService';

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
    user: {
      findUnique: jest.fn(),
    },
    contract: {
      findFirst: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
    },
    facility: {
      findFirst: jest.fn(),
    },
    inspection: {
      update: jest.fn(),
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

jest.mock('../notificationService', () => ({
  createNotification: jest.fn(),
}));

describe('appointmentService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.opportunity.create as jest.Mock).mockResolvedValue({
      id: 'opp-1',
      accountId: 'account-1',
      facilityId: 'facility-1',
      leadId: 'lead-1',
      status: 'walk_through_booked',
      updatedAt: new Date('2026-02-01T10:00:00.000Z'),
      createdAt: new Date('2026-02-01T10:00:00.000Z'),
    });
    (prisma.opportunity.update as jest.Mock).mockResolvedValue({ id: 'opp-1' });
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue({ id: 'contact-1' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      roles: [{ role: { key: 'manager' } }],
    });
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);
    (createNotification as jest.Mock).mockResolvedValue({ id: 'notif-1' });
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
        facilityId: 'facility-1',
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
    (prisma.facility.findFirst as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (prisma.contract.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      appointmentService.createAppointment({
        accountId: 'account-1',
        facilityId: 'facility-1',
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
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
      id: 'lead-1',
      archivedAt: null,
      convertedToAccountId: 'account-1',
      companyName: 'Acme Corp',
      contactName: 'Jane Doe',
      estimatedValue: null,
      probability: 0,
      expectedCloseDate: null,
      lostReason: null,
      assignedToUserId: null,
      createdByUserId: 'admin-1',
    });
    (prisma.facility.findFirst as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      type: 'walk_through',
      lead: { id: 'lead-1' },
      account: { id: 'account-1' },
      facility: { id: 'facility-1' },
      scheduledStart: new Date('2026-02-01T10:00:00.000Z'),
    });

    await appointmentService.createAppointment({
      leadId: 'lead-1',
      facilityId: 'facility-1',
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

  it('createAppointment should reject a second scheduled walkthrough for the same lead and location', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
      id: 'lead-1',
      archivedAt: null,
      convertedToAccountId: 'account-1',
      companyName: 'Acme Corp',
      contactName: 'Jane Doe',
      estimatedValue: null,
      probability: 0,
      expectedCloseDate: null,
      lostReason: null,
      assignedToUserId: null,
      createdByUserId: 'admin-1',
    });
    (prisma.facility.findFirst as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (prisma.appointment.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'appt-1' });

    await expect(
      appointmentService.createAppointment({
        leadId: 'lead-1',
        facilityId: 'facility-1',
        assignedToUserId: 'user-1',
        type: 'walk_through',
        status: 'scheduled',
        scheduledStart: new Date('2026-02-01T10:00:00.000Z'),
        scheduledEnd: new Date('2026-02-01T11:00:00.000Z'),
        timezone: 'America/New_York',
        createdByUserId: 'admin-1',
      })
    ).rejects.toThrow(
      'A walkthrough is already booked for this location. Reschedule the existing appointment instead.'
    );
  });

  it('createAppointment should allow a second scheduled walkthrough for the same lead on a different location', async () => {
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
      id: 'lead-1',
      archivedAt: null,
      convertedToAccountId: 'account-1',
      companyName: 'Acme Corp',
      contactName: 'Jane Doe',
      estimatedValue: null,
      probability: 0,
      expectedCloseDate: null,
      lostReason: null,
      assignedToUserId: null,
      createdByUserId: 'admin-1',
    });
    (prisma.facility.findFirst as jest.Mock).mockResolvedValue({ id: 'facility-2' });
    (prisma.appointment.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: 'appt-2',
      type: 'walk_through',
      lead: { id: 'lead-1' },
      account: { id: 'account-1' },
      facility: { id: 'facility-2' },
      scheduledStart: new Date('2026-02-02T10:00:00.000Z'),
    });

    await expect(
      appointmentService.createAppointment({
        leadId: 'lead-1',
        facilityId: 'facility-2',
        assignedToUserId: 'user-1',
        type: 'walk_through',
        status: 'scheduled',
        scheduledStart: new Date('2026-02-02T10:00:00.000Z'),
        scheduledEnd: new Date('2026-02-02T11:00:00.000Z'),
        timezone: 'America/New_York',
        createdByUserId: 'admin-1',
      })
    ).resolves.toMatchObject({
      id: 'appt-2',
      facility: { id: 'facility-2' },
    });

    expect(prisma.appointment.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          leadId: 'lead-1',
          facilityId: 'facility-2',
          type: 'walk_through',
          status: 'scheduled',
        }),
      })
    );
  });

  it('createAppointment should reject cleaner assignees', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      roles: [{ role: { key: 'cleaner' } }],
    });

    await expect(
      appointmentService.createAppointment({
        leadId: 'lead-1',
        facilityId: 'facility-1',
        assignedToUserId: 'user-1',
        type: 'walk_through',
        status: 'scheduled',
        scheduledStart: new Date('2026-02-01T10:00:00.000Z'),
        scheduledEnd: new Date('2026-02-01T11:00:00.000Z'),
        timezone: 'America/New_York',
        createdByUserId: 'admin-1',
      })
    ).rejects.toThrow('Assigned rep must be an owner, admin, or manager');
  });

  it('completeAppointment should reject when no tasks exist for facility', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      type: 'walk_through',
      status: 'scheduled',
      leadId: 'lead-1',
      facilityId: 'facility-1',
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

  it('updateAppointment should notify assigned user with serialized schedule metadata', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      type: 'visit',
      accountId: 'account-1',
      leadId: null,
      assignedToUserId: 'user-1',
    });
    (prisma.appointment.update as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      type: 'visit',
      assignedToUser: { id: 'user-1', fullName: 'Rep', email: 'rep@example.com' },
      scheduledStart: new Date('2026-02-05T10:00:00.000Z'),
      scheduledEnd: new Date('2026-02-05T11:00:00.000Z'),
    });

    await appointmentService.updateAppointment('appt-1', {
      notes: 'Updated instructions',
    });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'appointment_updated',
        metadata: expect.objectContaining({
          appointmentId: 'appt-1',
          scheduledStart: '2026-02-05T10:00:00.000Z',
          scheduledEnd: '2026-02-05T11:00:00.000Z',
        }),
      })
    );
  });

  it('updateAppointment resets reminder state when reassigned', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      type: 'visit',
      accountId: 'account-1',
      leadId: null,
      assignedToUserId: 'user-1',
      scheduledStart: new Date('2026-02-05T10:00:00.000Z'),
      scheduledEnd: new Date('2026-02-05T11:00:00.000Z'),
      status: 'scheduled',
      inspectionId: null,
    });
    (prisma.appointment.update as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      type: 'visit',
      assignedToUser: { id: 'user-2', fullName: 'Rep Two', email: 'rep2@example.com' },
      scheduledStart: new Date('2026-02-05T10:00:00.000Z'),
      scheduledEnd: new Date('2026-02-05T11:00:00.000Z'),
    });

    await appointmentService.updateAppointment('appt-1', {
      assignedToUserId: 'user-2',
    });

    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedToUserId: 'user-2',
          reminderSentAt: null,
        }),
      })
    );
  });
});
