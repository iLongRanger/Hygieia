# Financial Management Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add expense tracking, payroll generation, and financial reports to Hygieia so the business has a complete money-in/money-out cycle with operational reporting.

**Architecture:** Thin financial layer — 4 new Prisma models (ExpenseCategory, Expense, PayrollRun, PayrollEntry) + 2 User fields. Payroll reads from existing timesheets + contracts. Job costing and reports are computed views (no materialized tables). One-way QuickBooks sync boundary preserved.

**Tech Stack:** Prisma (schema + migrations), Express routes with Zod validation, React frontend with Lucide icons, existing RBAC middleware.

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260305200000_add_financial_management/migration.sql`

**Step 1: Add User pay fields to schema**

Add these fields to the existing `User` model in `schema.prisma` (after the existing fields, before relations):

```prisma
  payType           String?   @map("pay_type") @db.VarChar(20)
  hourlyPayRate     Decimal?  @map("hourly_pay_rate") @db.Decimal(10, 2)
```

**Step 2: Add ExpenseCategory model**

Add after the last model in `schema.prisma`:

```prisma
model ExpenseCategory {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique @db.VarChar(100)
  description String?  @db.Text
  isDefault   Boolean  @default(false) @map("is_default")
  isActive    Boolean  @default(true) @map("is_active")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  expenses Expense[]

  @@index([isActive])
  @@map("expense_categories")
}
```

**Step 3: Add Expense model**

```prisma
model Expense {
  id               String    @id @default(uuid()) @db.Uuid
  date             DateTime  @db.Date
  amount           Decimal   @db.Decimal(12, 2)
  description      String    @db.Text
  vendor           String?   @db.VarChar(200)
  categoryId       String    @map("category_id") @db.Uuid
  jobId            String?   @map("job_id") @db.Uuid
  contractId       String?   @map("contract_id") @db.Uuid
  facilityId       String?   @map("facility_id") @db.Uuid
  receiptUrl       String?   @map("receipt_url") @db.Text
  status           String    @default("pending") @db.VarChar(20)
  createdByUserId  String    @map("created_by_user_id") @db.Uuid
  approvedByUserId String?   @map("approved_by_user_id") @db.Uuid
  approvedAt       DateTime? @map("approved_at") @db.Timestamptz(6)
  notes            String?   @db.Text
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  category       ExpenseCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  job            Job?            @relation("JobExpenses", fields: [jobId], references: [id], onDelete: SetNull)
  contract       Contract?       @relation("ContractExpenses", fields: [contractId], references: [id], onDelete: SetNull)
  facility       Facility?       @relation("FacilityExpenses", fields: [facilityId], references: [id], onDelete: SetNull)
  createdByUser  User            @relation("CreatedExpenses", fields: [createdByUserId], references: [id], onDelete: Restrict)
  approvedByUser User?           @relation("ApprovedExpenses", fields: [approvedByUserId], references: [id], onDelete: SetNull)

  @@index([categoryId])
  @@index([jobId])
  @@index([contractId])
  @@index([facilityId])
  @@index([status])
  @@index([date])
  @@index([createdByUserId])
  @@map("expenses")
}
```

**Step 4: Add PayrollRun model**

```prisma
model PayrollRun {
  id               String    @id @default(uuid()) @db.Uuid
  periodStart      DateTime  @map("period_start") @db.Date
  periodEnd        DateTime  @map("period_end") @db.Date
  status           String    @default("draft") @db.VarChar(20)
  totalGrossPay    Decimal   @default(0) @map("total_gross_pay") @db.Decimal(12, 2)
  totalEntries     Int       @default(0) @map("total_entries")
  approvedByUserId String?   @map("approved_by_user_id") @db.Uuid
  approvedAt       DateTime? @map("approved_at") @db.Timestamptz(6)
  paidAt           DateTime? @map("paid_at") @db.Timestamptz(6)
  notes            String?   @db.Text
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  approvedByUser User?          @relation("ApprovedPayrollRuns", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  entries        PayrollEntry[]

  @@index([status])
  @@index([periodStart, periodEnd])
  @@map("payroll_runs")
}
```

**Step 5: Add PayrollEntry model**

```prisma
model PayrollEntry {
  id                   String   @id @default(uuid()) @db.Uuid
  payrollRunId         String   @map("payroll_run_id") @db.Uuid
  userId               String   @map("user_id") @db.Uuid
  payType              String   @map("pay_type") @db.VarChar(20)
  scheduledHours       Decimal? @map("scheduled_hours") @db.Decimal(8, 2)
  hourlyRate           Decimal? @map("hourly_rate") @db.Decimal(10, 2)
  contractId           String?  @map("contract_id") @db.Uuid
  contractMonthlyValue Decimal? @map("contract_monthly_value") @db.Decimal(12, 2)
  tierPercentage       Decimal? @map("tier_percentage") @db.Decimal(5, 2)
  grossPay             Decimal  @map("gross_pay") @db.Decimal(12, 2)
  status               String   @default("valid") @db.VarChar(20)
  flagReason           String?  @map("flag_reason") @db.Text
  adjustedByUserId     String?  @map("adjusted_by_user_id") @db.Uuid
  adjustmentNotes      String?  @map("adjustment_notes") @db.Text
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  payrollRun     PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Cascade)
  user           User       @relation("UserPayrollEntries", fields: [userId], references: [id], onDelete: Restrict)
  contract       Contract?  @relation("ContractPayrollEntries", fields: [contractId], references: [id], onDelete: SetNull)
  adjustedByUser User?      @relation("AdjustedPayrollEntries", fields: [adjustedByUserId], references: [id], onDelete: SetNull)

  @@index([payrollRunId])
  @@index([userId])
  @@index([contractId])
  @@index([status])
  @@map("payroll_entries")
}
```

**Step 6: Add relation back-references on existing models**

Add to `User` model relations section:
```prisma
  createdExpenses       Expense[]      @relation("CreatedExpenses")
  approvedExpenses      Expense[]      @relation("ApprovedExpenses")
  approvedPayrollRuns   PayrollRun[]   @relation("ApprovedPayrollRuns")
  payrollEntries        PayrollEntry[] @relation("UserPayrollEntries")
  adjustedPayrollEntries PayrollEntry[] @relation("AdjustedPayrollEntries")
```

Add to `Job` model relations section:
```prisma
  expenses Job[] @relation("JobExpenses")
```
Note: If `Job` already has an `expenses` field name conflict, use `jobExpenses` instead.

Add to `Contract` model relations section:
```prisma
  expenses       Expense[]      @relation("ContractExpenses")
  payrollEntries PayrollEntry[] @relation("ContractPayrollEntries")
```

Add to `Facility` model relations section:
```prisma
  expenses Expense[] @relation("FacilityExpenses")
```

**Step 7: Generate migration**

Run: `cd packages/database && npx prisma migrate dev --name add_financial_management`

If Prisma auto-generates, verify the SQL. Otherwise create manually with seed data for default expense categories.

**Step 8: Seed default expense categories**

Add to the migration SQL (or create a seed script):

```sql
INSERT INTO expense_categories (id, name, description, is_default, is_active, sort_order, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Cleaning Supplies', 'Cleaning chemicals, paper products, trash bags', true, true, 1, NOW(), NOW()),
  (gen_random_uuid(), 'Equipment', 'Vacuums, floor machines, tools', true, true, 2, NOW(), NOW()),
  (gen_random_uuid(), 'Fuel / Travel', 'Gas, mileage, parking, tolls', true, true, 3, NOW(), NOW()),
  (gen_random_uuid(), 'Insurance', 'Liability, workers comp, vehicle insurance', true, true, 4, NOW(), NOW()),
  (gen_random_uuid(), 'Maintenance', 'Equipment repairs, vehicle maintenance', true, true, 5, NOW(), NOW()),
  (gen_random_uuid(), 'Rent / Utilities', 'Office rent, storage, phone, internet', true, true, 6, NOW(), NOW()),
  (gen_random_uuid(), 'Other', 'Miscellaneous business expenses', true, true, 99, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
```

**Step 9: Regenerate Prisma client and verify**

Run: `cd packages/database && npx prisma generate`
Run: `cd apps/api && npx tsc --noEmit --pretty 2>&1 | grep "error TS" | head -20`

**Step 10: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat: add financial management schema (expenses, payroll)"
```

---

### Task 2: Permissions + User Schema Updates

**Files:**
- Modify: `apps/api/src/types/permissions.ts`
- Modify: `apps/api/src/types/roles.ts`
- Modify: `apps/api/src/schemas/user.ts` (if payType/hourlyPayRate need validation)
- Modify: `apps/web/src/lib/permissions.ts`

**Step 1: Add permissions constants**

In `apps/api/src/types/permissions.ts`, add to the `PERMISSIONS` object:

```typescript
  EXPENSES_READ: 'expenses_read',
  EXPENSES_WRITE: 'expenses_write',
  EXPENSES_APPROVE: 'expenses_approve',
  PAYROLL_READ: 'payroll_read',
  PAYROLL_WRITE: 'payroll_write',
  PAYROLL_APPROVE: 'payroll_approve',
  FINANCE_REPORTS_READ: 'finance_reports_read',
```

**Step 2: Add role mappings**

In `apps/api/src/types/roles.ts`, add to each role:

`owner` and `admin`:
```typescript
    expenses_read: true,
    expenses_write: true,
    expenses_approve: true,
    payroll_read: true,
    payroll_write: true,
    payroll_approve: true,
    finance_reports_read: true,
```

`manager`:
```typescript
    expenses_read: true,
    expenses_write: true,
    payroll_read: true,
    finance_reports_read: true,
```

`subcontractor`:
```typescript
    expenses_read: true,
    payroll_read: true,
```

`cleaner`:
```typescript
    payroll_read: true,
```

**Step 3: Mirror permissions in frontend**

In `apps/web/src/lib/permissions.ts`, add the same permission constants so the frontend can gate UI elements.

**Step 4: Add route access config**

In `apps/web/src/lib/routeAccess.ts`, add:

```typescript
  { path: '/finance', requiredPermissions: [PERMISSIONS.FINANCE_REPORTS_READ] },
  { path: '/finance/expenses', requiredPermissions: [PERMISSIONS.EXPENSES_READ] },
  { path: '/finance/payroll', requiredPermissions: [PERMISSIONS.PAYROLL_READ] },
  { path: '/finance/reports', requiredPermissions: [PERMISSIONS.FINANCE_REPORTS_READ] },
```

**Step 5: Commit**

```bash
git add apps/api/src/types/ apps/web/src/lib/permissions.ts apps/web/src/lib/routeAccess.ts
git commit -m "feat: add financial management permissions and role mappings"
```

---

### Task 3: Expense Service + Routes

**Files:**
- Create: `apps/api/src/services/expenseService.ts`
- Create: `apps/api/src/schemas/expense.ts`
- Create: `apps/api/src/routes/expenses.ts`
- Modify: `apps/api/src/index.ts` (register route)

**Step 1: Create Zod schemas**

Create `apps/api/src/schemas/expense.ts`:

```typescript
import { z } from 'zod';

export const listExpensesSchema = z.object({
  query: z.object({
    categoryId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    facilityId: z.string().uuid().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const createExpenseSchema = z.object({
  body: z.object({
    date: z.string(),
    amount: z.number().positive(),
    description: z.string().min(1).max(2000),
    vendor: z.string().max(200).optional().nullable(),
    categoryId: z.string().uuid(),
    jobId: z.string().uuid().optional().nullable(),
    contractId: z.string().uuid().optional().nullable(),
    facilityId: z.string().uuid().optional().nullable(),
    receiptUrl: z.string().url().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

export const updateExpenseSchema = z.object({
  body: z.object({
    date: z.string().optional(),
    amount: z.number().positive().optional(),
    description: z.string().min(1).max(2000).optional(),
    vendor: z.string().max(200).optional().nullable(),
    categoryId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional().nullable(),
    contractId: z.string().uuid().optional().nullable(),
    facilityId: z.string().uuid().optional().nullable(),
    receiptUrl: z.string().url().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

export const listExpenseCategoriesSchema = z.object({
  query: z.object({
    includeInactive: z.enum(['true']).optional(),
  }),
});

export const createExpenseCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const updateExpenseCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});
```

**Step 2: Create expense service**

Create `apps/api/src/services/expenseService.ts`:

```typescript
import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

export interface ExpenseListParams {
  categoryId?: string;
  jobId?: string;
  contractId?: string;
  facilityId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
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
  ...expenseListSelect,
  categoryId: true,
  jobId: true,
  contractId: true,
  facilityId: true,
  notes: true,
  approvedAt: true,
  updatedAt: true,
  createdByUserId: true,
};

export async function listExpenses(
  params: ExpenseListParams,
  options?: { userRole?: string; userId?: string }
) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.jobId) where.jobId = params.jobId;
  if (params.contractId) where.contractId = params.contractId;
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.status) where.status = params.status;
  if (params.dateFrom || params.dateTo) {
    where.date = {
      ...(params.dateFrom ? { gte: params.dateFrom } : {}),
      ...(params.dateTo ? { lte: params.dateTo } : {}),
    };
  }

  // RBAC: subcontractors and cleaners see only their own expenses
  if (options?.userRole === 'cleaner' || options?.userRole === 'subcontractor') {
    where.createdByUserId = options.userId;
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
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

export async function createExpense(input: ExpenseCreateInput) {
  const expense = await prisma.expense.create({
    data: {
      date: input.date,
      amount: input.amount,
      description: input.description,
      vendor: input.vendor,
      categoryId: input.categoryId,
      jobId: input.jobId,
      contractId: input.contractId,
      facilityId: input.facilityId,
      receiptUrl: input.receiptUrl,
      notes: input.notes,
      createdByUserId: input.createdByUserId,
      status: 'pending',
    },
    select: expenseDetailSelect,
  });
  return expense;
}

export async function updateExpense(id: string, input: ExpenseUpdateInput) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status === 'approved') throw new BadRequestError('Cannot edit an approved expense');

  const data: Record<string, unknown> = {};
  if (input.date !== undefined) data.date = input.date;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.description !== undefined) data.description = input.description;
  if (input.vendor !== undefined) data.vendor = input.vendor;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.jobId !== undefined) data.jobId = input.jobId;
  if (input.contractId !== undefined) data.contractId = input.contractId;
  if (input.facilityId !== undefined) data.facilityId = input.facilityId;
  if (input.receiptUrl !== undefined) data.receiptUrl = input.receiptUrl;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.expense.update({
    where: { id },
    data,
    select: expenseDetailSelect,
  });
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
  if (existing.status !== 'pending') throw new BadRequestError('Only pending expenses can be approved');

  return prisma.expense.update({
    where: { id },
    data: { status: 'approved', approvedByUserId, approvedAt: new Date() },
    select: expenseDetailSelect,
  });
}

export async function rejectExpense(id: string, notes?: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status !== 'pending') throw new BadRequestError('Only pending expenses can be rejected');

  return prisma.expense.update({
    where: { id },
    data: { status: 'rejected', notes: notes || existing.notes },
    select: expenseDetailSelect,
  });
}

// Expense Categories

export async function listExpenseCategories(includeInactive = false) {
  return prisma.expenseCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createExpenseCategory(input: { name: string; description?: string | null; sortOrder?: number }) {
  return prisma.expenseCategory.create({
    data: {
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateExpenseCategory(id: string, input: { name?: string; description?: string | null; isActive?: boolean; sortOrder?: number }) {
  const existing = await prisma.expenseCategory.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Expense category not found');
  if (existing.isDefault && input.isActive === false) throw new BadRequestError('Cannot deactivate a default category');

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  return prisma.expenseCategory.update({ where: { id }, data });
}
```

**Step 3: Create expense routes**

Create `apps/api/src/routes/expenses.ts`:

```typescript
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

// Categories
router.get(
  '/categories',
  requirePermission(PERMISSIONS.EXPENSES_READ),
  validate(listExpenseCategoriesSchema),
  async (req: Request, res: Response) => {
    const categories = await listExpenseCategories(req.query.includeInactive === 'true');
    res.json({ data: categories });
  }
);

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

// Expenses
router.get(
  '/',
  requirePermission(PERMISSIONS.EXPENSES_READ),
  validate(listExpensesSchema),
  async (req: Request, res: Response) => {
    const { categoryId, jobId, contractId, facilityId, status, dateFrom, dateTo, page, limit } = req.query;
    const result = await listExpenses(
      {
        categoryId: categoryId as string,
        jobId: jobId as string,
        contractId: contractId as string,
        facilityId: facilityId as string,
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      { userRole: req.user?.role, userId: req.user?.id }
    );
    res.json(result);
  }
);

router.get('/:id', requirePermission(PERMISSIONS.EXPENSES_READ), async (req: Request, res: Response) => {
  const expense = await getExpenseById(req.params.id);
  res.json({ data: expense });
});

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
```

**Step 4: Register route in index.ts**

In `apps/api/src/index.ts`, add:

```typescript
import expensesRoutes from './routes/expenses';
// ... then in route registration:
app.use('/api/v1/expenses', expensesRoutes);
```

**Step 5: Verify compilation**

Run: `cd apps/api && npx tsc --noEmit --pretty 2>&1 | grep "error TS" | head -20`

**Step 6: Commit**

```bash
git add apps/api/src/schemas/expense.ts apps/api/src/services/expenseService.ts apps/api/src/routes/expenses.ts apps/api/src/index.ts
git commit -m "feat: add expense tracking service and routes"
```

---

### Task 4: Payroll Service + Routes

**Files:**
- Create: `apps/api/src/services/payrollService.ts`
- Create: `apps/api/src/schemas/payroll.ts`
- Create: `apps/api/src/routes/payroll.ts`
- Modify: `apps/api/src/index.ts` (register route)

**Step 1: Create Zod schemas**

Create `apps/api/src/schemas/payroll.ts`:

```typescript
import { z } from 'zod';

export const listPayrollRunsSchema = z.object({
  query: z.object({
    status: z.enum(['draft', 'approved', 'paid']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const generatePayrollSchema = z.object({
  body: z.object({
    periodStart: z.string(),
    periodEnd: z.string(),
  }).refine(
    (data) => !Number.isNaN(new Date(data.periodStart).getTime()) && !Number.isNaN(new Date(data.periodEnd).getTime()),
    { message: 'periodStart and periodEnd must be valid dates' }
  ),
});

export const adjustPayrollEntrySchema = z.object({
  body: z.object({
    grossPay: z.number().min(0).optional(),
    scheduledHours: z.number().min(0).optional(),
    status: z.enum(['valid', 'flagged', 'adjusted']).optional(),
    adjustmentNotes: z.string().max(2000).optional().nullable(),
  }),
});
```

**Step 2: Create payroll service**

Create `apps/api/src/services/payrollService.ts`:

This is the most complex service. Key logic:

1. `generatePayrollRun(periodStart, periodEnd)`:
   - Find all users with role cleaner or subcontractor (or who have payType set)
   - For each user, determine pay type (user.payType or role default)
   - **Hourly users**: Query approved timesheets for the period. Sum scheduled hours. Calculate `grossPay = scheduledHours * hourlyRate`. Check if they have valid clock-ins for all scheduled jobs — flag if missing.
   - **Percentage users**: Find contracts they're assigned to. For each contract, calculate `grossPay = contractMonthlyValue * tierPercentage`. Check if they clocked in/out of all scheduled jobs — flag if missing.
   - Create PayrollRun + PayrollEntry records in a transaction

2. `approvePayrollRun(id, userId)`: Update status to approved
3. `markPayrollRunPaid(id)`: Update status to paid, set paidAt
4. `adjustPayrollEntry(entryId, input, userId)`: Admin edits an entry

```typescript
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

export interface PayrollListParams {
  status?: string;
  page?: number;
  limit?: number;
}

const payrollRunListSelect = {
  id: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  totalGrossPay: true,
  totalEntries: true,
  approvedAt: true,
  paidAt: true,
  notes: true,
  createdAt: true,
  approvedByUser: { select: { id: true, fullName: true } },
};

const payrollRunDetailSelect = {
  ...payrollRunListSelect,
  updatedAt: true,
  entries: {
    select: {
      id: true,
      userId: true,
      payType: true,
      scheduledHours: true,
      hourlyRate: true,
      contractId: true,
      contractMonthlyValue: true,
      tierPercentage: true,
      grossPay: true,
      status: true,
      flagReason: true,
      adjustmentNotes: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, role: true } },
      contract: { select: { id: true, contractNumber: true, title: true } },
      adjustedByUser: { select: { id: true, fullName: true } },
    },
    orderBy: { user: { fullName: 'asc' as const } },
  },
};

const TIER_PERCENTAGES: Record<string, number> = {
  tier1: 0.45,
  tier2: 0.50,
  tier3: 0.55,
};

export async function listPayrollRuns(params: PayrollListParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;

  const [data, total] = await Promise.all([
    prisma.payrollRun.findMany({
      where,
      select: payrollRunListSelect,
      orderBy: { periodStart: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payrollRun.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getPayrollRunById(
  id: string,
  options?: { userRole?: string; userId?: string }
) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    select: payrollRunDetailSelect,
  });
  if (!run) throw new NotFoundError('Payroll run not found');

  // Cleaners/subcontractors only see their own entries
  if (options?.userRole === 'cleaner' || options?.userRole === 'subcontractor') {
    return {
      ...run,
      entries: run.entries.filter((e) => e.userId === options.userId),
    };
  }

  return run;
}

export async function generatePayrollRun(periodStart: Date, periodEnd: Date) {
  // Check for existing run in this period
  const existing = await prisma.payrollRun.findFirst({
    where: { periodStart, periodEnd },
  });
  if (existing) throw new BadRequestError('A payroll run already exists for this period');

  // Get all cleaners and subcontractors
  const workers = await prisma.user.findMany({
    where: {
      role: { in: ['cleaner', 'subcontractor'] },
      isActive: true,
    },
    select: {
      id: true,
      role: true,
      payType: true,
      hourlyPayRate: true,
    },
  });

  // Get default hourly rate from pricing settings
  const pricingSettings = await prisma.pricingSettings.findFirst({
    select: { laborCostPerHour: true },
  });
  const defaultHourlyRate = pricingSettings?.laborCostPerHour
    ? parseFloat(pricingSettings.laborCostPerHour.toString())
    : 18.0;

  const entries: Array<{
    userId: string;
    payType: string;
    scheduledHours: number | null;
    hourlyRate: number | null;
    contractId: string | null;
    contractMonthlyValue: number | null;
    tierPercentage: number | null;
    grossPay: number;
    status: string;
    flagReason: string | null;
  }> = [];

  for (const worker of workers) {
    const payType = worker.payType || (worker.role === 'subcontractor' ? 'percentage' : 'hourly');

    if (payType === 'hourly') {
      await generateHourlyEntries(worker, periodStart, periodEnd, defaultHourlyRate, entries);
    } else {
      await generatePercentageEntries(worker, periodStart, periodEnd, entries);
    }
  }

  // Create in transaction
  const totalGrossPay = entries.reduce((sum, e) => sum + e.grossPay, 0);

  const run = await prisma.$transaction(async (tx) => {
    const payrollRun = await tx.payrollRun.create({
      data: {
        periodStart,
        periodEnd,
        status: 'draft',
        totalGrossPay: new Prisma.Decimal(Math.round(totalGrossPay * 100) / 100),
        totalEntries: entries.length,
      },
    });

    if (entries.length > 0) {
      await tx.payrollEntry.createMany({
        data: entries.map((e) => ({
          payrollRunId: payrollRun.id,
          userId: e.userId,
          payType: e.payType,
          scheduledHours: e.scheduledHours != null ? new Prisma.Decimal(e.scheduledHours) : null,
          hourlyRate: e.hourlyRate != null ? new Prisma.Decimal(e.hourlyRate) : null,
          contractId: e.contractId,
          contractMonthlyValue: e.contractMonthlyValue != null ? new Prisma.Decimal(e.contractMonthlyValue) : null,
          tierPercentage: e.tierPercentage != null ? new Prisma.Decimal(e.tierPercentage) : null,
          grossPay: new Prisma.Decimal(Math.round(e.grossPay * 100) / 100),
          status: e.status,
          flagReason: e.flagReason,
        })),
      });
    }

    return payrollRun;
  });

  return getPayrollRunById(run.id);
}

async function generateHourlyEntries(
  worker: { id: string; hourlyPayRate: unknown },
  periodStart: Date,
  periodEnd: Date,
  defaultHourlyRate: number,
  entries: Array<any>
) {
  const rate = worker.hourlyPayRate
    ? parseFloat(worker.hourlyPayRate.toString())
    : defaultHourlyRate;

  // Get approved time entries for the period
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      userId: worker.id,
      clockIn: { gte: periodStart },
      clockOut: { lte: periodEnd },
      status: { in: ['completed', 'approved', 'edited'] },
    },
    select: {
      id: true,
      totalHours: true,
      jobId: true,
      job: { select: { scheduledStartTime: true, scheduledEndTime: true } },
    },
  });

  // Get scheduled jobs for the period to validate attendance
  const scheduledJobs = await prisma.job.findMany({
    where: {
      assignedToUserId: worker.id,
      scheduledDate: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true, scheduledStartTime: true, scheduledEndTime: true },
  });

  const jobsWithTimeEntry = new Set(timeEntries.filter((e) => e.jobId).map((e) => e.jobId));
  const missedJobs = scheduledJobs.filter((j) => !jobsWithTimeEntry.has(j.id));

  const totalScheduledHours = timeEntries.reduce(
    (sum, e) => sum + (e.totalHours ? parseFloat(e.totalHours.toString()) : 0),
    0
  );

  const grossPay = totalScheduledHours * rate;
  const isFlagged = missedJobs.length > 0;

  if (totalScheduledHours > 0 || isFlagged) {
    entries.push({
      userId: worker.id,
      payType: 'hourly',
      scheduledHours: Math.round(totalScheduledHours * 100) / 100,
      hourlyRate: rate,
      contractId: null,
      contractMonthlyValue: null,
      tierPercentage: null,
      grossPay,
      status: isFlagged ? 'flagged' : 'valid',
      flagReason: isFlagged ? `Missed ${missedJobs.length} scheduled job(s)` : null,
    });
  }
}

async function generatePercentageEntries(
  worker: { id: string },
  periodStart: Date,
  periodEnd: Date,
  entries: Array<any>
) {
  // Find contracts assigned to this user (via team or direct assignment)
  const contracts = await prisma.contract.findMany({
    where: {
      status: 'active',
      OR: [
        { assignedToUserId: worker.id },
      ],
    },
    select: {
      id: true,
      monthlyValue: true,
      subcontractorTier: true,
    },
  });

  for (const contract of contracts) {
    const tier = contract.subcontractorTier || 'tier1';
    const percentage = TIER_PERCENTAGES[tier] || 0.45;
    const monthlyValue = contract.monthlyValue
      ? parseFloat(contract.monthlyValue.toString())
      : 0;
    const grossPay = monthlyValue * percentage;

    // Check if they clocked in/out for all scheduled jobs on this contract
    const scheduledJobs = await prisma.job.findMany({
      where: {
        contractId: contract.id,
        assignedToUserId: worker.id,
        scheduledDate: { gte: periodStart, lte: periodEnd },
      },
      select: { id: true },
    });

    const clockedJobs = await prisma.timeEntry.findMany({
      where: {
        userId: worker.id,
        job: { contractId: contract.id },
        clockIn: { gte: periodStart },
        clockOut: { not: null },
      },
      select: { jobId: true },
    });

    const clockedJobIds = new Set(clockedJobs.map((e) => e.jobId));
    const missedJobs = scheduledJobs.filter((j) => !clockedJobIds.has(j.id));
    const isFlagged = missedJobs.length > 0;

    entries.push({
      userId: worker.id,
      payType: 'percentage',
      scheduledHours: null,
      hourlyRate: null,
      contractId: contract.id,
      contractMonthlyValue: monthlyValue,
      tierPercentage: percentage * 100,
      grossPay,
      status: isFlagged ? 'flagged' : 'valid',
      flagReason: isFlagged ? `Missed check-in/out for ${missedJobs.length} scheduled job(s)` : null,
    });
  }
}

export async function approvePayrollRun(id: string, approvedByUserId: string) {
  const existing = await prisma.payrollRun.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Payroll run not found');
  if (existing.status !== 'draft') throw new BadRequestError('Only draft payroll runs can be approved');

  return prisma.payrollRun.update({
    where: { id },
    data: { status: 'approved', approvedByUserId, approvedAt: new Date() },
    select: payrollRunDetailSelect,
  });
}

export async function markPayrollRunPaid(id: string) {
  const existing = await prisma.payrollRun.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Payroll run not found');
  if (existing.status !== 'approved') throw new BadRequestError('Only approved payroll runs can be marked as paid');

  return prisma.payrollRun.update({
    where: { id },
    data: { status: 'paid', paidAt: new Date() },
    select: payrollRunDetailSelect,
  });
}

export async function adjustPayrollEntry(
  entryId: string,
  input: { grossPay?: number; scheduledHours?: number; status?: string; adjustmentNotes?: string | null },
  adjustedByUserId: string
) {
  const existing = await prisma.payrollEntry.findUnique({
    where: { id: entryId },
    include: { payrollRun: { select: { status: true } } },
  });
  if (!existing) throw new NotFoundError('Payroll entry not found');
  if (existing.payrollRun.status !== 'draft') throw new BadRequestError('Can only adjust entries in draft payroll runs');

  const data: Record<string, unknown> = {
    adjustedByUserId,
    status: input.status || 'adjusted',
  };
  if (input.grossPay !== undefined) data.grossPay = new Prisma.Decimal(Math.round(input.grossPay * 100) / 100);
  if (input.scheduledHours !== undefined) data.scheduledHours = new Prisma.Decimal(input.scheduledHours);
  if (input.adjustmentNotes !== undefined) data.adjustmentNotes = input.adjustmentNotes;

  const entry = await prisma.payrollEntry.update({
    where: { id: entryId },
    data,
  });

  // Recalculate run totals
  const allEntries = await prisma.payrollEntry.findMany({
    where: { payrollRunId: existing.payrollRunId },
    select: { grossPay: true },
  });
  const totalGrossPay = allEntries.reduce(
    (sum, e) => sum + parseFloat(e.grossPay.toString()),
    0
  );
  await prisma.payrollRun.update({
    where: { id: existing.payrollRunId },
    data: { totalGrossPay: new Prisma.Decimal(Math.round(totalGrossPay * 100) / 100) },
  });

  return entry;
}

export async function deletePayrollRun(id: string) {
  const existing = await prisma.payrollRun.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Payroll run not found');
  if (existing.status !== 'draft') throw new BadRequestError('Only draft payroll runs can be deleted');

  await prisma.payrollRun.delete({ where: { id } });
}
```

**Step 3: Create payroll routes**

Create `apps/api/src/routes/payroll.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import { validate } from '../middleware/validate';
import {
  listPayrollRunsSchema,
  generatePayrollSchema,
  adjustPayrollEntrySchema,
} from '../schemas/payroll';
import {
  listPayrollRuns,
  getPayrollRunById,
  generatePayrollRun,
  approvePayrollRun,
  markPayrollRunPaid,
  adjustPayrollEntry,
  deletePayrollRun,
} from '../services/payrollService';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.PAYROLL_READ),
  validate(listPayrollRunsSchema),
  async (req: Request, res: Response) => {
    const { status, page, limit } = req.query;
    const result = await listPayrollRuns({
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }
);

router.get('/:id', requirePermission(PERMISSIONS.PAYROLL_READ), async (req: Request, res: Response) => {
  const run = await getPayrollRunById(req.params.id, {
    userRole: req.user?.role,
    userId: req.user?.id,
  });
  res.json({ data: run });
});

router.post(
  '/generate',
  requirePermission(PERMISSIONS.PAYROLL_WRITE),
  validate(generatePayrollSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = await generatePayrollRun(
        new Date(req.body.periodStart),
        new Date(req.body.periodEnd)
      );
      res.status(201).json({ data: run });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/approve',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = await approvePayrollRun(req.params.id, req.user!.id);
      res.json({ data: run });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/mark-paid',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = await markPayrollRunPaid(req.params.id);
      res.json({ data: run });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/entries/:entryId',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  validate(adjustPayrollEntrySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await adjustPayrollEntry(req.params.entryId, req.body, req.user!.id);
      res.json({ data: entry });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deletePayrollRun(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

**Step 4: Register route in index.ts**

In `apps/api/src/index.ts`, add:

```typescript
import payrollRoutes from './routes/payroll';
// ... then in route registration:
app.use('/api/v1/payroll', payrollRoutes);
```

**Step 5: Verify compilation**

Run: `cd apps/api && npx tsc --noEmit --pretty 2>&1 | grep "error TS" | head -20`

**Step 6: Commit**

```bash
git add apps/api/src/schemas/payroll.ts apps/api/src/services/payrollService.ts apps/api/src/routes/payroll.ts apps/api/src/index.ts
git commit -m "feat: add payroll generation service and routes"
```

---

### Task 5: Financial Reports Service + Routes

**Files:**
- Create: `apps/api/src/services/financeReportService.ts`
- Create: `apps/api/src/routes/finance.ts`
- Modify: `apps/api/src/index.ts` (register route)

**Step 1: Create finance report service**

Create `apps/api/src/services/financeReportService.ts`:

Key reports (all accept `dateFrom` and `dateTo` parameters):

1. **`getFinanceOverview`**: KPI cards — total revenue (sum of paid invoices), total expenses (sum of approved expenses), outstanding AR (sum of unpaid invoice balances), upcoming payroll (latest draft run total), net income estimate (revenue - expenses).

2. **`getArAgingReport`**: Group unpaid invoices into buckets (current, 1-30 days, 31-60, 61-90, 90+) based on days past due date. Include account name, invoice number, total, balance due, days overdue.

3. **`getProfitabilityReport`**: For each contract (or facility), sum invoice revenue for the period, sum expenses linked to that contract/facility, sum payroll entries for that contract. Calculate profit = revenue - expenses - labor. Calculate margin %.

4. **`getRevenueReport`**: Sum paid invoice amounts grouped by account and/or month. Return totals, breakdowns, and period comparisons.

5. **`getExpenseSummaryReport`**: Sum approved expenses grouped by category and/or month.

6. **`getLaborCostReport`**: Sum payroll entry gross pay grouped by user and/or team.

7. **`getPayrollSummaryReport`**: Payroll run totals grouped by period with entry counts and status breakdown.

Each report returns a `{ data, summary }` shape. Summary has totals. Data has the rows.

The service uses raw Prisma queries with `groupBy` where possible for efficiency.

**Step 2: Create finance routes**

Create `apps/api/src/routes/finance.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types';
import {
  getFinanceOverview,
  getArAgingReport,
  getProfitabilityReport,
  getRevenueReport,
  getExpenseSummaryReport,
  getLaborCostReport,
  getPayrollSummaryReport,
} from '../services/financeReportService';

const router = Router();

router.use(authenticate);

router.get('/overview', requirePermission(PERMISSIONS.FINANCE_REPORTS_READ), async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const data = await getFinanceOverview(
    dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo ? new Date(dateTo as string) : undefined
  );
  res.json({ data });
});

router.get('/reports/ar-aging', requirePermission(PERMISSIONS.FINANCE_REPORTS_READ), async (req: Request, res: Response) => {
  const data = await getArAgingReport();
  res.json({ data });
});

router.get('/reports/profitability', requirePermission(PERMISSIONS.FINANCE_REPORTS_READ), async (req: Request, res: Response) => {
  const { dateFrom, dateTo, groupBy } = req.query;
  const data = await getProfitabilityReport(
    dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo ? new Date(dateTo as string) : undefined,
    (groupBy as string) || 'contract'
  );
  res.json({ data });
});

router.get('/reports/revenue', requirePermission(PERMISSIONS.FINANCE_REPORTS_READ), async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const data = await getRevenueReport(
    dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo ? new Date(dateTo as string) : undefined
  );
  res.json({ data });
});

router.get('/reports/expenses', requirePermission(PERMISSIONS.FINANCE_REPORTS_READ), async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const data = await getExpenseSummaryReport(
    dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo ? new Date(dateTo as string) : undefined
  );
  res.json({ data });
});

router.get('/reports/labor-costs', requirePermission(PERMISSIONS.FINANCE_REPORTS_READ), async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const data = await getLaborCostReport(
    dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo ? new Date(dateTo as string) : undefined
  );
  res.json({ data });
});

router.get('/reports/payroll-summary', requirePermission(PERMISSIONS.FINANCE_REPORTS_READ), async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const data = await getPayrollSummaryReport(
    dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo ? new Date(dateTo as string) : undefined
  );
  res.json({ data });
});

export default router;
```

**Step 3: Register route**

```typescript
import financeRoutes from './routes/finance';
app.use('/api/v1/finance', financeRoutes);
```

**Step 4: Verify and commit**

```bash
git add apps/api/src/services/financeReportService.ts apps/api/src/routes/finance.ts apps/api/src/index.ts
git commit -m "feat: add financial reports service and routes"
```

---

### Task 6: Frontend Types + API Client

**Files:**
- Create: `apps/web/src/types/expense.ts`
- Create: `apps/web/src/types/payroll.ts`
- Create: `apps/web/src/types/finance.ts`
- Create: `apps/web/src/lib/expenses.ts`
- Create: `apps/web/src/lib/payroll.ts`
- Create: `apps/web/src/lib/finance.ts`

**Step 1: Create frontend types**

Follow the invoice type pattern. Define types for:
- `Expense`, `ExpenseDetail`, `ExpenseCategory`, `CreateExpenseInput`, `UpdateExpenseInput`
- `PayrollRun`, `PayrollRunDetail`, `PayrollEntry`, `AdjustPayrollEntryInput`
- `FinanceOverview`, `ArAgingBucket`, `ProfitabilityRow`, `RevenueRow`, `ExpenseSummaryRow`

**Step 2: Create API client functions**

Follow the invoice lib pattern. Create async functions for all endpoints:
- `listExpenses`, `getExpense`, `createExpense`, `updateExpense`, `deleteExpense`, `approveExpense`, `rejectExpense`, `listExpenseCategories`, etc.
- `listPayrollRuns`, `getPayrollRun`, `generatePayrollRun`, `approvePayrollRun`, `markPayrollRunPaid`, `adjustPayrollEntry`, `deletePayrollRun`
- `getFinanceOverview`, `getArAgingReport`, `getProfitabilityReport`, `getRevenueReport`, `getExpenseSummaryReport`, `getLaborCostReport`, `getPayrollSummaryReport`

**Step 3: Commit**

```bash
git add apps/web/src/types/ apps/web/src/lib/
git commit -m "feat: add financial management frontend types and API client"
```

---

### Task 7: Expenses Frontend Page

**Files:**
- Create: `apps/web/src/pages/finance/ExpensesPage.tsx`
- Modify: `apps/web/src/App.tsx` (add route)

**Step 1: Build ExpensesPage**

Follow the InvoicesList pattern. Include:
- Table with columns: Date, Description, Amount, Category, Vendor, Status, Job/Contract, Created By
- Filter bar: date range, category dropdown, status dropdown
- Create/Edit modal with form fields matching `CreateExpenseInput`
- Category dropdown populated from `listExpenseCategories`
- Optional job/contract/facility dropdowns
- Receipt URL field (or file upload if you have upload infrastructure)
- Approve/Reject buttons for admins (check `PERMISSIONS.EXPENSES_APPROVE`)
- Pagination using `useSearchParams`
- Delete button on pending/rejected expenses

**Step 2: Add route to App.tsx**

```typescript
import ExpensesPage from './pages/finance/ExpensesPage';
// In routes:
<Route path="/finance/expenses" element={withRouteGuard('/finance/expenses', <ExpensesPage />)} />
```

**Step 3: Commit**

```bash
git add apps/web/src/pages/finance/ExpensesPage.tsx apps/web/src/App.tsx
git commit -m "feat: add expenses frontend page"
```

---

### Task 8: Payroll Frontend Page

**Files:**
- Create: `apps/web/src/pages/finance/PayrollPage.tsx`
- Modify: `apps/web/src/App.tsx` (add route)

**Step 1: Build PayrollPage**

Two views:
1. **List view**: Table of payroll runs with columns: Period, Status, Total Gross Pay, Entries, Approved By, Paid At. Generate button opens modal to pick period dates.
2. **Detail view**: Selected run shows entries grouped by employee. Each entry shows: Employee Name, Pay Type, Hours/Contract, Rate/Tier%, Gross Pay, Status (valid/flagged/adjusted). Flagged entries highlighted in amber with flag reason. Admin can click to adjust (opens inline edit or modal). Approve and Mark Paid buttons at top.

RBAC: Cleaners/subcontractors see only their own entries (already filtered by the API).

**Step 2: Add route**

```typescript
<Route path="/finance/payroll" element={withRouteGuard('/finance/payroll', <PayrollPage />)} />
```

**Step 3: Commit**

```bash
git add apps/web/src/pages/finance/PayrollPage.tsx apps/web/src/App.tsx
git commit -m "feat: add payroll frontend page"
```

---

### Task 9: Finance Overview + Reports Pages

**Files:**
- Create: `apps/web/src/pages/finance/FinanceOverviewPage.tsx`
- Create: `apps/web/src/pages/finance/FinanceReportsPage.tsx`
- Modify: `apps/web/src/App.tsx` (add routes)

**Step 1: Build FinanceOverviewPage**

Dashboard-style page:
- KPI cards: Total Revenue, Total Expenses, Net Income, Outstanding AR, Upcoming Payroll
- Revenue vs Expenses trend chart (use existing chart library if available, otherwise simple bars)
- Date range picker to adjust period

**Step 2: Build FinanceReportsPage**

Tab-based report viewer:
- Tabs: AR Aging, Profitability, Revenue, Expenses, Labor Costs, Payroll Summary
- Each tab has date range filter and table of results
- CSV export button per report (generate CSV from data in-browser)
- AR Aging: grouped by bucket with invoice details
- Profitability: rows per contract/facility with revenue, costs, margin columns
- Revenue: by account with period totals
- Expenses: by category with period totals
- Labor Costs: by employee with hours and gross pay
- Payroll Summary: by period with run status and totals

**Step 3: Add routes**

```typescript
<Route path="/finance" element={withRouteGuard('/finance', <FinanceOverviewPage />)} />
<Route path="/finance/reports" element={withRouteGuard('/finance/reports', <FinanceReportsPage />)} />
```

**Step 4: Commit**

```bash
git add apps/web/src/pages/finance/
git commit -m "feat: add finance overview and reports pages"
```

---

### Task 10: Sidebar Navigation + Final Wiring

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Verify: `apps/web/src/App.tsx` (all routes registered)

**Step 1: Add Finance section to sidebar**

In `Sidebar.tsx`, add a new `NavSection` after the Sales section:

```typescript
{
  key: 'finance',
  title: 'Finance',
  icon: DollarSign,  // from lucide-react
  items: [
    { to: '/finance', icon: BarChart3, label: 'Overview' },
    { to: '/finance/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/finance/payroll', icon: Wallet, label: 'Payroll' },
    { to: '/finance/reports', icon: FileBarChart, label: 'Reports' },
  ],
},
```

Import icons: `DollarSign, BarChart3, Wallet, FileBarChart` from `lucide-react`.

**Step 2: Verify all routes are registered in App.tsx**

Confirm these routes exist:
- `/finance` → FinanceOverviewPage
- `/finance/expenses` → ExpensesPage
- `/finance/payroll` → PayrollPage
- `/finance/reports` → FinanceReportsPage

**Step 3: Final type-check**

Run: `cd apps/api && npx tsc --noEmit --pretty 2>&1 | grep "error TS" | head -20`
Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep "error TS" | head -20`

**Step 4: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx apps/web/src/App.tsx
git commit -m "feat: add finance section to sidebar navigation"
```

---

### Task 11: Final Verification + Push

**Step 1: Run API tests**

Run: `cd apps/api && npm test 2>&1 | tail -20`

**Step 2: Run web tests**

Run: `cd apps/web && npm test 2>&1 | tail -20`

**Step 3: Manual smoke test**

- Start API: `cd apps/api && npm run dev`
- Start web: `cd apps/web && npm run dev`
- Navigate to Finance section in sidebar
- Verify Overview page loads
- Create an expense
- Generate a payroll run
- View reports

**Step 4: Push**

```bash
git push origin main
```
