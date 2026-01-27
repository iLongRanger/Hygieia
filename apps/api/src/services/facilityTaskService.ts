import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface FacilityTaskListParams {
  page?: number;
  limit?: number;
  facilityId?: string;
  areaId?: string;
  taskTemplateId?: string;
  cleaningFrequency?: string;
  isRequired?: boolean;
  priority?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface FacilityTaskCreateInput {
  facilityId: string;
  areaId?: string | null;
  taskTemplateId?: string | null;
  customName?: string | null;
  customInstructions?: string | null;
  estimatedMinutes?: number | null;
  baseMinutesOverride?: number | null;
  perSqftMinutesOverride?: number | null;
  perUnitMinutesOverride?: number | null;
  perRoomMinutesOverride?: number | null;
  isRequired?: boolean;
  cleaningFrequency?: string;
  conditionMultiplier?: number;
  priority?: number;
  fixtureMinutes?: { fixtureTypeId: string; minutesPerFixture: number }[];
  createdByUserId: string;
}

export interface FacilityTaskUpdateInput {
  areaId?: string | null;
  taskTemplateId?: string | null;
  customName?: string | null;
  customInstructions?: string | null;
  estimatedMinutes?: number | null;
  baseMinutesOverride?: number | null;
  perSqftMinutesOverride?: number | null;
  perUnitMinutesOverride?: number | null;
  perRoomMinutesOverride?: number | null;
  isRequired?: boolean;
  cleaningFrequency?: string;
  conditionMultiplier?: number;
  priority?: number;
  fixtureMinutes?: { fixtureTypeId: string; minutesPerFixture: number }[];
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

const facilityTaskSelect = {
  id: true,
  customName: true,
  customInstructions: true,
  estimatedMinutes: true,
  baseMinutesOverride: true,
  perSqftMinutesOverride: true,
  perUnitMinutesOverride: true,
  perRoomMinutesOverride: true,
  isRequired: true,
  cleaningFrequency: true,
  conditionMultiplier: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  facility: {
    select: {
      id: true,
      name: true,
      accountId: true,
    },
  },
  area: {
    select: {
      id: true,
      name: true,
      areaType: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  taskTemplate: {
    select: {
      id: true,
      name: true,
      cleaningType: true,
      estimatedMinutes: true,
      baseMinutes: true,
      perSqftMinutes: true,
      perUnitMinutes: true,
      perRoomMinutes: true,
      difficultyLevel: true,
    },
  },
  fixtureMinutes: {
    select: {
      id: true,
      minutesPerFixture: true,
      fixtureType: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.FacilityTaskSelect;

export async function listFacilityTasks(
  params: FacilityTaskListParams
): Promise<
  PaginatedResult<
    Prisma.FacilityTaskGetPayload<{ select: typeof facilityTaskSelect }>
  >
> {
  const {
    page = 1,
    limit = 50,
    facilityId,
    areaId,
    taskTemplateId,
    cleaningFrequency,
    isRequired,
    priority,
    search,
    sortBy = 'priority',
    sortOrder = 'asc',
    includeArchived = false,
  } = params;

  const where: Prisma.FacilityTaskWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (facilityId) {
    where.facilityId = facilityId;
  }

  if (areaId) {
    where.areaId = areaId;
  }

  if (taskTemplateId) {
    where.taskTemplateId = taskTemplateId;
  }

  if (cleaningFrequency) {
    where.cleaningFrequency = cleaningFrequency;
  }

  if (isRequired !== undefined) {
    where.isRequired = isRequired;
  }

  if (priority !== undefined) {
    where.priority = priority;
  }

  if (search) {
    where.OR = [
      { customName: { contains: search, mode: 'insensitive' } },
      { taskTemplate: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const validSortFields = [
    'createdAt',
    'priority',
    'estimatedMinutes',
    'cleaningFrequency',
  ];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'priority';

  const [tasks, total] = await Promise.all([
    prisma.facilityTask.findMany({
      where,
      select: facilityTaskSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facilityTask.count({ where }),
  ]);

  return {
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getFacilityTaskById(id: string) {
  return prisma.facilityTask.findUnique({
    where: { id },
    select: facilityTaskSelect,
  });
}

export async function createFacilityTask(input: FacilityTaskCreateInput) {
  return prisma.facilityTask.create({
    data: {
      facilityId: input.facilityId,
      areaId: input.areaId,
      taskTemplateId: input.taskTemplateId,
      customName: input.customName,
      customInstructions: input.customInstructions,
      estimatedMinutes: input.estimatedMinutes,
      baseMinutesOverride: input.baseMinutesOverride,
      perSqftMinutesOverride: input.perSqftMinutesOverride,
      perUnitMinutesOverride: input.perUnitMinutesOverride,
      perRoomMinutesOverride: input.perRoomMinutesOverride,
      isRequired: input.isRequired ?? true,
      cleaningFrequency: input.cleaningFrequency ?? 'daily',
      conditionMultiplier: input.conditionMultiplier ?? 1.0,
      priority: input.priority ?? 3,
      createdByUserId: input.createdByUserId,
      fixtureMinutes: input.fixtureMinutes && input.fixtureMinutes.length > 0 ? {
        create: input.fixtureMinutes.map((fixture) => ({
          fixtureTypeId: fixture.fixtureTypeId,
          minutesPerFixture: fixture.minutesPerFixture,
        })),
      } : undefined,
    },
    select: facilityTaskSelect,
  });
}

export async function updateFacilityTask(
  id: string,
  input: FacilityTaskUpdateInput
) {
  const updateData: Prisma.FacilityTaskUpdateInput = {};

  if (input.areaId !== undefined) {
    updateData.area = input.areaId
      ? { connect: { id: input.areaId } }
      : { disconnect: true };
  }
  if (input.taskTemplateId !== undefined) {
    updateData.taskTemplate = input.taskTemplateId
      ? { connect: { id: input.taskTemplateId } }
      : { disconnect: true };
  }
  if (input.customName !== undefined) updateData.customName = input.customName;
  if (input.customInstructions !== undefined)
    updateData.customInstructions = input.customInstructions;
  if (input.estimatedMinutes !== undefined)
    updateData.estimatedMinutes = input.estimatedMinutes;
  if (input.baseMinutesOverride !== undefined)
    updateData.baseMinutesOverride = input.baseMinutesOverride;
  if (input.perSqftMinutesOverride !== undefined)
    updateData.perSqftMinutesOverride = input.perSqftMinutesOverride;
  if (input.perUnitMinutesOverride !== undefined)
    updateData.perUnitMinutesOverride = input.perUnitMinutesOverride;
  if (input.perRoomMinutesOverride !== undefined)
    updateData.perRoomMinutesOverride = input.perRoomMinutesOverride;
  if (input.isRequired !== undefined) updateData.isRequired = input.isRequired;
  if (input.cleaningFrequency !== undefined)
    updateData.cleaningFrequency = input.cleaningFrequency;
  if (input.conditionMultiplier !== undefined)
    updateData.conditionMultiplier = input.conditionMultiplier;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.fixtureMinutes !== undefined) {
    updateData.fixtureMinutes = {
      deleteMany: {},
      create: input.fixtureMinutes.map((fixture) => ({
        fixtureTypeId: fixture.fixtureTypeId,
        minutesPerFixture: fixture.minutesPerFixture,
      })),
    };
  }

  return prisma.facilityTask.update({
    where: { id },
    data: updateData,
    select: facilityTaskSelect,
  });
}

export async function archiveFacilityTask(id: string) {
  return prisma.facilityTask.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: facilityTaskSelect,
  });
}

export async function restoreFacilityTask(id: string) {
  return prisma.facilityTask.update({
    where: { id },
    data: { archivedAt: null },
    select: facilityTaskSelect,
  });
}

export async function deleteFacilityTask(id: string) {
  return prisma.facilityTask.delete({
    where: { id },
    select: { id: true },
  });
}

export async function bulkCreateFacilityTasks(
  facilityId: string,
  taskTemplateIds: string[],
  createdByUserId: string,
  areaId?: string,
  cleaningFrequency?: string
) {
  const templates = await prisma.taskTemplate.findMany({
    where: { id: { in: taskTemplateIds } },
    select: {
      id: true,
      estimatedMinutes: true,
      cleaningType: true,
    },
  });

  const tasks = templates.map((template) => ({
    facilityId,
    areaId: areaId || null,
    taskTemplateId: template.id,
    estimatedMinutes: template.estimatedMinutes,
    // Use provided frequency, or map cleaningType to frequency, or default to daily
    cleaningFrequency: cleaningFrequency || mapCleaningTypeToFrequency(template.cleaningType),
    createdByUserId,
  }));

  return prisma.facilityTask.createMany({
    data: tasks,
  });
}

// Helper to map task template cleaning type to frequency
function mapCleaningTypeToFrequency(cleaningType: string): string {
  const mapping: Record<string, string> = {
    daily: 'daily',
    weekly: 'weekly',
    biweekly: 'biweekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    annual: 'annual',
    deep_clean: 'monthly',
    move_out: 'as_needed',
    post_construction: 'as_needed',
  };
  return mapping[cleaningType] || 'daily';
}
