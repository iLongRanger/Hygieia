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
  isRequired?: boolean;
  cleaningFrequency?: string;
  conditionMultiplier?: number;
  priority?: number;
  createdByUserId: string;
}

export interface FacilityTaskUpdateInput {
  areaId?: string | null;
  taskTemplateId?: string | null;
  customName?: string | null;
  customInstructions?: string | null;
  estimatedMinutes?: number | null;
  isRequired?: boolean;
  cleaningFrequency?: string;
  conditionMultiplier?: number;
  priority?: number;
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
      difficultyLevel: true,
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
      isRequired: input.isRequired ?? true,
      cleaningFrequency: input.cleaningFrequency ?? 'daily',
      conditionMultiplier: input.conditionMultiplier ?? 1.0,
      priority: input.priority ?? 3,
      createdByUserId: input.createdByUserId,
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
  if (input.isRequired !== undefined) updateData.isRequired = input.isRequired;
  if (input.cleaningFrequency !== undefined)
    updateData.cleaningFrequency = input.cleaningFrequency;
  if (input.conditionMultiplier !== undefined)
    updateData.conditionMultiplier = input.conditionMultiplier;
  if (input.priority !== undefined) updateData.priority = input.priority;

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
  createdByUserId: string
) {
  const templates = await prisma.taskTemplate.findMany({
    where: { id: { in: taskTemplateIds } },
    select: {
      id: true,
      estimatedMinutes: true,
    },
  });

  const tasks = templates.map((template) => ({
    facilityId,
    taskTemplateId: template.id,
    estimatedMinutes: template.estimatedMinutes,
    createdByUserId,
  }));

  return prisma.facilityTask.createMany({
    data: tasks,
  });
}
