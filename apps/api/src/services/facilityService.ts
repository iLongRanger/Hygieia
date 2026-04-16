import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import { geocodeAddressIfNeeded } from './geocodingService';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { completeAppointment } from './appointmentService';
import { hasNormalizedNameMatch, normalizeComparableName } from '../lib/dedupe';
import { findPreferredOpportunityForAccount } from './opportunityResolver';

export interface FacilityListParams {
  page?: number;
  limit?: number;
  accountId?: string;
  status?: string;
  buildingType?: string;
  facilityManagerId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface FacilityCreateInput {
  accountId: string;
  name: string;
  address: Record<string, unknown>;
  buildingType?: string | null;
  accessInstructions?: string | null;
  parkingInfo?: string | null;
  specialRequirements?: string | null;
  facilityManagerId?: string | null;
  status?: string;
  notes?: string | null;
  createdByUserId: string;
}

export interface FacilityUpdateInput {
  name?: string;
  address?: Record<string, unknown>;
  buildingType?: string | null;
  accessInstructions?: string | null;
  parkingInfo?: string | null;
  specialRequirements?: string | null;
  facilityManagerId?: string | null;
  status?: string;
  notes?: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const facilitySelect = {
  id: true,
  name: true,
  residentialPropertyId: true,
  address: true,
  squareFeet: true,
  buildingType: true,
  accessInstructions: true,
  parkingInfo: true,
  specialRequirements: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  account: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  facilityManager: {
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
  areas: {
    where: { archivedAt: null },
    select: {
      squareFeet: true,
      quantity: true,
    },
  },
  _count: {
    select: {
      areas: true,
      facilityTasks: true,
      proposals: true,
      contracts: true,
    },
  },
} satisfies Prisma.FacilitySelect;

async function assertNoDuplicateFacility(
  input: {
    accountId: string;
    name?: string;
  },
  excludeFacilityId?: string
): Promise<void> {
  const normalizedName = normalizeComparableName(input.name);
  if (!normalizedName) {
    return;
  }

  const candidates = await prisma.facility.findMany({
    where: {
      accountId: input.accountId,
      archivedAt: null,
      ...(excludeFacilityId ? { id: { not: excludeFacilityId } } : {}),
    },
    select: {
      id: true,
      name: true,
    },
  });

  const duplicate = candidates.find((candidate) =>
    hasNormalizedNameMatch(candidate.name, normalizedName)
  );

  if (duplicate) {
    throw new BadRequestError(
      `A facility named "${duplicate.name}" already exists for this account. Use the existing facility instead.`
    );
  }
}

export async function listFacilities(
  params: FacilityListParams,
  options?: { userRole?: string; userId?: string; userTeamId?: string }
): Promise<
  PaginatedResult<Prisma.FacilityGetPayload<{ select: typeof facilitySelect }>>
> {
  const {
    page = 1,
    limit = 20,
    accountId,
    status,
    buildingType,
    facilityManagerId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.FacilityWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  if (status) {
    where.status = status;
  }

  if (buildingType) {
    where.buildingType = buildingType;
  }

  if (facilityManagerId) {
    where.facilityManagerId = facilityManagerId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { account: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // RBAC scoping
  if (options?.userRole === 'cleaner' && options.userId) {
    where.jobs = { some: { assignedToUserId: options.userId } };
  } else if (options?.userRole === 'subcontractor' && options.userTeamId) {
    where.contracts = { some: { assignedTeamId: options.userTeamId } };
  } else if (options?.userRole === 'manager' && options.userId) {
    where.account = { accountManagerId: options.userId };
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name', 'squareFeet'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [facilities, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      select: facilitySelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facility.count({ where }),
  ]);

  return {
    data: facilities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getFacilityById(id: string) {
  const facility = await prisma.facility.findUnique({
    where: { id },
    select: facilitySelect,
  });

  if (!facility) {
    return null;
  }

  const opportunity = await findPreferredOpportunityForAccount(prisma, facility.account.id, {
    requireLeadId: true,
    facilityId: facility.id,
  });

  return {
    ...facility,
    submittedForProposal:
      opportunity?.status === 'walk_through_completed'
      || opportunity?.status === 'proposal_sent'
      || opportunity?.status === 'negotiation'
      || opportunity?.status === 'won',
  };
}

export async function createFacility(input: FacilityCreateInput) {
  const normalizedName = input.name.trim();
  await assertNoDuplicateFacility({
    accountId: input.accountId,
    name: normalizedName,
  });

  const normalizedAddress = await geocodeAddressIfNeeded(input.address);

  const facility = await prisma.facility.create({
    data: {
      accountId: input.accountId,
      name: normalizedName,
      address: normalizedAddress as Prisma.InputJsonValue,
      buildingType: input.buildingType,
      accessInstructions: input.accessInstructions,
      parkingInfo: input.parkingInfo,
      specialRequirements: input.specialRequirements,
      facilityManagerId: input.facilityManagerId,
      status: input.status ?? 'active',
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
    select: facilitySelect,
  });

  const sourceOpportunity = await findPreferredOpportunityForAccount(prisma, input.accountId, {
    requireLeadId: true,
  });

  if (sourceOpportunity?.leadId) {
    const [lead, primaryContact] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: sourceOpportunity.leadId },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          estimatedValue: true,
          probability: true,
          expectedCloseDate: true,
          assignedToUserId: true,
          createdByUserId: true,
        },
      }),
      prisma.contact.findFirst({
        where: {
          accountId: input.accountId,
          archivedAt: null,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        select: { id: true },
      }),
    ]);

    await prisma.opportunity.create({
      data: {
        leadId: sourceOpportunity.leadId,
        accountId: input.accountId,
        facilityId: facility.id,
        primaryContactId: primaryContact?.id ?? null,
        title: lead?.companyName?.trim() ?? lead?.contactName?.trim() ?? normalizedName,
        source: null,
        estimatedValue: lead?.estimatedValue ?? null,
        probability: lead?.probability ?? 0,
        expectedCloseDate: lead?.expectedCloseDate ?? null,
        ownerUserId: lead?.assignedToUserId ?? null,
        createdByUserId: sourceOpportunity.leadId ? (lead?.createdByUserId ?? input.createdByUserId) : input.createdByUserId,
        status: 'lead',
      } satisfies Prisma.OpportunityUncheckedCreateInput,
    });
  }

  return facility;
}

export async function updateFacility(id: string, input: FacilityUpdateInput) {
  const updateData: Prisma.FacilityUpdateInput = {};
  let currentFacility:
    | {
        accountId: string;
        name: string;
      }
    | null = null;

  const getCurrentFacility = async () => {
    if (currentFacility) {
      return currentFacility;
    }

    currentFacility = await prisma.facility.findUnique({
      where: { id },
      select: {
        accountId: true,
        name: true,
      },
    });

    if (!currentFacility) {
      throw new NotFoundError('Facility not found');
    }

    return currentFacility;
  };

  if (input.name !== undefined) {
    const existingFacility = await getCurrentFacility();
    await assertNoDuplicateFacility(
      {
        accountId: existingFacility.accountId,
        name: input.name,
      },
      id
    );
  }

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.address !== undefined) {
    const normalizedAddress = await geocodeAddressIfNeeded(input.address);
    updateData.address = normalizedAddress as Prisma.InputJsonValue;
  }

  if (input.buildingType !== undefined)
    updateData.buildingType = input.buildingType;
  if (input.accessInstructions !== undefined)
    updateData.accessInstructions = input.accessInstructions;
  if (input.parkingInfo !== undefined)
    updateData.parkingInfo = input.parkingInfo;
  if (input.specialRequirements !== undefined)
    updateData.specialRequirements = input.specialRequirements;
  if (input.facilityManagerId !== undefined) {
    updateData.facilityManager = input.facilityManagerId
      ? { connect: { id: input.facilityManagerId } }
      : { disconnect: true };
  }
  if (input.status !== undefined) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes;

  return prisma.facility.update({
    where: { id },
    data: updateData,
    select: facilitySelect,
  });
}

export async function archiveFacility(id: string) {
  return prisma.facility.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: facilitySelect,
  });
}

export async function restoreFacility(id: string) {
  return prisma.facility.update({
    where: { id },
    data: { archivedAt: null },
    select: facilitySelect,
  });
}

export async function deleteFacility(id: string) {
  return prisma.facility.delete({
    where: { id },
    select: { id: true },
  });
}

export async function submitFacilityForProposal(
  facilityId: string,
  input: { userId: string; notes?: string | null }
): Promise<{
  facilityId: string;
  leadId: string;
  appointmentId: string;
  appointmentStatus: 'completed';
  leadStatus: 'walk_through_completed';
  alreadyCompleted: boolean;
}> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: {
      id: true,
      accountId: true,
      archivedAt: true,
    },
  });

  if (!facility) {
    throw new NotFoundError('Facility not found');
  }

  if (facility.archivedAt) {
    throw new BadRequestError('Cannot submit an archived facility');
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
    throw new BadRequestError('Add at least one area before submitting this facility');
  }

  if (taskCount === 0) {
    throw new BadRequestError('Add at least one task before submitting this facility');
  }

  const opportunity = await findPreferredOpportunityForAccount(prisma, facility.accountId, {
    requireLeadId: true,
    facilityId: facility.id,
  });

  if (!opportunity?.leadId) {
    throw new BadRequestError('No active opportunity found for this facility account');
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      type: 'walk_through',
      OR: [
        { opportunityId: opportunity.id },
        { leadId: opportunity.leadId },
      ],
    },
    orderBy: {
      scheduledStart: 'desc',
    },
    select: {
      id: true,
      status: true,
      opportunityId: true,
    },
  });

  if (!appointment) {
    throw new BadRequestError('No walkthrough appointment found for this opportunity');
  }

  if (appointment.status === 'canceled' || appointment.status === 'no_show') {
    throw new BadRequestError(
      'Latest walkthrough is not completable. Reschedule walkthrough before submitting.'
    );
  }

  if (appointment.status === 'completed') {
    throw new BadRequestError('Facility has already been submitted for proposal');
  }

  await completeAppointment(appointment.id, {
    facilityId: facility.id,
    notes: input.notes ?? null,
    userId: input.userId,
  });

  return {
    facilityId: facility.id,
    leadId: opportunity.leadId,
    appointmentId: appointment.id,
    appointmentStatus: 'completed',
    leadStatus: 'walk_through_completed',
    alreadyCompleted: false,
  };
}

export interface TaskTimeBreakdownItem {
  taskId: string;
  taskName: string;
  calculatedMinutes: number;
}

export interface AreaTimeBreakdown {
  id: string;
  name: string;
  squareFeet: number;
  floorType: string;
  tasks: TaskTimeBreakdownItem[];
  totalMinutes: number;
}

export interface FacilityTaskTimeBreakdown {
  facilityId: string;
  facilityName: string;
  areas: AreaTimeBreakdown[];
  totalMinutes: number;
  totalHours: number;
}

/**
 * Get task time breakdown for a facility.
 * Calculates the estimated time for each task in each area based on
 * task templates, area dimensions, fixtures, and room/unit counts.
 */
export async function getTaskTimeBreakdown(
  facilityId: string
): Promise<FacilityTaskTimeBreakdown> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      areas: {
        where: { archivedAt: null },
        include: {
          areaType: true,
          fixtures: {
            include: {
              fixtureType: true,
            },
          },
        },
      },
    },
  });

  if (!facility) {
    throw new Error('Facility not found');
  }

  const facilityTasks = await prisma.facilityTask.findMany({
    where: {
      facilityId,
      archivedAt: null,
    },
    include: {
      taskTemplate: {
        include: {
          fixtureMinutes: {
            include: { fixtureType: true },
          },
        },
      },
      fixtureMinutes: {
        include: { fixtureType: true },
      },
    },
  });

  // Group tasks by area
  const tasksByArea = new Map<string | null, typeof facilityTasks>();
  for (const task of facilityTasks) {
    const areaId = task.areaId ?? null;
    if (!tasksByArea.has(areaId)) {
      tasksByArea.set(areaId, []);
    }
    const tasksForArea = tasksByArea.get(areaId);
    if (tasksForArea) {
      tasksForArea.push(task);
    }
  }

  const areaBreakdowns: AreaTimeBreakdown[] = [];
  let grandTotalMinutes = 0;

  for (const area of facility.areas) {
    const areaQuantity = area.quantity ?? 1;
    const totalAreaSqFt = (Number(area.squareFeet) ?? 0) * areaQuantity;
    const totalRoomCount = (area.roomCount ?? 0) * areaQuantity;
    const totalUnitCount = (area.unitCount ?? 0) * areaQuantity;

    const areaTasks = tasksByArea.get(area.id) ?? [];
    const taskBreakdowns: TaskTimeBreakdownItem[] = [];
    let areaTotalMinutes = 0;

    // Build fixture lookup for this area
    const areaFixtureCounts = new Map<string, number>();
    for (const fixture of area.fixtures) {
      areaFixtureCounts.set(
        fixture.fixtureTypeId,
        (fixture.count ?? 0) * areaQuantity
      );
    }

    for (const task of areaTasks) {
      const template = task.taskTemplate;
      const baseMinutes = Number(task.baseMinutesOverride ?? template?.baseMinutes ?? 0);
      const perSqftMinutes = Number(task.perSqftMinutesOverride ?? template?.perSqftMinutes ?? 0);
      const perUnitMinutes = Number(template?.perUnitMinutes ?? 0);
      const perRoomMinutes = Number(template?.perRoomMinutes ?? 0);

      // Build fixture minutes map (template values + overrides)
      const fixtureMinutesMap: Record<string, number> = {};
      if (template?.fixtureMinutes) {
        for (const fm of template.fixtureMinutes) {
          fixtureMinutesMap[fm.fixtureTypeId] = Number(fm.minutesPerFixture) ?? 0;
        }
      }
      if (task.fixtureMinutes) {
        for (const fm of task.fixtureMinutes) {
          fixtureMinutesMap[fm.fixtureTypeId] = Number(fm.minutesPerFixture) ?? 0;
        }
      }

      // Calculate task minutes
      let taskMinutes = baseMinutes;
      taskMinutes += perSqftMinutes * totalAreaSqFt;
      taskMinutes += perUnitMinutes * totalUnitCount;
      taskMinutes += perRoomMinutes * totalRoomCount;

      // Add fixture-based minutes
      for (const [fixtureTypeId, minutesPerFixture] of Object.entries(fixtureMinutesMap)) {
        const fixtureCount = areaFixtureCounts.get(fixtureTypeId) ?? 0;
        taskMinutes += minutesPerFixture * fixtureCount;
      }

      const taskName = task.customName ?? template?.name ?? 'Unnamed Task';
      taskBreakdowns.push({
        taskId: task.id,
        taskName,
        calculatedMinutes: roundToTwo(taskMinutes),
      });

      areaTotalMinutes += taskMinutes;
    }

    // Add time from area fixtures with minutesPerItem
    for (const fixture of area.fixtures) {
      const minutesPerItem = Number(fixture.minutesPerItem) ?? 0;
      if (minutesPerItem > 0) {
        const fixtureCount = (fixture.count ?? 0) * areaQuantity;
        areaTotalMinutes += minutesPerItem * fixtureCount;
      }
    }

    areaBreakdowns.push({
      id: area.id,
      name: area.name ?? area.areaType.name,
      squareFeet: totalAreaSqFt,
      floorType: area.floorType ?? 'vct',
      tasks: taskBreakdowns,
      totalMinutes: roundToTwo(areaTotalMinutes),
    });

    grandTotalMinutes += areaTotalMinutes;
  }

  // Handle facility-wide tasks (tasks not assigned to any specific area)
  const facilityWideTasks = tasksByArea.get(null) ?? [];
  if (facilityWideTasks.length > 0) {
    const totalFacilitySqFt = facility.areas.reduce((sum, area) => {
      return sum + (Number(area.squareFeet) ?? 0) * (area.quantity ?? 1);
    }, 0);

    const taskBreakdowns: TaskTimeBreakdownItem[] = [];
    let facilityWideMinutes = 0;

    for (const task of facilityWideTasks) {
      const template = task.taskTemplate;
      const baseMinutes = Number(task.baseMinutesOverride ?? template?.baseMinutes ?? 0);
      const perSqftMinutes = Number(task.perSqftMinutesOverride ?? template?.perSqftMinutes ?? 0);

      let taskMinutes = baseMinutes;
      taskMinutes += perSqftMinutes * totalFacilitySqFt;

      const taskName = task.customName ?? template?.name ?? 'Unnamed Task';
      taskBreakdowns.push({
        taskId: task.id,
        taskName,
        calculatedMinutes: roundToTwo(taskMinutes),
      });

      facilityWideMinutes += taskMinutes;
    }

    if (taskBreakdowns.length > 0) {
      areaBreakdowns.push({
        id: 'facility-wide',
        name: 'Facility-Wide',
        squareFeet: totalFacilitySqFt,
        floorType: 'mixed',
        tasks: taskBreakdowns,
        totalMinutes: roundToTwo(facilityWideMinutes),
      });

      grandTotalMinutes += facilityWideMinutes;
    }
  }

  return {
    facilityId: facility.id,
    facilityName: facility.name,
    areas: areaBreakdowns,
    totalMinutes: roundToTwo(grandTotalMinutes),
    totalHours: roundToTwo(grandTotalMinutes / 60),
  };
}

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}
