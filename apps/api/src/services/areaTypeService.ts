import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface AreaTypeListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AreaTypeCreateInput {
  name: string;
  description?: string | null;
  defaultSquareFeet?: number | null;
  baseCleaningTimeMinutes?: number | null;
}

export interface AreaTypeUpdateInput {
  name?: string;
  description?: string | null;
  defaultSquareFeet?: number | null;
  baseCleaningTimeMinutes?: number | null;
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

const areaTypeSelect = {
  id: true,
  name: true,
  description: true,
  defaultSquareFeet: true,
  baseCleaningTimeMinutes: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      areas: true,
      taskTemplates: true,
    },
  },
} satisfies Prisma.AreaTypeSelect;

export async function listAreaTypes(
  params: AreaTypeListParams
): Promise<
  PaginatedResult<Prisma.AreaTypeGetPayload<{ select: typeof areaTypeSelect }>>
> {
  const {
    page = 1,
    limit = 50,
    search,
    sortBy = 'name',
    sortOrder = 'asc',
  } = params;

  const where: Prisma.AreaTypeWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const validSortFields = ['createdAt', 'name'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

  const [areaTypes, total] = await Promise.all([
    prisma.areaType.findMany({
      where,
      select: areaTypeSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.areaType.count({ where }),
  ]);

  return {
    data: areaTypes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAreaTypeById(id: string) {
  return prisma.areaType.findUnique({
    where: { id },
    select: areaTypeSelect,
  });
}

export async function getAreaTypeByName(name: string) {
  return prisma.areaType.findUnique({
    where: { name },
    select: { id: true, name: true },
  });
}

export async function createAreaType(input: AreaTypeCreateInput) {
  return prisma.areaType.create({
    data: {
      name: input.name,
      description: input.description,
      defaultSquareFeet: input.defaultSquareFeet,
      baseCleaningTimeMinutes: input.baseCleaningTimeMinutes,
    },
    select: areaTypeSelect,
  });
}

export async function updateAreaType(id: string, input: AreaTypeUpdateInput) {
  const updateData: Prisma.AreaTypeUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.defaultSquareFeet !== undefined)
    updateData.defaultSquareFeet = input.defaultSquareFeet;
  if (input.baseCleaningTimeMinutes !== undefined)
    updateData.baseCleaningTimeMinutes = input.baseCleaningTimeMinutes;

  return prisma.areaType.update({
    where: { id },
    data: updateData,
    select: areaTypeSelect,
  });
}

export async function deleteAreaType(id: string) {
  return prisma.areaType.delete({
    where: { id },
    select: { id: true },
  });
}

export async function getAreaTypeGuidance(
  names: string[]
): Promise<Record<string, string[]>> {
  const areaTypes = await prisma.areaType.findMany({
    where: { name: { in: names } },
    select: { name: true, guidanceItems: true },
  });
  const result: Record<string, string[]> = {};
  for (const at of areaTypes) {
    result[at.name] = (at.guidanceItems as string[]) || [];
  }
  return result;
}
