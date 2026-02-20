# Inspection Workflow Implementation

## Scope
This implementation upgrades inspections from checklist-only tracking to a full quality workflow with:

- Corrective actions for failed checklist items
- Reinspection creation from failed items
- Supervisor/client signoff tracking
- List-level visibility for open and overdue quality actions

## Data Model

### New tables
- `inspection_corrective_actions`
  - Tracks remediation work per inspection or per failed checklist item
  - Key fields: `severity`, `status`, `due_date`, assignee/resolved/verified metadata, `follow_up_inspection_id`
- `inspection_signoffs`
  - Tracks final acknowledgement from supervisor or client
  - Key fields: `signer_type`, `signer_name`, `signer_title`, `comments`, `signed_at`

### Schema updates
- `Inspection`
  - Added relations: `correctiveActions`, `signoffs`
- `InspectionItem`
  - Added relation: `correctiveActions`
- `User`
  - Added workflow relations for corrective action ownership/verification and signoff attribution

### Migration
- Added migration:
  - `packages/database/prisma/migrations/20260220120000_add_inspection_workflow_tables/migration.sql`

## Backend API

### Existing lifecycle extended
- `POST /inspections/:id/complete`
  - Still completes inspection and calculates weighted score/rating
  - Now auto-creates corrective actions for failed items by default
  - Adds completion activity metadata including failed-item/action counts

### New corrective action endpoints
- `GET /inspections/:id/actions`
- `POST /inspections/:id/actions`
- `PATCH /inspections/:id/actions/:actionId`
- `POST /inspections/:id/actions/:actionId/verify`

### New signoff endpoints
- `GET /inspections/:id/signoffs`
- `POST /inspections/:id/signoffs`

### New reinspection endpoint
- `POST /inspections/:id/reinspect`
  - Creates a follow-up inspection using failed items
  - Links unresolved corrective actions to the follow-up inspection
  - Auto-creates an appointment for the reinspection

## Service Behavior

### Auto corrective-action generation
When completing an inspection:
- Every failed item creates a corrective action (unless disabled)
- Default due date is 7 days out
- Severity is derived from rating:
  - `1-2` => `critical`
  - `3` => `major`
  - `4-5` => `minor`
  - Missing rating => `major`

### Reinspection logic
- Reinspection can only be created from a completed inspection
- Default item set is failed checklist items
- Optional `actionIds` can restrict reinspection scope
- Parent inspection activity is logged with reinspection linkage metadata

### Signoff logic
- Signoff can only be added once inspection is completed
- Supports `supervisor` and `client` signer types

## Frontend Changes

### Inspections list (`/inspections`)
- Added visibility fields:
  - open corrective action count
  - overdue corrective action count
  - signoff count

### Inspection detail (`/inspections/:id`)
- Added corrective actions section:
  - create action
  - update status (`open`, `in_progress`, `resolved`, `verified`)
  - verify/reopen actions
- Added signoff section:
  - add supervisor/client signoff
  - view signoff history
- Added reinspection action:
  - `Reinspect Failed Items` for completed inspections with failures

## Testing

Validated with focused tests:
- API:
  - `apps/api/src/services/__tests__/inspectionService.test.ts`
- Web:
  - `apps/web/src/pages/__tests__/InspectionDetail.test.tsx`
  - `apps/web/src/pages/__tests__/InspectionsList.test.tsx`

## Known Notes

- Repository-wide typecheck currently has pre-existing errors outside inspections scope.
- Prisma client was regenerated with `--no-engine` to avoid local Windows file lock on query engine binary.
- This implementation avoids touching unrelated modules and keeps changes isolated to inspection workflow paths.
