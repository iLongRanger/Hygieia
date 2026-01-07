import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface AccountListParams {
  page?: number;
  limit?: number;
  type?: string;
  accountManagerId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface AccountCreateInput {
  name: string;
  type: string;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Record<string, unknown> | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
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
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
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
  qboCustomerId: true,
  taxId: true,
  paymentTerms: true,
  creditLimit: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
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

export async function listAccounts(
  params: AccountListParams
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
  return prisma.account.create({
    data: {
      name: input.name,
      type: input.type,
      industry: input.industry,
      website: input.website,
      billingEmail: input.billingEmail,
      billingPhone: input.billingPhone,
      billingAddress: input.billingAddress as Prisma.InputJsonValue,
      taxId: input.taxId,
      paymentTerms: input.paymentTerms ?? 'NET30',
      creditLimit: input.creditLimit,
      accountManagerId: input.accountManagerId,
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
    select: accountSelect,
  });
}

export async function updateAccount(id: string, input: AccountUpdateInput) {
  const updateData: Prisma.AccountUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.industry !== undefined) updateData.industry = input.industry;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.billingEmail !== undefined)
    updateData.billingEmail = input.billingEmail;
  if (input.billingPhone !== undefined)
    updateData.billingPhone = input.billingPhone;
  if (input.billingAddress !== undefined) {
    updateData.billingAddress = input.billingAddress as Prisma.InputJsonValue;
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
