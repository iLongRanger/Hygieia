import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface OpportunityListParams {
  page?: number;
  limit?: number;
  status?: string;
  leadId?: string;
  accountId?: string;
  assignedToUserId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface OpportunityCreateInput {
  leadId?: string | null;
  accountId?: string | null;
  name: string;
  status?: string;
  probability?: number | null;
  expectedValue?: number | null;
  expectedCloseDate?: Date | null;
  description?: string | null;
  assignedToUserId?: string | null;
  createdByUserId: string;
}

export interface OpportunityUpdateInput {
  leadId?: string | null;
  accountId?: string | null;
  name?: string;
  status?: string;
  probability?: number | null;
  expectedValue?: number | null;
  actualValue?: number | null;
  expectedCloseDate?: Date | null;
  actualCloseDate?: Date | null;
  description?: string | null;
  assignedToUserId?: string | null;
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

const opportunitySelect = {
  id: true,
  name: true,
  status: true,
  probability: true,
  expectedValue: true,
  actualValue: true,
  expectedCloseDate: true,
  actualCloseDate: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  lead: {
    select: {
      id: true,
      contactName: true,
      companyName: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  assignedToUser: {
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
} satisfies Prisma.OpportunitySelect;

export async function listOpportunities(
  params: OpportunityListParams
): Promise<
  PaginatedResult<Prisma.OpportunityGetPayload<{ select: typeof opportunitySelect }>>
> {
  const {
    page = 1,
    limit = 20,
    status,
    leadId,
    accountId,
    assignedToUserId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.OpportunityWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (status) {
    where.status = status;
  }

  if (leadId) {
    where.leadId = leadId;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  if (assignedToUserId) {
    where.assignedToUserId = assignedToUserId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { lead: { contactName: { contains: search, mode: 'insensitive' } } },
      { lead: { companyName: { contains: search, mode: 'insensitive' } } },
      { account: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const validSortFields = [
    'createdAt',
    'updatedAt',
    'name',
    'expectedValue',
    'probability',
    'expectedCloseDate',
  ];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [opportunities, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      select: opportunitySelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.opportunity.count({ where }),
  ]);

  return {
    data: opportunities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getOpportunityById(id: string) {
  return prisma.opportunity.findUnique({
    where: { id },
    select: opportunitySelect,
  });
}

export async function createOpportunity(input: OpportunityCreateInput) {
  return prisma.opportunity.create({
    data: {
      name: input.name,
      status: input.status ?? 'prospecting',
      probability: input.probability,
      expectedValue: input.expectedValue,
      expectedCloseDate: input.expectedCloseDate,
      description: input.description,
      leadId: input.leadId,
      accountId: input.accountId,
      assignedToUserId: input.assignedToUserId,
      createdByUserId: input.createdByUserId,
    },
    select: opportunitySelect,
  });
}

export async function updateOpportunity(id: string, input: OpportunityUpdateInput) {
  const updateData: Prisma.OpportunityUpdateInput = {};

  if (input.leadId !== undefined) {
    updateData.lead = input.leadId
      ? { connect: { id: input.leadId } }
      : { disconnect: true };
  }
  if (input.accountId !== undefined) {
    updateData.account = input.accountId
      ? { connect: { id: input.accountId } }
      : { disconnect: true };
  }
  if (input.name !== undefined) updateData.name = input.name;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.probability !== undefined) updateData.probability = input.probability;
  if (input.expectedValue !== undefined) updateData.expectedValue = input.expectedValue;
  if (input.actualValue !== undefined) updateData.actualValue = input.actualValue;
  if (input.expectedCloseDate !== undefined) updateData.expectedCloseDate = input.expectedCloseDate;
  if (input.actualCloseDate !== undefined) updateData.actualCloseDate = input.actualCloseDate;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.assignedToUserId !== undefined) {
    updateData.assignedToUser = input.assignedToUserId
      ? { connect: { id: input.assignedToUserId } }
      : { disconnect: true };
  }

  return prisma.opportunity.update({
    where: { id },
    data: updateData,
    select: opportunitySelect,
  });
}

export async function archiveOpportunity(id: string) {
  return prisma.opportunity.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: opportunitySelect,
  });
}

export async function restoreOpportunity(id: string) {
  return prisma.opportunity.update({
    where: { id },
    data: { archivedAt: null },
    select: opportunitySelect,
  });
}

export async function deleteOpportunity(id: string) {
  return prisma.opportunity.delete({
    where: { id },
    select: { id: true },
  });
}
