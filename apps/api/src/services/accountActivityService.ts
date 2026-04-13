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

interface AccountActivityListItem {
  id: string;
  entryType: CreateAccountActivityInput['entryType'];
  note: string;
  createdAt: Date;
  performedByUser: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
}

interface AccountActivityModel {
  findMany(args: {
    where: { accountId: string };
    select: typeof activitySelect;
    orderBy: { createdAt: 'desc' };
    skip: number;
    take: number;
  }): Promise<AccountActivityListItem[]>;
  count(args: { where: { accountId: string } }): Promise<number>;
  create(args: {
    data: {
      accountId: string;
      entryType: CreateAccountActivityInput['entryType'];
      note: string;
      performedByUserId: string | null;
    };
    select: typeof activitySelect;
  }): Promise<AccountActivityListItem>;
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
  const accountActivityModel = (prisma as unknown as { accountActivity: AccountActivityModel }).accountActivity;

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
  const accountActivityModel = (prisma as unknown as { accountActivity: AccountActivityModel }).accountActivity;
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
