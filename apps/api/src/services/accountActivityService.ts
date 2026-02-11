import { prisma } from '../lib/prisma';

export interface AccountActivityListParams {
  page?: number;
  limit?: number;
}

export interface CreateAccountActivityInput {
  accountId: string;
  entryType: 'note' | 'request' | 'complaint';
  note: string;
  performedByUserId?: string | null;
}

const activitySelect = {
  id: true,
  entryType: true,
  note: true,
  createdAt: true,
  performedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

export async function listAccountActivities(
  accountId: string,
  params: AccountActivityListParams = {}
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const accountActivityModel = (prisma as any).accountActivity;

  const [data, total] = await Promise.all([
    accountActivityModel.findMany({
      where: { accountId },
      select: activitySelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    accountActivityModel.count({ where: { accountId } }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createAccountActivity(input: CreateAccountActivityInput) {
  const accountActivityModel = (prisma as any).accountActivity;
  return accountActivityModel.create({
    data: {
      accountId: input.accountId,
      entryType: input.entryType,
      note: input.note,
      performedByUserId: input.performedByUserId ?? null,
    },
    select: activitySelect,
  });
}
