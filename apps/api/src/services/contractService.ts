import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError } from '../middleware/errorHandler';
import { generateContractTerms } from './contractTemplateService';
import { normalizeSubcontractorPercentage, percentageToTier, tierToPercentage } from '../lib/subcontractorTiers';
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
import { getGlobalSettings } from './globalSettingsService';

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
  facilityId: string;
  proposalId?: string | null;
  startDate: Date;
  endDate?: Date | null;
  serviceFrequency?: string | null;
  serviceSchedule?: Record<string, unknown> | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue: number;
  taxRate?: number;
  taxAmount?: number;
  totalValue?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
  equipmentProvidedBy?: string;
  chemicalsProvidedBy?: string;
  approvedChemicalNotes?: string | null;
  restrictedChemicalNotes?: string | null;
  equipmentNotes?: string | null;
  requiresSpecialEquipment?: boolean;
  specialEquipmentNotes?: string | null;
  sdsRequired?: boolean;
  storageAllowedOnSite?: boolean;
  subcontractorTier?: string | null;
  compensationType?: string;
  subcontractorPercentage?: number | null;
  createdByUserId: string;
}

export interface ContractUpdateInput {
  title?: string;
  accountId?: string;
  facilityId?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  serviceFrequency?: string | null;
  serviceSchedule?: Record<string, unknown> | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue?: number;
  taxRate?: number;
  taxAmount?: number;
  totalValue?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
  equipmentProvidedBy?: string;
  chemicalsProvidedBy?: string;
  approvedChemicalNotes?: string | null;
  restrictedChemicalNotes?: string | null;
  equipmentNotes?: string | null;
  requiresSpecialEquipment?: boolean;
  specialEquipmentNotes?: string | null;
  sdsRequired?: boolean;
  storageAllowedOnSite?: boolean;
  subcontractorTier?: string | null;
  compensationType?: string;
  subcontractorPercentage?: number | null;
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

interface ContractLegacyDefaults {
  assignedToUser: Prisma.ContractGetPayload<{ select: typeof contractSelect }>['assignedToUser'] | null;
  pendingAssignedTeamId: string | null;
  pendingAssignedToUserId: string | null;
  pendingSubcontractorTier: string | null;
  compensationType: string;
  subcontractorPercentage: Prisma.Decimal | null;
  pendingCompensationType: string | null;
  pendingSubcontractorPercentage: Prisma.Decimal | null;
  assignmentOverrideEffectiveDate: Date | null;
  assignmentOverrideSetAt: Date | null;
  pendingAssignedTeam: Prisma.ContractGetPayload<{ select: typeof contractSelect }>['pendingAssignedTeam'] | null;
  pendingAssignedToUser: Prisma.ContractGetPayload<{ select: typeof contractSelect }>['pendingAssignedToUser'] | null;
}

function applyContractAccessScope(
  where: Prisma.ContractWhereInput,
  options?: ContractAccessOptions
) {
  if (options?.userRole === 'subcontractor') {
    const subcontractorScope: Prisma.ContractWhereInput[] = [];

    if (options.userTeamId) {
      subcontractorScope.push({ assignedTeamId: options.userTeamId });
    }

    if (options.userId) {
      subcontractorScope.push({ assignedToUserId: options.userId });
    }

    if (subcontractorScope.length > 0) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: subcontractorScope },
      ];
    }
  }

  if (options?.userRole === 'cleaner' && options.userId) {
    where.assignedToUserId = options.userId;
  }

  if (options?.userRole === 'manager' && options.userId) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { account: { accountManagerId: options.userId } },
    ];
  }
}

function getUnassignedContractWhere(): Prisma.ContractWhereInput {
  return {
    assignedTeamId: null,
    assignedToUserId: null,
  };
}

const contractSelect = {
  id: true,
  opportunityId: true,
  contractNumber: true,
  title: true,
  status: true,
  serviceCategory: true,
  residentialPropertyId: true,
  residentialServiceType: true,
  residentialFrequency: true,
  homeProfileSnapshot: true,
  renewalNumber: true,
  startDate: true,
  endDate: true,
  serviceFrequency: true,
  serviceSchedule: true,
  autoRenew: true,
  renewalNoticeDays: true,
  monthlyValue: true,
  taxRate: true,
  taxAmount: true,
  totalValue: true,
  billingCycle: true,
  paymentTerms: true,
  subcontractorTier: true,
  compensationType: true,
  subcontractorPercentage: true,
  pendingCompensationType: true,
  pendingSubcontractorPercentage: true,
  termsAndConditions: true,
  termsDocumentName: true,
  termsDocumentMimeType: true,
  specialInstructions: true,
  equipmentProvidedBy: true,
  chemicalsProvidedBy: true,
  approvedChemicalNotes: true,
  restrictedChemicalNotes: true,
  equipmentNotes: true,
  requiresSpecialEquipment: true,
  specialEquipmentNotes: true,
  sdsRequired: true,
  storageAllowedOnSite: true,
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
      taxRate: true,
      taxAmount: true,
      totalAmount: true,
      proposalServices: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          serviceName: true,
          frequency: true,
          description: true,
          monthlyPrice: true,
          estimatedHours: true,
          hourlyRate: true,
          includedTasks: true,
        },
      },
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
  pendingCompensationType: _pendingCompensationTypeOmitted,
  pendingSubcontractorPercentage: _pendingSubcontractorPercentageOmitted,
  assignmentOverrideEffectiveDate: _assignmentOverrideEffectiveDateOmitted,
  assignmentOverrideSetAt: _assignmentOverrideSetAtOmitted,
  pendingAssignedTeam: _pendingAssignedTeamOmitted,
  pendingAssignedToUser: _pendingAssignedToUserOmitted,
  ...contractSelectWithoutAssignedUser
} = contractSelect;

type ContractRecord = Prisma.ContractGetPayload<{ select: typeof contractSelect }> & ContractLegacyDefaults;

function isLegacyContractColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const missingColumns = [
    'contracts.assigned_to_user_id',
    'contracts.pending_assigned_team_id',
    'contracts.pending_assigned_to_user_id',
    'contracts.pending_subcontractor_tier',
    'contracts.compensation_type',
    'contracts.subcontractor_percentage',
    'contracts.pending_compensation_type',
    'contracts.pending_subcontractor_percentage',
    'contracts.assignment_override_effective_date',
    'contracts.assignment_override_set_at',
  ];
  return error.message.includes('does not exist') && missingColumns.some((c) => error.message.includes(c));
}

function getKnownProperty<T>(value: Record<string, unknown>, key: string, fallback: T): T {
  return key in value ? (value[key] as T) : fallback;
}

function withLegacyPendingDefaults<T extends Record<string, unknown>>(contract: T): T & ContractLegacyDefaults {
  return {
    ...contract,
    assignedToUser: getKnownProperty<ContractLegacyDefaults['assignedToUser']>(contract, 'assignedToUser', null),
    pendingAssignedTeamId: getKnownProperty<string | null>(contract, 'pendingAssignedTeamId', null),
    pendingAssignedToUserId: getKnownProperty<string | null>(contract, 'pendingAssignedToUserId', null),
    pendingSubcontractorTier: getKnownProperty<string | null>(contract, 'pendingSubcontractorTier', null),
    compensationType: getKnownProperty<string>(contract, 'compensationType', 'hourly'),
    subcontractorPercentage: getKnownProperty<Prisma.Decimal | null>(contract, 'subcontractorPercentage', null),
    pendingCompensationType: getKnownProperty<string | null>(contract, 'pendingCompensationType', null),
    pendingSubcontractorPercentage: getKnownProperty<Prisma.Decimal | null>(contract, 'pendingSubcontractorPercentage', null),
    assignmentOverrideEffectiveDate: getKnownProperty<Date | null>(contract, 'assignmentOverrideEffectiveDate', null),
    assignmentOverrideSetAt: getKnownProperty<Date | null>(contract, 'assignmentOverrideSetAt', null),
    pendingAssignedTeam: getKnownProperty<ContractLegacyDefaults['pendingAssignedTeam']>(contract, 'pendingAssignedTeam', null),
    pendingAssignedToUser: getKnownProperty<ContractLegacyDefaults['pendingAssignedToUser']>(contract, 'pendingAssignedToUser', null),
  };
}

async function validateFacilityOwnership(
  accountId: string,
  facilityId: string
) {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: {
      id: true,
      accountId: true,
      archivedAt: true,
    },
  });

  if (!facility || facility.archivedAt) {
    throw new BadRequestError('Facility not found');
  }

  if (facility.accountId !== accountId) {
    throw new BadRequestError('Facility does not belong to the selected account');
  }

  return facility;
}

async function ensureNoOtherActiveContractForFacility(
  facilityId: string,
  excludeContractId?: string
) {
  const existingActiveContract = await prisma.contract.findFirst({
    where: {
      facilityId,
      archivedAt: null,
      status: 'active',
      ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
    },
    select: {
      id: true,
      contractNumber: true,
    },
  });

  if (existingActiveContract) {
    throw new BadRequestError(
      `Facility already has an active contract (${existingActiveContract.contractNumber})`
    );
  }
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
    const lastSequence = parseInt(lastContract.contractNumber.split('-')[2] ?? '0');
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
): Promise<PaginatedResult<ContractRecord>> {
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
        getUnassignedContractWhere(),
        { status: { in: ['sent', 'viewed'] } },
      ],
    });
  }

  if (unassignedOnly) {
    andConditions.push(getUnassignedContractWhere());
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
    data: contracts.map((contract) => withLegacyPendingDefaults(contract)),
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
  await validateFacilityOwnership(data.accountId, data.facilityId);

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
    select: { status: true, opportunityId: true, taxRate: true, taxAmount: true },
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
      prisma.account.findUnique({ where: { id: data.accountId }, select: { name: true, type: true } }),
      data.facilityId
        ? prisma.facility.findUnique({ where: { id: data.facilityId }, select: { name: true, address: true } })
        : null,
    ]);
    termsAndConditions = await generateContractTerms({
      contractNumber,
      title: data.title,
      serviceCategory: account?.type ?? null,
      accountName: account?.name ?? 'Client',
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
      equipmentProvidedBy: data.equipmentProvidedBy,
      chemicalsProvidedBy: data.chemicalsProvidedBy,
      approvedChemicalNotes: data.approvedChemicalNotes,
      restrictedChemicalNotes: data.restrictedChemicalNotes,
      equipmentNotes: data.equipmentNotes,
      requiresSpecialEquipment: data.requiresSpecialEquipment,
      specialEquipmentNotes: data.specialEquipmentNotes,
      sdsRequired: data.sdsRequired,
      storageAllowedOnSite: data.storageAllowedOnSite,
    });
  }

  return createContractWithLegacyFallback({
    contractNumber,
    title: data.title,
    status: 'draft',
    account: { connect: { id: data.accountId } },
    ...(data.facilityId && { facility: { connect: { id: data.facilityId } } }),
    proposal: { connect: { id: data.proposalId } },
    ...(proposal.opportunityId && { opportunity: { connect: { id: proposal.opportunityId } } }),
    startDate: data.startDate,
    endDate: data.endDate,
    serviceFrequency: data.serviceFrequency,
    serviceSchedule:
      (normalizedSchedule as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    autoRenew: data.autoRenew,
    renewalNoticeDays: data.renewalNoticeDays,
    monthlyValue: data.monthlyValue,
    taxRate: data.taxRate ?? Number(proposal.taxRate ?? 0),
    taxAmount: data.taxAmount ?? Number(proposal.taxAmount ?? 0),
    totalValue: data.totalValue,
    billingCycle: data.billingCycle,
    paymentTerms: data.paymentTerms,
    termsAndConditions,
    termsDocumentName: data.termsDocumentName,
    termsDocumentMimeType: data.termsDocumentMimeType,
    termsDocumentDataUrl: data.termsDocumentDataUrl,
    specialInstructions: data.specialInstructions,
    equipmentProvidedBy: data.equipmentProvidedBy ?? 'company',
    chemicalsProvidedBy: data.chemicalsProvidedBy ?? 'company',
    approvedChemicalNotes: data.approvedChemicalNotes,
    restrictedChemicalNotes: data.restrictedChemicalNotes,
    equipmentNotes: data.equipmentNotes,
    requiresSpecialEquipment: data.requiresSpecialEquipment ?? false,
    specialEquipmentNotes: data.specialEquipmentNotes,
    sdsRequired: data.sdsRequired ?? true,
    storageAllowedOnSite: data.storageAllowedOnSite ?? false,
    subcontractorTier: data.subcontractorTier,
    compensationType: data.compensationType ?? 'hourly',
    subcontractorPercentage:
      data.compensationType === 'percentage'
        ? normalizeSubcontractorPercentage(data.subcontractorPercentage, data.subcontractorTier)
        : null,
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
    proposal.serviceFrequency ?? mappedProposalFrequency ?? 'weekly'
  );
  const resolvedServiceFrequency =
    proposal.serviceFrequency ??
    mappedProposalFrequency ??
    'monthly';
  const resolvedServiceSchedule = normalizedProposalSchedule;

  // Reverse-lookup subcontractor tier from proposal's pricing snapshot
  const snapshot = proposal.pricingSnapshot as Record<string, unknown> | null;
  const snapshotPct = snapshot?.subcontractorPercentage;
  const subcontractorTier = snapshotPct != null
    ? percentageToTier(Number(snapshotPct))
    : 'premium';

  const contractData: Prisma.ContractCreateInput = {
    contractNumber,
    title: overrides?.title ?? proposal.title,
    status: 'draft',
    account: { connect: { id: proposal.accountId } },
    ...(proposal.facilityId && { facility: { connect: { id: proposal.facilityId } } }),
    proposal: { connect: { id: proposalId } },
    ...(proposal.opportunityId && { opportunity: { connect: { id: proposal.opportunityId } } }),
    startDate: overrides?.startDate ?? new Date(),
    endDate: overrides?.endDate ?? null,
    serviceFrequency: resolvedServiceFrequency,
    serviceSchedule:
      (resolvedServiceSchedule as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    autoRenew: overrides?.autoRenew ?? false,
    renewalNoticeDays: overrides?.renewalNoticeDays ?? 30,
    monthlyValue,
    taxRate: overrides?.taxRate ?? Number(proposal.taxRate ?? 0),
    taxAmount: overrides?.taxAmount ?? Number(proposal.taxAmount ?? 0),
    totalValue: overrides?.totalValue ?? null,
    billingCycle: overrides?.billingCycle ?? 'monthly',
    paymentTerms: overrides?.paymentTerms ?? proposal.account.paymentTerms ?? 'Net 30',
    termsAndConditions: overrides?.termsAndConditions ?? proposal.termsAndConditions ?? null,
    termsDocumentName: overrides?.termsDocumentName ?? null,
    termsDocumentMimeType: overrides?.termsDocumentMimeType ?? null,
    termsDocumentDataUrl: overrides?.termsDocumentDataUrl ?? null,
    specialInstructions: overrides?.specialInstructions ?? proposal.notes,
    equipmentProvidedBy: overrides?.equipmentProvidedBy ?? 'company',
    chemicalsProvidedBy: overrides?.chemicalsProvidedBy ?? 'company',
    approvedChemicalNotes: overrides?.approvedChemicalNotes ?? null,
    restrictedChemicalNotes: overrides?.restrictedChemicalNotes ?? null,
    equipmentNotes: overrides?.equipmentNotes ?? null,
    requiresSpecialEquipment: overrides?.requiresSpecialEquipment ?? false,
    specialEquipmentNotes: overrides?.specialEquipmentNotes ?? null,
    sdsRequired: overrides?.sdsRequired ?? true,
    storageAllowedOnSite: overrides?.storageAllowedOnSite ?? false,
    includesInitialClean: true,
    subcontractorTier,
    compensationType: 'hourly',
    subcontractorPercentage: null,
    createdByUser: { connect: { id: createdByUserId } },
  };

  // Auto-generate terms if not provided from overrides or proposal
  if (!contractData.termsAndConditions) {
    contractData.termsAndConditions = await generateContractTerms({
      contractNumber,
      title: contractData.title as string,
      serviceCategory: proposal.account.type,
      proposalType: proposal.proposalType,
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
      equipmentProvidedBy: overrides?.equipmentProvidedBy,
      chemicalsProvidedBy: overrides?.chemicalsProvidedBy,
      approvedChemicalNotes: overrides?.approvedChemicalNotes,
      restrictedChemicalNotes: overrides?.restrictedChemicalNotes,
      equipmentNotes: overrides?.equipmentNotes,
      requiresSpecialEquipment: overrides?.requiresSpecialEquipment,
      specialEquipmentNotes: overrides?.specialEquipmentNotes,
      sdsRequired: overrides?.sdsRequired,
      storageAllowedOnSite: overrides?.storageAllowedOnSite,
    });
  }

  return createContractWithLegacyFallback(contractData);
}

/**
 * Update contract
 */
export async function updateContract(id: string, data: ContractUpdateInput) {
  const { serviceSchedule, ...rest } = data;
  const updateData: Prisma.ContractUncheckedUpdateInput = {
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
  const currentContract = await prisma.contract.findUnique({
    where: { id },
    select: {
      id: true,
      facilityId: true,
      signedDate: true,
    },
  });

  if (!currentContract) {
    throw new Error('Contract not found');
  }

  const updateData: Prisma.ContractUpdateInput = { status };

  // If activating contract, set approval details
  if (status === 'active' && userId) {
    const publicSignature = await prisma.contractActivity.findFirst({
      where: {
        contractId: id,
        action: 'public_signed',
      },
      select: { id: true },
    });

    if (!currentContract.signedDate || !publicSignature) {
      throw new BadRequestError('Contract must be accepted and signed online before activation');
    }

    if (currentContract.facilityId) {
      await ensureNoOtherActiveContractForFacility(currentContract.facilityId, id);
    }
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
    prisma.contract.count({ where: { ...where, ...getUnassignedContractWhere() } }),
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
  subcontractorTier?: string,
  subcontractorPercentage?: number | null,
  compensationType: 'hourly' | 'percentage' = 'hourly'
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
  const assignmentCompensation = buildAssignmentCompensation({
    teamId,
    assignedToUserId,
    subcontractorTier,
    subcontractorPercentage,
    compensationType,
  });

  const data: Prisma.ContractUncheckedUpdateInput = {
    assignedTeamId: teamId,
    assignedToUserId: assignedToUserId,
    compensationType: assignmentCompensation.compensationType,
    subcontractorPercentage: assignmentCompensation.subcontractorPercentage,
    pendingAssignedTeamId: null,
    pendingAssignedToUserId: null,
    pendingSubcontractorTier: null,
    pendingCompensationType: null,
    pendingSubcontractorPercentage: null,
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
      compensationType: assignmentCompensation.compensationType,
      subcontractorPercentage: assignmentCompensation.subcontractorPercentage,
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

  if (teamId ?? assignedToUserId) {
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

    if (!team?.isActive || team.archivedAt) {
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

function buildAssignmentCompensation(input: {
  teamId: string | null;
  assignedToUserId: string | null;
  compensationType?: 'hourly' | 'percentage';
  subcontractorTier?: string | null;
  subcontractorPercentage?: number | null;
}) {
  if (!input.teamId && !input.assignedToUserId) {
    return {
      compensationType: 'hourly',
      subcontractorPercentage: null,
    };
  }

  const compensationType = input.compensationType ?? 'hourly';

  if (compensationType === 'percentage') {
    const subcontractorPercentage = normalizeSubcontractorPercentage(
      input.subcontractorPercentage,
      input.subcontractorTier
    );

    if (subcontractorPercentage <= 0 || subcontractorPercentage > 1) {
      throw new Error('Subcontractor percentage must be greater than 0 and no more than 100');
    }

    return {
      compensationType: 'percentage',
      subcontractorPercentage,
    };
  }

  return {
    compensationType: 'hourly',
    subcontractorPercentage: null,
  };
}

export async function scheduleContractAssignmentOverride(
  contractId: string,
  teamId: string | null,
  assignedToUserId: string | null,
  effectivityDate: Date,
  updatedByUserId: string,
  subcontractorTier?: string,
  subcontractorPercentage?: number | null,
  compensationType: 'hourly' | 'percentage' = 'hourly'
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      assignedTeamId: true,
      assignedToUserId: true,
      subcontractorTier: true,
      subcontractorPercentage: true,
      compensationType: true,
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
  const assignmentCompensation = buildAssignmentCompensation({
    teamId,
    assignedToUserId,
    subcontractorTier: subcontractorTier ?? contract.subcontractorTier,
    subcontractorPercentage,
    compensationType,
  });

  const sameAssignee =
    contract.assignedTeamId === (teamId ?? null) &&
    contract.assignedToUserId === (assignedToUserId ?? null) &&
    assignmentCompensation.compensationType === contract.compensationType &&
    (assignmentCompensation.compensationType === 'percentage'
      ? (subcontractorTier ?? contract.subcontractorTier) === contract.subcontractorTier &&
        assignmentCompensation.subcontractorPercentage ===
          Number(contract.subcontractorPercentage ?? 0)
      : true);
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
      pendingSubcontractorTier:
        assignmentCompensation.compensationType === 'percentage'
          ? subcontractorTier ?? contract.subcontractorTier
          : null,
      pendingCompensationType: assignmentCompensation.compensationType,
      pendingSubcontractorPercentage: assignmentCompensation.compensationType === 'percentage'
        ? assignmentCompensation.subcontractorPercentage
        : null,
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
  taxRate?: number;
  taxAmount?: number;
  serviceFrequency?: string | null;
  serviceSchedule?: Record<string, unknown> | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
  equipmentProvidedBy?: string;
  chemicalsProvidedBy?: string;
  approvedChemicalNotes?: string | null;
  restrictedChemicalNotes?: string | null;
  equipmentNotes?: string | null;
  requiresSpecialEquipment?: boolean;
  specialEquipmentNotes?: string | null;
  sdsRequired?: boolean;
  storageAllowedOnSite?: boolean;
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
      serviceCategory: true,
      residentialServiceType: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.status !== 'active' && contract.status !== 'expired') {
    throw new Error('Only active or expired contracts can be renewed');
  }

  if (
    contract.serviceCategory === 'residential'
    && contract.residentialServiceType !== 'recurring_standard'
  ) {
    throw new Error(
      'One-time residential services cannot be renewed. Create a new residential quote instead.'
    );
  }

  // Build update data from provided fields only
  const updateData: Prisma.ContractUpdateInput = {
    renewalNumber: contract.renewalNumber + 1,
  };

  if (input.startDate !== undefined) updateData.startDate = input.startDate;
  if (input.endDate !== undefined) updateData.endDate = input.endDate;
  if (input.monthlyValue !== undefined) updateData.monthlyValue = input.monthlyValue;
  if (input.taxRate !== undefined) updateData.taxRate = input.taxRate;
  if (input.taxAmount !== undefined) updateData.taxAmount = input.taxAmount;
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
  if (input.equipmentProvidedBy !== undefined) updateData.equipmentProvidedBy = input.equipmentProvidedBy;
  if (input.chemicalsProvidedBy !== undefined) updateData.chemicalsProvidedBy = input.chemicalsProvidedBy;
  if (input.approvedChemicalNotes !== undefined) updateData.approvedChemicalNotes = input.approvedChemicalNotes;
  if (input.restrictedChemicalNotes !== undefined) updateData.restrictedChemicalNotes = input.restrictedChemicalNotes;
  if (input.equipmentNotes !== undefined) updateData.equipmentNotes = input.equipmentNotes;
  if (input.requiresSpecialEquipment !== undefined) updateData.requiresSpecialEquipment = input.requiresSpecialEquipment;
  if (input.specialEquipmentNotes !== undefined) updateData.specialEquipmentNotes = input.specialEquipmentNotes;
  if (input.sdsRequired !== undefined) updateData.sdsRequired = input.sdsRequired;
  if (input.storageAllowedOnSite !== undefined) updateData.storageAllowedOnSite = input.storageAllowedOnSite;

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
      serviceCategory: true,
      residentialServiceType: true,
    },
  });

  if (!contract) {
    return { canRenew: false, reason: 'Contract not found' };
  }

  if (contract.status !== 'active' && contract.status !== 'expired') {
    return { canRenew: false, reason: 'Only active or expired contracts can be renewed' };
  }

  if (
    contract.serviceCategory === 'residential'
    && contract.residentialServiceType !== 'recurring_standard'
  ) {
    return {
      canRenew: false,
      reason: 'One-time residential services cannot be renewed. Create a new residential quote instead.',
    };
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
  serviceSchedule?: Record<string, unknown> | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue: number;
  taxRate?: number;
  taxAmount?: number;
  totalValue?: number | null;
  billingCycle?: string;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
  equipmentProvidedBy?: string;
  chemicalsProvidedBy?: string;
  approvedChemicalNotes?: string | null;
  restrictedChemicalNotes?: string | null;
  equipmentNotes?: string | null;
  requiresSpecialEquipment?: boolean;
  specialEquipmentNotes?: string | null;
  sdsRequired?: boolean;
  storageAllowedOnSite?: boolean;
  createdByUserId: string;
}

/**
 * Create a standalone contract (imported or legacy, without proposal)
 */
export async function createStandaloneContract(data: StandaloneContractCreateInput) {
  if (data.facilityId) {
    await validateFacilityOwnership(data.accountId, data.facilityId);
  }

  const contractNumber = await generateContractNumber();
  const normalizedSchedule = normalizeServiceSchedule(
    data.serviceSchedule,
    data.serviceFrequency
  );
  const globalSettings = data.taxRate === undefined ? await getGlobalSettings() : null;
  const taxRate = data.taxRate ?? globalSettings?.taxRate ?? 0;
  const taxAmount = data.taxAmount ?? Math.round(data.monthlyValue * taxRate * 100) / 100;
  const totalValue =
    data.totalValue ?? Math.round((data.monthlyValue + taxAmount) * 100) / 100;

  // Auto-generate terms if not provided
  let termsAndConditions = data.termsAndConditions;
  if (!termsAndConditions) {
    const [account, facility] = await Promise.all([
      prisma.account.findUnique({ where: { id: data.accountId }, select: { name: true, type: true } }),
      data.facilityId
        ? prisma.facility.findUnique({ where: { id: data.facilityId }, select: { name: true, address: true } })
        : null,
    ]);
    termsAndConditions = await generateContractTerms({
      contractNumber,
      title: data.title,
      serviceCategory: account?.type ?? null,
      accountName: account?.name ?? 'Client',
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
      equipmentProvidedBy: data.equipmentProvidedBy,
      chemicalsProvidedBy: data.chemicalsProvidedBy,
      approvedChemicalNotes: data.approvedChemicalNotes,
      restrictedChemicalNotes: data.restrictedChemicalNotes,
      equipmentNotes: data.equipmentNotes,
      requiresSpecialEquipment: data.requiresSpecialEquipment,
      specialEquipmentNotes: data.specialEquipmentNotes,
      sdsRequired: data.sdsRequired,
      storageAllowedOnSite: data.storageAllowedOnSite,
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
    taxRate,
    taxAmount,
    totalValue,
    billingCycle: data.billingCycle ?? 'monthly',
    paymentTerms: data.paymentTerms ?? 'Net 30',
    termsAndConditions,
    termsDocumentName: data.termsDocumentName ?? null,
    termsDocumentMimeType: data.termsDocumentMimeType ?? null,
    termsDocumentDataUrl: data.termsDocumentDataUrl ?? null,
    specialInstructions: data.specialInstructions,
    equipmentProvidedBy: data.equipmentProvidedBy ?? 'company',
    chemicalsProvidedBy: data.chemicalsProvidedBy ?? 'company',
    approvedChemicalNotes: data.approvedChemicalNotes,
    restrictedChemicalNotes: data.restrictedChemicalNotes,
    equipmentNotes: data.equipmentNotes,
    requiresSpecialEquipment: data.requiresSpecialEquipment ?? false,
    specialEquipmentNotes: data.specialEquipmentNotes,
    sdsRequired: data.sdsRequired ?? true,
    storageAllowedOnSite: data.storageAllowedOnSite ?? false,
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
  daysAhead = 30,
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
