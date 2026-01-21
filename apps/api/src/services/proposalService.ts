import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface ProposalListParams {
  page?: number;
  limit?: number;
  status?: string;
  accountId?: string;
  facilityId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface ProposalItemInput {
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sortOrder?: number;
}

export interface ProposalServiceInput {
  serviceName: string;
  serviceType: string;
  frequency: string;
  estimatedHours?: number | null;
  hourlyRate?: number | null;
  monthlyPrice: number;
  description?: string | null;
  includedTasks?: string[];
  sortOrder?: number;
}

export interface ProposalCreateInput {
  accountId: string;
  facilityId?: string | null;
  title: string;
  description?: string | null;
  validUntil?: Date | null;
  taxRate?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  createdByUserId: string;
  proposalItems?: ProposalItemInput[];
  proposalServices?: ProposalServiceInput[];
}

export interface ProposalUpdateInput {
  accountId?: string;
  facilityId?: string | null;
  title?: string;
  status?: string;
  description?: string | null;
  validUntil?: Date | null;
  taxRate?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  proposalItems?: (ProposalItemInput & { id?: string })[];
  proposalServices?: (ProposalServiceInput & { id?: string })[];
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

const proposalSelect = {
  id: true,
  proposalNumber: true,
  title: true,
  status: true,
  description: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  validUntil: true,
  sentAt: true,
  viewedAt: true,
  acceptedAt: true,
  rejectedAt: true,
  rejectionReason: true,
  notes: true,
  termsAndConditions: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
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
      address: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  proposalItems: {
    select: {
      id: true,
      itemType: true,
      description: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: 'asc' as const,
    },
  },
  proposalServices: {
    select: {
      id: true,
      serviceName: true,
      serviceType: true,
      frequency: true,
      estimatedHours: true,
      hourlyRate: true,
      monthlyPrice: true,
      description: true,
      includedTasks: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: 'asc' as const,
    },
  },
} satisfies Prisma.ProposalSelect;

/**
 * Generate a unique proposal number in the format: PROP-YYYYMMDD-XXXX
 */
async function generateProposalNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Find the latest proposal number for today
  const latestProposal = await prisma.proposal.findFirst({
    where: {
      proposalNumber: {
        startsWith: `PROP-${dateStr}`,
      },
    },
    orderBy: {
      proposalNumber: 'desc',
    },
    select: {
      proposalNumber: true,
    },
  });

  let sequence = 1;
  if (latestProposal) {
    const lastSequence = parseInt(latestProposal.proposalNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  return `PROP-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Calculate proposal totals based on items and services
 */
function calculateTotals(
  items: ProposalItemInput[],
  services: ProposalServiceInput[],
  taxRate: number
): { subtotal: number; taxAmount: number; totalAmount: number } {
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const servicesTotal = services.reduce((sum, service) => sum + Number(service.monthlyPrice), 0);

  const subtotal = itemsTotal + servicesTotal;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  };
}

export async function listProposals(
  params: ProposalListParams
): Promise<PaginatedResult<Prisma.ProposalGetPayload<{ select: typeof proposalSelect }>>> {
  const {
    page = 1,
    limit = 20,
    status,
    accountId,
    facilityId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.ProposalWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (status) {
    where.status = status;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  if (facilityId) {
    where.facilityId = facilityId;
  }

  if (search) {
    where.OR = [
      { proposalNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { account: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const validSortFields = [
    'createdAt',
    'updatedAt',
    'proposalNumber',
    'title',
    'totalAmount',
    'validUntil',
    'sentAt',
  ];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      select: proposalSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.proposal.count({ where }),
  ]);

  return {
    data: proposals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProposalById(id: string) {
  return prisma.proposal.findUnique({
    where: { id },
    select: proposalSelect,
  });
}

export async function getProposalByNumber(proposalNumber: string) {
  return prisma.proposal.findUnique({
    where: { proposalNumber },
    select: proposalSelect,
  });
}

export async function createProposal(input: ProposalCreateInput) {
  const proposalNumber = await generateProposalNumber();
  const taxRate = input.taxRate ?? 0;

  const items = input.proposalItems ?? [];
  const services = input.proposalServices ?? [];
  const totals = calculateTotals(items, services, taxRate);

  return prisma.proposal.create({
    data: {
      proposalNumber,
      title: input.title,
      description: input.description,
      status: 'draft',
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      validUntil: input.validUntil,
      notes: input.notes,
      termsAndConditions: input.termsAndConditions,
      accountId: input.accountId,
      facilityId: input.facilityId,
      createdByUserId: input.createdByUserId,
      proposalItems: {
        create: items.map((item, index) => ({
          itemType: item.itemType,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          sortOrder: item.sortOrder ?? index,
        })),
      },
      proposalServices: {
        create: services.map((service, index) => ({
          serviceName: service.serviceName,
          serviceType: service.serviceType,
          frequency: service.frequency,
          estimatedHours: service.estimatedHours,
          hourlyRate: service.hourlyRate,
          monthlyPrice: service.monthlyPrice,
          description: service.description,
          includedTasks: service.includedTasks ?? [],
          sortOrder: service.sortOrder ?? index,
        })),
      },
    },
    select: proposalSelect,
  });
}

export async function updateProposal(id: string, input: ProposalUpdateInput) {
  const updateData: Prisma.ProposalUpdateInput = {};

  if (input.accountId !== undefined) {
    updateData.account = { connect: { id: input.accountId } };
  }
  if (input.facilityId !== undefined) {
    updateData.facility = input.facilityId
      ? { connect: { id: input.facilityId } }
      : { disconnect: true };
  }
  if (input.title !== undefined) updateData.title = input.title;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.validUntil !== undefined) updateData.validUntil = input.validUntil;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.termsAndConditions !== undefined) updateData.termsAndConditions = input.termsAndConditions;

  // If items or services are being updated, recalculate totals
  if (input.proposalItems || input.proposalServices || input.taxRate !== undefined) {
    const currentProposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        proposalItems: true,
        proposalServices: true,
      },
    });

    if (!currentProposal) {
      throw new Error('Proposal not found');
    }

    const items = input.proposalItems ?? currentProposal.proposalItems.map(item => ({
      itemType: item.itemType,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      sortOrder: item.sortOrder,
    }));

    const services = input.proposalServices ?? currentProposal.proposalServices.map(service => ({
      serviceName: service.serviceName,
      serviceType: service.serviceType,
      frequency: service.frequency,
      estimatedHours: service.estimatedHours ? Number(service.estimatedHours) : null,
      hourlyRate: service.hourlyRate ? Number(service.hourlyRate) : null,
      monthlyPrice: Number(service.monthlyPrice),
      description: service.description,
      includedTasks: service.includedTasks as string[],
      sortOrder: service.sortOrder,
    }));

    const taxRate = input.taxRate ?? Number(currentProposal.taxRate);
    const totals = calculateTotals(items, services, taxRate);

    updateData.subtotal = totals.subtotal;
    updateData.taxRate = taxRate;
    updateData.taxAmount = totals.taxAmount;
    updateData.totalAmount = totals.totalAmount;

    // Update items if provided
    if (input.proposalItems) {
      updateData.proposalItems = {
        deleteMany: {},
        create: items.map((item, index) => ({
          itemType: item.itemType,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          sortOrder: item.sortOrder ?? index,
        })),
      };
    }

    // Update services if provided
    if (input.proposalServices) {
      updateData.proposalServices = {
        deleteMany: {},
        create: services.map((service, index) => ({
          serviceName: service.serviceName,
          serviceType: service.serviceType,
          frequency: service.frequency,
          estimatedHours: service.estimatedHours,
          hourlyRate: service.hourlyRate,
          monthlyPrice: service.monthlyPrice,
          description: service.description,
          includedTasks: service.includedTasks ?? [],
          sortOrder: service.sortOrder ?? index,
        })),
      };
    }
  }

  return prisma.proposal.update({
    where: { id },
    data: updateData,
    select: proposalSelect,
  });
}

export async function sendProposal(id: string) {
  return prisma.proposal.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
    select: proposalSelect,
  });
}

export async function markProposalAsViewed(id: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: { status: true, viewedAt: true },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  // Only update if not already viewed
  if (!proposal.viewedAt) {
    return prisma.proposal.update({
      where: { id },
      data: {
        status: proposal.status === 'sent' ? 'viewed' : proposal.status,
        viewedAt: new Date(),
      },
      select: proposalSelect,
    });
  }

  return getProposalById(id);
}

export async function acceptProposal(id: string) {
  return prisma.proposal.update({
    where: { id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
    },
    select: proposalSelect,
  });
}

export async function rejectProposal(id: string, rejectionReason: string) {
  return prisma.proposal.update({
    where: { id },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason,
    },
    select: proposalSelect,
  });
}

export async function archiveProposal(id: string) {
  return prisma.proposal.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: proposalSelect,
  });
}

export async function restoreProposal(id: string) {
  return prisma.proposal.update({
    where: { id },
    data: { archivedAt: null },
    select: proposalSelect,
  });
}

export async function deleteProposal(id: string) {
  return prisma.proposal.delete({
    where: { id },
    select: { id: true },
  });
}
