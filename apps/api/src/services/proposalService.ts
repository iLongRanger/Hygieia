import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import {
  calculatePricing,
  generateProposalServices,
  resolvePricingPlanId,
  resolvePricingPlan,
  getStrategyForPricingType,
  type PricingBreakdown,
  type PricingSettingsSnapshot,
} from './pricing';
import { normalizeServiceSchedule } from './serviceScheduleService';
import { autoAdvanceLeadStatusForAccount, autoSetLeadStatusForAccount } from './leadService';

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
  serviceFrequency?: string;
  serviceSchedule?: Record<string, unknown> | null;
  createdByUserId: string;
  proposalItems?: ProposalItemInput[];
  proposalServices?: ProposalServiceInput[];
  // Pricing plan fields
  pricingPlanId?: string | null;
  pricingSnapshot?: PricingSettingsSnapshot | null;
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
  serviceFrequency?: string;
  serviceSchedule?: Record<string, unknown> | null;
  proposalItems?: (ProposalItemInput & { id?: string })[];
  proposalServices?: (ProposalServiceInput & { id?: string })[];
  // Pricing plan fields
  pricingPlanId?: string | null;
  pricingSnapshot?: PricingSettingsSnapshot | null;
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
  serviceFrequency: true,
  serviceSchedule: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  // Pricing plan fields
  pricingPlanId: true,
  pricingSnapshot: true,
  pricingLocked: true,
  pricingLockedAt: true,
  // Public access fields
  publicToken: true,
  publicTokenExpiresAt: true,
  signatureName: true,
  signatureDate: true,
  signatureIp: true,
  account: {
    select: {
      id: true,
      name: true,
      type: true,
      defaultPricingPlanId: true,
      contacts: {
        where: { archivedAt: null, email: { not: null } },
        select: { name: true, email: true, isPrimary: true },
        orderBy: { isPrimary: 'desc' as const },
      },
    },
  },
  facility: {
    select: {
      id: true,
      name: true,
      address: true,
      defaultPricingPlanId: true,
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

function removeZeroValueItems(items: ProposalItemInput[]): ProposalItemInput[] {
  return items.filter((item) => Number(item.totalPrice) > 0);
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
  const serviceFrequency = input.serviceFrequency || '5x_week';
  const serviceSchedule = normalizeServiceSchedule(
    input.serviceSchedule ?? null,
    serviceFrequency
  );

  const items = removeZeroValueItems(input.proposalItems ?? []);
  const services = input.proposalServices ?? [];
  const totals = calculateTotals(items, services, taxRate);

  const pricingPlan = await resolvePricingPlan({
    pricingPlanId: input.pricingPlanId ?? undefined,
    facilityId: input.facilityId ?? undefined,
    accountId: input.accountId,
  });

  if (!pricingPlan) {
    throw new Error('No pricing plan found. Please configure pricing plans first.');
  }

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
      serviceFrequency,
      serviceSchedule:
        (serviceSchedule as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      accountId: input.accountId,
      facilityId: input.facilityId,
      createdByUserId: input.createdByUserId,
      // Pricing plan fields
      pricingPlanId: pricingPlan.id,
      pricingSnapshot:
        (input.pricingSnapshot as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      pricingLocked: false,
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
  if (input.serviceFrequency !== undefined) updateData.serviceFrequency = input.serviceFrequency;
  if (input.serviceSchedule !== undefined || input.serviceFrequency !== undefined) {
    const normalized = normalizeServiceSchedule(
      input.serviceSchedule,
      input.serviceFrequency
    );
    updateData.serviceSchedule =
      (normalized as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull;
  }
  if (input.pricingPlanId !== undefined) {
    updateData.pricingPlan = input.pricingPlanId
      ? { connect: { id: input.pricingPlanId } }
      : { disconnect: true };
    updateData.pricingSnapshot = Prisma.JsonNull;
  }
  if (input.pricingSnapshot !== undefined) {
    updateData.pricingSnapshot =
      (input.pricingSnapshot as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull;
  }

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

    const rawItems = input.proposalItems ?? currentProposal.proposalItems.map(item => ({
      itemType: item.itemType,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      sortOrder: item.sortOrder,
    }));
    const items = removeZeroValueItems(rawItems);

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
  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
    select: proposalSelect,
  });

  await autoAdvanceLeadStatusForAccount(proposal.account.id, 'proposal_sent');
  return proposal;
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
  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
    },
    select: proposalSelect,
  });

  await autoAdvanceLeadStatusForAccount(proposal.account.id, 'negotiation');
  return proposal;
}

export async function rejectProposal(id: string, rejectionReason: string) {
  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason,
    },
    select: proposalSelect,
  });

  await autoSetLeadStatusForAccount(proposal.account.id, 'lost');
  return proposal;
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

/**
 * Get accepted proposals that don't have a contract yet
 * Used for contract creation - only accepted proposals without existing contracts are available
 */
export async function getProposalsAvailableForContract(accountId?: string) {
  const where: Prisma.ProposalWhereInput = {
    status: 'accepted',
    archivedAt: null,
    // Exclude proposals that already have contracts
    contracts: {
      none: {},
    },
  };

  if (accountId) {
    where.accountId = accountId;
  }

  return prisma.proposal.findMany({
    where,
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      totalAmount: true,
      acceptedAt: true,
      account: {
        select: {
          id: true,
          name: true,
        },
      },
      facility: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { acceptedAt: 'desc' },
  });
}

// ============================================================
// SERVICE TASK QUICK-EDIT
// ============================================================

export async function updateProposalServiceTasks(
  proposalId: string,
  serviceId: string,
  includedTasks: string[]
) {
  // Verify proposal exists
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { id: true, status: true },
  });
  if (!proposal) {
    throw new Error('Proposal not found');
  }

  // Verify the service belongs to this proposal
  const service = await prisma.proposalService.findFirst({
    where: { id: serviceId, proposalId },
    select: { id: true },
  });
  if (!service) {
    throw new Error('Proposal service not found');
  }

  return prisma.proposalService.update({
    where: { id: serviceId },
    data: { includedTasks },
    select: {
      id: true,
      serviceName: true,
      includedTasks: true,
    },
  });
}

// ============================================================
// PRICING STRATEGY FUNCTIONS
// ============================================================

/**
 * Lock the pricing for a proposal
 * Once locked, the pricing won't automatically change when facility settings change
 */
export async function lockProposalPricing(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      pricingLocked: true,
      pricingPlanId: true,
      pricingSnapshot: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.pricingLocked) {
    throw new Error('Proposal pricing is already locked');
  }

  return prisma.proposal.update({
    where: { id: proposalId },
    data: {
      pricingLocked: true,
      pricingLockedAt: new Date(),
    },
    select: proposalSelect,
  });
}

/**
 * Unlock the pricing for a proposal
 * Allows automatic recalculation when facility settings change
 */
export async function unlockProposalPricing(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      pricingLocked: true,
      status: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (!proposal.pricingLocked) {
    throw new Error('Proposal pricing is not locked');
  }

  // Only allow unlocking draft proposals
  if (proposal.status !== 'draft') {
    throw new Error('Can only unlock pricing for draft proposals');
  }

  return prisma.proposal.update({
    where: { id: proposalId },
    data: {
      pricingLocked: false,
      pricingLockedAt: null,
    },
    select: proposalSelect,
  });
}

/**
 * Change the pricing plan for a proposal
 * Requires the proposal to be in draft status and pricing to be unlocked
 */
export async function changeProposalPricingPlan(
  proposalId: string,
  pricingPlanId: string
) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      status: true,
      pricingLocked: true,
      pricingPlanId: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.status !== 'draft') {
    throw new Error('Can only change pricing plan for draft proposals');
  }

  if (proposal.pricingLocked) {
    throw new Error('Cannot change pricing plan while pricing is locked');
  }

  await resolvePricingPlan({ pricingPlanId });

  return prisma.proposal.update({
    where: { id: proposalId },
    data: {
      pricingPlan: { connect: { id: pricingPlanId } },
      // Clear snapshot since plan changed
      pricingSnapshot: Prisma.JsonNull,
    },
    select: proposalSelect,
  });
}

/**
 * Recalculate pricing for a proposal using the stored plan
 * Updates the proposal services and totals based on current facility data
 */
export async function recalculateProposalPricing(
  proposalId: string,
  serviceFrequency: string,
  options?: {
    lockAfterRecalculation?: boolean;
    workerCount?: number;
  }
) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      status: true,
      facilityId: true,
      accountId: true,
      pricingLocked: true,
      pricingPlanId: true,
      taxRate: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.status !== 'draft') {
    throw new Error('Can only recalculate pricing for draft proposals');
  }

  if (proposal.pricingLocked) {
    throw new Error('Cannot recalculate pricing while pricing is locked. Unlock first.');
  }

  if (!proposal.facilityId) {
    throw new Error('Proposal must have a facility to recalculate pricing');
  }

  const pricing = await calculatePricing(
    {
      facilityId: proposal.facilityId,
      serviceFrequency,
      workerCount: options?.workerCount,
    },
    {
      pricingPlanId: proposal.pricingPlanId ?? undefined,
      accountId: proposal.accountId,
    }
  );

  const newServices = await generateProposalServices(
    {
      facilityId: proposal.facilityId,
      serviceFrequency,
      workerCount: options?.workerCount,
    },
    {
      pricingPlanId: proposal.pricingPlanId ?? undefined,
      accountId: proposal.accountId,
    }
  );

  // Calculate new totals
  const servicesTotal = newServices.reduce((sum, service) => sum + service.monthlyPrice, 0);
  const taxRate = Number(proposal.taxRate);
  const taxAmount = servicesTotal * taxRate;
  const totalAmount = servicesTotal + taxAmount;

  // Update the proposal
  return prisma.proposal.update({
    where: { id: proposalId },
    data: {
      subtotal: Number(servicesTotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      pricingPlanId: pricing.settingsSnapshot.pricingPlanId,
      pricingSnapshot: pricing.settingsSnapshot as unknown as Prisma.InputJsonValue,
      pricingLocked: options?.lockAfterRecalculation ?? false,
      pricingLockedAt: options?.lockAfterRecalculation ? new Date() : null,
      // Replace all services with new calculated ones
      proposalServices: {
        deleteMany: {},
        create: newServices.map((service, index) => ({
          serviceName: service.serviceName,
          serviceType: service.serviceType,
          frequency: service.frequency,
          monthlyPrice: service.monthlyPrice,
          description: service.description,
          includedTasks: service.includedTasks,
          sortOrder: index,
        })),
      },
    },
    select: proposalSelect,
  });
}

/**
 * Get pricing preview for a proposal without saving
 * Useful for showing what the pricing would be before committing
 */
export async function getProposalPricingPreview(
  proposalId: string,
  serviceFrequency: string,
  options?: {
    pricingPlanId?: string;
    workerCount?: number;
  }
): Promise<PricingBreakdown> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      facilityId: true,
      accountId: true,
      pricingPlanId: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (!proposal.facilityId) {
    throw new Error('Proposal must have a facility for pricing preview');
  }

  return calculatePricing(
    {
      facilityId: proposal.facilityId,
      serviceFrequency,
      workerCount: options?.workerCount,
    },
    {
      pricingPlanId: options?.pricingPlanId ?? proposal.pricingPlanId ?? undefined,
      accountId: proposal.accountId,
    }
  );
}
