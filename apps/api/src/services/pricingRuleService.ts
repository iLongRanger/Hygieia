import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface PricingRuleListParams {
  page?: number;
  limit?: number;
  pricingType?: string;
  cleaningType?: string;
  areaTypeId?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface PricingRuleCreateInput {
  name: string;
  description?: string | null;
  pricingType: string;
  baseRate: number;
  minimumCharge?: number | null;
  squareFootRate?: number | null;
  difficultyMultiplier?: number;
  conditionMultipliers?: object;
  cleaningType?: string | null;
  areaTypeId?: string | null;
  isActive?: boolean;
  createdByUserId: string;
}

export interface PricingRuleUpdateInput {
  name?: string;
  description?: string | null;
  pricingType?: string;
  baseRate?: number;
  minimumCharge?: number | null;
  squareFootRate?: number | null;
  difficultyMultiplier?: number;
  conditionMultipliers?: object;
  cleaningType?: string | null;
  areaTypeId?: string | null;
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

const pricingRuleSelect = {
  id: true,
  name: true,
  description: true,
  pricingType: true,
  baseRate: true,
  minimumCharge: true,
  squareFootRate: true,
  difficultyMultiplier: true,
  conditionMultipliers: true,
  cleaningType: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  areaType: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
  _count: {
    select: {
      pricingOverrides: true,
    },
  },
} satisfies Prisma.PricingRuleSelect;

export async function listPricingRules(
  params: PricingRuleListParams
): Promise<
  PaginatedResult<Prisma.PricingRuleGetPayload<{ select: typeof pricingRuleSelect }>>
> {
  const {
    page = 1,
    limit = 20,
    pricingType,
    cleaningType,
    areaTypeId,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.PricingRuleWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (pricingType) {
    where.pricingType = pricingType;
  }

  if (cleaningType) {
    where.cleaningType = cleaningType;
  }

  if (areaTypeId) {
    where.areaTypeId = areaTypeId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { cleaningType: { contains: search, mode: 'insensitive' } },
      { areaType: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const validSortFields = [
    'createdAt',
    'updatedAt',
    'name',
    'baseRate',
    'pricingType',
  ];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [pricingRules, total] = await Promise.all([
    prisma.pricingRule.findMany({
      where,
      select: pricingRuleSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pricingRule.count({ where }),
  ]);

  return {
    data: pricingRules,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPricingRuleById(id: string) {
  return prisma.pricingRule.findUnique({
    where: { id },
    select: pricingRuleSelect,
  });
}

export async function createPricingRule(input: PricingRuleCreateInput) {
  return prisma.pricingRule.create({
    data: {
      name: input.name,
      description: input.description,
      pricingType: input.pricingType,
      baseRate: input.baseRate,
      minimumCharge: input.minimumCharge,
      squareFootRate: input.squareFootRate,
      difficultyMultiplier: input.difficultyMultiplier ?? 1.0,
      conditionMultipliers: input.conditionMultipliers ?? {
        excellent: 0.8,
        good: 1.0,
        fair: 1.3,
        poor: 1.6,
      },
      cleaningType: input.cleaningType,
      areaTypeId: input.areaTypeId,
      isActive: input.isActive ?? true,
      createdByUserId: input.createdByUserId,
    },
    select: pricingRuleSelect,
  });
}

export async function updatePricingRule(id: string, input: PricingRuleUpdateInput) {
  const updateData: Prisma.PricingRuleUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.pricingType !== undefined) updateData.pricingType = input.pricingType;
  if (input.baseRate !== undefined) updateData.baseRate = input.baseRate;
  if (input.minimumCharge !== undefined) updateData.minimumCharge = input.minimumCharge;
  if (input.squareFootRate !== undefined) updateData.squareFootRate = input.squareFootRate;
  if (input.difficultyMultiplier !== undefined) updateData.difficultyMultiplier = input.difficultyMultiplier;
  if (input.conditionMultipliers !== undefined) updateData.conditionMultipliers = input.conditionMultipliers;
  if (input.cleaningType !== undefined) updateData.cleaningType = input.cleaningType;
  if (input.areaTypeId !== undefined) {
    updateData.areaType = input.areaTypeId
      ? { connect: { id: input.areaTypeId } }
      : { disconnect: true };
  }
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  return prisma.pricingRule.update({
    where: { id },
    data: updateData,
    select: pricingRuleSelect,
  });
}

export async function archivePricingRule(id: string) {
  return prisma.pricingRule.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: pricingRuleSelect,
  });
}

export async function restorePricingRule(id: string) {
  return prisma.pricingRule.update({
    where: { id },
    data: { archivedAt: null },
    select: pricingRuleSelect,
  });
}

export async function deletePricingRule(id: string) {
  return prisma.pricingRule.delete({
    where: { id },
    select: { id: true },
  });
}
