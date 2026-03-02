import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { ValidationError } from '../middleware/errorHandler';

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

type DuplicateCandidateTask = {
  id: string;
  customName: string | null;
  taskTemplate: { id: string; name: string } | null;
};

function normalizeTaskName(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getTaskDisplayName(task: DuplicateCandidateTask): string {
  return task.customName ?? task.taskTemplate?.name ?? '';
}

async function getTaskNameFromTemplate(taskTemplateId: string): Promise<string> {
  const template = await prisma.taskTemplate.findUnique({
    where: { id: taskTemplateId },
    select: { name: true },
  });
  if (!template) {
    throw new ValidationError('Task template not found');
  }
  return template.name;
}

async function ensureNoDuplicateFacilityTask(params: {
  facilityId: string;
  areaId?: string | null;
  cleaningFrequency: string;
  taskTemplateId?: string | null;
  customName?: string | null;
  excludeTaskId?: string;
}) {
  const areaId = params.areaId ?? null;
  const incomingTaskName = params.taskTemplateId
    ? await getTaskNameFromTemplate(params.taskTemplateId)
    : params.customName ?? '';
  const normalizedIncomingName = normalizeTaskName(incomingTaskName);

  if (!normalizedIncomingName) {
    return;
  }

  const existingTasks = await prisma.facilityTask.findMany({
    where: {
      facilityId: params.facilityId,
      areaId,
      cleaningFrequency: params.cleaningFrequency,
      archivedAt: null,
      ...(params.excludeTaskId
        ? { id: { not: params.excludeTaskId } }
        : {}),
    },
    select: {
      id: true,
      customName: true,
      taskTemplate: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const hasDuplicate = existingTasks.some((task) => {
    const existingName = normalizeTaskName(getTaskDisplayName(task));
    return existingName === normalizedIncomingName;
  });

  if (hasDuplicate) {
    throw new ValidationError(
      `Duplicate task detected for this area and frequency: "${incomingTaskName.trim()}"`
    );
  }
}

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
  await ensureNoDuplicateFacilityTask({
    facilityId: input.facilityId,
    areaId: input.areaId,
    cleaningFrequency: input.cleaningFrequency ?? 'daily',
    taskTemplateId: input.taskTemplateId,
    customName: input.customName,
  });

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
  const existingTask = await prisma.facilityTask.findUnique({
    where: { id },
    select: {
      id: true,
      facilityId: true,
      areaId: true,
      taskTemplateId: true,
      customName: true,
      cleaningFrequency: true,
    },
  });

  if (!existingTask) {
    throw new ValidationError('Facility task not found');
  }

  const nextAreaId =
    input.areaId !== undefined ? input.areaId : existingTask.areaId;
  const nextTaskTemplateId =
    input.taskTemplateId !== undefined
      ? input.taskTemplateId
      : existingTask.taskTemplateId;
  const nextCustomName =
    input.customName !== undefined ? input.customName : existingTask.customName;
  const nextCleaningFrequency =
    input.cleaningFrequency !== undefined
      ? input.cleaningFrequency
      : existingTask.cleaningFrequency;

  await ensureNoDuplicateFacilityTask({
    facilityId: existingTask.facilityId,
    areaId: nextAreaId,
    cleaningFrequency: nextCleaningFrequency,
    taskTemplateId: nextTaskTemplateId,
    customName: nextCustomName,
    excludeTaskId: id,
  });

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
  const uniqueTemplateIds = Array.from(new Set(taskTemplateIds));

  const templates = await prisma.taskTemplate.findMany({
    where: { id: { in: uniqueTemplateIds } },
    select: {
      id: true,
      name: true,
      estimatedMinutes: true,
      cleaningType: true,
    },
  });

  const resolvedFrequency = cleaningFrequency || undefined;
  const existingTasks = await prisma.facilityTask.findMany({
    where: {
      facilityId,
      areaId: areaId ?? null,
      cleaningFrequency: resolvedFrequency ?? undefined,
      archivedAt: null,
    },
    select: {
      id: true,
      customName: true,
      taskTemplate: {
        select: {
          id: true,
          name: true,
        },
      },
      cleaningFrequency: true,
    },
  });

  const existingNameKeys = new Set(
    existingTasks.map((task) =>
      `${task.cleaningFrequency}::${normalizeTaskName(getTaskDisplayName(task))}`
    )
  );

  const seenIncomingKeys = new Set<string>();

  const tasks = templates
    .map((template) => {
      const taskFrequency =
        cleaningFrequency || mapCleaningTypeToFrequency(template.cleaningType);
      const nameKey = `${taskFrequency}::${normalizeTaskName(template.name)}`;

      if (existingNameKeys.has(nameKey) || seenIncomingKeys.has(nameKey)) {
        return null;
      }

      seenIncomingKeys.add(nameKey);
      return {
        facilityId,
        areaId: areaId || null,
        taskTemplateId: template.id,
        estimatedMinutes: template.estimatedMinutes,
        // Use provided frequency, or map cleaningType to frequency, or default to daily
        cleaningFrequency: taskFrequency,
        createdByUserId,
      };
    })
    .filter((task): task is NonNullable<typeof task> => task !== null);

  if (tasks.length === 0) {
    return { count: 0 };
  }

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
