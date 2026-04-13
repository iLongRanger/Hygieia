import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

// ==================== Interfaces ====================

export interface ExpenseListParams {
  categoryId?: string;
  jobId?: string;
  contractId?: string;
  facilityId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseListOptions {
  userId?: string;
  role?: string;
  userTeamId?: string | null;
}

export interface ExpenseCreateInput {
  date: Date;
  amount: number;
  description: string;
  vendor?: string | null;
  categoryId: string;
  jobId?: string | null;
  contractId?: string | null;
  facilityId?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  createdByUserId: string;
}

export interface ExpenseUpdateInput {
  date?: Date;
  amount?: number;
  description?: string;
  vendor?: string | null;
  categoryId?: string;
  jobId?: string | null;
  contractId?: string | null;
  facilityId?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

export interface ExpenseCategoryCreateInput {
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export interface ExpenseCategoryUpdateInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

// ==================== Select objects ====================

const expenseListSelect = {
  id: true,
  date: true,
  amount: true,
  description: true,
  vendor: true,
  status: true,
  receiptUrl: true,
  createdAt: true,
  category: { select: { id: true, name: true } },
  job: { select: { id: true, jobNumber: true } },
  contract: { select: { id: true, contractNumber: true } },
  facility: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, fullName: true } },
  approvedByUser: { select: { id: true, fullName: true } },
};

const expenseDetailSelect = {
  id: true,
  date: true,
  amount: true,
  description: true,
  vendor: true,
  categoryId: true,
  jobId: true,
  contractId: true,
  facilityId: true,
  receiptUrl: true,
  status: true,
  notes: true,
  approvedAt: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  job: { select: { id: true, jobNumber: true } },
  contract: { select: { id: true, contractNumber: true } },
  facility: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, fullName: true } },
  approvedByUser: { select: { id: true, fullName: true } },
};

const expenseCategorySelect = {
  id: true,
  name: true,
  description: true,
  isDefault: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { expenses: true } },
};

// ==================== Service ====================

export async function listExpenses(params: ExpenseListParams, options?: ExpenseListOptions) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  // RBAC: subcontractors see expenses created by their team, cleaners only their own.
  if (options?.role === 'subcontractor') {
    if (options.userTeamId) {
      where.createdByUser = { teamId: options.userTeamId };
    } else if (options.userId) {
      where.createdByUserId = options.userId;
    }
  } else if (options?.role === 'cleaner' && options.userId) {
    where.createdByUserId = options.userId;
  }

  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.jobId) where.jobId = params.jobId;
  if (params.contractId) where.contractId = params.contractId;
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.status) where.status = params.status;

  if ((params.dateFrom ?? params.dateTo) !== undefined) {
    where.date = {};
    if (params.dateFrom) (where.date as Record<string, unknown>).gte = new Date(params.dateFrom);
    if (params.dateTo) (where.date as Record<string, unknown>).lte = new Date(params.dateTo);
  }

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      select: expenseListSelect,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where }),
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

export async function getExpenseById(id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    select: expenseDetailSelect,
  });
  if (!expense) throw new NotFoundError('Expense not found');
  return expense;
}

export async function getExpenseByIdScoped(
  id: string,
  options?: ExpenseListOptions
) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    select: {
      ...expenseDetailSelect,
      createdByUser: {
        select: { id: true, fullName: true, teamId: true },
      },
    },
  });

  if (!expense) throw new NotFoundError('Expense not found');

  if (options?.role === 'subcontractor') {
    const isTeamExpense = Boolean(options.userTeamId) && expense.createdByUser?.teamId === options.userTeamId;
    const isOwnExpense = expense.createdByUserId === options.userId;
    if (!isTeamExpense && !isOwnExpense) {
      throw new NotFoundError('Expense not found');
    }
  }

  if (options?.role === 'cleaner' && options.userId && expense.createdByUserId !== options.userId) {
    throw new NotFoundError('Expense not found');
  }

  return expense;
}

export async function createExpense(input: ExpenseCreateInput) {
  // Validate category exists
  const category = await prisma.expenseCategory.findUnique({
    where: { id: input.categoryId },
    select: { id: true, isActive: true },
  });
  if (!category) throw new NotFoundError('Expense category not found');
  if (!category.isActive) throw new BadRequestError('Expense category is inactive');

  const expense = await prisma.expense.create({
    data: {
      date: input.date,
      amount: new Prisma.Decimal(input.amount),
      description: input.description,
      vendor: input.vendor,
      categoryId: input.categoryId,
      jobId: input.jobId,
      contractId: input.contractId,
      facilityId: input.facilityId,
      receiptUrl: input.receiptUrl,
      notes: input.notes,
      status: 'pending',
      createdByUserId: input.createdByUserId,
    },
    select: expenseDetailSelect,
  });

  return expense;
}

export async function updateExpense(id: string, input: ExpenseUpdateInput) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status === 'approved') throw new BadRequestError('Cannot edit an approved expense');

  if (input.categoryId) {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: input.categoryId },
      select: { id: true, isActive: true },
    });
    if (!category) throw new NotFoundError('Expense category not found');
    if (!category.isActive) throw new BadRequestError('Expense category is inactive');
  }

  const data: Record<string, unknown> = {};
  if (input.date !== undefined) data.date = input.date;
  if (input.amount !== undefined) data.amount = new Prisma.Decimal(input.amount);
  if (input.description !== undefined) data.description = input.description;
  if (input.vendor !== undefined) data.vendor = input.vendor;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.jobId !== undefined) data.jobId = input.jobId;
  if (input.contractId !== undefined) data.contractId = input.contractId;
  if (input.facilityId !== undefined) data.facilityId = input.facilityId;
  if (input.receiptUrl !== undefined) data.receiptUrl = input.receiptUrl;
  if (input.notes !== undefined) data.notes = input.notes;

  // If the expense was rejected, reset to pending on edit
  if (existing.status === 'rejected') {
    data.status = 'pending';
    data.approvedByUserId = null;
    data.approvedAt = null;
  }

  const expense = await prisma.expense.update({
    where: { id },
    data,
    select: expenseDetailSelect,
  });

  return expense;
}

export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status === 'approved') throw new BadRequestError('Cannot delete an approved expense');

  await prisma.expense.delete({ where: { id } });
}

export async function approveExpense(id: string, approvedByUserId: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status === 'approved') throw new BadRequestError('Expense is already approved');

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      status: 'approved',
      approvedByUserId,
      approvedAt: new Date(),
    },
    select: expenseDetailSelect,
  });

  return expense;
}

export async function rejectExpense(id: string, notes?: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status === 'approved') throw new BadRequestError('Cannot reject an approved expense');

  const data: Record<string, unknown> = {
    status: 'rejected',
    approvedByUserId: null,
    approvedAt: null,
  };
  if (notes !== undefined) data.notes = notes;

  const expense = await prisma.expense.update({
    where: { id },
    data,
    select: expenseDetailSelect,
  });

  return expense;
}

// ==================== Categories ====================

export async function listExpenseCategories(includeInactive = false) {
  const where: Record<string, unknown> = {};
  if (!includeInactive) where.isActive = true;

  return prisma.expenseCategory.findMany({
    where,
    select: expenseCategorySelect,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function createExpenseCategory(input: ExpenseCategoryCreateInput) {
  return prisma.expenseCategory.create({
    data: {
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder ?? 0,
    },
    select: expenseCategorySelect,
  });
}

export async function updateExpenseCategory(id: string, input: ExpenseCategoryUpdateInput) {
  const existing = await prisma.expenseCategory.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Expense category not found');

  // Cannot deactivate default categories
  if (input.isActive === false && existing.isDefault) {
    throw new BadRequestError('Cannot deactivate a default expense category');
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  return prisma.expenseCategory.update({
    where: { id },
    data,
    select: expenseCategorySelect,
  });
}
