import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
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
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
} from '../services/expenseService';

const router = Router();

router.use(authenticate);

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
          userId: req.user!.id,
          role: req.user!.role,
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
      const expense = await getExpenseById(req.params.id);
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
      const expense = await createExpense({
        ...req.body,
        date: new Date(req.body.date),
        createdByUserId: req.user!.id,
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
      const expense = await approveExpense(req.params.id, req.user!.id);
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
      const expense = await rejectExpense(req.params.id, req.body.notes);
      res.json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
