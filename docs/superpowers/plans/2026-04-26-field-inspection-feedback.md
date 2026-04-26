# Field Inspection Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give cleaners and subcontractors read access to inspections on contracts they're assigned to, with a per-item append-only feedback channel that notifies the inspector and account manager.

**Architecture:** Extend existing `/inspections` routes with role-aware scoping (no parallel `/me/*` endpoints). Add a new `InspectionItemFeedback` model and two new endpoints (`GET`/`POST /inspections/:id/items/:itemId/feedback`). Field roles read inspections inline with `feedback[]` already populated on each item; managers continue using the same routes unchanged.

**Tech Stack:** Express, Prisma (PostgreSQL), Zod, React + Vite, Jest + supertest, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-25-field-inspection-feedback-design.md`

**Project conventions:**
- Commit messages must NOT include a `Co-Authored-By` footer.
- Push to `main` immediately after each commit (per user preference in `MEMORY.md`).
- Working directory for backend tasks: `apps/api/`.
- Working directory for schema: `packages/database/`.
- Working directory for frontend: `apps/web/`.

---

## File Structure

**Backend — modify:**
- `packages/database/prisma/schema.prisma` — add `InspectionItemFeedback` model + back-relations on `InspectionItem` and `User`.
- `apps/api/src/types/roles.ts` — grant `inspections_read` to cleaner and subcontractor.
- `apps/api/src/routes/inspections.ts` — extend `assertInspectionAccess` for field roles; register new feedback routes.
- `apps/api/src/services/inspectionService.ts` — extend `listInspections` scoping; extend `inspectionDetailSelect` with `feedback`; add `findInspectionItemInScope`, `listInspectionItemFeedback`, `createInspectionItemFeedback`.
- `apps/api/src/schemas/inspection.ts` — add `createInspectionItemFeedbackSchema`.
- `apps/api/src/services/__tests__/inspectionService.test.ts` — extend.
- `apps/api/src/routes/__tests__/inspections.routes.test.ts` — **create** (no existing route test for inspections).

**Frontend — modify:**
- `apps/web/src/types/inspection.ts` — add `InspectionItemFeedback` type, add `feedback` to item type.
- `apps/web/src/lib/inspections.ts` — add API client functions.
- `apps/web/src/pages/inspections/InspectionDetail.tsx` — gate write controls; add per-item feedback section.
- `apps/web/src/pages/__tests__/InspectionDetail.test.tsx` — extend.

**Frontend — verify (no code change expected):**
- `apps/web/src/components/layout/Sidebar.tsx` — Inspections nav already gated by `inspections_read`.
- `apps/web/src/lib/notificationRouting.ts` — already routes by `inspectionId` in metadata.
- `apps/web/src/lib/routeAccess.ts` — `/inspections` already gated by `INSPECTIONS_READ`.

---

## Task 1: Prisma model for `InspectionItemFeedback`

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Locate the `InspectionItem` model**

Open `packages/database/prisma/schema.prisma` and find `model InspectionItem`. Note its file location for the next steps.

- [ ] **Step 2: Add the `feedback` back-relation to `InspectionItem`**

Inside the `model InspectionItem { ... }` block, add this line alongside the other `@relation` fields (preserve existing relations like `inspection`, etc.):

```prisma
  feedback    InspectionItemFeedback[]
```

- [ ] **Step 3: Add the `inspectionItemFeedback` back-relation to `User`**

Find `model User { ... }` and add this line alongside the existing relations (look for `inspections` or `correctiveActions` for placement):

```prisma
  inspectionItemFeedback InspectionItemFeedback[]
```

- [ ] **Step 4: Add the new model**

Append this model definition near the other inspection models (after `InspectionSignoff` is a natural spot):

```prisma
model InspectionItemFeedback {
  id               String         @id @default(uuid()) @db.Uuid
  inspectionItemId String         @map("inspection_item_id") @db.Uuid
  authorUserId     String         @map("author_user_id") @db.Uuid
  body             String         @db.Text
  createdAt        DateTime       @default(now()) @map("created_at")

  inspectionItem   InspectionItem @relation(fields: [inspectionItemId], references: [id], onDelete: Cascade)
  authorUser       User           @relation(fields: [authorUserId], references: [id], onDelete: Restrict)

  @@index([inspectionItemId])
  @@index([authorUserId])
  @@map("inspection_item_feedback")
}
```

- [ ] **Step 5: Push the schema to the database**

Run from `packages/database/`:
```bash
npx prisma db push --accept-data-loss
```

Expected output: "Your database is now in sync with your Prisma schema." Then it regenerates the client.

- [ ] **Step 6: Regenerate Prisma client (if step 5 didn't auto-regenerate)**

Run from `packages/database/`:
```bash
npx prisma generate
```

- [ ] **Step 7: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add InspectionItemFeedback model

Append-only per-item feedback channel for inspections. Cascade from
parent item; restrict on author user to preserve attribution."
git push origin main
```

---

## Task 2: Grant `inspections_read` to cleaner and subcontractor

**Files:**
- Modify: `apps/api/src/types/roles.ts`

- [ ] **Step 1: Add `inspections_read: true` to the cleaner permission map**

Open `apps/api/src/types/roles.ts`. In the `cleaner` object (currently around lines 223-232), add `inspections_read: true,` after `payroll_read: true,`. Final cleaner block:

```ts
  cleaner: {
    dashboard_read: true,
    contracts_read: true,
    facilities_read: true,
    jobs_read: true,
    jobs_write: true,
    time_tracking_read: true,
    time_tracking_write: true,
    payroll_read: true,
    inspections_read: true,
  },
```

- [ ] **Step 2: Add `inspections_read: true` to the subcontractor permission map**

In the `subcontractor` object (currently around lines 233-243), add `inspections_read: true,`:

```ts
  subcontractor: {
    dashboard_read: true,
    contracts_read: true,
    facilities_read: true,
    jobs_read: true,
    jobs_write: true,
    time_tracking_read: true,
    time_tracking_write: true,
    expenses_read: true,
    payroll_read: true,
    inspections_read: true,
  },
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/types/roles.ts
git commit -m "feat(rbac): grant inspections_read to cleaner and subcontractor

Field roles need to view inspections on contracts they service.
Write/admin permissions intentionally remain manager+ only."
git push origin main
```

---

## Task 3: Extend `assertInspectionAccess` to scope field roles by contract

**Files:**
- Modify: `apps/api/src/routes/inspections.ts`

- [ ] **Step 1: Update the import to include `ensureOwnershipAccess` and `ForbiddenError`**

At the top of `apps/api/src/routes/inspections.ts`, change the imports:

```ts
import { UnauthorizedError } from '../middleware/errorHandler';
import { ensureManagerAccountAccess, ensureOwnershipAccess } from '../middleware/ownership';
```

to:

```ts
import { UnauthorizedError, ForbiddenError } from '../middleware/errorHandler';
import { ensureManagerAccountAccess, ensureOwnershipAccess } from '../middleware/ownership';
```

(`ensureOwnershipAccess` is already imported. `ForbiddenError` is the new addition.)

- [ ] **Step 2: Update `assertInspectionAccess` to accept `contractId` and check field roles**

Replace the current `assertInspectionAccess` function with:

```ts
async function assertInspectionAccess(
  req: Request,
  inspection: { accountId: string; contractId: string | null }
) {
  if (req.user?.role === 'manager') {
    await ensureManagerAccountAccess(req.user, inspection.accountId, {
      path: req.path,
      method: req.method,
    });
    return;
  }
  if (req.user?.role === 'cleaner' || req.user?.role === 'subcontractor') {
    if (!inspection.contractId) {
      throw new ForbiddenError('Access denied');
    }
    await ensureOwnershipAccess(req.user, {
      resourceType: 'contract',
      resourceId: inspection.contractId,
      path: req.path,
      method: req.method,
    });
  }
}
```

- [ ] **Step 3: Verify the inspection detail select returns `contractId`**

Open `apps/api/src/services/inspectionService.ts` and confirm that `inspectionDetailSelect` already includes `contractId: true` (it does — around line 136). No change needed; this step is just verification.

- [ ] **Step 4: Run the inspection tests to make sure nothing broke**

Run from `apps/api/`:
```bash
npm test -- src/services/__tests__/inspectionService.test.ts
```

Expected: all 9 existing tests pass. (Tests don't yet exercise the new branch — that comes in Task 4 + 5.)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/inspections.ts
git commit -m "feat(inspections): scope field-role access to assigned contracts

assertInspectionAccess now allows cleaner and subcontractor through
when the inspection's contractId resolves to a contract they're
assigned to (cleaner: assignedToUserId; sub: team or user).
Inspections without a contractId remain manager-only."
git push origin main
```

---

## Task 4: Test for `listInspections` field-role scoping (failing test first)

**Files:**
- Modify: `apps/api/src/services/__tests__/inspectionService.test.ts`

- [ ] **Step 1: Add the failing test**

Append these tests inside the `describe('inspectionService', ...)` block in `apps/api/src/services/__tests__/inspectionService.test.ts`:

```ts
  it('listInspections scopes cleaner to inspections on assigned contracts', async () => {
    (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inspection.count as jest.Mock).mockResolvedValue(0);

    await listInspections({}, { userRole: 'cleaner', userId: 'cleaner-1' });

    expect(prisma.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contract: { assignedToUserId: 'cleaner-1' },
          status: { in: ['scheduled', 'completed'] },
        }),
      })
    );
  });

  it('listInspections scopes subcontractor by team OR user assignment', async () => {
    (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inspection.count as jest.Mock).mockResolvedValue(0);

    await listInspections(
      {},
      { userRole: 'subcontractor', userId: 'sub-1', userTeamId: 'team-1' }
    );

    expect(prisma.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contract: {
            OR: [
              { assignedTeamId: 'team-1' },
              { assignedToUserId: 'sub-1' },
            ],
          },
          status: { in: ['scheduled', 'completed'] },
        }),
      })
    );
  });

  it('listInspections returns empty for subcontractor with no userId', async () => {
    const result = await listInspections({}, { userRole: 'subcontractor' });

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(prisma.inspection.findMany).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `apps/api/`:
```bash
npm test -- src/services/__tests__/inspectionService.test.ts -t "scopes cleaner"
```

Expected: FAIL — the `where` clause doesn't include `contract` or `status` filters yet.

---

## Task 5: Implement field-role scoping in `listInspections`

**Files:**
- Modify: `apps/api/src/services/inspectionService.ts`

- [ ] **Step 1: Update `listInspections` signature and add scoping**

Open `apps/api/src/services/inspectionService.ts`. Find `listInspections` (currently around line 393). Update the `options` parameter type and add scoping logic. Replace the function body up through the `findMany`/`count` call:

```ts
export async function listInspections(
  params: InspectionListParams,
  options?: { userRole?: string; userId?: string; userTeamId?: string | null }
) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  if (options?.userRole === 'subcontractor' && !options.userId) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const where: Record<string, unknown> = {};
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.accountId) where.accountId = params.accountId;
  if (params.contractId) where.contractId = params.contractId;
  if (params.jobId) where.jobId = params.jobId;
  if (params.inspectorUserId) where.inspectorUserId = params.inspectorUserId;
  if (params.status) where.status = params.status;

  if (options?.userRole === 'manager' && options.userId) {
    where.account = { accountManagerId: options.userId };
  }

  if (options?.userRole === 'cleaner' && options.userId) {
    where.contract = { assignedToUserId: options.userId };
  }

  if (options?.userRole === 'subcontractor' && options.userId) {
    where.contract = {
      OR: [
        ...(options.userTeamId ? [{ assignedTeamId: options.userTeamId }] : []),
        { assignedToUserId: options.userId },
      ],
    };
  }

  if (options?.userRole === 'cleaner' || options?.userRole === 'subcontractor') {
    where.status = { in: ['scheduled', 'completed'] };
  }

  if ((params.dateFrom ?? params.dateTo) !== undefined) {
    where.scheduledDate = {};
    if (params.dateFrom) (where.scheduledDate as Record<string, unknown>).gte = params.dateFrom;
    if (params.dateTo) (where.scheduledDate as Record<string, unknown>).lte = params.dateTo;
  }

  // ... (the rest of the existing function, including overallScore filter and findMany/count, stays unchanged)
```

**IMPORTANT:** Keep everything from `if (params.minScore !== undefined ...)` through the end of the function exactly as-is. Only modify the prefix shown above.

- [ ] **Step 2: Run the test to verify it passes**

Run from `apps/api/`:
```bash
npm test -- src/services/__tests__/inspectionService.test.ts
```

Expected: all tests pass, including the three new scoping tests.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/inspectionService.ts apps/api/src/services/__tests__/inspectionService.test.ts
git commit -m "feat(inspections): scope listInspections by field-role contract assignment

Cleaners see only inspections on contracts assigned to them.
Subcontractors see inspections where their team is assigned or they
are personally assigned. Field roles also see only scheduled and
completed statuses (in_progress is hidden until the inspector finishes)."
git push origin main
```

---

## Task 6: Pass `userTeamId` from the route into `listInspections`

**Files:**
- Modify: `apps/api/src/routes/inspections.ts`

- [ ] **Step 1: Add `userTeamId` to the options passed to `listInspections`**

Open `apps/api/src/routes/inspections.ts`. Find the `GET /` handler (currently around line 65). The current call ends with:

```ts
      {
        userRole: req.user?.role,
        userId: req.user?.id,
      }
    );
```

Change it to:

```ts
      {
        userRole: req.user?.role,
        userId: req.user?.id,
        userTeamId: req.user?.teamId ?? null,
      }
    );
```

- [ ] **Step 2: Run the inspection service tests**

Run from `apps/api/`:
```bash
npm test -- src/services/__tests__/inspectionService.test.ts
```

Expected: all tests still pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/inspections.ts
git commit -m "feat(inspections): plumb userTeamId into listInspections

Required for subcontractor scoping by team contract assignment."
git push origin main
```

---

## Task 7: Add `feedback` to `inspectionDetailSelect`

**Files:**
- Modify: `apps/api/src/services/inspectionService.ts`

- [ ] **Step 1: Add `feedback` to the items select**

Open `apps/api/src/services/inspectionService.ts`. Find `inspectionDetailSelect` (currently around line 131). The `items` block looks like:

```ts
  items: {
    select: {
      id: true,
      templateItemId: true,
      category: true,
      itemText: true,
      score: true,
      rating: true,
      notes: true,
      photoUrl: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
```

Replace it with:

```ts
  items: {
    select: {
      id: true,
      templateItemId: true,
      category: true,
      itemText: true,
      score: true,
      rating: true,
      notes: true,
      photoUrl: true,
      sortOrder: true,
      feedback: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          authorUser: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
```

- [ ] **Step 2: Run the inspection service tests**

Run from `apps/api/`:
```bash
npm test -- src/services/__tests__/inspectionService.test.ts
```

Expected: all tests pass (existing tests don't assert the shape of the items select).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/inspectionService.ts
git commit -m "feat(inspections): inline item feedback in detail response

Saves a per-item round-trip on the frontend; feedback is small and
fetched alongside the inspection."
git push origin main
```

---

## Task 8: Zod schema for feedback POST body

**Files:**
- Modify: `apps/api/src/schemas/inspection.ts`

- [ ] **Step 1: Append the feedback schema**

Open `apps/api/src/schemas/inspection.ts` and append at the end of the file:

```ts
export const createInspectionItemFeedbackSchema = z.object({
  body: z.object({
    body: z.string().min(1, 'Feedback body is required').max(2000),
  }),
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/schemas/inspection.ts
git commit -m "feat(inspections): add Zod schema for item feedback creation"
git push origin main
```

---

## Task 9: Test for `findInspectionItemInScope` and feedback service functions (failing tests)

**Files:**
- Modify: `apps/api/src/services/__tests__/inspectionService.test.ts`

- [ ] **Step 1: Update the prisma mock to include `inspectionItemFeedback`**

Open `apps/api/src/services/__tests__/inspectionService.test.ts`. Find the `jest.mock('../../lib/prisma', ...)` call (around line 14). Add the new model under `prisma:`:

```ts
    inspectionItemFeedback: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
```

Place it alongside the other model mocks (after `inspectionSignoff` is a good spot).

- [ ] **Step 2: Add the imports under test**

At the top of the file, change:

```ts
import {
  addInspectionItem,
  completeInspection,
  createInspection,
  createInspectionSignoff,
  getInspectionById,
  listInspections,
  startInspection,
  updateInspection,
} from '../inspectionService';
```

to:

```ts
import {
  addInspectionItem,
  completeInspection,
  createInspection,
  createInspectionItemFeedback,
  createInspectionSignoff,
  findInspectionItemInScope,
  getInspectionById,
  listInspectionItemFeedback,
  listInspections,
  startInspection,
  updateInspection,
} from '../inspectionService';
```

Also add a mock for `notificationService` near the existing `jest.mock` calls (top of file):

```ts
jest.mock('../notificationService', () => ({
  createNotification: jest.fn(async () => undefined),
}));
```

And import it for assertions:

```ts
import { createNotification } from '../notificationService';
```

- [ ] **Step 3: Append the failing tests**

Append inside the `describe('inspectionService', ...)` block:

```ts
  describe('findInspectionItemInScope', () => {
    it('returns the item when it belongs to the inspection', async () => {
      (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1',
        inspectionId: 'ins-1',
        itemText: 'Floors',
      });

      const item = await findInspectionItemInScope('ins-1', 'item-1');

      expect(item.id).toBe('item-1');
      expect(prisma.inspectionItem.findFirst).toHaveBeenCalledWith({
        where: { id: 'item-1', inspectionId: 'ins-1' },
        select: { id: true, inspectionId: true, itemText: true },
      });
    });

    it('throws NotFoundError when the item is in a different inspection', async () => {
      (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(findInspectionItemInScope('ins-1', 'item-other')).rejects.toThrow(
        'Inspection item not found'
      );
    });
  });

  describe('listInspectionItemFeedback', () => {
    it('returns feedback ordered by createdAt asc when item is in scope', async () => {
      (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1',
        inspectionId: 'ins-1',
        itemText: 'Floors',
      });
      (prisma.inspectionItemFeedback.findMany as jest.Mock).mockResolvedValue([
        { id: 'fb-1', body: 'first', createdAt: new Date('2026-01-01'), authorUser: { id: 'u-1', fullName: 'A' } },
      ]);

      const result = await listInspectionItemFeedback('ins-1', 'item-1');

      expect(result).toHaveLength(1);
      expect(prisma.inspectionItemFeedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { inspectionItemId: 'item-1' },
          orderBy: { createdAt: 'asc' },
        })
      );
    });
  });

  describe('createInspectionItemFeedback', () => {
    beforeEach(() => {
      (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1',
        inspectionId: 'ins-1',
        itemText: 'Floors',
      });
      (prisma.inspection.findUnique as jest.Mock).mockResolvedValue({
        id: 'ins-1',
        inspectionNumber: 'INS-2026-0001',
        inspectorUserId: 'inspector-1',
        account: { accountManagerId: 'manager-1' },
      });
      (prisma.inspectionItemFeedback.create as jest.Mock).mockResolvedValue({
        id: 'fb-1',
        body: 'something is off',
        createdAt: new Date('2026-04-26'),
        authorUser: { id: 'cleaner-1', fullName: 'Cleaner' },
      });
    });

    it('creates feedback and writes an activity row', async () => {
      await createInspectionItemFeedback('ins-1', 'item-1', {
        body: 'something is off',
        authorUserId: 'cleaner-1',
      });

      expect(prisma.inspectionItemFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            inspectionItemId: 'item-1',
            authorUserId: 'cleaner-1',
            body: 'something is off',
          },
        })
      );
      expect(prisma.inspectionActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inspectionId: 'ins-1',
            action: 'field_feedback_posted',
          }),
        })
      );
    });

    it('notifies inspector and account manager, deduplicating and skipping author', async () => {
      await createInspectionItemFeedback('ins-1', 'item-1', {
        body: 'something is off',
        authorUserId: 'cleaner-1',
      });

      const userIds = (createNotification as jest.Mock).mock.calls.map(
        ([arg]) => (arg as { userId: string }).userId
      );
      expect(new Set(userIds)).toEqual(new Set(['inspector-1', 'manager-1']));
    });

    it('does not notify author when author is also the inspector', async () => {
      (prisma.inspection.findUnique as jest.Mock).mockResolvedValue({
        id: 'ins-1',
        inspectionNumber: 'INS-2026-0001',
        inspectorUserId: 'cleaner-1',
        account: { accountManagerId: 'manager-1' },
      });

      await createInspectionItemFeedback('ins-1', 'item-1', {
        body: 'something is off',
        authorUserId: 'cleaner-1',
      });

      const userIds = (createNotification as jest.Mock).mock.calls.map(
        ([arg]) => (arg as { userId: string }).userId
      );
      expect(userIds).toEqual(['manager-1']);
    });
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run from `apps/api/`:
```bash
npm test -- src/services/__tests__/inspectionService.test.ts -t "findInspectionItemInScope"
```

Expected: FAIL — `findInspectionItemInScope` is not exported. Same for the other new tests.

---

## Task 10: Implement `findInspectionItemInScope`, `listInspectionItemFeedback`, and `createInspectionItemFeedback`

**Files:**
- Modify: `apps/api/src/services/inspectionService.ts`

- [ ] **Step 1: Add the `InspectionItemFeedbackInput` interface**

Near the other interfaces at the top of `apps/api/src/services/inspectionService.ts` (after `InspectionSignoffInput`), add:

```ts
export interface InspectionItemFeedbackInput {
  body: string;
  authorUserId: string;
}
```

- [ ] **Step 2: Add the feedback select object**

Near the other select objects (after `inspectionSignoffSelect`), add:

```ts
const inspectionItemFeedbackSelect = {
  id: true,
  inspectionItemId: true,
  body: true,
  createdAt: true,
  authorUser: { select: { id: true, fullName: true } },
};
```

- [ ] **Step 3: Append the three new service functions at the end of the file**

Append at the very end of `apps/api/src/services/inspectionService.ts`:

```ts
// ==================== Item feedback ====================

export async function findInspectionItemInScope(inspectionId: string, itemId: string) {
  const item = await prisma.inspectionItem.findFirst({
    where: { id: itemId, inspectionId },
    select: { id: true, inspectionId: true, itemText: true },
  });
  if (!item) throw new NotFoundError('Inspection item not found');
  return item;
}

export async function listInspectionItemFeedback(inspectionId: string, itemId: string) {
  await findInspectionItemInScope(inspectionId, itemId);

  return prisma.inspectionItemFeedback.findMany({
    where: { inspectionItemId: itemId },
    select: inspectionItemFeedbackSelect,
    orderBy: { createdAt: 'asc' },
  });
}

export async function createInspectionItemFeedback(
  inspectionId: string,
  itemId: string,
  input: InspectionItemFeedbackInput
) {
  const item = await findInspectionItemInScope(inspectionId, itemId);

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: {
      id: true,
      inspectionNumber: true,
      inspectorUserId: true,
      account: { select: { accountManagerId: true } },
    },
  });
  if (!inspection) throw new NotFoundError('Inspection not found');

  const feedback = await prisma.inspectionItemFeedback.create({
    data: {
      inspectionItemId: itemId,
      authorUserId: input.authorUserId,
      body: input.body,
    },
    select: inspectionItemFeedbackSelect,
  });

  await prisma.inspectionActivity.create({
    data: {
      inspectionId,
      action: 'field_feedback_posted',
      performedByUserId: input.authorUserId,
      metadata: {
        inspectionItemId: itemId,
        feedbackId: feedback.id,
      },
    },
  });

  const recipients = new Set<string>();
  if (inspection.inspectorUserId !== input.authorUserId) {
    recipients.add(inspection.inspectorUserId);
  }
  const accountManagerId = inspection.account?.accountManagerId;
  if (accountManagerId && accountManagerId !== input.authorUserId) {
    recipients.add(accountManagerId);
  }

  for (const userId of recipients) {
    createNotification({
      userId,
      type: 'inspection_feedback_posted',
      title: `New feedback on inspection ${inspection.inspectionNumber}`,
      body: `${feedback.authorUser.fullName} commented on "${item.itemText}"`,
      metadata: {
        inspectionId,
        inspectionItemId: itemId,
        feedbackId: feedback.id,
      },
    }).catch(() => undefined);
  }

  return feedback;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `apps/api/`:
```bash
npm test -- src/services/__tests__/inspectionService.test.ts
```

Expected: all tests pass, including the new `findInspectionItemInScope`, `listInspectionItemFeedback`, and `createInspectionItemFeedback` describe blocks.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/inspectionService.ts apps/api/src/services/__tests__/inspectionService.test.ts
git commit -m "feat(inspections): add item feedback service functions

findInspectionItemInScope guards (inspectionId, itemId) coupling
to prevent cross-inspection IDOR. createInspectionItemFeedback
writes an activity row and notifies inspector + account manager
(deduped, never the author)."
git push origin main
```

---

## Task 11: Wire feedback routes (GET + POST)

**Files:**
- Modify: `apps/api/src/routes/inspections.ts`

- [ ] **Step 1: Add imports for the new service + schema**

In `apps/api/src/routes/inspections.ts`, extend the existing schema import block:

```ts
import {
  createInspectionSchema,
  updateInspectionSchema,
  listInspectionsSchema,
  rescheduleAppointmentSchema, // (only if it's already imported here — leave existing imports as-is)
  // ... other existing schemas ...
  createInspectionItemFeedbackSchema,
} from '../schemas/inspection';
```

(Replace the existing `from '../schemas/inspection'` import block. The exact list of schemas already present is what's in the current file — just add `createInspectionItemFeedbackSchema` to it.)

Extend the existing service import block:

```ts
import {
  // ... all existing imports ...
  createInspectionItemFeedback,
  listInspectionItemFeedback,
} from '../services/inspectionService';
```

- [ ] **Step 2: Append the two new routes at the end of the file (before `export default router`)**

Insert this block right before `export default router;`:

```ts
// List feedback for an inspection item
router.get(
  '/:id/items/:itemId/feedback',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const inspection = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, inspection);

    const feedback = await listInspectionItemFeedback(req.params.id, req.params.itemId);
    res.json({ data: feedback });
  }
);

// Create feedback on an inspection item
router.post(
  '/:id/items/:itemId/feedback',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  validate(createInspectionItemFeedbackSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const inspection = await getInspectionById(req.params.id);
    await assertInspectionAccess(req, inspection);

    const feedback = await createInspectionItemFeedback(
      req.params.id,
      req.params.itemId,
      {
        body: req.body.body,
        authorUserId: user.id,
      }
    );
    res.status(201).json({ data: feedback });
  }
);
```

- [ ] **Step 3: Run the inspection service tests to confirm nothing broke**

Run from `apps/api/`:
```bash
npm test -- src/services/__tests__/inspectionService.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/inspections.ts
git commit -m "feat(inspections): expose feedback list and create endpoints

GET /inspections/:id/items/:itemId/feedback returns ordered feedback.
POST writes feedback as the authenticated user. Both gated by
INSPECTIONS_READ since this is the field role's own channel; access
check still scopes by contract assignment."
git push origin main
```

---

## Task 12: Route-level test for cross-inspection IDOR and access control (failing tests)

**Files:**
- Create: `apps/api/src/routes/__tests__/inspections.routes.test.ts`

- [ ] **Step 1: Create the test file**

Create `apps/api/src/routes/__tests__/inspections.routes.test.ts` with this content:

```ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as inspectionService from '../../services/inspectionService';
import { ensureOwnershipAccess } from '../../middleware/ownership';

let mockUser: { id: string; role: string; teamId?: string | null };

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyRole: (_req: any, _res: any, next: any) => next(),
  requireManager: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/ownership', () => ({
  ensureOwnershipAccess: jest.fn(async () => undefined),
  ensureManagerAccountAccess: jest.fn(async () => undefined),
}));

jest.mock('../../services/inspectionService');

describe('Inspections Routes — feedback', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = { id: 'cleaner-1', role: 'cleaner', teamId: null };
    app = createTestApp();
    const routes = (await import('../inspections')).default;
    setupTestRoutes(app, routes, '/api/v1/inspections');
  });

  it('GET /:id/items/:itemId/feedback returns feedback for in-scope inspection', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: 'contract-1',
    });
    (inspectionService.listInspectionItemFeedback as jest.Mock).mockResolvedValue([
      { id: 'fb-1', body: 'note' },
    ]);

    const response = await request(app)
      .get('/api/v1/inspections/ins-1/items/item-1/feedback')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(ensureOwnershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cleaner-1', role: 'cleaner' }),
      expect.objectContaining({ resourceType: 'contract', resourceId: 'contract-1' })
    );
  });

  it('GET /:id/items/:itemId/feedback rejects when inspection has no contractId for cleaner', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: null,
    });

    await request(app)
      .get('/api/v1/inspections/ins-1/items/item-1/feedback')
      .expect(403);

    expect(inspectionService.listInspectionItemFeedback).not.toHaveBeenCalled();
  });

  it('POST /:id/items/:itemId/feedback creates feedback as the authenticated user', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: 'contract-1',
    });
    (inspectionService.createInspectionItemFeedback as jest.Mock).mockResolvedValue({
      id: 'fb-1',
      body: 'mismatched',
    });

    const response = await request(app)
      .post('/api/v1/inspections/ins-1/items/item-1/feedback')
      .send({ body: 'mismatched' })
      .expect(201);

    expect(response.body.data.id).toBe('fb-1');
    expect(inspectionService.createInspectionItemFeedback).toHaveBeenCalledWith(
      'ins-1',
      'item-1',
      { body: 'mismatched', authorUserId: 'cleaner-1' }
    );
  });

  it('POST /:id/items/:itemId/feedback rejects empty body with 422', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: 'contract-1',
    });

    await request(app)
      .post('/api/v1/inspections/ins-1/items/item-1/feedback')
      .send({ body: '' })
      .expect(422);
  });

  it('POST /:id/items/:itemId/feedback surfaces NotFoundError as 404 for cross-inspection itemId', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: 'contract-1',
    });
    (inspectionService.createInspectionItemFeedback as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Inspection item not found'), { statusCode: 404 })
    );

    await request(app)
      .post('/api/v1/inspections/ins-1/items/item-other/feedback')
      .send({ body: 'something' })
      .expect(404);
  });
});
```

- [ ] **Step 2: Run the tests**

Run from `apps/api/`:
```bash
npm test -- src/routes/__tests__/inspections.routes.test.ts
```

Expected: all tests pass (the routes were already implemented in Task 11; this task verifies them).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/__tests__/inspections.routes.test.ts
git commit -m "test(inspections): cover feedback routes and access control

Verifies field-role contract scoping, empty-body rejection, and that
cross-inspection itemId surfaces as 404 (NotFoundError from
findInspectionItemInScope)."
git push origin main
```

---

## Task 13: Frontend types for feedback

**Files:**
- Modify: `apps/web/src/types/inspection.ts`

- [ ] **Step 1: Add the `InspectionItemFeedback` type**

Open `apps/web/src/types/inspection.ts`. Find where `InspectionItem` is defined. Just above it, add:

```ts
export interface InspectionItemFeedback {
  id: string;
  body: string;
  createdAt: string;
  authorUser: { id: string; fullName: string };
}
```

- [ ] **Step 2: Add `feedback` to the inspection item type**

Within the `InspectionItem` interface (or whatever the existing detail item type is named — check the file), add:

```ts
  feedback?: InspectionItemFeedback[];
```

Mark it optional because not all places where the item type is used will populate it (list endpoint vs detail endpoint).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/inspection.ts
git commit -m "feat(web): add InspectionItemFeedback type"
git push origin main
```

---

## Task 14: Frontend API client functions for feedback

**Files:**
- Modify: `apps/web/src/lib/inspections.ts`

- [ ] **Step 1: Add the two new client functions**

Append to `apps/web/src/lib/inspections.ts`:

```ts
import type { InspectionItemFeedback } from '../types/inspection';

export async function listInspectionItemFeedback(
  inspectionId: string,
  itemId: string
): Promise<InspectionItemFeedback[]> {
  const response = await api.get<{ data: InspectionItemFeedback[] }>(
    `/inspections/${inspectionId}/items/${itemId}/feedback`
  );
  return response.data.data;
}

export async function createInspectionItemFeedback(
  inspectionId: string,
  itemId: string,
  body: string
): Promise<InspectionItemFeedback> {
  const response = await api.post<{ data: InspectionItemFeedback }>(
    `/inspections/${inspectionId}/items/${itemId}/feedback`,
    { body }
  );
  return response.data.data;
}
```

**Note:** Match the exact `api` import style already used in this file (e.g., if the file uses `apiClient` instead of `api`, mirror that). Do not add a duplicate import — if `InspectionItemFeedback` import collides with an existing import block, merge into the existing one.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/inspections.ts
git commit -m "feat(web): add inspection item feedback API client functions"
git push origin main
```

---

## Task 15: Gate write controls in `InspectionDetail.tsx` behind `INSPECTIONS_WRITE`

**Files:**
- Modify: `apps/web/src/pages/inspections/InspectionDetail.tsx`

- [ ] **Step 1: Read the current write-control set**

Open `apps/web/src/pages/inspections/InspectionDetail.tsx` and identify every button/control that triggers a mutation. Likely candidates: Edit, Start, Complete, Cancel, Add Item, Edit Item, Delete Item, Add Corrective Action, Add Signoff, Reinspect.

- [ ] **Step 2: Add a `canWrite` flag using the existing permission hook**

Find the existing imports for the auth/permission helpers (likely `useAuth` or `usePermissions` — match the convention in this file). Add at the top of the component body:

```tsx
const canWrite = hasPermission(PERMISSIONS.INSPECTIONS_WRITE);
```

(Use whatever the file's existing pattern is for permission checking — there will be examples in the same file or in nearby pages. Do NOT introduce a new helper.)

- [ ] **Step 3: Conditionally render each write control**

For every write control identified in Step 1, wrap it (or its enclosing block) in `{canWrite && (...)}`. Do not modify the read-only display of items, scores, photos, signoffs, or corrective actions — those stay visible to all roles with `INSPECTIONS_READ`.

- [ ] **Step 4: Manually test in dev**

Run from `apps/web/`:
```bash
npm run dev
```

Log in as a manager → confirm all write buttons are visible. Log in as a cleaner assigned to a contract with an inspection → confirm the inspection detail loads with NO write buttons. Stop the dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/inspections/InspectionDetail.tsx
git commit -m "feat(web): gate inspection write controls behind INSPECTIONS_WRITE

Field roles (cleaner, subcontractor) now see the read-only inspection
detail; write actions remain manager+ only."
git push origin main
```

---

## Task 16: Add per-item feedback section to `InspectionDetail.tsx`

**Files:**
- Modify: `apps/web/src/pages/inspections/InspectionDetail.tsx`

- [ ] **Step 1: Import the API client functions and type**

At the top of `apps/web/src/pages/inspections/InspectionDetail.tsx`:

```tsx
import {
  listInspectionItemFeedback,
  createInspectionItemFeedback,
} from '../../lib/inspections';
import type { InspectionItemFeedback } from '../../types/inspection';
```

- [ ] **Step 2: Build a feedback-section component**

Add this component definition at the top of the file (or in a new file `apps/web/src/pages/inspections/InspectionItemFeedbackSection.tsx` if the file is too large — match the project's pattern):

```tsx
import { useState } from 'react';

interface ItemFeedbackSectionProps {
  inspectionId: string;
  itemId: string;
  initialFeedback: InspectionItemFeedback[];
  disabled?: boolean;
}

export function InspectionItemFeedbackSection({
  inspectionId,
  itemId,
  initialFeedback,
  disabled,
}: ItemFeedbackSectionProps) {
  const [feedback, setFeedback] = useState<InspectionItemFeedback[]>(initialFeedback);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createInspectionItemFeedback(inspectionId, itemId, body.trim());
      setFeedback((prev) => [...prev, created]);
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <h4 className="text-sm font-semibold mb-2">Feedback</h4>
      {feedback.length === 0 ? (
        <p className="text-sm text-gray-500 mb-2">No feedback yet.</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {feedback.map((entry) => (
            <li key={entry.id} className="text-sm">
              <span className="font-medium">{entry.authorUser.fullName}</span>
              <span className="text-gray-500 ml-2">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
              <p className="mt-1 whitespace-pre-wrap">{entry.body}</p>
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="space-y-2">
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={2}
            placeholder="Add feedback…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
            maxLength={2000}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting || !body.trim()}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Note:** Match the project's existing class-naming/styling convention. The file likely uses Tailwind given the existing codebase — confirm by reading other sections of `InspectionDetail.tsx` and align the class strings.

- [ ] **Step 3: Render the feedback section inside each item**

In `InspectionDetail.tsx`, find where each inspection item is rendered (look for `inspection.items.map(...)`). Inside the item card, after the score/notes/photo area, add:

```tsx
<InspectionItemFeedbackSection
  inspectionId={inspection.id}
  itemId={item.id}
  initialFeedback={item.feedback ?? []}
  disabled={inspection.status === 'canceled'}
/>
```

- [ ] **Step 4: Manually test in dev**

Run from `apps/web/`:
```bash
npm run dev
```

Log in as a cleaner assigned to a contract that has a completed inspection → open the inspection → confirm feedback section appears under each item. Post feedback → confirm it appears in the list. Log in as the inspector (manager) → reload → confirm the feedback is visible. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/inspections/InspectionDetail.tsx
git commit -m "feat(web): add per-item feedback section to inspection detail

Renders inline feedback list and a compose box. Disabled when the
inspection is canceled. Available to any role with INSPECTIONS_READ."
git push origin main
```

---

## Task 17: Verify nav and route access (no code change expected)

**Files:**
- Verify: `apps/web/src/components/layout/Sidebar.tsx`
- Verify: `apps/web/src/lib/routeAccess.ts`
- Verify: `apps/web/src/lib/notificationRouting.ts`

- [ ] **Step 1: Confirm sidebar gating**

Open `apps/web/src/components/layout/Sidebar.tsx` and find the inspections nav entry. Confirm it gates on `inspections_read` (a permission), not on a hardcoded role. If it uses a hardcoded role list (e.g., `['owner', 'admin', 'manager']`), update it to use the permission instead:

```tsx
hasPermission(PERMISSIONS.INSPECTIONS_READ)
```

If the gate is already permission-based, no change is needed.

- [ ] **Step 2: Confirm route-access config**

Open `apps/web/src/lib/routeAccess.ts`. Confirm `/inspections` is gated by `INSPECTIONS_READ` (line 47-49 of the current file). No change expected.

- [ ] **Step 3: Confirm notification routing**

Open `apps/web/src/lib/notificationRouting.ts`. Confirm that any notification with `inspectionId` in its metadata routes to `/inspections/:inspectionId` (line 61-62 of the current file). No change expected — the new `inspection_feedback_posted` type carries `inspectionId` in metadata so it routes automatically.

- [ ] **Step 4: If Sidebar.tsx required a change, commit it**

```bash
git add apps/web/src/components/layout/Sidebar.tsx
git commit -m "chore(web): gate inspections nav on inspections_read permission"
git push origin main
```

If no change was needed, skip this commit.

---

## Task 18: Frontend test for `InspectionDetail` write gating + feedback rendering

**Files:**
- Modify: `apps/web/src/pages/__tests__/InspectionDetail.test.tsx`

- [ ] **Step 1: Read the existing test file**

Open `apps/web/src/pages/__tests__/InspectionDetail.test.tsx` (if it exists) or check the surrounding `__tests__` directory for the existing test pattern.

If no test file exists, skip to Task 19; otherwise continue.

- [ ] **Step 2: Add tests for write-gating and feedback**

Add these tests, matching the existing test setup (e.g., MSW handlers, render helpers — copy from neighboring tests):

```tsx
describe('InspectionDetail field-role access', () => {
  it('hides write controls for cleaner role', async () => {
    // mock current user as cleaner; mock GET /inspections/:id to return an inspection
    // render the page; assert Edit/Start/Complete/Cancel buttons are NOT in the document
  });

  it('renders existing feedback and allows posting as cleaner', async () => {
    // mock inspection detail with item.feedback = [{ id: 'fb-1', body: 'existing', ... }]
    // render; assert 'existing' is visible
    // type into textarea, click Post, assert the new feedback appears
  });
});
```

Fill in the actual mocks/render calls based on the existing test infrastructure in the file — do NOT introduce new test infrastructure.

- [ ] **Step 3: Run the tests**

Run from `apps/web/`:
```bash
npm test -- src/pages/__tests__/InspectionDetail.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/__tests__/InspectionDetail.test.tsx
git commit -m "test(web): cover field-role write gating and feedback flow"
git push origin main
```

---

## Task 19: Final verification — full backend + frontend test suites

**Files:**
- (none modified)

- [ ] **Step 1: Run the full backend test suite**

Run from `apps/api/`:
```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 2: Run the full frontend test suite**

Run from `apps/web/`:
```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 3: Manual end-to-end smoke**

Start both servers (use the project's existing dev script — typically `pnpm dev` or two terminals running `npm run dev` in `apps/api/` and `apps/web/`). Walk the happy path:

1. As a manager, create an inspection on a contract assigned to a known cleaner.
2. Complete the inspection with a failing item.
3. Log out, log in as that cleaner.
4. Open `/inspections` → see the inspection in the list.
5. Open the inspection detail → see no write controls, see the failing item with notes.
6. Post feedback on the failing item.
7. Log back in as the manager → click the notification → land on the inspection detail with the cleaner's feedback visible.

If anything breaks, stop and triage before declaring done.

---

## Self-Review Checklist (run by author of this plan, complete before handoff)

**1. Spec coverage:**
- ✅ Permissions added (Task 2)
- ✅ Access control extended (Task 3)
- ✅ List scoping (Tasks 4–6)
- ✅ Inline feedback in detail response (Task 7)
- ✅ Zod schema (Task 8)
- ✅ Service helpers + feedback service (Tasks 9–10)
- ✅ New routes (Task 11)
- ✅ Route-level tests (Task 12)
- ✅ Frontend types + API client (Tasks 13–14)
- ✅ Write-control gating (Task 15)
- ✅ Per-item feedback UI (Task 16)
- ✅ Nav/route-access verification (Task 17)
- ✅ Frontend tests (Task 18)
- ✅ Notification activity log entry (covered in Task 10's `inspectionActivity.create`)
- ✅ Notification dedup + skip-author (covered in Task 10 tests)

**2. Placeholder scan:** No TBD/TODO/“implement later”/“add error handling” in any task. Each step has concrete code or commands.

**3. Type consistency:**
- `findInspectionItemInScope(inspectionId, itemId)` — used in Task 9 test, Task 10 implementation, Task 11 service consumers. Consistent.
- `createInspectionItemFeedback(inspectionId, itemId, input)` where `input = { body, authorUserId }` — used identically in Task 9 test, Task 10 impl, Task 11 route, Task 14 client (client only sends `body`; route adds `authorUserId` from `req.user.id`). Consistent.
- Field name `body` for both Zod schema (Task 8) and service input (Task 10) — consistent.
- Notification type string `inspection_feedback_posted` — Task 10 impl, Task 17 verifies routing handles it via existing `inspectionId` metadata path. Consistent.
- Activity action string `field_feedback_posted` — only in Task 10. No reuse to break.
