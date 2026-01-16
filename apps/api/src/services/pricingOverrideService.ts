import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface PricingOverrideListParams {
  page?: number;
  limit?: number;
  facilityId?: string;
  pricingRuleId?: string;
  approvedByUserId?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PricingOverrideCreateInput {
  facilityId: string;
  pricingRuleId: string;
  overrideRate: number;
  overrideReason: string;
  effectiveDate?: Date;
  expiryDate?: Date | null;
  createdByUserId: string;
}

export interface PricingOverrideUpdateInput {
  overrideRate?: number;
  overrideReason?: string;
  effectiveDate?: Date;
  expiryDate?: Date | null;
  approvedByUserId?: string | null;
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

const pricingOverrideSelect = {
  id: true,
  overrideRate: true,
  overrideReason: true,
  effectiveDate: true,
  expiryDate: true,
  createdAt: true,
  updatedAt: true,
  facility: {
    select: {
      id: true,
      name: true,
      account: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  pricingRule: {
    select: {
      id: true,
      name: true,
      pricingType: true,
      baseRate: true,
    },
  },
  approvedByUser: {
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
} satisfies Prisma.PricingOverrideSelect;

export async function listPricingOverrides(
  params: PricingOverrideListParams
): Promise<
  PaginatedResult<Prisma.PricingOverrideGetPayload<{ select: typeof pricingOverrideSelect }>>
> {
  const {
    page = 1,
    limit = 20,
    facilityId,
    pricingRuleId,
    approvedByUserId,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const where: Prisma.PricingOverrideWhereInput = {};

  if (facilityId) {
    where.facilityId = facilityId;
  }

  if (pricingRuleId) {
    where.pricingRuleId = pricingRuleId;
  }

  if (approvedByUserId) {
    where.approvedByUserId = approvedByUserId;
  }

  // isActive means the override is currently in effect (effectiveDate <= now and (expiryDate is null or > now))
  if (isActive !== undefined) {
    const now = new Date();
    if (isActive) {
      where.effectiveDate = { lte: now };
      where.OR = [
        { expiryDate: null },
        { expiryDate: { gt: now } },
      ];
    } else {
      where.OR = [
        { effectiveDate: { gt: now } },
        { expiryDate: { lte: now } },
      ];
    }
  }

  if (search) {
    where.AND = [
      ...(where.AND as Prisma.PricingOverrideWhereInput[] || []),
      {
        OR: [
          { overrideReason: { contains: search, mode: 'insensitive' } },
          { facility: { name: { contains: search, mode: 'insensitive' } } },
          { facility: { account: { name: { contains: search, mode: 'insensitive' } } } },
          { pricingRule: { name: { contains: search, mode: 'insensitive' } } },
        ],
      },
    ];
  }

  const validSortFields = [
    'createdAt',
    'updatedAt',
    'effectiveDate',
    'expiryDate',
    'overrideRate',
  ];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [pricingOverrides, total] = await Promise.all([
    prisma.pricingOverride.findMany({
      where,
      select: pricingOverrideSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pricingOverride.count({ where }),
  ]);

  return {
    data: pricingOverrides,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPricingOverrideById(id: string) {
  return prisma.pricingOverride.findUnique({
    where: { id },
    select: pricingOverrideSelect,
  });
}

export async function createPricingOverride(input: PricingOverrideCreateInput) {
  return prisma.pricingOverride.create({
    data: {
      facilityId: input.facilityId,
      pricingRuleId: input.pricingRuleId,
      overrideRate: input.overrideRate,
      overrideReason: input.overrideReason,
      effectiveDate: input.effectiveDate ?? new Date(),
      expiryDate: input.expiryDate,
      createdByUserId: input.createdByUserId,
    },
    select: pricingOverrideSelect,
  });
}

export async function updatePricingOverride(id: string, input: PricingOverrideUpdateInput) {
  const updateData: Prisma.PricingOverrideUpdateInput = {};

  if (input.overrideRate !== undefined) updateData.overrideRate = input.overrideRate;
  if (input.overrideReason !== undefined) updateData.overrideReason = input.overrideReason;
  if (input.effectiveDate !== undefined) updateData.effectiveDate = input.effectiveDate;
  if (input.expiryDate !== undefined) updateData.expiryDate = input.expiryDate;
  if (input.approvedByUserId !== undefined) {
    updateData.approvedByUser = input.approvedByUserId
      ? { connect: { id: input.approvedByUserId } }
      : { disconnect: true };
  }

  return prisma.pricingOverride.update({
    where: { id },
    data: updateData,
    select: pricingOverrideSelect,
  });
}

export async function approvePricingOverride(id: string, approvedByUserId: string) {
  return prisma.pricingOverride.update({
    where: { id },
    data: {
      approvedByUserId,
    },
    select: pricingOverrideSelect,
  });
}

export async function deletePricingOverride(id: string) {
  return prisma.pricingOverride.delete({
    where: { id },
    select: { id: true },
  });
}
