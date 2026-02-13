import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { createNotification } from './notificationService';

export interface AppointmentListParams {
  leadId?: string;
  accountId?: string;
  assignedToUserId?: string;
  type?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includePast?: boolean;
}

export interface AppointmentCreateInput {
  leadId?: string;
  accountId?: string;
  assignedToUserId: string;
  assignedTeamId?: string | null;
  type: string;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  location?: string | null;
  notes?: string | null;
  createdByUserId: string;
}

export interface AppointmentUpdateInput {
  assignedToUserId?: string;
  assignedTeamId?: string | null;
  status?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  timezone?: string;
  location?: string | null;
  notes?: string | null;
}

export interface AppointmentRescheduleInput {
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  location?: string | null;
  notes?: string | null;
}

export interface AppointmentCompleteInput {
  facilityId: string;
  notes?: string | null;
  completionNotes?: string | null;
  actualDuration?: number | null;
  userId: string;
}

const appointmentSelect = {
  id: true,
  type: true,
  status: true,
  scheduledStart: true,
  scheduledEnd: true,
  timezone: true,
  location: true,
  notes: true,
  completionNotes: true,
  actualDuration: true,
  completedAt: true,
  reminderSentAt: true,
  rescheduledFromId: true,
  createdAt: true,
  updatedAt: true,
  lead: {
    select: {
      id: true,
      contactName: true,
      companyName: true,
      status: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  assignedTeam: {
    select: {
      id: true,
      name: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.AppointmentSelect;

export async function listAppointments(params: AppointmentListParams) {
  const {
    leadId,
    accountId,
    assignedToUserId,
    type,
    status,
    dateFrom,
    dateTo,
    includePast = false,
  } = params;

  const where: Prisma.AppointmentWhereInput = {};

  if (leadId) where.leadId = leadId;
  if (accountId) where.accountId = accountId;
  if (assignedToUserId) where.assignedToUserId = assignedToUserId;
  if (type) where.type = type;
  if (status) where.status = status;

  if (dateFrom || dateTo) {
    const overlapFilters: Prisma.AppointmentWhereInput[] = [];

    if (dateTo) {
      overlapFilters.push({ scheduledStart: { lte: dateTo } });
    }

    if (dateFrom) {
      overlapFilters.push({ scheduledEnd: { gte: dateFrom } });
    }

    if (overlapFilters.length === 1) {
      Object.assign(where, overlapFilters[0]);
    } else if (overlapFilters.length > 1) {
      where.AND = overlapFilters;
    }
  } else if (!includePast) {
    where.scheduledEnd = { gte: new Date() };
  }

  return prisma.appointment.findMany({
    where,
    select: appointmentSelect,
    orderBy: { scheduledStart: 'asc' },
  });
}

export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    select: appointmentSelect,
  });
}

export async function createAppointment(input: AppointmentCreateInput) {
  if (input.type === 'walk_through') {
    if (!input.leadId) {
      throw new BadRequestError('Lead is required for walkthrough appointments');
    }

    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      select: { id: true, archivedAt: true },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (lead.archivedAt) {
      throw new BadRequestError('Cannot schedule appointment for archived lead');
    }
  } else {
    if (!input.accountId) {
      throw new BadRequestError('Account is required for visit or inspection appointments');
    }

    const account = await prisma.account.findUnique({
      where: { id: input.accountId },
      select: { id: true, archivedAt: true },
    });

    if (!account || account.archivedAt) {
      throw new BadRequestError('Account not found or archived');
    }

    const activeContract = await prisma.contract.findFirst({
      where: {
        accountId: input.accountId,
        status: 'active',
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!activeContract) {
      throw new BadRequestError('Account must have an active contract');
    }
  }

  const { appointment, shouldNotify } = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        leadId: input.leadId ?? null,
        accountId: input.accountId ?? null,
        assignedToUserId: input.assignedToUserId,
        assignedTeamId: input.assignedTeamId ?? null,
        type: input.type,
        status: input.status,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        timezone: input.timezone,
        location: input.location ?? null,
        notes: input.notes ?? null,
        createdByUserId: input.createdByUserId,
      },
      select: appointmentSelect,
    });

    if (input.type === 'walk_through' && input.leadId) {
      await tx.lead.update({
        where: { id: input.leadId },
        data: { status: 'walk_through_booked' },
      });
    }

    return {
      appointment,
      shouldNotify: true,
    };
  });

  if (shouldNotify) {
    await createNotification({
      userId: input.assignedToUserId,
      type: 'appointment_assigned',
      title: 'New appointment assigned',
      body: 'You have been assigned a new appointment.',
      metadata: {
        appointmentId: appointment.id,
        leadId: appointment.lead?.id,
        accountId: appointment.account?.id,
        type: appointment.type,
        scheduledStart: appointment.scheduledStart.toISOString(),
      },
    });
  }

  return appointment;
}

export async function updateAppointment(id: string, input: AppointmentUpdateInput) {
  return prisma.appointment.update({
    where: { id },
    data: {
      assignedToUserId: input.assignedToUserId,
      assignedTeamId: input.assignedTeamId,
      status: input.status,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      timezone: input.timezone,
      location: input.location,
      notes: input.notes,
    },
    select: appointmentSelect,
  });
}

export async function deleteAppointment(id: string) {
  return prisma.appointment.delete({
    where: { id },
    select: { id: true },
  });
}

export async function rescheduleAppointment(
  id: string,
  input: AppointmentRescheduleInput,
  userId: string
) {
  const existing = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      leadId: true,
      accountId: true,
      assignedToUserId: true,
      status: true,
      type: true,
    },
  });

  if (!existing) {
    throw new NotFoundError('Appointment not found');
  }

  if (existing.status === 'completed') {
    throw new BadRequestError('Cannot reschedule a completed appointment');
  }

  const appointment = await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id },
      data: { status: 'rescheduled' },
    });

    const appointment = await tx.appointment.create({
      data: {
        leadId: existing.leadId ?? null,
        accountId: existing.accountId ?? null,
        assignedToUserId: existing.assignedToUserId,
        type: existing.type,
        status: 'scheduled',
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        timezone: input.timezone,
        location: input.location ?? null,
        notes: input.notes ?? null,
        createdByUserId: userId,
        rescheduledFromId: existing.id,
      },
      select: appointmentSelect,
    });

    return appointment;
  });

  await createNotification({
    userId: existing.assignedToUserId,
    type: 'appointment_rescheduled',
    title: 'Appointment rescheduled',
    body: 'An assigned appointment has been rescheduled.',
    metadata: {
      appointmentId: appointment.id,
      leadId: appointment.lead?.id,
      accountId: appointment.account?.id,
      type: appointment.type,
      scheduledStart: appointment.scheduledStart.toISOString(),
    },
  });

  return appointment;
}

export async function completeAppointment(
  id: string,
  input: AppointmentCompleteInput
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      status: true,
      leadId: true,
      assignedToUserId: true,
    },
  });

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  if (appointment.status === 'completed') {
    throw new BadRequestError('Appointment already completed');
  }

  if (appointment.type !== 'walk_through' || !appointment.leadId) {
    throw new BadRequestError('Only walkthrough appointments can be completed here');
  }

  const lead = await prisma.lead.findUnique({
    where: { id: appointment.leadId },
    select: { id: true, convertedToAccountId: true },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  if (!lead.convertedToAccountId) {
    throw new BadRequestError('Lead must be converted to an account before completion');
  }

  const facility = await prisma.facility.findFirst({
    where: {
      id: input.facilityId,
      accountId: lead.convertedToAccountId,
      archivedAt: null,
    },
    select: { id: true },
  });

  if (!facility) {
    throw new BadRequestError('Facility not found for this lead account');
  }

  const [areaCount, taskCount] = await Promise.all([
    prisma.area.count({
      where: { facilityId: facility.id, archivedAt: null },
    }),
    prisma.facilityTask.count({
      where: { facilityId: facility.id, archivedAt: null },
    }),
  ]);

  if (areaCount === 0) {
    throw new BadRequestError('Add at least one area before completing walkthrough');
  }

  if (taskCount === 0) {
    throw new BadRequestError('Add at least one task before completing walkthrough');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        notes: input.notes ?? undefined,
        completionNotes: input.completionNotes ?? undefined,
        actualDuration: input.actualDuration ?? undefined,
      },
      select: appointmentSelect,
    });

    if (appointment.type === 'walk_through') {
      await tx.lead.update({
        where: { id: appointment.leadId! },
        data: { status: 'walk_through_completed' },
      });
    }

    return updated;
  });
}

export async function canMoveLeadToProposal(leadId: string): Promise<boolean> {
  const latest = await prisma.appointment.findFirst({
    where: { leadId, type: 'walk_through' },
    orderBy: { scheduledStart: 'desc' },
    select: { status: true },
  });

  return latest?.status === 'completed';
}

/**
 * Find appointments that need reminders sent.
 * Returns appointments within the next 24 hours that haven't had a reminder sent yet.
 */
export async function getAppointmentsNeedingReminders() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return prisma.appointment.findMany({
    where: {
      status: 'scheduled',
      reminderSentAt: null,
      scheduledStart: {
        gte: now,
        lte: tomorrow,
      },
    },
    select: {
      ...appointmentSelect,
      assignedToUserId: true,
    },
  });
}

/**
 * Mark an appointment as having had its reminder sent.
 */
export async function markReminderSent(id: string) {
  return prisma.appointment.update({
    where: { id },
    data: { reminderSentAt: new Date() },
    select: { id: true },
  });
}
