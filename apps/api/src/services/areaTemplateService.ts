import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface AreaTemplateListParams {
  page?: number;
  limit?: number;
  areaTypeId?: string;
  search?: string;
}

export interface AreaTemplateCreateInput {
  areaTypeId: string;
  name?: string | null;
  defaultSquareFeet?: number | null;
  items?: { fixtureTypeId: string; defaultCount: number; minutesPerItem: number; sortOrder?: number }[];
  taskTemplateIds?: string[];
  taskTemplates?: { id: string; sortOrder?: number }[];
  tasks?: {
    name: string;
    baseMinutes?: number;
    perSqftMinutes?: number;
    perUnitMinutes?: number;
    perRoomMinutes?: number;
    sortOrder?: number;
  }[];
  createdByUserId: string;
}

export interface AreaTemplateUpdateInput {
  areaTypeId?: string;
  name?: string | null;
  defaultSquareFeet?: number | null;
  items?: { fixtureTypeId: string; defaultCount: number; minutesPerItem: number; sortOrder?: number }[];
  taskTemplateIds?: string[];
  taskTemplates?: { id: string; sortOrder?: number }[];
  tasks?: {
    name: string;
    baseMinutes?: number;
    perSqftMinutes?: number;
    perUnitMinutes?: number;
    perRoomMinutes?: number;
    sortOrder?: number;
  }[];
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

const areaTemplateSelect = {
  id: true,
  name: true,
  defaultSquareFeet: true,
  createdAt: true,
  updatedAt: true,
  areaType: {
    select: {
      id: true,
      name: true,
      defaultSquareFeet: true,
    },
  },
  items: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      defaultCount: true,
      minutesPerItem: true,
      sortOrder: true,
      fixtureType: {
        select: {
          id: true,
          name: true,
          category: true,
          defaultMinutesPerItem: true,
        },
      },
    },
  },
  tasks: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      sortOrder: true,
      name: true,
      baseMinutes: true,
      perSqftMinutes: true,
      perUnitMinutes: true,
      perRoomMinutes: true,
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
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.AreaTemplateSelect;

export async function listAreaTemplates(
  params: AreaTemplateListParams
): Promise<PaginatedResult<Prisma.AreaTemplateGetPayload<{ select: typeof areaTemplateSelect }>>> {
  const { page = 1, limit = 50, areaTypeId, search } = params;

  const where: Prisma.AreaTemplateWhereInput = {};
  if (areaTypeId) {
    where.areaTypeId = areaTypeId;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { areaType: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [templates, total] = await Promise.all([
    prisma.areaTemplate.findMany({
      where,
      select: areaTemplateSelect,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.areaTemplate.count({ where }),
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

export async function getAreaTemplateById(id: string) {
  return prisma.areaTemplate.findUnique({
    where: { id },
    select: areaTemplateSelect,
  });
}

export async function getAreaTemplateByAreaType(areaTypeId: string) {
  return prisma.areaTemplate.findUnique({
    where: { areaTypeId },
    select: areaTemplateSelect,
  });
}

export async function createAreaTemplate(input: AreaTemplateCreateInput) {
  const taskLinks = await buildAreaTemplateTaskLinks({
    taskTemplates: input.taskTemplates,
    taskTemplateIds: input.taskTemplateIds,
    legacyTasks: input.tasks,
    areaTypeId: input.areaTypeId,
    createdByUserId: input.createdByUserId,
  });

  return prisma.areaTemplate.create({
    data: {
      areaTypeId: input.areaTypeId,
      name: input.name,
      defaultSquareFeet: input.defaultSquareFeet,
      createdByUserId: input.createdByUserId,
      items: input.items && input.items.length > 0 ? {
        create: input.items.map((item) => ({
          fixtureTypeId: item.fixtureTypeId,
          defaultCount: item.defaultCount,
          minutesPerItem: item.minutesPerItem,
          sortOrder: item.sortOrder ?? 0,
        })),
      } : undefined,
      tasks: taskLinks && taskLinks.length > 0 ? {
        create: taskLinks.map((task) => ({
          taskTemplateId: task.taskTemplateId,
          sortOrder: task.sortOrder ?? 0,
        })),
      } : undefined,
    },
    select: areaTemplateSelect,
  });
}

export async function updateAreaTemplate(id: string, input: AreaTemplateUpdateInput) {
  const updateData: Prisma.AreaTemplateUpdateInput = {};
  const shouldUpdateTasks = input.taskTemplates !== undefined
    || input.taskTemplateIds !== undefined
    || input.tasks !== undefined;

  if (input.areaTypeId !== undefined) {
    updateData.areaType = { connect: { id: input.areaTypeId } };
  }
  if (input.name !== undefined) updateData.name = input.name;
  if (input.defaultSquareFeet !== undefined) updateData.defaultSquareFeet = input.defaultSquareFeet;
  if (input.items !== undefined) {
    updateData.items = {
      deleteMany: {},
      create: input.items.map((item) => ({
        fixtureTypeId: item.fixtureTypeId,
        defaultCount: item.defaultCount,
        minutesPerItem: item.minutesPerItem,
        sortOrder: item.sortOrder ?? 0,
      })),
    };
  }

  if (shouldUpdateTasks) {
    const existing = await prisma.areaTemplate.findUnique({
      where: { id },
      select: { createdByUserId: true, areaTypeId: true },
    });
    const taskLinks = await buildAreaTemplateTaskLinks({
      taskTemplates: input.taskTemplates,
      taskTemplateIds: input.taskTemplateIds,
      legacyTasks: input.tasks,
      areaTypeId: input.areaTypeId ?? existing?.areaTypeId ?? '',
      createdByUserId: existing?.createdByUserId ?? '',
    });
    updateData.tasks = {
      deleteMany: {},
      create: (taskLinks || []).map((task) => ({
        taskTemplateId: task.taskTemplateId,
        sortOrder: task.sortOrder ?? 0,
      })),
    };
  }

  return prisma.areaTemplate.update({
    where: { id },
    data: updateData,
    select: areaTemplateSelect,
  });
}

export async function deleteAreaTemplate(id: string) {
  return prisma.areaTemplate.delete({
    where: { id },
    select: { id: true },
  });
}

type LegacyTaskInput = {
  name: string;
  baseMinutes?: number;
  perSqftMinutes?: number;
  perUnitMinutes?: number;
  perRoomMinutes?: number;
  sortOrder?: number;
};

async function buildAreaTemplateTaskLinks(params: {
  taskTemplates?: { id: string; sortOrder?: number }[];
  taskTemplateIds?: string[];
  legacyTasks?: LegacyTaskInput[];
  areaTypeId: string;
  createdByUserId: string;
}): Promise<{ taskTemplateId: string; sortOrder: number }[] | undefined> {
  const { taskTemplates, taskTemplateIds, legacyTasks, areaTypeId, createdByUserId } = params;

  if (taskTemplates !== undefined) {
    return taskTemplates.map((task, index) => ({
      taskTemplateId: task.id,
      sortOrder: task.sortOrder ?? index,
    }));
  }

  if (taskTemplateIds !== undefined) {
    return taskTemplateIds.map((id, index) => ({
      taskTemplateId: id,
      sortOrder: index,
    }));
  }

  if (legacyTasks !== undefined) {
    if (!legacyTasks.length) return [];
    const createdTemplates = await prisma.$transaction(
      legacyTasks.map((task) =>
        prisma.taskTemplate.create({
          data: {
            name: task.name,
            cleaningType: 'daily',
            areaTypeId: areaTypeId || null,
            estimatedMinutes: Math.round(task.baseMinutes ?? 0),
            baseMinutes: task.baseMinutes ?? 0,
            perSqftMinutes: task.perSqftMinutes ?? 0,
            perUnitMinutes: task.perUnitMinutes ?? 0,
            perRoomMinutes: task.perRoomMinutes ?? 0,
            difficultyLevel: 3,
            requiredEquipment: [],
            requiredSupplies: [],
            isGlobal: false,
            isActive: true,
            createdByUserId,
          },
          select: { id: true },
        })
      )
    );
    return createdTemplates.map((template, index) => ({
      taskTemplateId: template.id,
      sortOrder: legacyTasks[index]?.sortOrder ?? index,
    }));
  }

  return undefined;
}
