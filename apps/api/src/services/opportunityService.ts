import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface OpportunityListParams {
  page?: number;
  limit?: number;
  status?: string;
  accountId?: string;
  facilityId?: string;
  leadId?: string;
  ownerUserId?: string;
  search?: string;
  includeArchived?: boolean;
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
  title: true,
  status: true,
  source: true,
  estimatedValue: true,
  probability: true,
  expectedCloseDate: true,
  lostReason: true,
  wonAt: true,
  lostAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  lead: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      status: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  facility: {
    select: {
      id: true,
      name: true,
    },
  },
  primaryContact: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  ownerUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  _count: {
    select: {
      appointments: true,
      proposals: true,
      contracts: true,
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
    accountId,
    facilityId,
    leadId,
    ownerUserId,
    search,
    includeArchived = false,
  } = params;

  const where: Prisma.OpportunityWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (status) where.status = status;
  if (accountId) where.accountId = accountId;
  if (facilityId) where.facilityId = facilityId;
  if (leadId) where.leadId = leadId;
  if (ownerUserId) where.ownerUserId = ownerUserId;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { account: { name: { contains: search, mode: 'insensitive' } } },
      { facility: { name: { contains: search, mode: 'insensitive' } } },
      { lead: { contactName: { contains: search, mode: 'insensitive' } } },
      { lead: { companyName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [opportunities, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      select: opportunitySelect,
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
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
