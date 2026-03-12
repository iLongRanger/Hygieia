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
import {
  autoAdvanceLeadStatusForAccount,
  autoSetLeadStatusForAccount,
  autoSetLeadStatusForOpportunity,
} from './leadService';
import { BadRequestError } from '../middleware/errorHandler';
import { findPreferredOpportunityForAccount } from './opportunityResolver';

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

interface ProposalAccessOptions {
  userRole?: string;
  userId?: string;
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
  facilityId: string;
  opportunityId?: string | null;
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
  opportunityId?: string | null;
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
  opportunityId: true,
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
  opportunity: {
    select: {
      id: true,
      title: true,
      status: true,
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

const ACTIVE_PROPOSAL_STATUSES = ['draft', 'sent', 'viewed', 'accepted'] as const;

async function ensureSingleActiveProposalForFacility(
  accountId: string,
  facilityId: string,
  excludeProposalId?: string
) {
  const existingProposal = await prisma.proposal.findFirst({
    where: {
      accountId,
      facilityId,
      archivedAt: null,
      status: { in: [...ACTIVE_PROPOSAL_STATUSES] },
      ...(excludeProposalId ? { id: { not: excludeProposalId } } : {}),
    },
    select: {
      id: true,
      proposalNumber: true,
      status: true,
    },
  });

  if (existingProposal) {
    throw new BadRequestError(
      `Facility already has an active proposal (${existingProposal.proposalNumber}) with status ${existingProposal.status}`
    );
  }
}

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

async function resolveOpportunityForAccount(
  accountId: string,
  facilityId?: string | null,
  opportunityId?: string | null
) {
  if (opportunityId) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: {
        id: true,
        accountId: true,
        facilityId: true,
        leadId: true,
        primaryContactId: true,
        title: true,
        source: true,
        estimatedValue: true,
        probability: true,
        expectedCloseDate: true,
        ownerUserId: true,
        createdByUserId: true,
        archivedAt: true,
      },
    });

    if (!opportunity || opportunity.archivedAt) {
      throw new BadRequestError('Opportunity not found or archived');
    }

    if (opportunity.accountId !== accountId) {
      throw new BadRequestError('Opportunity does not belong to the selected account');
    }

    return opportunity;
  }

  if (facilityId) {
    const facilityOpportunity = await findPreferredOpportunityForAccount(prisma, accountId, {
      facilityId,
    });

    if (facilityOpportunity) {
      return facilityOpportunity;
    }
  }

  return findPreferredOpportunityForAccount(prisma, accountId);
}

function deriveOpportunityTitle(lead: {
  companyName?: string | null;
  contactName?: string | null;
} | null) {
  return lead?.companyName?.trim()
    || lead?.contactName?.trim()
    || 'Sales Opportunity';
}

async function ensureFacilityScopedOpportunity(
  input: ProposalCreateInput,
  opportunityId: string | null
) {
  if (!input.facilityId || !opportunityId) {
    return opportunityId;
  }

  const sourceOpportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      accountId: true,
      facilityId: true,
      leadId: true,
      primaryContactId: true,
      title: true,
      source: true,
      estimatedValue: true,
      probability: true,
      expectedCloseDate: true,
      ownerUserId: true,
      createdByUserId: true,
      archivedAt: true,
    },
  });

  if (!sourceOpportunity || sourceOpportunity.archivedAt) {
    return opportunityId;
  }

  if (sourceOpportunity.facilityId === input.facilityId) {
    return sourceOpportunity.id;
  }

  const existingFacilityOpportunity = await prisma.opportunity.findFirst({
    where: {
      accountId: input.accountId,
      facilityId: input.facilityId,
      archivedAt: null,
      ...(sourceOpportunity.leadId ? { leadId: sourceOpportunity.leadId } : {}),
    },
    select: { id: true },
  });

  if (existingFacilityOpportunity) {
    return existingFacilityOpportunity.id;
  }

  if (!sourceOpportunity.leadId) {
    return sourceOpportunity.id;
  }

  const [lead, primaryContact] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: sourceOpportunity.leadId },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        estimatedValue: true,
        probability: true,
        expectedCloseDate: true,
        assignedToUserId: true,
        createdByUserId: true,
      },
    }),
    prisma.contact.findFirst({
      where: { accountId: input.accountId, archivedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    }),
  ]);

  const createdOpportunity = await prisma.opportunity.create({
    data: {
      leadId: sourceOpportunity.leadId,
      accountId: input.accountId,
      facilityId: input.facilityId,
      primaryContactId: primaryContact?.id ?? sourceOpportunity.primaryContactId ?? null,
      title: sourceOpportunity.title || deriveOpportunityTitle(lead),
      source: sourceOpportunity.source ?? null,
      estimatedValue: sourceOpportunity.estimatedValue ?? lead?.estimatedValue ?? null,
      probability: sourceOpportunity.probability ?? lead?.probability ?? 0,
      expectedCloseDate:
        sourceOpportunity.expectedCloseDate ?? lead?.expectedCloseDate ?? null,
      ownerUserId: sourceOpportunity.ownerUserId ?? lead?.assignedToUserId ?? null,
      createdByUserId:
        sourceOpportunity.createdByUserId ?? lead?.createdByUserId ?? input.createdByUserId,
      status: 'walk_through_completed',
    },
    select: { id: true },
  });

  return createdOpportunity.id;
}

async function assertProposalCreateReadiness(
  input: ProposalCreateInput
): Promise<{ opportunityId: string | null }> {
  const account = await prisma.account.findUnique({
    where: { id: input.accountId },
    select: {
      id: true,
      archivedAt: true,
    },
  });

  if (!account || account.archivedAt) {
    throw new BadRequestError('Account not found or archived');
  }

  const opportunity = await resolveOpportunityForAccount(
    input.accountId,
    input.facilityId,
    input.opportunityId
  );

  if (!opportunity) {
    throw new BadRequestError('Proposal creation requires a converted lead with a completed walkthrough');
  }

  const completedWalkthrough = await prisma.appointment.findFirst({
    where: {
      type: 'walk_through',
      status: 'completed',
      facilityId: input.facilityId,
      OR: [
        { opportunityId: opportunity.id },
        ...(opportunity.leadId ? [{ leadId: opportunity.leadId }] : []),
      ],
    },
    select: { id: true },
    orderBy: { scheduledStart: 'desc' },
  });

  if (!completedWalkthrough) {
    throw new BadRequestError(
      'Walkthrough must be completed for the selected facility before creating a proposal'
    );
  }

  const facility = await prisma.facility.findUnique({
    where: { id: input.facilityId },
    select: {
      id: true,
      accountId: true,
      archivedAt: true,
      status: true,
    },
  });

  if (!facility || facility.archivedAt) {
    throw new BadRequestError('Facility not found or archived');
  }

  if (facility.accountId !== input.accountId) {
    throw new BadRequestError('Facility does not belong to the selected account');
  }

  if (facility.status !== 'active') {
    throw new BadRequestError('Facility must be active before creating a proposal');
  }

  await ensureSingleActiveProposalForFacility(input.accountId, facility.id);

  const [areaCount, taskCount] = await Promise.all([
    prisma.area.count({
      where: {
        facilityId: facility.id,
        archivedAt: null,
      },
    }),
    prisma.facilityTask.count({
      where: {
        facilityId: facility.id,
        archivedAt: null,
      },
    }),
  ]);

  if (areaCount === 0) {
    throw new BadRequestError('Facility must have at least one area before creating a proposal');
  }

  if (taskCount === 0) {
    throw new BadRequestError('Facility must have at least one task before creating a proposal');
  }

  const resolvedOpportunityId = await ensureFacilityScopedOpportunity(input, opportunity.id);

  return { opportunityId: resolvedOpportunityId };
}

export async function listProposals(
  params: ProposalListParams,
  access: ProposalAccessOptions = {}
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

  if (access.userRole === 'manager' && access.userId) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { account: { accountManagerId: access.userId } },
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
  const readiness = await assertProposalCreateReadiness(input);

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
      opportunityId: readiness.opportunityId,
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
  let currentProposalForUpdate:
    | {
        accountId: string;
        facilityId: string | null;
        opportunityId: string | null;
        taxRate: Prisma.Decimal | number;
      }
    | null = null;

  const getCurrentProposalForUpdate = async () => {
    if (currentProposalForUpdate) {
      return currentProposalForUpdate;
    }

    currentProposalForUpdate = await prisma.proposal.findUnique({
      where: { id },
      select: {
        accountId: true,
        facilityId: true,
        opportunityId: true,
        taxRate: true,
      },
    });

    if (!currentProposalForUpdate) {
      throw new Error('Proposal not found');
    }

    return currentProposalForUpdate;
  };

  if (
    input.accountId !== undefined
    || input.facilityId !== undefined
    || input.opportunityId !== undefined
  ) {
    const currentProposal = await getCurrentProposalForUpdate();
    const effectiveAccountId = input.accountId ?? currentProposal.accountId;
    const effectiveFacilityId =
      input.facilityId !== undefined ? input.facilityId : currentProposal.facilityId;
    const effectiveOpportunityId =
      input.opportunityId !== undefined ? input.opportunityId : currentProposal.opportunityId;

    if (!effectiveFacilityId) {
      throw new BadRequestError('Facility is required for proposals');
    }

    await ensureSingleActiveProposalForFacility(
      effectiveAccountId,
      effectiveFacilityId,
      id
    );

    await assertProposalCreateReadiness({
      accountId: effectiveAccountId,
      facilityId: effectiveFacilityId,
      opportunityId: effectiveOpportunityId,
      title: input.title ?? 'Existing Proposal',
      createdByUserId: 'system',
    });
  }

  if (input.accountId !== undefined) {
    updateData.account = { connect: { id: input.accountId } };
  }
  if (input.facilityId !== undefined) {
    updateData.facility = input.facilityId
      ? { connect: { id: input.facilityId } }
      : { disconnect: true };
  }
  if (input.opportunityId !== undefined) {
    updateData.opportunity = input.opportunityId
      ? { connect: { id: input.opportunityId } }
      : { disconnect: true };
  }
  if (input.status === 'draft') {
    updateData.sentAt = null;
    updateData.viewedAt = null;
    updateData.acceptedAt = null;
    updateData.rejectedAt = null;
    updateData.rejectionReason = null;
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

  if (proposal.opportunityId) {
    await autoSetLeadStatusForOpportunity(proposal.opportunityId, 'proposal_sent', {
      mode: 'advance',
    });
  } else {
    await autoAdvanceLeadStatusForAccount(proposal.account.id, 'proposal_sent');
  }
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

  if (proposal.opportunityId) {
    await autoSetLeadStatusForOpportunity(proposal.opportunityId, 'negotiation', {
      mode: 'advance',
    });
  } else {
    await autoAdvanceLeadStatusForAccount(proposal.account.id, 'negotiation');
  }
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

  if (proposal.opportunityId) {
    await autoSetLeadStatusForOpportunity(proposal.opportunityId, 'lost');
  } else {
    await autoSetLeadStatusForAccount(proposal.account.id, 'lost');
  }
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
export async function getProposalsAvailableForContract(
  accountId?: string,
  access: ProposalAccessOptions = {}
) {
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

  if (access.userRole === 'manager' && access.userId) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { account: { accountManagerId: access.userId } },
    ];
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
