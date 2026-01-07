import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

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
} satisfies Prisma.LeadSelect;

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
  return prisma.lead.create({
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
}

export async function updateLead(id: string, input: LeadUpdateInput) {
  const updateData: Prisma.LeadUpdateInput = {};

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

  return prisma.lead.update({
    where: { id },
    data: updateData,
    select: leadSelect,
  });
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
