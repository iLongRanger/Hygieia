import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { generateContractTerms } from './contractTemplateService';
import { tierToPercentage, percentageToTier } from '../lib/subcontractorTiers';
import {
  extractFacilityTimezone,
  mapProposalFrequencyToContractFrequency,
  normalizeServiceSchedule,
} from './serviceScheduleService';
import { autoAdvanceLeadStatusForAccount, autoSetLeadStatusForAccount } from './leadService';

export interface ContractListParams {
  page?: number;
  limit?: number;
  status?: string;
  accountId?: string;
  facilityId?: string;
  proposalId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
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

const contractSelect = {
  id: true,
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
  ...contractSelectWithoutAssignedUser
} = contractSelect;

function isMissingAssignedToUserColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('contracts.assigned_to_user_id') &&
    error.message.includes('does not exist')
  );
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
  options?: { userRole?: string; userTeamId?: string }
): Promise<PaginatedResult<any>> {
  const {
    page = 1,
    limit = 10,
    status,
    accountId,
    facilityId,
    proposalId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.ContractWhereInput = {};

  if (options?.userRole === 'subcontractor' && options?.userTeamId) {
    where.assignedTeamId = options.userTeamId;
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

  if (proposalId) {
    where.proposalId = proposalId;
  }

  if (search) {
    where.OR = [
      { contractNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
    ];
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
    if (!isMissingAssignedToUserColumnError(error)) {
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
    data: contracts.map((contract) =>
      'assignedToUser' in contract ? contract : { ...contract, assignedToUser: null }
    ),
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
  const contract = await prisma.contract.findUnique({
    where: { id },
    select: contractSelect,
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  return contract;
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
    select: { status: true },
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

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      ...data,
      serviceSchedule:
        (normalizedSchedule as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      termsAndConditions,
      status: 'draft',
      includesInitialClean: true,
    },
    select: contractSelect,
  });

  return contract;
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

  const contract = await prisma.contract.create({
    data: contractData,
    select: contractSelect,
  });

  return contract;
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

  const contract = await prisma.contract.update({
    where: { id },
    data: updateData,
    select: contractSelect,
  });

  if (status === 'active') {
    await autoAdvanceLeadStatusForAccount(contract.account.id, 'won');
  }
  if (status === 'terminated') {
    await autoSetLeadStatusForAccount(contract.account.id, 'lost');
  }

  return contract;
}

/**
 * Mark contract as sent
 */
export async function sendContract(id: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    select: { status: true, accountId: true },
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

  if (contract?.accountId) {
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

  const data: any = {
    assignedTeamId: teamId,
    assignedToUserId: assignedToUserId,
  };
  if (subcontractorTier !== undefined) {
    data.subcontractorTier = subcontractorTier;
  }

  const updatedContract = await prisma.contract.update({
    where: { id: contractId },
    data,
    select: contractSelect,
  });

  if (teamId || assignedToUserId) {
    await autoAdvanceLeadStatusForAccount(updatedContract.account.id, 'won');
  }

  return updatedContract;
}

/**
 * Sign contract
 */
export async function signContract(id: string, signData: ContractSignInput) {
  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...signData,
      status: 'pending_signature',
    },
    select: contractSelect,
  });

  await autoAdvanceLeadStatusForAccount(contract.account.id, 'won');
  return contract;
}

/**
 * Terminate contract
 */
export async function terminateContract(id: string, reason: string) {
  const contract = await prisma.contract.update({
    where: { id },
    data: {
      status: 'terminated',
      terminationReason: reason,
      terminatedAt: new Date(),
    },
    select: contractSelect,
  });

  await autoSetLeadStatusForAccount(contract.account.id, 'lost');
  return contract;
}

/**
 * Archive contract (soft delete)
 */
export async function archiveContract(id: string) {
  const contract = await prisma.contract.update({
    where: { id },
    data: {
      archivedAt: new Date(),
    },
    select: contractSelect,
  });

  return contract;
}

/**
 * Restore archived contract
 */
export async function restoreContract(id: string) {
  const contract = await prisma.contract.update({
    where: { id },
    data: {
      archivedAt: null,
    },
    select: contractSelect,
  });

  return contract;
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

  const contract = await prisma.contract.create({
    data: {
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
      specialInstructions: data.specialInstructions,
      createdByUserId: data.createdByUserId,
    },
    select: contractSelect,
  });

  return contract;
}

// ============================================================
// Expiration Check
// ============================================================

/**
 * Get active contracts expiring within the given number of days
 */
export async function getExpiringContracts(daysAhead: number = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return prisma.contract.findMany({
    where: {
      status: 'active',
      archivedAt: null,
      endDate: {
        gte: now,
        lte: futureDate,
      },
    },
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

  return prisma.contract.update({
    where: { id: contractId },
    data: {
      initialCleanCompleted: true,
      initialCleanCompletedAt: new Date(),
      initialCleanCompletedByUserId: completedByUserId,
    },
    select: contractSelect,
  });
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
