import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { generateContractTerms } from './contractTemplateService';
import { tierToPercentage, percentageToTier } from '../lib/subcontractorTiers';
import {
  extractFacilityTimezone,
  mapProposalFrequencyToContractFrequency,
  normalizeServiceSchedule,
} from './serviceScheduleService';
import {
  autoAdvanceLeadStatusForAccount,
  autoSetLeadStatusForAccount,
  autoSetLeadStatusForOpportunity,
} from './leadService';

export interface ContractListParams {
  page?: number;
  limit?: number;
  status?: string;
  needsAttention?: boolean;
  unassignedOnly?: boolean;
  nearingRenewalOnly?: boolean;
  renewalWindowDays?: number;
  accountId?: string;
  facilityId?: string;
  proposalId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface ContractSummaryParams {
  accountId?: string;
  includeArchived?: boolean;
  renewalWindowDays?: number;
}

export interface ContractCreateInput {
  title: string;
  accountId: string;
  facilityId?: string | null;
  proposalId?: string | null;
  startDate: Date;
  endDate?: Date | null;
  serviceFrequency?: string | null;
  serviceSchedule?: any;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue: number;
  totalValue?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
  subcontractorTier?: string | null;
  createdByUserId: string;
}

export interface ContractUpdateInput {
  title?: string;
  accountId?: string;
  facilityId?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  serviceFrequency?: string | null;
  serviceSchedule?: any;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue?: number;
  totalValue?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
  subcontractorTier?: string | null;
}

export interface ContractSignInput {
  signedDate: Date;
  signedByName: string;
  signedByEmail: string;
  signedDocumentUrl?: string | null;
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

interface ContractAccessOptions {
  userRole?: string;
  userTeamId?: string;
  userId?: string;
}

function applyContractAccessScope(
  where: Prisma.ContractWhereInput,
  options?: ContractAccessOptions
) {
  if (options?.userRole === 'subcontractor' && options.userTeamId) {
    where.assignedTeamId = options.userTeamId;
  }

  if (options?.userRole === 'cleaner' && options.userId) {
    where.assignedToUserId = options.userId;
  }

  if (options?.userRole === 'manager' && options.userId) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { createdByUserId: options.userId },
          { account: { accountManagerId: options.userId } },
        ],
      },
    ];
  }
}

const contractSelect = {
  id: true,
  opportunityId: true,
  contractNumber: true,
  title: true,
  status: true,
  renewalNumber: true,
  startDate: true,
  endDate: true,
  serviceFrequency: true,
  serviceSchedule: true,
  autoRenew: true,
  renewalNoticeDays: true,
  monthlyValue: true,
  totalValue: true,
  billingCycle: true,
  paymentTerms: true,
  subcontractorTier: true,
  termsAndConditions: true,
  termsDocumentName: true,
  termsDocumentMimeType: true,
  specialInstructions: true,
  signedDocumentUrl: true,
  signedDate: true,
  signedByName: true,
  signedByEmail: true,
  sentAt: true,
  viewedAt: true,
  publicToken: true,
  approvedAt: true,
  terminationReason: true,
  terminatedAt: true,
  includesInitialClean: true,
  initialCleanCompleted: true,
  initialCleanCompletedAt: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  account: {
    select: {
      id: true,
      name: true,
      type: true,
      contacts: {
        where: {
          archivedAt: null,
          email: { not: null },
        },
        select: {
          name: true,
          email: true,
          isPrimary: true,
        },
        orderBy: [
          { isPrimary: 'desc' as const },
          { createdAt: 'asc' as const },
        ],
      },
    },
  },
  facility: {
    select: {
      id: true,
      name: true,
      address: true,
      buildingType: true,
      accessInstructions: true,
      parkingInfo: true,
      specialRequirements: true,
      notes: true,
    },
  },
  proposal: {
    select: {
      id: true,
      proposalNumber: true,
      title: true,
    },
  },
  opportunity: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
  assignedTeam: {
    select: {
      id: true,
      name: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
    },
  },
  pendingAssignedTeamId: true,
  pendingAssignedToUserId: true,
  pendingSubcontractorTier: true,
  assignmentOverrideEffectiveDate: true,
  assignmentOverrideSetAt: true,
  pendingAssignedTeam: {
    select: {
      id: true,
      name: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    },
  },
  pendingAssignedToUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
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
      email: true,
    },
  },
} satisfies Prisma.ContractSelect;

const {
  assignedToUser: _assignedToUserOmitted,
  pendingAssignedTeamId: _pendingAssignedTeamIdOmitted,
  pendingAssignedToUserId: _pendingAssignedToUserIdOmitted,
  pendingSubcontractorTier: _pendingSubcontractorTierOmitted,
  assignmentOverrideEffectiveDate: _assignmentOverrideEffectiveDateOmitted,
  assignmentOverrideSetAt: _assignmentOverrideSetAtOmitted,
  pendingAssignedTeam: _pendingAssignedTeamOmitted,
  pendingAssignedToUser: _pendingAssignedToUserOmitted,
  ...contractSelectWithoutAssignedUser
} = contractSelect;

function isLegacyContractColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const missingColumns = [
    'contracts.assigned_to_user_id',
    'contracts.pending_assigned_team_id',
    'contracts.pending_assigned_to_user_id',
    'contracts.pending_subcontractor_tier',
    'contracts.assignment_override_effective_date',
    'contracts.assignment_override_set_at',
  ];
  return error.message.includes('does not exist') && missingColumns.some((c) => error.message.includes(c));
}

function withLegacyPendingDefaults<T extends Record<string, any>>(contract: T) {
  return {
    ...contract,
    assignedToUser: 'assignedToUser' in contract ? contract.assignedToUser : null,
    pendingAssignedTeamId: 'pendingAssignedTeamId' in contract ? contract.pendingAssignedTeamId : null,
    pendingAssignedToUserId: 'pendingAssignedToUserId' in contract ? contract.pendingAssignedToUserId : null,
    pendingSubcontractorTier:
      'pendingSubcontractorTier' in contract ? contract.pendingSubcontractorTier : null,
    assignmentOverrideEffectiveDate:
      'assignmentOverrideEffectiveDate' in contract ? contract.assignmentOverrideEffectiveDate : null,
    assignmentOverrideSetAt: 'assignmentOverrideSetAt' in contract ? contract.assignmentOverrideSetAt : null,
    pendingAssignedTeam: 'pendingAssignedTeam' in contract ? contract.pendingAssignedTeam : null,
    pendingAssignedToUser: 'pendingAssignedToUser' in contract ? contract.pendingAssignedToUser : null,
  };
}

async function createContractWithLegacyFallback(data: Prisma.ContractCreateArgs['data']) {
  try {
    const contract = await prisma.contract.create({
      data,
      select: contractSelect,
    });
    return withLegacyPendingDefaults(contract);
  } catch (error) {
    if (!isLegacyContractColumnError(error)) {
      throw error;
    }

    const contract = await prisma.contract.create({
      data,
      select: contractSelectWithoutAssignedUser,
    });
    return withLegacyPendingDefaults(contract);
  }
}

async function updateContractWithLegacyFallback(
  where: Prisma.ContractWhereUniqueInput,
  data: Prisma.ContractUpdateArgs['data']
) {
  try {
    const contract = await prisma.contract.update({
      where,
      data,
      select: contractSelect,
    });
    return withLegacyPendingDefaults(contract);
  } catch (error) {
    if (!isLegacyContractColumnError(error)) {
      throw error;
    }

    const contract = await prisma.contract.update({
      where,
      data,
      select: contractSelectWithoutAssignedUser,
    });
    return withLegacyPendingDefaults(contract);
  }
}

/**
 * Generate the next contract number in the format: CONT-YYYYMM-XXXX
 */
async function generateContractNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7).replace('-', '');
  const prefix = `CONT-${yearMonth}`;

  const lastContract = await prisma.contract.findFirst({
    where: {
      contractNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      contractNumber: 'desc',
    },
    select: {
      contractNumber: true,
    },
  });

  let nextSequence = 1;
  if (lastContract) {
    const lastSequence = parseInt(lastContract.contractNumber.split('-')[2] || '0');
    nextSequence = lastSequence + 1;
  }

  return `${prefix}-${nextSequence.toString().padStart(4, '0')}`;
}

/**
 * List contracts with pagination and filtering
 */
export async function listContracts(
  params: ContractListParams,
  options?: ContractAccessOptions
): Promise<PaginatedResult<any>> {
  const {
    page = 1,
    limit = 10,
    status,
    needsAttention = false,
    unassignedOnly = false,
    nearingRenewalOnly = false,
    renewalWindowDays = 30,
    accountId,
    facilityId,
    proposalId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.ContractWhereInput = {};
  applyContractAccessScope(where, options);

  if (status) {
    where.status = status;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  if (facilityId) {
    where.facilityId = facilityId;
  }

  if (proposalId) {
    where.proposalId = proposalId;
  }

  const andConditions: Prisma.ContractWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (needsAttention) {
    andConditions.push({
      OR: [
        { assignedTeamId: null },
        { status: { in: ['sent', 'viewed'] } },
      ],
    });
  }

  if (unassignedOnly) {
    andConditions.push({ assignedTeamId: null });
  }

  if (nearingRenewalOnly) {
    const renewalEndDate = new Date();
    renewalEndDate.setDate(renewalEndDate.getDate() + renewalWindowDays);
    andConditions.push({
      status: 'active',
      endDate: {
        gte: new Date(),
        lte: renewalEndDate,
      },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  if (!includeArchived) {
    where.archivedAt = null;
  }

  const total = await prisma.contract.count({ where });

  let contracts;
  try {
    contracts = await prisma.contract.findMany({
      where,
      select: contractSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });
  } catch (error) {
    if (!isLegacyContractColumnError(error)) {
      throw error;
    }

    contracts = await prisma.contract.findMany({
      where,
      select: contractSelectWithoutAssignedUser,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  return {
    data: contracts.map((contract) => ({
      ...contract,
      assignedToUser: 'assignedToUser' in contract ? contract.assignedToUser : null,
      pendingAssignedTeamId: 'pendingAssignedTeamId' in contract ? contract.pendingAssignedTeamId : null,
      pendingAssignedToUserId: 'pendingAssignedToUserId' in contract ? contract.pendingAssignedToUserId : null,
      pendingSubcontractorTier:
        'pendingSubcontractorTier' in contract ? contract.pendingSubcontractorTier : null,
      assignmentOverrideEffectiveDate:
        'assignmentOverrideEffectiveDate' in contract ? contract.assignmentOverrideEffectiveDate : null,
      assignmentOverrideSetAt: 'assignmentOverrideSetAt' in contract ? contract.assignmentOverrideSetAt : null,
      pendingAssignedTeam: 'pendingAssignedTeam' in contract ? contract.pendingAssignedTeam : null,
      pendingAssignedToUser: 'pendingAssignedToUser' in contract ? contract.pendingAssignedToUser : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get contract by ID
 */
export async function getContractById(id: string) {
  let contract;
  try {
    contract = await prisma.contract.findUnique({
      where: { id },
      select: contractSelect,
    });
  } catch (error) {
    if (!isLegacyContractColumnError(error)) {
      throw error;
    }
    contract = await prisma.contract.findUnique({
      where: { id },
      select: contractSelectWithoutAssignedUser,
    });
  }

  if (!contract) {
    throw new Error('Contract not found');
  }

  return withLegacyPendingDefaults(contract);
}

/**
 * Create a new contract
 * Note: For new contracts, use createContractFromProposal() which requires an accepted proposal.
 * This function is now primarily used internally or for standalone/legacy contracts.
 */
export async function createContract(data: ContractCreateInput) {
  // Enforce that contracts require a proposal unless explicitly marked as imported/legacy
  // This validation ensures all new contracts come from accepted proposals
  if (!data.proposalId) {
    throw new Error(
      'Contract creation requires a proposal. Use createContractFromProposal() for new contracts, ' +
      'or createStandaloneContract() for imported/legacy contracts.'
    );
  }

  // If proposalId is provided, validate the proposal
  const proposal = await prisma.proposal.findUnique({
    where: { id: data.proposalId },
    select: { status: true, opportunityId: true },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.status !== 'accepted') {
    throw new Error('Only accepted proposals can be converted to contracts');
  }

  // Check if contract already exists for this proposal
  const existingContract = await prisma.contract.findFirst({
    where: { proposalId: data.proposalId },
  });

  if (existingContract) {
    throw new Error('A contract already exists for this proposal');
  }

  const contractNumber = await generateContractNumber();
  const normalizedSchedule = normalizeServiceSchedule(
    data.serviceSchedule,
    data.serviceFrequency
  );

  // Auto-generate terms if not provided
  let termsAndConditions = data.termsAndConditions;
  if (!termsAndConditions) {
    const [account, facility] = await Promise.all([
      prisma.account.findUnique({ where: { id: data.accountId }, select: { name: true } }),
      data.facilityId
        ? prisma.facility.findUnique({ where: { id: data.facilityId }, select: { name: true, address: true } })
        : null,
    ]);
    termsAndConditions = await generateContractTerms({
      contractNumber,
      title: data.title,
      accountName: account?.name || 'Client',
      facilityName: facility?.name,
      facilityAddress: facility?.address,
      startDate: data.startDate,
      endDate: data.endDate,
      monthlyValue: data.monthlyValue,
      totalValue: data.totalValue,
      billingCycle: data.billingCycle,
      paymentTerms: data.paymentTerms,
      serviceFrequency: data.serviceFrequency,
      serviceSchedule: normalizedSchedule,
      autoRenew: data.autoRenew,
      renewalNoticeDays: data.renewalNoticeDays,
      facilityTimezone: facility ? extractFacilityTimezone(facility.address) : null,
    });
  }

  return createContractWithLegacyFallback({
    contractNumber,
    title: data.title,
    status: 'draft',
    account: { connect: { id: data.accountId } },
    ...(data.facilityId && { facility: { connect: { id: data.facilityId } } }),
    proposal: { connect: { id: data.proposalId! } },
    ...(proposal.opportunityId && { opportunity: { connect: { id: proposal.opportunityId } } }),
    startDate: data.startDate,
    endDate: data.endDate,
    serviceFrequency: data.serviceFrequency,
    serviceSchedule:
      (normalizedSchedule as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    autoRenew: data.autoRenew,
    renewalNoticeDays: data.renewalNoticeDays,
    monthlyValue: data.monthlyValue,
    totalValue: data.totalValue,
    billingCycle: data.billingCycle,
    paymentTerms: data.paymentTerms,
    termsAndConditions,
    termsDocumentName: data.termsDocumentName,
    termsDocumentMimeType: data.termsDocumentMimeType,
    termsDocumentDataUrl: data.termsDocumentDataUrl,
    specialInstructions: data.specialInstructions,
    subcontractorTier: data.subcontractorTier,
    includesInitialClean: true,
    createdByUser: { connect: { id: data.createdByUserId } },
  });
}

/**
 * Create a contract from an accepted proposal
 */
export async function createContractFromProposal(
  proposalId: string,
  createdByUserId: string,
  overrides?: Partial<ContractCreateInput>
) {
  // Get the proposal with all details
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      account: true,
      facility: true,
      proposalServices: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.status !== 'accepted') {
    throw new Error('Only accepted proposals can be converted to contracts');
  }

  // Check if contract already exists for this proposal
  const existingContract = await prisma.contract.findFirst({
    where: { proposalId },
  });

  if (existingContract) {
    throw new Error('A contract already exists for this proposal');
  }

  // Calculate total value based on proposal and contract duration
  const monthlyValue = Number(proposal.totalAmount);
  const contractNumber = await generateContractNumber();
  const mappedProposalFrequency = mapProposalFrequencyToContractFrequency(
    proposal.serviceFrequency
  );
  const normalizedProposalSchedule = normalizeServiceSchedule(
    proposal.serviceSchedule,
    proposal.serviceFrequency || mappedProposalFrequency || 'weekly'
  );
  const resolvedServiceFrequency =
    proposal.serviceFrequency ||
    mappedProposalFrequency ||
    'monthly';
  const resolvedServiceSchedule = normalizedProposalSchedule;

  // Reverse-lookup subcontractor tier from proposal's pricing snapshot
  const snapshot = proposal.pricingSnapshot as Record<string, any> | null;
  const snapshotPct = snapshot?.subcontractorPercentage;
  const subcontractorTier = snapshotPct != null
    ? percentageToTier(Number(snapshotPct))
    : 'premium';

  const contractData: Prisma.ContractCreateInput = {
    contractNumber,
    title: overrides?.title || proposal.title,
    status: 'draft',
    account: { connect: { id: proposal.accountId } },
    ...(proposal.facilityId && { facility: { connect: { id: proposal.facilityId } } }),
    proposal: { connect: { id: proposalId } },
    ...(proposal.opportunityId && { opportunity: { connect: { id: proposal.opportunityId } } }),
    startDate: overrides?.startDate || new Date(),
    endDate: overrides?.endDate || null,
    serviceFrequency: resolvedServiceFrequency,
    serviceSchedule:
      (resolvedServiceSchedule as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    autoRenew: overrides?.autoRenew ?? false,
    renewalNoticeDays: overrides?.renewalNoticeDays ?? 30,
    monthlyValue,
    totalValue: overrides?.totalValue || null,
    billingCycle: overrides?.billingCycle || 'monthly',
    paymentTerms: overrides?.paymentTerms || proposal.account.paymentTerms || 'Net 30',
    termsAndConditions: overrides?.termsAndConditions || proposal.termsAndConditions || null,
    termsDocumentName: overrides?.termsDocumentName ?? null,
    termsDocumentMimeType: overrides?.termsDocumentMimeType ?? null,
    termsDocumentDataUrl: overrides?.termsDocumentDataUrl ?? null,
    specialInstructions: overrides?.specialInstructions || proposal.notes,
    includesInitialClean: true,
    subcontractorTier,
    createdByUser: { connect: { id: createdByUserId } },
  };

  // Auto-generate terms if not provided from overrides or proposal
  if (!contractData.termsAndConditions) {
    contractData.termsAndConditions = await generateContractTerms({
      contractNumber,
      title: contractData.title as string,
      accountName: proposal.account.name,
      facilityName: proposal.facility?.name,
      facilityAddress: proposal.facility?.address,
      startDate: contractData.startDate as Date,
      endDate: contractData.endDate as Date | null,
      monthlyValue,
      billingCycle: contractData.billingCycle as string,
      paymentTerms: contractData.paymentTerms as string,
      serviceFrequency: contractData.serviceFrequency as string | null,
      serviceSchedule: contractData.serviceSchedule as Record<string, unknown> | null,
      autoRenew: contractData.autoRenew as boolean,
      renewalNoticeDays: contractData.renewalNoticeDays as number | null,
      facilityTimezone: proposal.facility
        ? extractFacilityTimezone(proposal.facility.address)
        : null,
    });
  }

  return createContractWithLegacyFallback(contractData);
}

/**
 * Update contract
 */
export async function updateContract(id: string, data: ContractUpdateInput) {
  const { serviceSchedule, ...rest } = data;
  const updateData: Prisma.ContractUpdateInput = {
    ...rest,
  };

  if (serviceSchedule !== undefined || data.serviceFrequency !== undefined) {
    const normalized = normalizeServiceSchedule(serviceSchedule, data.serviceFrequency);
    updateData.serviceSchedule =
      (normalized as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull;
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: updateData,
    select: contractSelect,
  });

  return contract;
}

/**
 * Update contract status
 */
export async function updateContractStatus(
  id: string,
  status: string,
  userId?: string
) {
  const updateData: Prisma.ContractUpdateInput = { status };

  // If activating contract, set approval details
  if (status === 'active' && userId) {
    updateData.approvedByUser = { connect: { id: userId } };
    updateData.approvedAt = new Date();
  }

  // If terminating contract, set termination date
  if (status === 'terminated') {
    updateData.terminatedAt = new Date();
  }

  const contract = await updateContractWithLegacyFallback({ id }, updateData);

  if (status === 'active') {
    if (contract.opportunityId) {
      await autoSetLeadStatusForOpportunity(contract.opportunityId, 'won', {
        mode: 'advance',
      });
    } else {
      await autoAdvanceLeadStatusForAccount(contract.account.id, 'won');
    }
  }
  if (status === 'terminated') {
    if (contract.opportunityId) {
      await autoSetLeadStatusForOpportunity(contract.opportunityId, 'lost');
    } else {
      await autoSetLeadStatusForAccount(contract.account.id, 'lost');
    }
  }

  return contract;
}

export async function getContractsSummary(
  params: ContractSummaryParams,
  options?: ContractAccessOptions
) {
  const {
    accountId,
    includeArchived = false,
    renewalWindowDays = 30,
  } = params;

  const where: Prisma.ContractWhereInput = {};

  applyContractAccessScope(where, options);

  if (accountId) {
    where.accountId = accountId;
  }

  if (!includeArchived) {
    where.archivedAt = null;
  }

  const renewalEndDate = new Date();
  renewalEndDate.setDate(renewalEndDate.getDate() + renewalWindowDays);

  const [
    total,
    draft,
    sent,
    viewed,
    pendingSignature,
    active,
    unassigned,
    nearingRenewal,
  ] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.count({ where: { ...where, status: 'draft' } }),
    prisma.contract.count({ where: { ...where, status: 'sent' } }),
    prisma.contract.count({ where: { ...where, status: 'viewed' } }),
    prisma.contract.count({ where: { ...where, status: 'pending_signature' } }),
    prisma.contract.count({ where: { ...where, status: 'active' } }),
    prisma.contract.count({ where: { ...where, assignedTeamId: null } }),
    prisma.contract.count({
      where: {
        ...where,
        status: 'active',
        endDate: {
          gte: new Date(),
          lte: renewalEndDate,
        },
      },
    }),
  ]);

  return {
    total,
    byStatus: {
      draft,
      sent,
      viewed,
      pendingSignature,
      active,
    },
    unassigned,
    nearingRenewal,
    renewalWindowDays,
  };
}

/**
 * Mark contract as sent
 */
export async function sendContract(id: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    select: { status: true, accountId: true, opportunityId: true },
  });

  // Don't regress an active contract back to 'sent'
  const data: { status?: string; sentAt: Date } = { sentAt: new Date() };
  if (contract?.status !== 'active') {
    data.status = 'sent';
  }

  const updatedContract = await prisma.contract.update({
    where: { id },
    data,
    select: contractSelect,
  });

  if (contract?.opportunityId) {
    await autoSetLeadStatusForOpportunity(contract.opportunityId, 'negotiation', {
      mode: 'advance',
    });
  } else if (contract?.accountId) {
    await autoAdvanceLeadStatusForAccount(contract.accountId, 'negotiation');
  }

  return updatedContract;
}

/**
 * Assign or unassign a team from an active contract.
 */
export async function assignContractTeam(
  contractId: string,
  teamId: string | null,
  assignedToUserId: string | null = null,
  subcontractorTier?: string
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      accountId: true,
      opportunityId: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.status !== 'active') {
    throw new Error('Only active contracts can have team assignments');
  }

  if (teamId && assignedToUserId) {
    throw new Error('Assign either a subcontractor team or an internal employee, not both');
  }

  await validateContractAssignee(teamId, assignedToUserId);

  const data: any = {
    assignedTeamId: teamId,
    assignedToUserId: assignedToUserId,
    pendingAssignedTeamId: null,
    pendingAssignedToUserId: null,
    pendingSubcontractorTier: null,
    assignmentOverrideEffectiveDate: null,
    assignmentOverrideSetByUserId: null,
    assignmentOverrideSetAt: null,
  };
  if (subcontractorTier !== undefined) {
    data.subcontractorTier = subcontractorTier;
  }

  let updatedContract;
  try {
    updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data,
      select: contractSelect,
    });
  } catch (error) {
    if (!isLegacyContractColumnError(error)) {
      throw error;
    }

    const legacyData: Record<string, unknown> = {
      assignedTeamId: teamId,
      assignedToUserId: assignedToUserId,
    };
    if (subcontractorTier !== undefined) {
      legacyData.subcontractorTier = subcontractorTier;
    }

    updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: legacyData,
      select: contractSelectWithoutAssignedUser,
    });
  }

  if (teamId || assignedToUserId) {
    if (contract.opportunityId) {
      await autoSetLeadStatusForOpportunity(contract.opportunityId, 'won', {
        mode: 'advance',
      });
    } else {
      await autoAdvanceLeadStatusForAccount(contract.accountId, 'won');
    }
  }

  return withLegacyPendingDefaults(updatedContract);
}

async function validateContractAssignee(
  teamId: string | null,
  assignedToUserId: string | null
): Promise<void> {
  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        isActive: true,
        archivedAt: true,
      },
    });

    if (!team || team.archivedAt || !team.isActive) {
      throw new Error('Team not found or inactive');
    }
  }

  if (assignedToUserId) {
    const user = await prisma.user.findUnique({
      where: { id: assignedToUserId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new Error('Assigned internal employee not found or inactive');
    }
  }
}

export async function scheduleContractAssignmentOverride(
  contractId: string,
  teamId: string | null,
  assignedToUserId: string | null,
  effectivityDate: Date,
  updatedByUserId: string,
  subcontractorTier?: string
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      assignedTeamId: true,
      assignedToUserId: true,
      subcontractorTier: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.status !== 'active') {
    throw new Error('Only active contracts can have assignment overrides');
  }

  if (!teamId && !assignedToUserId) {
    throw new Error('Assignment override requires a team or internal employee');
  }

  if (teamId && assignedToUserId) {
    throw new Error('Assign either a subcontractor team or an internal employee, not both');
  }

  await validateContractAssignee(teamId, assignedToUserId);

  const sameAssignee =
    contract.assignedTeamId === (teamId ?? null) &&
    contract.assignedToUserId === (assignedToUserId ?? null) &&
    (teamId ? (subcontractorTier ?? contract.subcontractorTier) === contract.subcontractorTier : true);
  if (sameAssignee) {
    throw new Error('New assignment must be different from current assignment');
  }

  const dateOnlyIso = effectivityDate.toISOString().slice(0, 10);
  const normalizedDate = new Date(`${dateOnlyIso}T00:00:00.000Z`);

  return prisma.contract.update({
    where: { id: contractId },
    data: {
      pendingAssignedTeamId: teamId,
      pendingAssignedToUserId: assignedToUserId,
      pendingSubcontractorTier: teamId ? subcontractorTier ?? contract.subcontractorTier : null,
      assignmentOverrideEffectiveDate: normalizedDate,
      assignmentOverrideSetByUserId: updatedByUserId,
      assignmentOverrideSetAt: new Date(),
    },
    select: contractSelect,
  });
}

/**
 * Sign contract
 */
export async function signContract(id: string, signData: ContractSignInput) {
  const contract = await updateContractWithLegacyFallback(
    { id },
    {
      ...signData,
      status: 'pending_signature',
    }
  );

  if (contract.opportunityId) {
    await autoSetLeadStatusForOpportunity(contract.opportunityId, 'won', {
      mode: 'advance',
    });
  } else {
    await autoAdvanceLeadStatusForAccount(contract.account.id, 'won');
  }
  return contract;
}

/**
 * Terminate contract
 */
export async function terminateContract(id: string, reason: string) {
  const contract = await updateContractWithLegacyFallback(
    { id },
    {
      status: 'terminated',
      terminationReason: reason,
      terminatedAt: new Date(),
    }
  );

  if (contract.opportunityId) {
    await autoSetLeadStatusForOpportunity(contract.opportunityId, 'lost');
  } else {
    await autoSetLeadStatusForAccount(contract.account.id, 'lost');
  }
  return contract;
}

/**
 * Archive contract (soft delete)
 */
export async function archiveContract(id: string) {
  return updateContractWithLegacyFallback(
    { id },
    {
      archivedAt: new Date(),
    }
  );
}

/**
 * Restore archived contract
 */
export async function restoreContract(id: string) {
  return updateContractWithLegacyFallback(
    { id },
    {
      archivedAt: null,
    }
  );
}

// ============================================================
// Contract Renewal
// ============================================================

export interface RenewContractInput {
  startDate?: Date;
  endDate?: Date | null;
  monthlyValue?: number;
  serviceFrequency?: string | null;
  serviceSchedule?: any;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
}

/**
 * Renew a contract by updating it in place with new dates/terms
 */
export async function renewContract(
  contractId: string,
  input: RenewContractInput,
  _createdByUserId: string
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      renewalNumber: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.status !== 'active' && contract.status !== 'expired') {
    throw new Error('Only active or expired contracts can be renewed');
  }

  // Build update data from provided fields only
  const updateData: Prisma.ContractUpdateInput = {
    renewalNumber: contract.renewalNumber + 1,
  };

  if (input.startDate !== undefined) updateData.startDate = input.startDate;
  if (input.endDate !== undefined) updateData.endDate = input.endDate;
  if (input.monthlyValue !== undefined) updateData.monthlyValue = input.monthlyValue;
  if (input.serviceFrequency !== undefined) updateData.serviceFrequency = input.serviceFrequency;
  if (input.serviceSchedule !== undefined || input.serviceFrequency !== undefined) {
    const normalized = normalizeServiceSchedule(input.serviceSchedule, input.serviceFrequency);
    updateData.serviceSchedule =
      (normalized as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull;
  }
  if (input.autoRenew !== undefined) updateData.autoRenew = input.autoRenew;
  if (input.renewalNoticeDays !== undefined) updateData.renewalNoticeDays = input.renewalNoticeDays;
  if (input.billingCycle !== undefined) updateData.billingCycle = input.billingCycle;
  if (input.paymentTerms !== undefined) updateData.paymentTerms = input.paymentTerms;
  if (input.termsAndConditions !== undefined) updateData.termsAndConditions = input.termsAndConditions;
  if (input.termsDocumentName !== undefined) updateData.termsDocumentName = input.termsDocumentName;
  if (input.termsDocumentMimeType !== undefined) updateData.termsDocumentMimeType = input.termsDocumentMimeType;
  if (input.termsDocumentDataUrl !== undefined) updateData.termsDocumentDataUrl = input.termsDocumentDataUrl;
  if (input.specialInstructions !== undefined) updateData.specialInstructions = input.specialInstructions;

  return prisma.contract.update({
    where: { id: contractId },
    data: updateData,
    select: contractSelect,
  });
}

/**
 * Check if a contract can be renewed
 */
export async function canRenewContract(contractId: string): Promise<{
  canRenew: boolean;
  reason?: string;
}> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!contract) {
    return { canRenew: false, reason: 'Contract not found' };
  }

  if (contract.status !== 'active' && contract.status !== 'expired') {
    return { canRenew: false, reason: 'Only active or expired contracts can be renewed' };
  }

  return { canRenew: true };
}

// ============================================================
// Standalone Contract Creation (for imported/legacy)
// ============================================================

export interface StandaloneContractCreateInput {
  title: string;
  accountId: string;
  facilityId?: string | null;
  startDate: Date;
  endDate?: Date | null;
  serviceFrequency?: string | null;
  serviceSchedule?: any;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue: number;
  totalValue?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
  createdByUserId: string;
}

/**
 * Create a standalone contract (imported or legacy, without proposal)
 */
export async function createStandaloneContract(data: StandaloneContractCreateInput) {
  const contractNumber = await generateContractNumber();
  const normalizedSchedule = normalizeServiceSchedule(
    data.serviceSchedule,
    data.serviceFrequency
  );

  // Auto-generate terms if not provided
  let termsAndConditions = data.termsAndConditions;
  if (!termsAndConditions) {
    const [account, facility] = await Promise.all([
      prisma.account.findUnique({ where: { id: data.accountId }, select: { name: true } }),
      data.facilityId
        ? prisma.facility.findUnique({ where: { id: data.facilityId }, select: { name: true, address: true } })
        : null,
    ]);
    termsAndConditions = await generateContractTerms({
      contractNumber,
      title: data.title,
      accountName: account?.name || 'Client',
      facilityName: facility?.name,
      facilityAddress: facility?.address,
      startDate: data.startDate,
      endDate: data.endDate,
      monthlyValue: data.monthlyValue,
      totalValue: data.totalValue,
      billingCycle: data.billingCycle ?? 'monthly',
      paymentTerms: data.paymentTerms ?? 'Net 30',
      serviceFrequency: data.serviceFrequency,
      serviceSchedule: normalizedSchedule,
      autoRenew: data.autoRenew,
      renewalNoticeDays: data.renewalNoticeDays ?? 30,
      facilityTimezone: facility ? extractFacilityTimezone(facility.address) : null,
    });
  }

  return createContractWithLegacyFallback({
    contractNumber,
    title: data.title,
    status: 'draft',
    accountId: data.accountId,
    facilityId: data.facilityId,
    startDate: data.startDate,
    endDate: data.endDate,
    serviceFrequency: data.serviceFrequency,
    serviceSchedule:
      (normalizedSchedule as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    autoRenew: data.autoRenew ?? false,
    renewalNoticeDays: data.renewalNoticeDays ?? 30,
    monthlyValue: data.monthlyValue,
    totalValue: data.totalValue,
    billingCycle: data.billingCycle ?? 'monthly',
    paymentTerms: data.paymentTerms ?? 'Net 30',
    termsAndConditions,
    termsDocumentName: data.termsDocumentName ?? null,
    termsDocumentMimeType: data.termsDocumentMimeType ?? null,
    termsDocumentDataUrl: data.termsDocumentDataUrl ?? null,
    specialInstructions: data.specialInstructions,
    createdByUserId: data.createdByUserId,
  });
}

// ============================================================
// Expiration Check
// ============================================================

/**
 * Get active contracts expiring within the given number of days
 */
export async function getExpiringContracts(
  daysAhead: number = 30,
  options?: ContractAccessOptions
) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  const where: Prisma.ContractWhereInput = {
    status: 'active',
    archivedAt: null,
    endDate: {
      gte: now,
      lte: futureDate,
    },
  };
  applyContractAccessScope(where, options);

  return prisma.contract.findMany({
    where,
    select: contractSelect,
    orderBy: { endDate: 'asc' },
  });
}

// ============================================================
// Initial Clean Tracking
// ============================================================

/**
 * Mark initial clean as completed for a contract
 */
export async function completeInitialClean(contractId: string, completedByUserId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      includesInitialClean: true,
      initialCleanCompleted: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (!contract.includesInitialClean) {
    throw new Error('This contract does not include initial clean');
  }

  if (contract.initialCleanCompleted) {
    throw new Error('Initial clean has already been completed');
  }

  return updateContractWithLegacyFallback(
    { id: contractId },
    {
      initialCleanCompleted: true,
      initialCleanCompletedAt: new Date(),
      initialCleanCompletedByUserId: completedByUserId,
    }
  );
}

// ============================================================
// Notification Helpers
// ============================================================

/**
 * Fetch contract data needed for team assignment notifications
 */
export async function getTeamAssignmentNotificationData(contractId: string) {
  return prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      contractNumber: true,
      title: true,
      monthlyValue: true,
      subcontractorTier: true,
      startDate: true,
      serviceFrequency: true,
      facility: {
        select: {
          id: true,
          name: true,
          address: true,
          buildingType: true,
        },
      },
      proposal: {
        select: {
          proposalServices: {
            select: {
              serviceName: true,
              frequency: true,
              description: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      assignedTeam: {
        select: {
          id: true,
          name: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
        },
      },
    },
  });
}

/**
 * Fetch facility tasks for contract notification emails
 */
export async function getFacilityTasksForContract(facilityId: string) {
  return prisma.facilityTask.findMany({
    where: {
      facilityId,
      archivedAt: null,
    },
    select: {
      taskTemplate: {
        select: {
          name: true,
        },
      },
      customName: true,
      area: {
        select: {
          name: true,
        },
      },
      cleaningFrequency: true,
    },
    orderBy: [
      { area: { name: 'asc' } },
      { priority: 'asc' },
    ],
  });
}
