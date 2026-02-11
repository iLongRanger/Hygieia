import { prisma } from '../lib/prisma';

export interface LogContractActivityInput {
  contractId: string;
  action: string;
  performedByUserId?: string | null;
  metadata?: Record<string, any>;
}

const activitySelect = {
  id: true,
  action: true,
  metadata: true,
  createdAt: true,
  performedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

export async function logContractActivity(input: LogContractActivityInput) {
  return prisma.contractActivity.create({
    data: {
      contractId: input.contractId,
      action: input.action,
      performedByUserId: input.performedByUserId ?? null,
      metadata: input.metadata ?? {},
    },
    select: activitySelect,
  });
}

export async function getContractActivities(
  contractId: string,
  params?: { page?: number; limit?: number }
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;

  const [activities, total] = await Promise.all([
    prisma.contractActivity.findMany({
      where: { contractId },
      select: activitySelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contractActivity.count({ where: { contractId } }),
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
