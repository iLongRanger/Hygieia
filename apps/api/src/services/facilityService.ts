import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface FacilityListParams {
  page?: number;
  limit?: number;
  accountId?: string;
  status?: string;
  buildingType?: string;
  facilityManagerId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface FacilityCreateInput {
  accountId: string;
  name: string;
  address: Record<string, unknown>;
  squareFeet?: number | null;
  buildingType?: string | null;
  accessInstructions?: string | null;
  parkingInfo?: string | null;
  specialRequirements?: string | null;
  facilityManagerId?: string | null;
  status?: string;
  notes?: string | null;
  createdByUserId: string;
}

export interface FacilityUpdateInput {
  name?: string;
  address?: Record<string, unknown>;
  squareFeet?: number | null;
  buildingType?: string | null;
  accessInstructions?: string | null;
  parkingInfo?: string | null;
  specialRequirements?: string | null;
  facilityManagerId?: string | null;
  status?: string;
  notes?: string | null;
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

const facilitySelect = {
  id: true,
  name: true,
  address: true,
  squareFeet: true,
  buildingType: true,
  accessInstructions: true,
  parkingInfo: true,
  specialRequirements: true,
  status: true,
  notes: true,
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
  facilityManager: {
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
  _count: {
    select: {
      areas: true,
      facilityTasks: true,
    },
  },
} satisfies Prisma.FacilitySelect;

export async function listFacilities(
  params: FacilityListParams
): Promise<
  PaginatedResult<Prisma.FacilityGetPayload<{ select: typeof facilitySelect }>>
> {
  const {
    page = 1,
    limit = 20,
    accountId,
    status,
    buildingType,
    facilityManagerId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.FacilityWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  if (status) {
    where.status = status;
  }

  if (buildingType) {
    where.buildingType = buildingType;
  }

  if (facilityManagerId) {
    where.facilityManagerId = facilityManagerId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { account: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name', 'squareFeet'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [facilities, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      select: facilitySelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facility.count({ where }),
  ]);

  return {
    data: facilities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getFacilityById(id: string) {
  return prisma.facility.findUnique({
    where: { id },
    select: facilitySelect,
  });
}

export async function createFacility(input: FacilityCreateInput) {
  return prisma.facility.create({
    data: {
      accountId: input.accountId,
      name: input.name,
      address: input.address as Prisma.InputJsonValue,
      squareFeet: input.squareFeet,
      buildingType: input.buildingType,
      accessInstructions: input.accessInstructions,
      parkingInfo: input.parkingInfo,
      specialRequirements: input.specialRequirements,
      facilityManagerId: input.facilityManagerId,
      status: input.status ?? 'active',
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
    select: facilitySelect,
  });
}

export async function updateFacility(id: string, input: FacilityUpdateInput) {
  const updateData: Prisma.FacilityUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.address !== undefined) {
    updateData.address = input.address as Prisma.InputJsonValue;
  }
  if (input.squareFeet !== undefined) updateData.squareFeet = input.squareFeet;
  if (input.buildingType !== undefined)
    updateData.buildingType = input.buildingType;
  if (input.accessInstructions !== undefined)
    updateData.accessInstructions = input.accessInstructions;
  if (input.parkingInfo !== undefined)
    updateData.parkingInfo = input.parkingInfo;
  if (input.specialRequirements !== undefined)
    updateData.specialRequirements = input.specialRequirements;
  if (input.facilityManagerId !== undefined) {
    updateData.facilityManager = input.facilityManagerId
      ? { connect: { id: input.facilityManagerId } }
      : { disconnect: true };
  }
  if (input.status !== undefined) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes;

  return prisma.facility.update({
    where: { id },
    data: updateData,
    select: facilitySelect,
  });
}

export async function archiveFacility(id: string) {
  return prisma.facility.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: facilitySelect,
  });
}

export async function restoreFacility(id: string) {
  return prisma.facility.update({
    where: { id },
    data: { archivedAt: null },
    select: facilitySelect,
  });
}

export async function deleteFacility(id: string) {
  return prisma.facility.delete({
    where: { id },
    select: { id: true },
  });
}
