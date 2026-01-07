import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface ContactListParams {
  page?: number;
  limit?: number;
  accountId?: string;
  isPrimary?: boolean;
  isBilling?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface ContactCreateInput {
  accountId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  department?: string | null;
  isPrimary?: boolean;
  isBilling?: boolean;
  notes?: string | null;
  createdByUserId: string;
}

export interface ContactUpdateInput {
  accountId?: string | null;
  name?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  department?: string | null;
  isPrimary?: boolean;
  isBilling?: boolean;
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

const contactSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  mobile: true,
  title: true,
  department: true,
  isPrimary: true,
  isBilling: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  account: {
    select: {
      id: true,
      name: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.ContactSelect;

export async function listContacts(
  params: ContactListParams
): Promise<
  PaginatedResult<Prisma.ContactGetPayload<{ select: typeof contactSelect }>>
> {
  const {
    page = 1,
    limit = 20,
    accountId,
    isPrimary,
    isBilling,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.ContactWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  if (isPrimary !== undefined) {
    where.isPrimary = isPrimary;
  }

  if (isBilling !== undefined) {
    where.isBilling = isBilling;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: contactSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    data: contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getContactById(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    select: contactSelect,
  });
}

export async function createContact(input: ContactCreateInput) {
  return prisma.contact.create({
    data: {
      accountId: input.accountId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      mobile: input.mobile,
      title: input.title,
      department: input.department,
      isPrimary: input.isPrimary ?? false,
      isBilling: input.isBilling ?? false,
      notes: input.notes,
      createdByUserId: input.createdByUserId,
    },
    select: contactSelect,
  });
}

export async function updateContact(id: string, input: ContactUpdateInput) {
  const updateData: Prisma.ContactUpdateInput = {};

  if (input.accountId !== undefined) {
    updateData.account = input.accountId
      ? { connect: { id: input.accountId } }
      : { disconnect: true };
  }
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.mobile !== undefined) updateData.mobile = input.mobile;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.department !== undefined) updateData.department = input.department;
  if (input.isPrimary !== undefined) updateData.isPrimary = input.isPrimary;
  if (input.isBilling !== undefined) updateData.isBilling = input.isBilling;
  if (input.notes !== undefined) updateData.notes = input.notes;

  return prisma.contact.update({
    where: { id },
    data: updateData,
    select: contactSelect,
  });
}

export async function archiveContact(id: string) {
  return prisma.contact.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: contactSelect,
  });
}

export async function restoreContact(id: string) {
  return prisma.contact.update({
    where: { id },
    data: { archivedAt: null },
    select: contactSelect,
  });
}

export async function deleteContact(id: string) {
  return prisma.contact.delete({
    where: { id },
    select: { id: true },
  });
}
