import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { createNotification } from './notificationService';
import logger from '../lib/logger';
import { findPreferredOpportunityForLead } from './opportunityResolver';

export interface AppointmentListParams {
  leadId?: string;
  accountId?: string;
  facilityId?: string;
  assignedToUserId?: string;
  type?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includePast?: boolean;
}

interface AppointmentAccessOptions {
  userRole?: string;
  userId?: string;
}

export interface AppointmentCreateInput {
  leadId?: string;
  accountId?: string;
  facilityId: string;
  assignedToUserId: string;
  type: string;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  location?: string | null;
  notes?: string | null;
  createdByUserId: string;
  inspectionId?: string | null;
  skipAutoCreate?: boolean;
}

export interface AppointmentUpdateInput {
  facilityId?: string;
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

const APPOINTMENT_ASSIGNEE_ROLE_KEYS = new Set(['owner', 'admin', 'manager']);

function deriveOpportunityTitle(lead: {
  companyName?: string | null;
  contactName: string;
}): string {
  return lead.companyName?.trim() || lead.contactName.trim();
}

async function assertAssignableAppointmentRep(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      roles: {
        select: {
          role: {
            select: {
              key: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new BadRequestError('Assigned rep not found');
  }

  const hasEligibleRole = user.roles.some((assignment) =>
    APPOINTMENT_ASSIGNEE_ROLE_KEYS.has(assignment.role.key)
  );

  if (!hasEligibleRole) {
    throw new BadRequestError('Assigned rep must be an owner, admin, or manager');
  }
}

const appointmentSelect = {
  id: true,
  opportunityId: true,
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
  rescheduledFromId: true,
  inspectionId: true,
  createdAt: true,
  updatedAt: true,
  inspection: {
    select: {
      id: true,
      inspectionNumber: true,
      status: true,
    },
  },
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
  facility: {
    select: {
      id: true,
      name: true,
    },
  },
  opportunity: {
    select: {
      id: true,
      title: true,
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

async function assertNoAppointmentConflict(input: {
  assignedToUserId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  excludeAppointmentId?: string;
}) {
  const overlappingAppointment = await prisma.appointment.findFirst({
    where: {
      assignedToUserId: input.assignedToUserId,
      status: 'scheduled',
      ...(input.excludeAppointmentId
        ? { id: { not: input.excludeAppointmentId } }
        : {}),
      scheduledStart: { lt: input.scheduledEnd },
      scheduledEnd: { gt: input.scheduledStart },
    },
    select: {
      id: true,
      scheduledStart: true,
      scheduledEnd: true,
      type: true,
    },
  });

  if (overlappingAppointment) {
    throw new BadRequestError(
      'The assigned rep already has another appointment during this time window'
    );
  }
}

export async function listAppointments(
  params: AppointmentListParams,
  access: AppointmentAccessOptions = {}
) {
  const {
    leadId,
    accountId,
    facilityId,
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
  if (facilityId) where.facilityId = facilityId;
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

  if (access.userRole === 'manager' && access.userId) {
    where.account = { accountManagerId: access.userId };
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
  await assertAssignableAppointmentRep(input.assignedToUserId);
  await assertNoAppointmentConflict({
    assignedToUserId: input.assignedToUserId,
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
  });
  let walkthroughLeadAccountId: string | null = null;

  if (input.type === 'walk_through') {
    if (!input.leadId) {
      throw new BadRequestError('Lead is required for walkthrough appointments');
    }

    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      select: {
        id: true,
        archivedAt: true,
        convertedToAccountId: true,
        companyName: true,
        contactName: true,
        estimatedValue: true,
        probability: true,
        expectedCloseDate: true,
        lostReason: true,
        assignedToUserId: true,
        createdByUserId: true,
      },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (lead.archivedAt) {
      throw new BadRequestError('Cannot schedule appointment for archived lead');
    }

    walkthroughLeadAccountId = lead.convertedToAccountId;

    if (!lead.convertedToAccountId) {
      throw new BadRequestError('Lead must be converted before assigning a walkthrough to a facility');
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
      throw new BadRequestError('Facility not found for the selected lead account');
    }

    const existingWalkthrough = await prisma.appointment.findFirst({
      where: {
        leadId: input.leadId,
        type: 'walk_through',
        status: 'scheduled',
      },
      select: {
        id: true,
      },
    });

    if (existingWalkthrough) {
      throw new BadRequestError(
        'A walkthrough is already booked for this lead. Reschedule the existing appointment instead.'
      );
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

    const facility = await prisma.facility.findFirst({
      where: {
        id: input.facilityId,
        accountId: input.accountId,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!facility) {
      throw new BadRequestError('Facility not found for the selected account');
    }

    const activeContract = await prisma.contract.findFirst({
      where: {
        accountId: input.accountId,
        facilityId: input.facilityId,
        status: 'active',
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!activeContract) {
      throw new BadRequestError('Account must have an active contract');
    }
  }

  const appointment = await prisma.$transaction(async (tx) => {
    let opportunity =
      input.type === 'walk_through' && input.leadId
        ? await findPreferredOpportunityForLead(tx, input.leadId, {
            facilityId: input.facilityId ?? undefined,
          })
        : null;

    if (input.type === 'walk_through' && input.leadId && input.facilityId && !opportunity) {
      const [lead, primaryContact] = await Promise.all([
        tx.lead.findUnique({
          where: { id: input.leadId },
          select: {
            id: true,
            convertedToAccountId: true,
            companyName: true,
            contactName: true,
            estimatedValue: true,
            probability: true,
            expectedCloseDate: true,
            lostReason: true,
            assignedToUserId: true,
            createdByUserId: true,
          },
        }),
        walkthroughLeadAccountId
          ? tx.contact.findFirst({
              where: {
                accountId: walkthroughLeadAccountId,
              },
              select: {
                id: true,
              },
              orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'asc' },
              ],
            })
          : Promise.resolve(null),
      ]);

      if (!lead?.convertedToAccountId) {
        throw new BadRequestError('Lead must be converted before creating a facility opportunity');
      }

      opportunity = await tx.opportunity.create({
        data: {
          leadId: lead.id,
          accountId: lead.convertedToAccountId,
          facilityId: input.facilityId,
          primaryContactId: primaryContact?.id ?? null,
          title: deriveOpportunityTitle(lead),
          estimatedValue: lead.estimatedValue ?? null,
          probability: lead.probability ?? 0,
          expectedCloseDate: lead.expectedCloseDate ?? null,
          lostReason: lead.lostReason ?? null,
          ownerUserId: lead.assignedToUserId ?? null,
          createdByUserId: lead.createdByUserId,
          status: 'walk_through_booked',
        },
        select: {
          id: true,
          accountId: true,
          facilityId: true,
          leadId: true,
          status: true,
          updatedAt: true,
          createdAt: true,
        },
      });
    }

    if (input.type === 'walk_through' && input.leadId && !opportunity) {
      opportunity = await findPreferredOpportunityForLead(tx, input.leadId);
    }

    const appointment = await tx.appointment.create({
      data: {
        leadId: input.leadId ?? null,
        accountId: input.accountId ?? walkthroughLeadAccountId ?? null,
        facilityId: input.facilityId,
        opportunityId: opportunity?.id ?? null,
        assignedToUserId: input.assignedToUserId,
        type: input.type,
        status: input.status,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        timezone: input.timezone,
        location: input.location ?? null,
        notes: input.notes ?? null,
        createdByUserId: input.createdByUserId,
        inspectionId: input.inspectionId ?? null,
      },
      select: appointmentSelect,
    });

    if (input.type === 'walk_through' && input.leadId) {
      await tx.lead.update({
        where: { id: input.leadId },
        data: { status: 'walk_through_booked' },
      });

      if (opportunity) {
        await tx.opportunity.update({
          where: { id: opportunity.id },
          data: {
            status: 'walk_through_booked',
            facilityId: input.facilityId,
          },
        });
      }
    }

    return appointment;
  });

  // Auto-create inspection for inspection-type appointments
  if (input.type === 'inspection' && !input.skipAutoCreate && !input.inspectionId && input.accountId) {
    try {
      const { createInspection } = await import('./inspectionService');
      const inspection = await createInspection({
        facilityId: input.facilityId,
        accountId: input.accountId,
        inspectorUserId: input.assignedToUserId,
        scheduledDate: input.scheduledStart,
        createdByUserId: input.createdByUserId,
        skipAutoCreate: true,
      });
      // Link inspection to appointment
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { inspectionId: inspection.id },
      });
    } catch (e) {
      // Don't fail appointment creation if inspection auto-create fails
      console.error('Failed to auto-create inspection for appointment:', e);
    }
  }

  await createNotification({
    userId: input.assignedToUserId,
    type: 'appointment_assigned',
    title: 'New appointment assigned',
    body: 'You have been assigned a new appointment.',
    metadata: {
      appointmentId: appointment.id,
      leadId: appointment.lead?.id,
      accountId: appointment.account?.id,
      facilityId: appointment.facility?.id,
      type: appointment.type,
      scheduledStart: appointment.scheduledStart.toISOString(),
    },
  });

  return appointment;
}

export async function updateAppointment(id: string, input: AppointmentUpdateInput) {
  const existing = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      leadId: true,
      accountId: true,
      type: true,
      assignedToUserId: true,
      scheduledStart: true,
      scheduledEnd: true,
      status: true,
    },
  });

  if (!existing) {
    throw new NotFoundError('Appointment not found');
  }

  if (input.facilityId) {
    if (existing.type === 'walk_through') {
      if (!existing.leadId) {
        throw new BadRequestError('Walkthrough appointment is missing a lead');
      }

      const lead = await prisma.lead.findUnique({
        where: { id: existing.leadId },
        select: { convertedToAccountId: true },
      });

      if (!lead?.convertedToAccountId) {
        throw new BadRequestError('Lead must be converted before assigning a walkthrough to a facility');
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
        throw new BadRequestError('Facility not found for the selected lead account');
      }
    } else {
      if (!existing.accountId) {
        throw new BadRequestError('Appointment account not found');
      }

      const facility = await prisma.facility.findFirst({
        where: {
          id: input.facilityId,
          accountId: existing.accountId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!facility) {
        throw new BadRequestError('Facility not found for the selected account');
      }
    }
  }

  if (input.assignedToUserId) {
    await assertAssignableAppointmentRep(input.assignedToUserId);
  }

  const resolvedAssignedToUserId = input.assignedToUserId ?? existing.assignedToUserId;
  const resolvedStatus = input.status ?? existing.status;
  const resolvedScheduledStart = input.scheduledStart ?? existing.scheduledStart;
  const resolvedScheduledEnd = input.scheduledEnd ?? existing.scheduledEnd;

  if (
    resolvedStatus === 'scheduled' &&
    resolvedAssignedToUserId &&
    resolvedScheduledStart &&
    resolvedScheduledEnd
  ) {
    await assertNoAppointmentConflict({
      assignedToUserId: resolvedAssignedToUserId,
      scheduledStart: resolvedScheduledStart,
      scheduledEnd: resolvedScheduledEnd,
      excludeAppointmentId: id,
    });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      facilityId: input.facilityId,
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

  // Notify assigned user about the update
  if (appointment.assignedToUser?.id) {
    const assignmentChanged =
      input.assignedToUserId !== undefined &&
      input.assignedToUserId !== existing.assignedToUserId;

    try {
      await createNotification({
        userId: appointment.assignedToUser.id,
        type: assignmentChanged ? 'appointment_assigned' : 'appointment_updated',
        title: assignmentChanged ? 'Appointment assigned to you' : 'Appointment updated',
        body: assignmentChanged
          ? `You have been assigned a ${appointment.type} appointment.`
          : `Your ${appointment.type} appointment has been updated.`,
        metadata: {
          appointmentId: appointment.id,
          type: appointment.type,
          scheduledStart: appointment.scheduledStart.toISOString(),
          scheduledEnd: appointment.scheduledEnd.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to create appointment update notification', {
        appointmentId: appointment.id,
        assignedToUserId: appointment.assignedToUser.id,
        error,
      });
    }
  }

  return appointment;
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
      facilityId: true,
      opportunityId: true,
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

  await assertNoAppointmentConflict({
    assignedToUserId: existing.assignedToUserId,
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    excludeAppointmentId: id,
  });

  const appointment = await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id },
      data: { status: 'rescheduled' },
    });

    const appointment = await tx.appointment.create({
      data: {
        leadId: existing.leadId ?? null,
        accountId: existing.accountId ?? null,
        facilityId: existing.facilityId ?? null,
        opportunityId: existing.opportunityId ?? null,
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
      facilityId: true,
      accountId: true,
      opportunityId: true,
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

  if (appointment.facilityId && appointment.facilityId !== facility.id) {
    throw new BadRequestError('Walkthrough must be completed for the same facility it was scheduled for');
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
        facilityId: facility.id,
        notes: input.notes ?? undefined,
      },
      select: appointmentSelect,
    });

    if (appointment.type === 'walk_through') {
      await tx.lead.update({
        where: { id: appointment.leadId! },
        data: { status: 'walk_through_completed' },
      });

      if (appointment.opportunityId) {
        await tx.opportunity.update({
          where: { id: appointment.opportunityId },
          data: { status: 'walk_through_completed' },
        });
      }
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
