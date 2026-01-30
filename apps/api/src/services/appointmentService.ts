import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

export interface AppointmentListParams {
  leadId?: string;
  assignedToUserId?: string;
  type?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includePast?: boolean;
}

export interface AppointmentCreateInput {
  leadId: string;
  assignedToUserId: string;
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
  completedAt: true,
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
  assignedToUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
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
    assignedToUserId,
    type,
    status,
    dateFrom,
    dateTo,
    includePast = false,
  } = params;

  const where: Prisma.AppointmentWhereInput = {};

  if (leadId) where.leadId = leadId;
  if (assignedToUserId) where.assignedToUserId = assignedToUserId;
  if (type) where.type = type;
  if (status) where.status = status;

  if (dateFrom || dateTo) {
    where.scheduledStart = {};
    if (dateFrom) where.scheduledStart.gte = dateFrom;
    if (dateTo) where.scheduledStart.lte = dateTo;
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

  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        leadId: input.leadId,
        assignedToUserId: input.assignedToUserId,
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

    if (input.type === 'walk_through') {
      await tx.lead.update({
        where: { id: input.leadId },
        data: { status: 'walk_through_booked' },
      });
    }

    await tx.notification.create({
      data: {
        userId: input.assignedToUserId,
        type: 'appointment_assigned',
        title: 'New appointment assigned',
        body: 'You have been assigned a new appointment.',
        metadata: {
          appointmentId: appointment.id,
          leadId: appointment.lead.id,
          type: appointment.type,
          scheduledStart: appointment.scheduledStart,
        },
      },
    });

    return appointment;
  });
}

export async function updateAppointment(id: string, input: AppointmentUpdateInput) {
  return prisma.appointment.update({
    where: { id },
    data: {
      assignedToUserId: input.assignedToUserId,
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

  return prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id },
      data: { status: 'rescheduled' },
    });

    const appointment = await tx.appointment.create({
      data: {
        leadId: existing.leadId,
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

    await tx.notification.create({
      data: {
        userId: existing.assignedToUserId,
        type: 'appointment_rescheduled',
        title: 'Appointment rescheduled',
        body: 'An assigned appointment has been rescheduled.',
        metadata: {
          appointmentId: appointment.id,
          leadId: appointment.lead.id,
          type: appointment.type,
          scheduledStart: appointment.scheduledStart,
        },
      },
    });

    return appointment;
  });
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
      },
      select: appointmentSelect,
    });

    if (appointment.type === 'walk_through') {
      await tx.lead.update({
        where: { id: appointment.leadId },
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
