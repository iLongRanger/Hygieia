import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import { BadRequestError } from '../middleware/errorHandler';
import {
  hasNormalizedEmailMatch,
  hasNormalizedNameMatch,
  hasNormalizedPhoneMatch,
  normalizeComparableEmail,
  normalizeComparableName,
  normalizeComparablePhone,
} from '../lib/dedupe';

export interface AccountListParams {
  page?: number;
  limit?: number;
  type?: string;
  accountManagerId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
  readyForProposal?: boolean;
}

interface AccountAccessOptions {
  userRole?: string;
  userId?: string;
}

export interface AccountCreateInput {
  name: string;
  type: string;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Record<string, unknown> | null;
  serviceAddress?: Record<string, unknown> | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  residentialProfile?: Record<string, unknown> | null;
  residentialTaskLibrary?: string[];
  notes?: string | null;
  createdByUserId: string;
}

export interface AccountUpdateInput {
  name?: string;
  type?: string;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Record<string, unknown> | null;
  serviceAddress?: Record<string, unknown> | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  residentialProfile?: Record<string, unknown> | null;
  residentialTaskLibrary?: string[];
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

const accountSelect = {
  id: true,
  name: true,
  type: true,
  industry: true,
  website: true,
  billingEmail: true,
  billingPhone: true,
  billingAddress: true,
  serviceAddress: true,
  qboCustomerId: true,
  taxId: true,
  paymentTerms: true,
  creditLimit: true,
  residentialProfile: true,
  residentialTaskLibrary: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  residentialProperties: {
    where: {
      archivedAt: null,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      accountId: true,
      name: true,
      facility: {
        select: {
          id: true,
        },
      },
      serviceAddress: true,
      homeProfile: true,
      defaultTasks: true,
      defaultAddOns: true,
      accessNotes: true,
      parkingAccess: true,
      entryNotes: true,
      pets: true,
      isPrimary: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      archivedAt: true,
    },
  },
  accountManager: {
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
      contacts: true,
      facilities: true,
    },
  },
} satisfies Prisma.AccountSelect;

async function assertNoDuplicateAccount(
  input: {
    name?: string;
    billingEmail?: string | null;
    billingPhone?: string | null;
  },
  excludeAccountId?: string
): Promise<void> {
  const normalizedName = normalizeComparableName(input.name);
  const normalizedBillingEmail = normalizeComparableEmail(input.billingEmail);
  const normalizedBillingPhone = normalizeComparablePhone(input.billingPhone);

  if (!normalizedName && !normalizedBillingEmail && !normalizedBillingPhone) {
    return;
  }

  const candidates = await prisma.account.findMany({
    where: {
      archivedAt: null,
      ...(excludeAccountId ? { id: { not: excludeAccountId } } : {}),
    },
    select: {
      id: true,
      name: true,
      billingEmail: true,
      billingPhone: true,
    },
  });

  const duplicate = candidates.find((candidate) => {
    return (
      hasNormalizedNameMatch(candidate.name, normalizedName)
      || hasNormalizedEmailMatch(candidate.billingEmail, normalizedBillingEmail)
      || hasNormalizedPhoneMatch(candidate.billingPhone, normalizedBillingPhone)
    );
  });

  if (duplicate) {
    throw new BadRequestError(
      `A matching account already exists (${duplicate.name}). Use the existing account instead.`
    );
  }
}

export async function listAccounts(
  params: AccountListParams,
  access: AccountAccessOptions = {}
): Promise<
  PaginatedResult<Prisma.AccountGetPayload<{ select: typeof accountSelect }>>
> {
  const {
    page = 1,
    limit = 20,
    type,
    accountManagerId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
    readyForProposal = false,
  } = params;

  const where: Prisma.AccountWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (type) {
    where.type = type;
  }

  if (accountManagerId) {
    where.accountManagerId = accountManagerId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { billingEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (readyForProposal) {
    where.opportunities = {
      some: {
        archivedAt: null,
        appointments: {
          some: {
            type: 'walk_through',
            status: 'completed',
          },
        },
      },
    };
  }

  if (access.userRole === 'manager' && access.userId) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { accountManagerId: access.userId },
    ];
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      select: accountSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.account.count({ where }),
  ]);

  return {
    data: accounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAccountById(id: string) {
  return prisma.account.findUnique({
    where: { id },
    select: accountSelect,
  });
}

export async function getAccountByName(name: string) {
  return prisma.account.findUnique({
    where: { name },
    select: { id: true, name: true },
  });
}

export async function createAccount(input: AccountCreateInput) {
  const normalizedName = input.name.trim();
  const normalizedBillingEmail = normalizeComparableEmail(input.billingEmail);

  await assertNoDuplicateAccount({
    name: normalizedName,
    billingEmail: normalizedBillingEmail,
    billingPhone: input.billingPhone,
  });

  return prisma.account.create({
    data: {
      name: normalizedName,
      type: input.type,
      industry: input.industry,
      website: input.website,
      billingEmail: normalizedBillingEmail || null,
      billingPhone: input.billingPhone,
      billingAddress: input.billingAddress as Prisma.InputJsonValue,
      serviceAddress: input.serviceAddress as Prisma.InputJsonValue,
      taxId: input.taxId,
      paymentTerms: input.paymentTerms ?? 'NET30',
      creditLimit: input.creditLimit,
      accountManagerId: input.accountManagerId,
      residentialProfile: input.residentialProfile as Prisma.InputJsonValue,
      residentialTaskLibrary: (input.residentialTaskLibrary ?? []) as Prisma.InputJsonValue,
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
    select: accountSelect,
  });
}

export async function updateAccount(id: string, input: AccountUpdateInput) {
  const updateData: Prisma.AccountUpdateInput = {};
  let currentAccount:
    | {
        name: string;
        billingEmail: string | null;
        billingPhone: string | null;
      }
    | null = null;

  const getCurrentAccount = async () => {
    if (currentAccount) {
      return currentAccount;
    }

    currentAccount = await prisma.account.findUnique({
      where: { id },
      select: {
        name: true,
        billingEmail: true,
        billingPhone: true,
      },
    });

    if (!currentAccount) {
      throw new Error('Account not found');
    }

    return currentAccount;
  };

  if (
    input.name !== undefined
    || input.billingEmail !== undefined
    || input.billingPhone !== undefined
  ) {
    const existingAccount = await getCurrentAccount();
    await assertNoDuplicateAccount(
      {
        name: input.name ?? existingAccount.name,
        billingEmail:
          input.billingEmail !== undefined
            ? input.billingEmail
            : existingAccount.billingEmail,
        billingPhone:
          input.billingPhone !== undefined
            ? input.billingPhone
            : existingAccount.billingPhone,
      },
      id
    );
  }

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.type !== undefined) updateData.type = input.type;
  if (input.industry !== undefined) updateData.industry = input.industry;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.billingEmail !== undefined)
    updateData.billingEmail = normalizeComparableEmail(input.billingEmail) || null;
  if (input.billingPhone !== undefined)
    updateData.billingPhone = input.billingPhone;
  if (input.billingAddress !== undefined) {
    updateData.billingAddress = input.billingAddress as Prisma.InputJsonValue;
  }
  if (input.serviceAddress !== undefined) {
    updateData.serviceAddress = input.serviceAddress as Prisma.InputJsonValue;
  }
  if (input.taxId !== undefined) updateData.taxId = input.taxId;
  if (input.paymentTerms !== undefined)
    updateData.paymentTerms = input.paymentTerms;
  if (input.creditLimit !== undefined)
    updateData.creditLimit = input.creditLimit;
  if (input.accountManagerId !== undefined) {
    updateData.accountManager = input.accountManagerId
      ? { connect: { id: input.accountManagerId } }
      : { disconnect: true };
  }
  if (input.residentialProfile !== undefined) {
    updateData.residentialProfile = input.residentialProfile as Prisma.InputJsonValue;
  }
  if (input.residentialTaskLibrary !== undefined) {
    updateData.residentialTaskLibrary = input.residentialTaskLibrary as Prisma.InputJsonValue;
  }
  if (input.notes !== undefined) updateData.notes = input.notes;

  return prisma.account.update({
    where: { id },
    data: updateData,
    select: accountSelect,
  });
}

export async function archiveAccount(id: string) {
  return prisma.account.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: accountSelect,
  });
}

export async function restoreAccount(id: string) {
  return prisma.account.update({
    where: { id },
    data: { archivedAt: null },
    select: accountSelect,
  });
}

export async function deleteAccount(id: string) {
  return prisma.account.delete({
    where: { id },
    select: { id: true },
  });
}
