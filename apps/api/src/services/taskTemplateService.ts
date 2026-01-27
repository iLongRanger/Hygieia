import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface TaskTemplateListParams {
  page?: number;
  limit?: number;
  cleaningType?: string;
  areaTypeId?: string;
  facilityId?: string;
  isGlobal?: boolean;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface TaskTemplateCreateInput {
  name: string;
  description?: string | null;
  cleaningType: string;
  areaTypeId?: string | null;
  estimatedMinutes?: number | null;
  baseMinutes?: number;
  perSqftMinutes?: number;
  perUnitMinutes?: number;
  perRoomMinutes?: number;
  difficultyLevel?: number;
  requiredEquipment?: string[];
  requiredSupplies?: string[];
  instructions?: string | null;
  isGlobal?: boolean;
  facilityId?: string | null;
  isActive?: boolean;
  fixtureMinutes?: { fixtureTypeId: string; minutesPerFixture: number }[];
  createdByUserId: string;
}

export interface TaskTemplateUpdateInput {
  name?: string;
  description?: string | null;
  cleaningType?: string;
  areaTypeId?: string | null;
  estimatedMinutes?: number;
  baseMinutes?: number;
  perSqftMinutes?: number;
  perUnitMinutes?: number;
  perRoomMinutes?: number;
  difficultyLevel?: number;
  requiredEquipment?: string[];
  requiredSupplies?: string[];
  instructions?: string | null;
  isGlobal?: boolean;
  facilityId?: string | null;
  isActive?: boolean;
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

const taskTemplateSelect = {
  id: true,
  name: true,
  description: true,
  cleaningType: true,
  estimatedMinutes: true,
  baseMinutes: true,
  perSqftMinutes: true,
  perUnitMinutes: true,
  perRoomMinutes: true,
  difficultyLevel: true,
  requiredEquipment: true,
  requiredSupplies: true,
  instructions: true,
  isGlobal: true,
  version: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  areaType: {
    select: {
      id: true,
      name: true,
    },
  },
  facility: {
    select: {
      id: true,
      name: true,
      accountId: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
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
  _count: {
    select: {
      facilityTasks: true,
    },
  },
} satisfies Prisma.TaskTemplateSelect;

export async function listTaskTemplates(
  params: TaskTemplateListParams
): Promise<
  PaginatedResult<
    Prisma.TaskTemplateGetPayload<{ select: typeof taskTemplateSelect }>
  >
> {
  const {
    page = 1,
    limit = 20,
    cleaningType,
    areaTypeId,
    facilityId,
    isGlobal,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.TaskTemplateWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (cleaningType) {
    where.cleaningType = cleaningType;
  }

  if (areaTypeId) {
    where.areaTypeId = areaTypeId;
  }

  if (facilityId) {
    where.facilityId = facilityId;
  }

  if (isGlobal !== undefined) {
    where.isGlobal = isGlobal;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const validSortFields = ['createdAt', 'name', 'estimatedMinutes'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [templates, total] = await Promise.all([
    prisma.taskTemplate.findMany({
      where,
      select: taskTemplateSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.taskTemplate.count({ where }),
  ]);

  return {
    data: templates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTaskTemplateById(id: string) {
  return prisma.taskTemplate.findUnique({
    where: { id },
    select: taskTemplateSelect,
  });
}

export async function createTaskTemplate(input: TaskTemplateCreateInput) {
  return prisma.taskTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      cleaningType: input.cleaningType,
      areaTypeId: input.areaTypeId,
      estimatedMinutes: input.estimatedMinutes ?? 0,
      baseMinutes: input.baseMinutes ?? 0,
      perSqftMinutes: input.perSqftMinutes ?? 0,
      perUnitMinutes: input.perUnitMinutes ?? 0,
      perRoomMinutes: input.perRoomMinutes ?? 0,
      difficultyLevel: input.difficultyLevel ?? 3,
      requiredEquipment: input.requiredEquipment ?? [],
      requiredSupplies: input.requiredSupplies ?? [],
      instructions: input.instructions,
      isGlobal: input.isGlobal ?? false,
      facilityId: input.facilityId,
      isActive: input.isActive ?? true,
      createdByUserId: input.createdByUserId,
      fixtureMinutes: input.fixtureMinutes && input.fixtureMinutes.length > 0 ? {
        create: input.fixtureMinutes.map((fixture) => ({
          fixtureTypeId: fixture.fixtureTypeId,
          minutesPerFixture: fixture.minutesPerFixture,
        })),
      } : undefined,
    },
    select: taskTemplateSelect,
  });
}

export async function updateTaskTemplate(
  id: string,
  input: TaskTemplateUpdateInput
) {
  const updateData: Prisma.TaskTemplateUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.cleaningType !== undefined)
    updateData.cleaningType = input.cleaningType;
  if (input.areaTypeId !== undefined) {
    updateData.areaType = input.areaTypeId
      ? { connect: { id: input.areaTypeId } }
      : { disconnect: true };
  }
  if (input.estimatedMinutes !== undefined)
    updateData.estimatedMinutes = input.estimatedMinutes;
  if (input.baseMinutes !== undefined) updateData.baseMinutes = input.baseMinutes;
  if (input.perSqftMinutes !== undefined) updateData.perSqftMinutes = input.perSqftMinutes;
  if (input.perUnitMinutes !== undefined) updateData.perUnitMinutes = input.perUnitMinutes;
  if (input.perRoomMinutes !== undefined) updateData.perRoomMinutes = input.perRoomMinutes;
  if (input.difficultyLevel !== undefined)
    updateData.difficultyLevel = input.difficultyLevel;
  if (input.requiredEquipment !== undefined)
    updateData.requiredEquipment = input.requiredEquipment;
  if (input.requiredSupplies !== undefined)
    updateData.requiredSupplies = input.requiredSupplies;
  if (input.instructions !== undefined)
    updateData.instructions = input.instructions;
  if (input.isGlobal !== undefined) updateData.isGlobal = input.isGlobal;
  if (input.facilityId !== undefined) {
    updateData.facility = input.facilityId
      ? { connect: { id: input.facilityId } }
      : { disconnect: true };
  }
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.fixtureMinutes !== undefined) {
    updateData.fixtureMinutes = {
      deleteMany: {},
      create: input.fixtureMinutes.map((fixture) => ({
        fixtureTypeId: fixture.fixtureTypeId,
        minutesPerFixture: fixture.minutesPerFixture,
      })),
    };
  }

  return prisma.taskTemplate.update({
    where: { id },
    data: updateData,
    select: taskTemplateSelect,
  });
}

export async function archiveTaskTemplate(id: string) {
  return prisma.taskTemplate.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: taskTemplateSelect,
  });
}

export async function restoreTaskTemplate(id: string) {
  return prisma.taskTemplate.update({
    where: { id },
    data: { archivedAt: null },
    select: taskTemplateSelect,
  });
}

export async function deleteTaskTemplate(id: string) {
  return prisma.taskTemplate.delete({
    where: { id },
    select: { id: true },
  });
}
