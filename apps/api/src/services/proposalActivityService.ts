import { prisma } from '../lib/prisma';

export interface LogActivityInput {
  proposalId: string;
  action: string;
  performedByUserId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}

const activitySelect = {
  id: true,
  action: true,
  metadata: true,
  ipAddress: true,
  createdAt: true,
  performedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

export async function logActivity(input: LogActivityInput) {
  return prisma.proposalActivity.create({
    data: {
      proposalId: input.proposalId,
      action: input.action,
      performedByUserId: input.performedByUserId ?? null,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress ?? null,
    },
    select: activitySelect,
  });
}

export async function getProposalActivities(
  proposalId: string,
  params?: { page?: number; limit?: number }
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;

  const [activities, total] = await Promise.all([
    prisma.proposalActivity.findMany({
      where: { proposalId },
      select: activitySelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.proposalActivity.count({ where: { proposalId } }),
  ]);

  return {
    data: activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
