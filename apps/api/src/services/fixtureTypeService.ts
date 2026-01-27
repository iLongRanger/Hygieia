import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface FixtureTypeListParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FixtureTypeCreateInput {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface FixtureTypeUpdateInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
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

const fixtureTypeSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FixtureTypeSelect;

export async function listFixtureTypes(
  params: FixtureTypeListParams
): Promise<
  PaginatedResult<Prisma.FixtureTypeGetPayload<{ select: typeof fixtureTypeSelect }>>
> {
  const {
    page = 1,
    limit = 50,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const where: Prisma.FixtureTypeWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [items, total] = await Promise.all([
    prisma.fixtureType.findMany({
      where,
      select: fixtureTypeSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fixtureType.count({ where }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getFixtureTypeById(id: string) {
  return prisma.fixtureType.findUnique({
    where: { id },
    select: fixtureTypeSelect,
  });
}

export async function createFixtureType(input: FixtureTypeCreateInput) {
  return prisma.fixtureType.create({
    data: {
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
    },
    select: fixtureTypeSelect,
  });
}

export async function updateFixtureType(id: string, input: FixtureTypeUpdateInput) {
  const updateData: Prisma.FixtureTypeUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  return prisma.fixtureType.update({
    where: { id },
    data: updateData,
    select: fixtureTypeSelect,
  });
}

export async function deleteFixtureType(id: string) {
  return prisma.fixtureType.delete({
    where: { id },
    select: { id: true },
  });
}
