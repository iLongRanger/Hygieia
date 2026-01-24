import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface ContractListParams {
  page?: number;
  limit?: number;
  status?: string;
  contractSource?: string;
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
  contractSource: true,
  renewedFromContractId: true,
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
  termsAndConditions: true,
  specialInstructions: true,
  signedDocumentUrl: true,
  signedDate: true,
  signedByName: true,
  signedByEmail: true,
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
    },
  },
  facility: {
    select: {
      id: true,
      name: true,
      address: true,
    },
  },
  proposal: {
    select: {
      id: true,
      proposalNumber: true,
      title: true,
    },
  },
  renewedFromContract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
    },
  },
  renewedToContract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
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
};

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
  params: ContractListParams
): Promise<PaginatedResult<any>> {
  const {
    page = 1,
    limit = 10,
    status,
    contractSource,
    accountId,
    facilityId,
    proposalId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.ContractWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (contractSource) {
    where.contractSource = contractSource;
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

  const [total, contracts] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      select: contractSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: contracts,
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

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      ...data,
      status: 'draft',
      contractSource: 'proposal',
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

  const contractData: Prisma.ContractCreateInput = {
    contractNumber,
    title: overrides?.title || proposal.title,
    status: 'draft',
    contractSource: 'proposal',
    account: { connect: { id: proposal.accountId } },
    ...(proposal.facilityId && { facility: { connect: { id: proposal.facilityId } } }),
    proposal: { connect: { id: proposalId } },
    startDate: overrides?.startDate || new Date(),
    endDate: overrides?.endDate || null,
    serviceFrequency: overrides?.serviceFrequency || 'monthly',
    serviceSchedule: overrides?.serviceSchedule || null,
    autoRenew: overrides?.autoRenew ?? false,
    renewalNoticeDays: overrides?.renewalNoticeDays ?? 30,
    monthlyValue,
    totalValue: overrides?.totalValue || null,
    billingCycle: overrides?.billingCycle || 'monthly',
    paymentTerms: overrides?.paymentTerms || proposal.account.paymentTerms || 'Net 30',
    termsAndConditions: overrides?.termsAndConditions || proposal.termsAndConditions,
    specialInstructions: overrides?.specialInstructions || proposal.notes,
    includesInitialClean: true,
    createdByUser: { connect: { id: createdByUserId } },
  };

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
  const contract = await prisma.contract.update({
    where: { id },
    data,
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

  return contract;
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
  startDate: Date;
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
 * Renew a contract by creating a new contract linked to the original
 */
export async function renewContract(
  contractId: string,
  input: RenewContractInput,
  createdByUserId: string
) {
  // Get the original contract
  const originalContract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      title: true,
      status: true,
      contractSource: true,
      accountId: true,
      facilityId: true,
      monthlyValue: true,
      serviceFrequency: true,
      serviceSchedule: true,
      autoRenew: true,
      renewalNoticeDays: true,
      billingCycle: true,
      paymentTerms: true,
      termsAndConditions: true,
      specialInstructions: true,
      renewalNumber: true,
      renewedToContract: {
        select: { id: true },
      },
    },
  });

  if (!originalContract) {
    throw new Error('Contract not found');
  }

  // Only active or expired contracts can be renewed
  if (originalContract.status !== 'active' && originalContract.status !== 'expired') {
    throw new Error('Only active or expired contracts can be renewed');
  }

  // Check if already renewed
  if (originalContract.renewedToContract) {
    throw new Error('This contract has already been renewed');
  }

  const contractNumber = await generateContractNumber();

  return prisma.$transaction(async (tx) => {
    // Create renewal contract
    const renewalContract = await tx.contract.create({
      data: {
        contractNumber,
        title: originalContract.title,
        status: 'draft',
        contractSource: 'renewal',
        accountId: originalContract.accountId,
        facilityId: originalContract.facilityId,
        renewedFromContractId: originalContract.id,
        renewalNumber: originalContract.renewalNumber + 1,
        startDate: input.startDate,
        endDate: input.endDate || null,
        serviceFrequency: input.serviceFrequency ?? originalContract.serviceFrequency,
        serviceSchedule: input.serviceSchedule ?? originalContract.serviceSchedule,
        autoRenew: input.autoRenew ?? originalContract.autoRenew,
        renewalNoticeDays: input.renewalNoticeDays ?? originalContract.renewalNoticeDays,
        monthlyValue: input.monthlyValue ?? Number(originalContract.monthlyValue),
        billingCycle: input.billingCycle ?? originalContract.billingCycle,
        paymentTerms: input.paymentTerms ?? originalContract.paymentTerms,
        termsAndConditions: input.termsAndConditions ?? originalContract.termsAndConditions,
        specialInstructions: input.specialInstructions ?? originalContract.specialInstructions,
        createdByUserId,
      },
      select: contractSelect,
    });

    // Update original contract status to 'renewed'
    await tx.contract.update({
      where: { id: originalContract.id },
      data: { status: 'renewed' },
    });

    return renewalContract;
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
      renewedToContract: {
        select: { id: true },
      },
    },
  });

  if (!contract) {
    return { canRenew: false, reason: 'Contract not found' };
  }

  if (contract.status !== 'active' && contract.status !== 'expired') {
    return { canRenew: false, reason: 'Only active or expired contracts can be renewed' };
  }

  if (contract.renewedToContract) {
    return { canRenew: false, reason: 'Contract has already been renewed' };
  }

  return { canRenew: true };
}

// ============================================================
// Standalone Contract Creation (for imported/legacy)
// ============================================================

export interface StandaloneContractCreateInput {
  title: string;
  contractSource: 'imported' | 'legacy';
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

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      title: data.title,
      status: 'draft',
      contractSource: data.contractSource,
      accountId: data.accountId,
      facilityId: data.facilityId,
      startDate: data.startDate,
      endDate: data.endDate,
      serviceFrequency: data.serviceFrequency,
      serviceSchedule: data.serviceSchedule,
      autoRenew: data.autoRenew ?? false,
      renewalNoticeDays: data.renewalNoticeDays ?? 30,
      monthlyValue: data.monthlyValue,
      totalValue: data.totalValue,
      billingCycle: data.billingCycle ?? 'monthly',
      paymentTerms: data.paymentTerms ?? 'Net 30',
      termsAndConditions: data.termsAndConditions,
      specialInstructions: data.specialInstructions,
      createdByUserId: data.createdByUserId,
    },
    select: contractSelect,
  });

  return contract;
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
