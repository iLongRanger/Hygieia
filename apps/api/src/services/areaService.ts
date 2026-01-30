import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface AreaListParams {
  page?: number;
  limit?: number;
  facilityId?: string;
  areaTypeId?: string;
  floorType?: string;
  conditionLevel?: string;
  trafficLevel?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface AreaCreateInput {
  facilityId: string;
  areaTypeId: string;
  name?: string | null;
  quantity?: number;
  squareFeet?: number | null;
  floorType?: string;
  conditionLevel?: string;
  roomCount?: number;
  unitCount?: number;
  trafficLevel?: string;
  notes?: string | null;
  fixtures?: { fixtureTypeId: string; count: number; minutesPerItem?: number }[];
  createdByUserId: string;
  // Template auto-apply options
  applyTemplate?: boolean;
  excludeTaskTemplateIds?: string[];
}

export interface AreaUpdateInput {
  areaTypeId?: string;
  name?: string | null;
  quantity?: number;
  squareFeet?: number | null;
  floorType?: string;
  conditionLevel?: string;
  roomCount?: number;
  unitCount?: number;
  trafficLevel?: string;
  notes?: string | null;
  fixtures?: { fixtureTypeId: string; count: number; minutesPerItem?: number }[];
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

const areaSelect = {
  id: true,
  name: true,
  quantity: true,
  squareFeet: true,
  floorType: true,
  conditionLevel: true,
  roomCount: true,
  unitCount: true,
  trafficLevel: true,
  notes: true,
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
  areaType: {
    select: {
      id: true,
      name: true,
      defaultSquareFeet: true,
      baseCleaningTimeMinutes: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
  fixtures: {
    select: {
      id: true,
      count: true,
      fixtureType: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
      minutesPerItem: true,
    },
  },
  _count: {
    select: {
      facilityTasks: true,
    },
  },
} satisfies Prisma.AreaSelect;

export async function listAreas(
  params: AreaListParams
): Promise<
  PaginatedResult<Prisma.AreaGetPayload<{ select: typeof areaSelect }>>
> {
  const {
    page = 1,
    limit = 50,
    facilityId,
    areaTypeId,
    floorType,
    conditionLevel,
    trafficLevel,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.AreaWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (facilityId) {
    where.facilityId = facilityId;
  }

  if (areaTypeId) {
    where.areaTypeId = areaTypeId;
  }

  if (floorType) {
    where.floorType = floorType;
  }

  if (conditionLevel) {
    where.conditionLevel = conditionLevel;
  }

  if (trafficLevel) {
    where.trafficLevel = trafficLevel;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { areaType: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const validSortFields = ['createdAt', 'name', 'squareFeet', 'floorType'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [areas, total] = await Promise.all([
    prisma.area.findMany({
      where,
      select: areaSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.area.count({ where }),
  ]);

  return {
    data: areas,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAreaById(id: string) {
  return prisma.area.findUnique({
    where: { id },
    select: areaSelect,
  });
}

export async function createArea(input: AreaCreateInput) {
  const shouldApplyTemplate = input.applyTemplate !== false; // Default to true

  return prisma.$transaction(async (tx) => {
    // 1. Fetch template if applyTemplate is true
    const template = shouldApplyTemplate
      ? await tx.areaTemplate.findUnique({
          where: { areaTypeId: input.areaTypeId },
          select: {
            defaultSquareFeet: true,
            items: {
              select: {
                fixtureType: { select: { id: true } },
                defaultCount: true,
                minutesPerItem: true,
              },
            },
            tasks: {
              select: {
                taskTemplate: { select: { id: true } },
              },
            },
          },
        })
      : null;

    // 2. Determine fixtures: use provided OR template defaults
    const fixtures = input.fixtures && input.fixtures.length > 0
      ? input.fixtures
      : template?.items?.map(item => ({
          fixtureTypeId: item.fixtureType.id,
          count: item.defaultCount,
          minutesPerItem: item.minutesPerItem,
        })) || [];

    // 3. Create the area with fixtures
    const area = await tx.area.create({
      data: {
        facilityId: input.facilityId,
        areaTypeId: input.areaTypeId,
        name: input.name,
        quantity: input.quantity ?? 1,
        squareFeet: input.squareFeet ?? template?.defaultSquareFeet ?? null,
        floorType: input.floorType ?? 'vct',
        conditionLevel: input.conditionLevel ?? 'standard',
        roomCount: input.roomCount ?? 0,
        unitCount: input.unitCount ?? 0,
        trafficLevel: input.trafficLevel ?? 'medium',
        notes: input.notes,
        createdByUserId: input.createdByUserId,
        fixtures: fixtures.length > 0 ? {
          create: fixtures.map((fixture) => ({
            fixtureTypeId: fixture.fixtureTypeId,
            count: fixture.count,
            minutesPerItem: fixture.minutesPerItem ?? 0,
          })),
        } : undefined,
      },
      select: areaSelect,
    });

    // 4. Create facility tasks from template (if applyTemplate)
    let tasksCreated = 0;
    if (shouldApplyTemplate && template?.tasks?.length) {
      const excludeIds = new Set(input.excludeTaskTemplateIds || []);
      const taskTemplateIds = template.tasks
        .filter(t => t.taskTemplate && !excludeIds.has(t.taskTemplate.id))
        .map(t => t.taskTemplate!.id);

      if (taskTemplateIds.length > 0) {
        // Fetch task template details for creating facility tasks
        const taskTemplates = await tx.taskTemplate.findMany({
          where: { id: { in: taskTemplateIds } },
          select: { id: true, estimatedMinutes: true, cleaningType: true },
        });

        const taskData = taskTemplates.map((tmpl) => ({
          facilityId: input.facilityId,
          areaId: area.id,
          taskTemplateId: tmpl.id,
          estimatedMinutes: tmpl.estimatedMinutes,
          cleaningFrequency: mapCleaningTypeToFrequency(tmpl.cleaningType),
          createdByUserId: input.createdByUserId,
        }));

        const result = await tx.facilityTask.createMany({ data: taskData });
        tasksCreated = result.count;
      }
    }

    return { ...area, _appliedTemplate: { tasksCreated } };
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

export async function updateArea(id: string, input: AreaUpdateInput) {
  const updateData: Prisma.AreaUpdateInput = {};

  if (input.areaTypeId !== undefined) {
    updateData.areaType = { connect: { id: input.areaTypeId } };
  }
  if (input.name !== undefined) updateData.name = input.name;
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.squareFeet !== undefined) updateData.squareFeet = input.squareFeet;
  if (input.floorType !== undefined) updateData.floorType = input.floorType;
  if (input.conditionLevel !== undefined)
    updateData.conditionLevel = input.conditionLevel;
  if (input.roomCount !== undefined) updateData.roomCount = input.roomCount;
  if (input.unitCount !== undefined) updateData.unitCount = input.unitCount;
  if (input.trafficLevel !== undefined) updateData.trafficLevel = input.trafficLevel;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.fixtures !== undefined) {
    updateData.fixtures = {
      deleteMany: {},
      create: input.fixtures.map((fixture) => ({
        fixtureTypeId: fixture.fixtureTypeId,
        count: fixture.count,
        minutesPerItem: fixture.minutesPerItem ?? 0,
      })),
    };
  }

  return prisma.area.update({
    where: { id },
    data: updateData,
    select: areaSelect,
  });
}

export async function archiveArea(id: string) {
  return prisma.area.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: areaSelect,
  });
}

export async function restoreArea(id: string) {
  return prisma.area.update({
    where: { id },
    data: { archivedAt: null },
    select: areaSelect,
  });
}

export async function deleteArea(id: string) {
  return prisma.area.delete({
    where: { id },
    select: { id: true },
  });
}
