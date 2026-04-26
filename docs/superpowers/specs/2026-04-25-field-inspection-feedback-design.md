# Field Worker Inspection Read + Feedback

**Date**: 2026-04-25
**Status**: Approved, ready for implementation planning

## Problem

Cleaners and subcontractors are the subjects of inspections (they perform the work being inspected) but currently cannot see inspection results or push back when a score doesn't reflect what actually happened. The route layer contains dead branches that suggest field-role access was once intended; field roles lack the `inspections_read` permission entirely, so those branches were unreachable. We need to give field workers visibility into inspections on contracts they're assigned to, plus a per-item feedback channel so they can dispute or clarify scores.

## Goals

- Cleaners and subcontractors can list and view inspections scoped to contracts they are assigned to
- Field workers can post per-item feedback on completed inspections
- Inspector and account manager receive notifications when feedback is posted
- No new write capability for field workers on the inspection itself (scores, items, signoffs, corrective actions remain manager-only)

## Non-goals

- Field workers cannot create, edit, or run inspections
- Field workers cannot transition corrective action statuses (separate workflow, future)
- No threaded replies from inspector to field-worker feedback (one-direction channel)
- No edit/delete of feedback after posting (append-only)
- No notification batching/debouncing
- No mobile-specific UI; existing responsive InspectionDetail is sufficient

## Access scope

Cleaners and subcontractors see inspections where:

- `inspection.contractId` is set, AND
- For **cleaner**: `contract.assignedToUserId === user.id`
- For **subcontractor**: `contract.assignedTeamId === user.teamId` OR `contract.assignedToUserId === user.id`
- AND `inspection.status IN ('scheduled', 'completed')` — `in_progress` is hidden

Inspections without a `contractId` are invisible to field roles. Owners, admins, and managers continue to see inspections per existing rules (manager scoped by `account.accountManagerId`).

## Architecture

Approach: **extend existing routes with role-aware scoping**. Same endpoints handle managers and field workers; access checks branch on role. No parallel `/me/*` endpoint set.

### Permissions

Add `inspections_read: true` to both `cleaner` and `subcontractor` permission maps in `apps/api/src/types/roles.ts`. No new permission constant. Field workers remain blocked from `INSPECTIONS_WRITE` and `INSPECTIONS_ADMIN` routes by existing middleware.

### Access control

Extend `assertInspectionAccess` in `apps/api/src/routes/inspections.ts`:

```ts
async function assertInspectionAccess(req: Request, inspection: { accountId: string; contractId: string | null }) {
  if (req.user?.role === 'manager') {
    await ensureManagerAccountAccess(req.user, inspection.accountId, { path: req.path, method: req.method });
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

The existing `ensureOwnershipAccess` for `resourceType: 'contract'` already implements the cleaner/subcontractor scoping correctly (`apps/api/src/middleware/ownership.ts:209-241, 260-274`).

Extend `listInspections` in `apps/api/src/services/inspectionService.ts`:

```ts
if (options?.userRole === 'cleaner' && options.userId) {
  where.contract = { assignedToUserId: options.userId };
}
if (options?.userRole === 'subcontractor') {
  if (!options.userId) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
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
```

Plumb `userTeamId` through the route to the service (the route already has `req.user?.teamId`; just add it to the options object).

## Data model

New Prisma model in `packages/database/prisma/schema.prisma`:

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

Back-relations:

- On `InspectionItem`: `feedback InspectionItemFeedback[]`
- On `User`: `inspectionItemFeedback InspectionItemFeedback[]`

Migration via `prisma db push --accept-data-loss` per project convention.

Append-only by design: no `updatedAt`, no `editedAt`, no `acknowledgedBy`, no `status`, no soft delete. `onDelete: Cascade` from item so feedback follows the item; `Restrict` on user so we never lose attribution.

## API endpoints

### New endpoints

Both gated by `requirePermission(INSPECTIONS_READ)` and `assertInspectionAccess`.

```
GET  /inspections/:id/items/:itemId/feedback
POST /inspections/:id/items/:itemId/feedback
```

`GET` returns `{ data: InspectionItemFeedback[] }` ordered `createdAt asc`. Each entry: `id`, `body`, `createdAt`, `authorUser: { id, fullName }`.

`POST` body schema:

```ts
z.object({ body: z.object({ body: z.string().min(1).max(2000) }) })
```

Server resolves `authorUserId` from `req.user.id`. Returns the created entry, status `201`. Both routes use a service helper `findInspectionItemInScope(inspectionId, itemId)` that throws `NotFoundError` if the item doesn't belong to the inspection (prevents the same cross-resource IDOR class addressed in commit `be32ac6`).

### Existing endpoints

No code changes; field-role access is enabled automatically by Section 1's permission and access-control changes. Verified working for field roles:

- `GET /inspections`
- `GET /inspections/:id`
- `GET /inspections/:id/actions`
- `GET /inspections/:id/signoffs`
- `GET /inspections/:id/activities`

### Response shape change

Inline feedback on each item in `inspectionDetailSelect` so the frontend doesn't round-trip per item:

```ts
items: {
  select: {
    /* existing fields */,
    feedback: {
      select: { id: true, body: true, createdAt: true, authorUser: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' as const },
    },
  },
  orderBy: { sortOrder: 'asc' as const },
}
```

## Notifications

On successful `POST /inspections/:id/items/:itemId/feedback`:

```ts
const recipients = new Set<string>();
if (inspection.inspectorUserId !== authorUserId) recipients.add(inspection.inspectorUserId);
const accountManagerId = inspection.account.accountManagerId;
if (accountManagerId && accountManagerId !== authorUserId) recipients.add(accountManagerId);

for (const userId of recipients) {
  createNotification({
    userId,
    type: 'inspection_feedback_posted',
    title: `New feedback on inspection ${inspection.inspectionNumber}`,
    body: `${authorFullName} commented on "${item.itemText}"`,
    metadata: {
      inspectionId: inspection.id,
      inspectionItemId: item.id,
      feedbackId: feedback.id,
    },
  }).catch(() => undefined);
}
```

`Set` deduplication handles the case where the inspector and account manager are the same person. Author is never notified.

Also write an `inspectionActivity` row with `action: 'field_feedback_posted'` and metadata `{ inspectionItemId, authorUserId }` so feedback appears in the audit trail.

Register `inspection_feedback_posted` in `apps/web/src/lib/notificationRouting.ts` to deep-link to `/inspections/:inspectionId`.

## Frontend changes

### Files touched

- `apps/web/src/components/layout/Sidebar.tsx` — existing inspections nav item becomes visible to cleaner/sub once they have `inspections_read`; verify the gate uses the permission, not an explicit role check.
- `apps/web/src/types/inspection.ts` — add `InspectionItemFeedback` type; add `feedback: InspectionItemFeedback[]` to the inspection item type.
- `apps/web/src/lib/inspections.ts` — add `listInspectionItemFeedback(inspectionId, itemId)` and `createInspectionItemFeedback(inspectionId, itemId, body)`.
- `apps/web/src/pages/inspections/InspectionsList.tsx` — no behavior change; verify "Create Inspection" button is gated by `INSPECTIONS_WRITE`.
- `apps/web/src/pages/inspections/InspectionDetail.tsx`:
  - Hide all write controls (Edit, Start, Complete, Cancel, Add Item, Reinspect, Add Signoff, Add Corrective Action) behind `hasPermission(INSPECTIONS_WRITE)`.
  - Add a Feedback subsection inside each item card, always visible:
    - Renders `item.feedback[]` with `authorUser.fullName`, `createdAt`, `body`.
    - Below the list: textarea + Post button for any user with `INSPECTIONS_READ`.
    - Disabled when `inspection.status === 'canceled'`.
    - On submit: append optimistically, then refetch the inspection to pick up the new feedback entry.
- `apps/web/src/lib/notificationRouting.ts` — register `inspection_feedback_posted` → `/inspections/:inspectionId`.

No new pages. No new routes. The route-access config in `apps/web/src/lib/routeAccess.ts` already gates `/inspections` by `INSPECTIONS_READ`, so granting field roles that permission is sufficient.

## Testing

### Backend

- `listInspections` filter for `cleaner` returns only inspections where `contract.assignedToUserId === userId`
- `listInspections` filter for `subcontractor` returns inspections where `contract.assignedTeamId === teamId` OR `contract.assignedToUserId === userId`
- `listInspections` for field roles excludes `in_progress` status
- `assertInspectionAccess` integration via `GET /inspections/:id`:
  - cleaner with assigned contract → 200
  - cleaner with unassigned contract → 403
  - cleaner on inspection with `contractId === null` → 403
  - subcontractor variants (team match, user match, neither)
- `createInspectionItemFeedback` service:
  - happy path returns the created entry
  - throws when item doesn't belong to inspection
  - fires notifications to inspector and account manager (deduped, never to author)
- `POST /inspections/:id/items/:itemId/feedback`:
  - cross-resource IDOR (itemId belongs to a different inspection) → 404
  - unscoped field worker → 403
  - empty body → 400

### Frontend

- `apps/web/src/pages/__tests__/InspectionDetail.test.tsx`:
  - manager sees Edit, Complete, Add Item buttons; cleaner does not
  - field worker sees feedback section per item with existing comments rendered
  - posting feedback as field worker calls API and appends to the list

### Out of scope

- Notification delivery (fire-and-forget pattern already covered by `createInspection` tests)
- Mobile-specific layout (no breakpoint-specific code paths)

## Open risks

- **Comment spam**: a disgruntled field worker could post hundreds of comments. No rate limit in v1; if abused, add a per-user rate limit at the route layer.
- **Notification fatigue**: high-volume inspections could flood the inspector. Acceptable in v1; batching is a deliberate follow-up.
- **`contractId` requirement**: inspections without a contract are invisible to field roles. This may surface previously-hidden manager workflows; document the rule in the user-facing copy on InspectionsList ("Inspections without an associated contract are not shown.") if support gets confused.
