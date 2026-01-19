import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

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
 */
export async function createContract(data: ContractCreateInput) {
  const contractNumber = await generateContractNumber();

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      ...data,
      status: 'draft',
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
