# System Understanding and Current Risk Review

Date: 2026-02-27

## Current Findings

1. High: API is not typecheck-clean right now.
- `apps/api/src/routes/contracts.ts:147` — string | null | undefined not assignable to string | undefined
- `apps/api/src/routes/jobs.ts:68` — string | null | undefined not assignable to string | undefined
- `apps/api/src/services/dashboardService.ts:712` — facility possibly null
- `apps/api/src/services/dashboardService.ts:742` — facility possibly null
- `apps/api/src/services/jobService.ts:755` — Record<string, unknown> not assignable to InputJsonValue (geolocation field)
- `apps/api/src/services/timeTrackingService.ts:395` — Record<string, unknown> not assignable to InputJsonValue (geolocation field)
- `apps/api/src/services/reminderService.ts:5,6` — missing exports from appointmentService
- `apps/api/src/services/reminderService.ts:121,132,150,158,161` — stale contract select (missing accountManagerId, account relation)

2. Medium: Web typecheck fails — test fixtures stale against updated types.
- Facility fixtures missing `areas` property:
  - `apps/web/src/pages/__tests__/AccountDetail.test.tsx:101`
  - `apps/web/src/pages/__tests__/FacilitiesList.test.tsx:34`
  - `apps/web/src/pages/__tests__/FacilityDetail.test.tsx:64`
  - `apps/web/src/pages/__tests__/LeadDetail.test.tsx:141`
  - `apps/web/src/pages/__tests__/LeadsList.test.tsx:124`
  - `apps/web/src/pages/__tests__/ProposalForm.test.tsx:87`
- Area fixture missing `length`, `width`:
  - `apps/web/src/pages/__tests__/FacilityDetail.test.tsx:108`
- Appointment fixtures missing new fields (completionNotes, actualDuration, reminderSentAt, assignedTeam, etc.):
  - `apps/web/src/components/calendar/__tests__/AppointmentBlock.test.tsx:7`
  - `apps/web/src/components/calendar/__tests__/CalendarDayCell.test.tsx:6`
  - `apps/web/src/components/calendar/__tests__/CalendarGrid.test.tsx:6`
  - `apps/web/src/components/calendar/__tests__/DayCalendar.test.tsx:6`
  - `apps/web/src/components/calendar/__tests__/MonthCalendar.test.tsx:6`
  - `apps/web/src/components/calendar/__tests__/WeekCalendar.test.tsx:7`
  - `apps/web/src/lib/__tests__/calendar-utils.test.ts:159`
  - `apps/web/src/pages/__tests__/LeadDetail.test.tsx:94`
- Production code type mismatch:
  - `apps/web/src/pages/inspections/InspectionForm.tsx:108` — Job.contract can be null but JobOption.contract cannot

3. Medium: Public email links can fall back to localhost when env vars are missing.
- `apps/api/src/routes/contracts.ts:692`
- `apps/api/src/routes/proposals.ts:345`
- `apps/api/src/routes/quotations.ts:171`

## Verified Architecture

1. Monorepo structure
- `apps/web`: React + Vite frontend
- `apps/api`: Express + TypeScript backend
- `packages/database`: Prisma schema + migrations
- Single-tenant model today

2. API runtime bootstrap
- Entry point: `apps/api/src/index.ts`
- Registers protected and public routes
- Initializes realtime socket server
- Starts schedulers:
  - reminders
  - recurring jobs regeneration
  - job nearing-end alerts

3. Authentication and authorization
- JWT auth middleware: `apps/api/src/middleware/auth.ts`
- Permission/role checks: `apps/api/src/middleware/rbac.ts`
- Frontend route gating: `apps/web/src/lib/routeAccess.ts`

4. Frontend integration model
- Axios API client with token refresh: `apps/web/src/lib/api.ts`
- Auth persistence/store: `apps/web/src/stores/authStore.ts`
- Permission-aware navigation/sidebar: `apps/web/src/components/layout/Sidebar.tsx`

## Core Business Workflow Understanding

1. CRM lifecycle
- Lead management and conversion: `apps/api/src/services/leadService.ts`
- Conversion creates account/contact/facility linkages and pipeline progression

2. Proposal to contract flow
- Proposals created/updated with service frequency and normalized service schedule
- Contracts are primarily created from accepted proposals
- Contract frequency/schedule follow proposal values at creation time
- Key service: `apps/api/src/services/contractService.ts`

3. Recurring job generation flow
- Recurring jobs are generated when:
  - contract status is `active`
  - and assignee exists (team or internal user)
- Auto-generation window is 30 days
- Regeneration cycle runs periodically and extends future window
- Key logic: `apps/api/src/services/jobService.ts`
- Scheduler runner: `apps/api/src/services/recurringJobScheduler.ts`

4. Job workforce model
- Supports:
  - unassigned
  - internal employee assignment
  - subcontractor team assignment
- Enforces single assignment target (not both at once)

5. One-time job flow from quotation
- Quotation acceptance requires facility + scheduled date + start/end times
- Accepted quotation auto-creates one one-time job
- Job links back to quotation
- Key logic: `apps/api/src/services/quotationService.ts`

6. One-time service catalog
- Managed under dedicated endpoints/service
- Stores service type, unit type, base rate, max discount, add-ons
- Used to standardize quotation pricing inputs

7. Invoicing model
- Manual invoice creation
- Generate from contract with optional proration
- Bulk monthly generation: one invoice per account, active facilities/contracts as line items
- Overlap checks to prevent duplicate billing periods
- Key logic: `apps/api/src/services/invoiceService.ts`

8. Notifications and realtime
- Notifications persisted in DB and emitted via websocket to user rooms
- Optional email send based on configuration/preferences
- Core files:
  - `apps/api/src/services/notificationService.ts`
  - `apps/api/src/lib/realtime.ts`

9. Job alerting behavior
- Alert cycle checks jobs nearing end-time window (default 2 hours)
- Triggers admin notifications when no check-in/out conditions are met
- Scheduler: `apps/api/src/services/jobAlertScheduler.ts`

## Operational Notes

1. Test status snapshot
- CRM-focused API service and route tests: passing
- CRM-focused web tests: passing
- Full typecheck gates currently failing (API: 13 errors, web: 15 errors), release confidence reduced until fixed
- New geolocation feature introduced InputJsonValue type errors in jobService and timeTrackingService
- reminderService has drifted significantly from current schema (missing exports, stale selects)

2. Migration status snapshot
- Local Prisma migration status reports schema up to date

## How to Use This File

Use this file as the quick system memory for:
- architecture overview
- workflow tracing
- current known technical risks

Update this document after major workflow or schema changes.
