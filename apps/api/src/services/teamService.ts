import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface TeamListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  includeArchived?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TeamCreateInput {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  createdByUserId: string;
}

export interface TeamUpdateInput {
  name?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
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

const teamSelect = {
  id: true,
  name: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
};

export async function listTeams(params: TeamListParams): Promise<PaginatedResult<any>> {
  const {
    page = 1,
    limit = 20,
    search,
    isActive,
    includeArchived = false,
    sortBy = 'name',
    sortOrder = 'asc',
  } = params;

  const where: Prisma.TeamWhereInput = {};

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { contactEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  const validSortFields = ['name', 'createdAt', 'updatedAt', 'isActive'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      select: teamSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.team.count({ where }),
  ]);

  return {
    data: teams,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTeamById(id: string) {
  return prisma.team.findUnique({
    where: { id },
    select: teamSelect,
  });
}

export async function createTeam(input: TeamCreateInput) {
  return prisma.team.create({
    data: {
      name: input.name,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      notes: input.notes,
      isActive: input.isActive ?? true,
      createdByUserId: input.createdByUserId,
    },
    select: teamSelect,
  });
}

export async function updateTeam(id: string, input: TeamUpdateInput) {
  return prisma.team.update({
    where: { id },
    data: input,
    select: teamSelect,
  });
}

export async function archiveTeam(id: string) {
  return prisma.team.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      isActive: false,
    },
    select: teamSelect,
  });
}

export async function restoreTeam(id: string) {
  return prisma.team.update({
    where: { id },
    data: {
      archivedAt: null,
      isActive: true,
    },
    select: teamSelect,
  });
}
