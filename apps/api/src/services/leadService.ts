import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError } from '../middleware/errorHandler';
import { createNotification } from './notificationService';
import { geocodeAddressIfNeeded } from './geocodingService';
import logger from '../lib/logger';

const AUTO_LEAD_STATUS_RANK: Record<string, number> = {
  lead: 0,
  walk_through_booked: 1,
  walk_through_completed: 2,
  proposal_sent: 3,
  negotiation: 4,
  won: 5,
};
const CONVERSION_TARGET_STATUS = 'walk_through_booked';

function shouldAutoAdvanceLeadStatus(currentStatus: string, targetStatus: string): boolean {
  // Do not auto-override terminal/manual outcomes.
  if (currentStatus === 'won' || currentStatus === 'lost') {
    return false;
  }

  const currentRank = AUTO_LEAD_STATUS_RANK[currentStatus];
  const targetRank = AUTO_LEAD_STATUS_RANK[targetStatus];

  if (targetRank === undefined) return false;
  if (currentRank === undefined) return true;

  return targetRank > currentRank;
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  status?: string;
  leadSourceId?: string;
  assignedToUserId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
  converted?: boolean;
}

export interface LeadCreateInput {
  leadSourceId?: string | null;
  companyName?: string | null;
  contactName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  address?: Record<string, unknown> | null;
  estimatedValue?: number | null;
  probability?: number;
  expectedCloseDate?: Date | null;
  notes?: string | null;
  assignedToUserId?: string | null;
  createdByUserId: string;
}

export interface LeadUpdateInput {
  leadSourceId?: string | null;
  status?: string;
  companyName?: string | null;
  contactName?: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  address?: Record<string, unknown> | null;
  estimatedValue?: number | null;
  probability?: number;
  expectedCloseDate?: Date | null;
  notes?: string | null;
  lostReason?: string | null;
  assignedToUserId?: string | null;
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

const leadSelect = {
  id: true,
  status: true,
  companyName: true,
  contactName: true,
  primaryEmail: true,
  primaryPhone: true,
  secondaryEmail: true,
  secondaryPhone: true,
  address: true,
  estimatedValue: true,
  probability: true,
  expectedCloseDate: true,
  notes: true,
  lostReason: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  // Conversion tracking
  convertedToAccountId: true,
  convertedAt: true,
  leadSource: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
  assignedToUser: {
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
    },
  },
  convertedToAccount: {
    select: {
      id: true,
      name: true,
    },
  },
  convertedByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.LeadSelect;

function hasAddressCoordinates(address: unknown): boolean {
  if (!address || typeof address !== 'object') return false;
  const raw = address as Record<string, unknown>;
  const lat = raw.latitude ?? raw.lat;
  const lng = raw.longitude ?? raw.lng;
  return typeof lat === 'number' && Number.isFinite(lat)
    && typeof lng === 'number' && Number.isFinite(lng);
}

export async function listLeads(
  params: LeadListParams
): Promise<
  PaginatedResult<Prisma.LeadGetPayload<{ select: typeof leadSelect }>>
> {
  const {
    page = 1,
    limit = 20,
    status,
    leadSourceId,
    assignedToUserId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
    converted,
  } = params;

  const where: Prisma.LeadWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (status) {
    where.status = status;
  }

  if (leadSourceId) {
    where.leadSourceId = leadSourceId;
  }

  if (assignedToUserId) {
    where.assignedToUserId = assignedToUserId;
  }

  // Filter by conversion status
  if (converted !== undefined) {
    if (converted) {
      where.convertedToAccountId = { not: null };
    } else {
      where.convertedToAccountId = null;
    }
  }

  if (search) {
    where.OR = [
      { contactName: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
      { primaryEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  const validSortFields = [
    'createdAt',
    'updatedAt',
    'contactName',
    'companyName',
    'estimatedValue',
    'expectedCloseDate',
  ];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      select: leadSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    data: leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    select: leadSelect,
  });
}

export async function createLead(input: LeadCreateInput) {
  const lead = await prisma.lead.create({
    data: {
      leadSourceId: input.leadSourceId,
      companyName: input.companyName,
      contactName: input.contactName,
      primaryEmail: input.primaryEmail,
      primaryPhone: input.primaryPhone,
      secondaryEmail: input.secondaryEmail,
      secondaryPhone: input.secondaryPhone,
      address: input.address as Prisma.InputJsonValue,
      estimatedValue: input.estimatedValue,
      probability: input.probability ?? 0,
      expectedCloseDate: input.expectedCloseDate,
      notes: input.notes,
      assignedToUserId: input.assignedToUserId,
      createdByUserId: input.createdByUserId,
    },
    select: leadSelect,
  });

  // Notify assigned user whenever a lead is created with an assignee.
  if (input.assignedToUserId) {
    try {
      await createNotification({
        userId: input.assignedToUserId,
        type: 'lead_assigned',
        title: 'New lead assigned to you',
        body: `Lead "${input.contactName}" has been assigned to you.`,
        metadata: { leadId: lead.id },
      });
    } catch (error) {
      logger.error('Failed to create lead assignment notification', {
        leadId: lead.id,
        assignedToUserId: input.assignedToUserId,
        error,
      });
    }
  }

  return lead;
}

export async function updateLead(id: string, input: LeadUpdateInput) {
  const updateData: Prisma.LeadUpdateInput = {};

  if (input.status === 'proposal_sent') {
    const latestAppointment = await prisma.appointment.findFirst({
      where: { leadId: id, type: 'walk_through' },
      orderBy: { scheduledStart: 'desc' },
      select: { status: true },
    });

    if (!latestAppointment || latestAppointment.status !== 'completed') {
      throw new BadRequestError('Walkthrough must be completed before sending proposal');
    }
  }

  if (input.leadSourceId !== undefined) {
    updateData.leadSource = input.leadSourceId
      ? { connect: { id: input.leadSourceId } }
      : { disconnect: true };
  }
  if (input.status !== undefined) updateData.status = input.status;
  if (input.companyName !== undefined)
    updateData.companyName = input.companyName;
  if (input.contactName !== undefined)
    updateData.contactName = input.contactName;
  if (input.primaryEmail !== undefined)
    updateData.primaryEmail = input.primaryEmail;
  if (input.primaryPhone !== undefined)
    updateData.primaryPhone = input.primaryPhone;
  if (input.secondaryEmail !== undefined)
    updateData.secondaryEmail = input.secondaryEmail;
  if (input.secondaryPhone !== undefined)
    updateData.secondaryPhone = input.secondaryPhone;
  if (input.address !== undefined)
    updateData.address = input.address as Prisma.InputJsonValue;
  if (input.estimatedValue !== undefined)
    updateData.estimatedValue = input.estimatedValue;
  if (input.probability !== undefined)
    updateData.probability = input.probability;
  if (input.expectedCloseDate !== undefined)
    updateData.expectedCloseDate = input.expectedCloseDate;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.lostReason !== undefined) updateData.lostReason = input.lostReason;
  if (input.assignedToUserId !== undefined) {
    updateData.assignedToUser = input.assignedToUserId
      ? { connect: { id: input.assignedToUserId } }
      : { disconnect: true };
  }

  // Check if assignment changed before updating
  let previousAssignee: string | null = null;
  if (input.assignedToUserId !== undefined) {
    const existing = await prisma.lead.findUnique({
      where: { id },
      select: { assignedToUserId: true, contactName: true },
    });
    previousAssignee = existing?.assignedToUserId ?? null;
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: updateData,
    select: leadSelect,
  });

  // Notify new assignee if assignment changed
  if (
    input.assignedToUserId &&
    input.assignedToUserId !== previousAssignee
  ) {
    try {
      await createNotification({
        userId: input.assignedToUserId,
        type: 'lead_assigned',
        title: 'Lead assigned to you',
        body: `Lead "${lead.contactName}" has been assigned to you.`,
        metadata: { leadId: lead.id },
      });
    } catch (error) {
      logger.error('Failed to create lead reassignment notification', {
        leadId: lead.id,
        assignedToUserId: input.assignedToUserId,
        error,
      });
    }
  }

  return lead;
}

export async function archiveLead(id: string) {
  return prisma.lead.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: leadSelect,
  });
}

export async function restoreLead(id: string) {
  return prisma.lead.update({
    where: { id },
    data: { archivedAt: null },
    select: leadSelect,
  });
}

export async function deleteLead(id: string) {
  return prisma.lead.delete({
    where: { id },
    select: { id: true },
  });
}

// ============================================================
// Lead Conversion
// ============================================================

export interface ConvertLeadInput {
  createNewAccount: boolean;
  existingAccountId?: string | null;
  accountData?: {
    name: string;
    type: string;
    industry?: string | null;
    website?: string | null;
    billingEmail?: string | null;
    billingPhone?: string | null;
    paymentTerms?: string;
    notes?: string | null;
  };
  facilityOption: 'new' | 'existing';
  existingFacilityId?: string | null;
  facilityData?: {
    name: string;
    address: {
      street: string;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    };
    buildingType?: string | null;
    squareFeet?: number | null;
    accessInstructions?: string | null;
    notes?: string | null;
  };
  userId: string;
}

export interface ConvertLeadResult {
  lead: Prisma.LeadGetPayload<{ select: typeof leadSelect }>;
  account: {
    id: string;
    name: string;
  };
  contact: {
    id: string;
    name: string;
    email: string | null;
  };
  facility?: {
    id: string;
    name: string;
  };
}

/** Convert a lead to an account with optional facility creation */
export async function convertLead(
  leadId: string,
  input: ConvertLeadInput
): Promise<ConvertLeadResult> {
  // Get the lead first
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      status: true,
      companyName: true,
      contactName: true,
      primaryEmail: true,
      primaryPhone: true,
      address: true,
      notes: true,
      convertedToAccountId: true,
      archivedAt: true,
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  if (lead.convertedToAccountId) {
    throw new Error('Lead has already been converted to an account');
  }

  if (lead.archivedAt) {
    throw new Error('Cannot convert an archived lead');
  }

  return prisma.$transaction(async (tx) => {
    let accountId: string;
    let accountName: string;

    if (input.createNewAccount) {
      if (!input.accountData) {
        throw new Error('Account data is required when creating a new account');
      }

      // Create new account
      const account = await tx.account.create({
        data: {
          name: input.accountData.name,
          type: input.accountData.type,
          industry: input.accountData.industry,
          website: input.accountData.website,
          billingEmail: input.accountData.billingEmail || lead.primaryEmail,
          billingPhone: input.accountData.billingPhone || lead.primaryPhone,
          billingAddress: lead.address as Prisma.InputJsonValue,
          paymentTerms: input.accountData.paymentTerms || 'NET30',
          notes: input.accountData.notes,
          createdByUserId: input.userId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      accountId = account.id;
      accountName = account.name;
    } else {
      if (!input.existingAccountId) {
        throw new Error('Existing account ID is required when not creating a new account');
      }

      // Verify existing account exists
      const existingAccount = await tx.account.findUnique({
        where: { id: input.existingAccountId },
        select: { id: true, name: true },
      });

      if (!existingAccount) {
        throw new Error('Existing account not found');
      }

      accountId = existingAccount.id;
      accountName = existingAccount.name;
    }

    // Create primary contact from lead data
    const contact = await tx.contact.create({
      data: {
        accountId,
        name: lead.contactName,
        email: lead.primaryEmail,
        phone: lead.primaryPhone,
        isPrimary: true,
        createdByUserId: input.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Handle facility based on facilityOption
    let facility: { id: string; name: string } | undefined;
    if (input.facilityOption === 'new' && input.facilityData) {
      if (!input.facilityData.address?.street?.trim()) {
        throw new BadRequestError('Facility address is required before converting this lead');
      }

      const normalizedAddress = await geocodeAddressIfNeeded(
        input.facilityData.address as Record<string, unknown>
      );

      // Create new facility
      const createdFacility = await tx.facility.create({
        data: {
          accountId,
          name: input.facilityData.name,
          address: normalizedAddress as Prisma.InputJsonValue,
          buildingType: input.facilityData.buildingType,
          squareFeet: input.facilityData.squareFeet,
          accessInstructions: input.facilityData.accessInstructions,
          notes: input.facilityData.notes,
          createdByUserId: input.userId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      facility = createdFacility;
    } else if (input.facilityOption === 'existing' && input.existingFacilityId) {
      // Use existing facility - verify it exists and belongs to the account
      const existingFacility = await tx.facility.findUnique({
        where: { id: input.existingFacilityId },
        select: { id: true, name: true, accountId: true, address: true },
      });

      if (!existingFacility) {
        throw new Error('Existing facility not found');
      }

      const facilityAddress = existingFacility as { address?: { street?: unknown } | null };
      if (typeof facilityAddress.address?.street !== 'string' || !facilityAddress.address.street.trim()) {
        throw new BadRequestError('Selected facility must have an address before converting this lead');
      }

      // Backfill coordinates when existing facility has an address but no geocode.
      if (!hasAddressCoordinates(existingFacility.address)) {
        const normalizedAddress = await geocodeAddressIfNeeded(
          existingFacility.address as Record<string, unknown>
        );
        await tx.facility.update({
          where: { id: input.existingFacilityId },
          data: { address: normalizedAddress as Prisma.InputJsonValue },
        });
      }

      // If using existing account, verify facility belongs to that account
      if (!input.createNewAccount && existingFacility.accountId !== accountId) {
        throw new Error('Selected facility does not belong to the selected account');
      }

      // If creating new account, update facility to belong to new account
      if (input.createNewAccount) {
        await tx.facility.update({
          where: { id: input.existingFacilityId },
          data: { accountId },
        });
      }

      facility = { id: existingFacility.id, name: existingFacility.name };
    }

    // Update lead with conversion tracking
    const shouldAdvanceStatusOnConversion = shouldAutoAdvanceLeadStatus(
      lead.status,
      CONVERSION_TARGET_STATUS
    );

    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        ...(shouldAdvanceStatusOnConversion ? { status: CONVERSION_TARGET_STATUS } : {}),
        convertedToAccountId: accountId,
        convertedAt: new Date(),
        convertedByUserId: input.userId,
      },
      select: leadSelect,
    });

    return {
      lead: updatedLead,
      account: {
        id: accountId,
        name: accountName,
      },
      contact,
      facility,
    };
  });
}

/** Check if a lead can be converted */
export async function canConvertLead(leadId: string): Promise<{
  canConvert: boolean;
  reason?: string;
}> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      convertedToAccountId: true,
      archivedAt: true,
    },
  });

  if (!lead) {
    return { canConvert: false, reason: 'Lead not found' };
  }

  if (lead.convertedToAccountId) {
    return { canConvert: false, reason: 'Lead has already been converted' };
  }

  if (lead.archivedAt) {
    return { canConvert: false, reason: 'Lead is archived' };
  }

  return { canConvert: true };
}

/**
 * Auto-advance the newest active converted lead for an account.
 * This is best-effort and must never block core workflows.
 */
export async function autoAdvanceLeadStatusForAccount(
  accountId: string,
  targetStatus: 'proposal_sent' | 'negotiation' | 'won'
): Promise<void> {
  await autoSetLeadStatusForAccount(accountId, targetStatus, { mode: 'advance' });
}

type AutoLeadStatusTarget = 'proposal_sent' | 'negotiation' | 'won' | 'lost';

interface AutoLeadStatusOptions {
  mode?: 'advance' | 'set';
}

/**
 * Update the newest active converted lead for an account.
 * - `advance` mode only moves forward in the pipeline.
 * - `set` mode applies explicit target status (used for rejection/loss events).
 * This is best-effort and must never block core workflows.
 */
export async function autoSetLeadStatusForAccount(
  accountId: string,
  targetStatus: AutoLeadStatusTarget,
  options: AutoLeadStatusOptions = {}
): Promise<void> {
  try {
    const lead = await prisma.lead.findFirst({
      where: {
        convertedToAccountId: accountId,
        archivedAt: null,
      },
      orderBy: [
        { convertedAt: 'desc' },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        status: true,
      },
    });

    if (!lead) return;
    if (options.mode === 'advance') {
      if (!shouldAutoAdvanceLeadStatus(lead.status, targetStatus)) return;
    } else {
      if (lead.status === targetStatus) return;
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: targetStatus },
    });
  } catch (error) {
    logger.warn('Failed to auto-advance lead status for account', {
      accountId,
      targetStatus,
      error,
    });
  }
}
