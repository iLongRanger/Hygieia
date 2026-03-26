import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../middleware/errorHandler';

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

export async function getOpportunityById(id: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    select: opportunitySelect,
  });
  if (!opportunity) throw new NotFoundError('Opportunity not found');
  return opportunity;
}

export interface OpportunityUpdateInput {
  title?: string;
  status?: string;
  source?: string | null;
  estimatedValue?: number | null;
  probability?: number | null;
  expectedCloseDate?: string | null;
  lostReason?: string | null;
  ownerUserId?: string | null;
  accountId?: string | null;
  facilityId?: string | null;
  primaryContactId?: string | null;
}

export async function updateOpportunity(id: string, input: OpportunityUpdateInput) {
  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Opportunity not found');

  const data: Prisma.OpportunityUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'won' && !existing.wonAt) data.wonAt = new Date();
    if (input.status === 'lost' && !existing.lostAt) data.lostAt = new Date();
    if (['won', 'lost'].includes(input.status) && !existing.closedAt) data.closedAt = new Date();
  }
  if (input.source !== undefined) data.source = input.source;
  if (input.estimatedValue !== undefined) {
    data.estimatedValue = input.estimatedValue !== null
      ? new Prisma.Decimal(input.estimatedValue)
      : null;
  }
  if (input.probability !== undefined) data.probability = input.probability;
  if (input.expectedCloseDate !== undefined) {
    data.expectedCloseDate = input.expectedCloseDate ? new Date(input.expectedCloseDate) : null;
  }
  if (input.lostReason !== undefined) data.lostReason = input.lostReason;
  if (input.ownerUserId !== undefined) {
    data.ownerUser = input.ownerUserId
      ? { connect: { id: input.ownerUserId } }
      : { disconnect: true };
  }
  if (input.accountId !== undefined) {
    data.account = input.accountId
      ? { connect: { id: input.accountId } }
      : { disconnect: true };
  }
  if (input.facilityId !== undefined) {
    data.facility = input.facilityId
      ? { connect: { id: input.facilityId } }
      : { disconnect: true };
  }
  if (input.primaryContactId !== undefined) {
    data.primaryContact = input.primaryContactId
      ? { connect: { id: input.primaryContactId } }
      : { disconnect: true };
  }

  return prisma.opportunity.update({
    where: { id },
    data,
    select: opportunitySelect,
  });
}

export async function archiveOpportunity(id: string) {
  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Opportunity not found');
  return prisma.opportunity.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: opportunitySelect,
  });
}

export async function restoreOpportunity(id: string) {
  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Opportunity not found');
  return prisma.opportunity.update({
    where: { id },
    data: { archivedAt: null },
    select: opportunitySelect,
  });
}
