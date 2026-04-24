import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ForbiddenError, UnauthorizedError } from '../middleware/errorHandler';
import { ensureManagerAccountAccess, ensureOwnershipAccess } from '../middleware/ownership';
import { prisma } from '../lib/prisma';
import type { AuthenticatedUser } from '../types/express';
import { PERMISSIONS } from '../types';
import { validate } from '../middleware/validate';
import {
  listExpensesSchema,
  createExpenseSchema,
  updateExpenseSchema,
  listExpenseCategoriesSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
} from '../schemas/expense';
import {
  listExpenses,
  getExpenseByIdScoped,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
} from '../services/expenseService';

const router: Router = Router();

router.use(authenticate);

function requireAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }
  return req.user;
}

interface ExpenseResourceRefs {
  contractId?: string | null;
  facilityId?: string | null;
  jobId?: string | null;
}

async function assertExpenseResourceAccess(
  user: AuthenticatedUser,
  refs: ExpenseResourceRefs,
  context: { path: string; method: string }
): Promise<void> {
  if (user.role === 'owner' || user.role === 'admin') return;

  if (refs.contractId) {
    await ensureOwnershipAccess(user, {
      resourceType: 'contract',
      resourceId: refs.contractId,
      path: context.path,
      method: context.method,
    });
  }

  if (refs.facilityId) {
    await ensureOwnershipAccess(user, {
      resourceType: 'facility',
      resourceId: refs.facilityId,
      path: context.path,
      method: context.method,
    });
  }

  if (refs.jobId) {
    const job = await prisma.job.findUnique({
      where: { id: refs.jobId },
      select: { accountId: true },
    });
    if (!job) throw new ForbiddenError('Access denied');
    await ensureManagerAccountAccess(user, job.accountId, context);
  }
}

async function assertExpenseMutationAccess(
  user: AuthenticatedUser,
  expenseId: string,
  context: { path: string; method: string }
): Promise<void> {
  if (user.role === 'owner' || user.role === 'admin') return;

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      createdByUserId: true,
      contractId: true,
      facilityId: true,
      jobId: true,
    },
  });
  if (!expense) throw new ForbiddenError('Access denied');

  if (expense.createdByUserId === user.id) return;

  if (!expense.contractId && !expense.facilityId && !expense.jobId) {
    throw new ForbiddenError('You do not have access to this expense');
  }

  await assertExpenseResourceAccess(user, expense, context);
}

// ==================== Categories (must come before /:id) ====================

// List expense categories
router.get(
  '/categories',
  requirePermission(PERMISSIONS.EXPENSES_READ),
  validate(listExpenseCategoriesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await listExpenseCategories(req.query.includeInactive === 'true');
      res.json({ data: categories });
    } catch (error) {
      next(error);
    }
  }
);

// Create expense category
router.post(
  '/categories',
  requirePermission(PERMISSIONS.EXPENSES_APPROVE),
  validate(createExpenseCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await createExpenseCategory(req.body);
      res.status(201).json({ data: category });
    } catch (error) {
      next(error);
    }
  }
);

// Update expense category
router.patch(
  '/categories/:id',
  requirePermission(PERMISSIONS.EXPENSES_APPROVE),
  validate(updateExpenseCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await updateExpenseCategory(req.params.id, req.body);
      res.json({ data: category });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Expenses ====================

// List expenses
router.get(
  '/',
  requirePermission(PERMISSIONS.EXPENSES_READ),
  validate(listExpensesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      const {
        categoryId, jobId, contractId, facilityId, status,
        dateFrom, dateTo, page, limit,
      } = req.query;
      const result = await listExpenses(
        {
          categoryId: categoryId as string,
          jobId: jobId as string,
          contractId: contractId as string,
          facilityId: facilityId as string,
          status: status as string,
          dateFrom: dateFrom as string,
          dateTo: dateTo as string,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
        {
          userId: user.id,
          role: user.role,
          userTeamId: user.teamId ?? null,
        }
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get expense by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      const expense = await getExpenseByIdScoped(req.params.id, {
        userId: user.id,
        role: user.role,
        userTeamId: user.teamId ?? null,
      });
      res.json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

// Create expense
router.post(
  '/',
  requirePermission(PERMISSIONS.EXPENSES_WRITE),
  validate(createExpenseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      await assertExpenseResourceAccess(
        user,
        {
          contractId: req.body.contractId,
          facilityId: req.body.facilityId,
          jobId: req.body.jobId,
        },
        { path: req.path, method: req.method }
      );
      const expense = await createExpense({
        ...req.body,
        date: new Date(req.body.date),
        createdByUserId: user.id,
      });
      res.status(201).json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

// Update expense
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSES_WRITE),
  validate(updateExpenseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      await assertExpenseMutationAccess(user, req.params.id, {
        path: req.path,
        method: req.method,
      });
      await assertExpenseResourceAccess(
        user,
        {
          contractId: req.body.contractId,
          facilityId: req.body.facilityId,
          jobId: req.body.jobId,
        },
        { path: req.path, method: req.method }
      );
      const input = { ...req.body };
      if (input.date) input.date = new Date(input.date);
      const expense = await updateExpense(req.params.id, input);
      res.json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

// Delete expense
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSES_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      await assertExpenseMutationAccess(user, req.params.id, {
        path: req.path,
        method: req.method,
      });
      await deleteExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Approve expense
router.post(
  '/:id/approve',
  requirePermission(PERMISSIONS.EXPENSES_APPROVE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      await assertExpenseMutationAccess(user, req.params.id, {
        path: req.path,
        method: req.method,
      });
      const expense = await approveExpense(req.params.id, user.id);
      res.json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

// Reject expense
router.post(
  '/:id/reject',
  requirePermission(PERMISSIONS.EXPENSES_APPROVE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      await assertExpenseMutationAccess(user, req.params.id, {
        path: req.path,
        method: req.method,
      });
      const expense = await rejectExpense(req.params.id, req.body.notes);
      res.json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
