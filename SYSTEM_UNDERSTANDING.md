# System Understanding and Current Status

Date: 2026-03-09

## Current Status

1. Test suite status: passing
- Verified on 2026-03-09 with `npm test`
- API: 78 suites passed, 763 tests passed
- Web: 79 files passed, 707 tests passed

2. Typecheck status: failing in the web app
- Verified on 2026-03-09 with `npm run typecheck`
- Shared packages and API typecheck passed
- Failing package: `@hygieia/web`

3. Current web typecheck drift
- Stale test fixtures after appointment/facility/area type expansion:
  - calendar appointment fixtures missing `completionNotes`, `actualDuration`, `reminderSentAt`, `assignedTeam`, and related fields
  - facility fixtures missing `areas`
  - area fixtures missing `length` and `width`
- Contact type drift in account detail state:
  - `apps/web/src/pages/accounts/AccountDetail.tsx`
  - `apps/web/src/types/crm.ts` vs `apps/web/src/types/contact.ts`
- Case-sensitive import drift on Windows/macOS/Linux:
  - `apps/web/src/pages/accounts/AccountHero.tsx` imports `button` and `card` with lowercase names while the files are `Button.tsx` and `Card.tsx`
- Additional active TS issues:
  - `apps/web/src/pages/contracts/ContractDetail.tsx` (`nextDays` possibly undefined)
  - `apps/web/src/pages/leads/LeadsList.tsx` (partial address objects where `street` is required)
  - `apps/web/src/pages/public/PublicContractView.tsx` and `apps/web/src/pages/public/PublicProposalView.tsx` (`companyTimezone` missing from branding state)

4. Documentation drift that existed before this update
- The previous system snapshot said API typecheck was failing; that is no longer true
- The previous snapshot said `reminderService` had stale schema/select issues; current tests indicate that flow is working again
- Top-level docs also had some project-description drift:
  - `README.md` mentioned `apps/web/.env.example`, but that file is not in the repo
  - `README.md` listed a public invoice web view, but the current web router does not expose one

## Verified Architecture

1. Monorepo layout
- `apps/api`: Express + TypeScript backend
- `apps/web`: React + Vite + TypeScript frontend
- `packages/database`: Prisma schema, migrations, seed
- `packages/types`, `packages/ui`, `packages/utils`, `packages/shared`: shared workspace packages

2. Runtime entry points
- API entry: `apps/api/src/index.ts`
- Web entry: `apps/web/src/main.tsx`
- Frontend router: `apps/web/src/App.tsx`

3. Persistence and infra
- Database: PostgreSQL via Prisma
- Cache/realtime support: Redis and Socket.IO support are present
- Local infrastructure: `docker-compose.yml` provisions Postgres, Redis, API, and web

4. Security and auth model
- API auth: JWT middleware in `apps/api/src/middleware/auth.ts`
- API permission enforcement: `apps/api/src/middleware/rbac.ts`
- API ownership/IDOR protection: `apps/api/src/middleware/ownership.ts`
- API request validation: Zod-based middleware in `apps/api/src/middleware/validate.ts`
- API rate limiting: Redis-backed limiters in `apps/api/src/middleware/rateLimiter.ts`
- Frontend route gating: `apps/web/src/components/auth/ProtectedRoute.tsx` and `apps/web/src/lib/routeAccess.ts`
- Token refresh and request wiring: `apps/web/src/lib/api.ts`

5. Security documentation caveat
- `Documentation/AUTHENTICATION.md` and `Documentation/Security_Implementation_Guide.md` are partially stale
- The live API does not call Supabase on every protected request
- Current runtime behavior is:
  - verify Hygieia-issued JWT locally
  - load user from Prisma by `decoded.sub`
  - reject inactive users
  - resolve the effective role from DB-backed assigned roles
  - enforce permissions and ownership in middleware

## How The System Works

1. CRM workflow
- Leads move through the CRM pipeline and can be converted into accounts
- Conversion establishes downstream account/contact/facility relationships
- Core files:
  - `apps/api/src/services/leadService.ts`
  - `apps/api/src/services/accountService.ts`
  - `apps/api/src/services/contactService.ts`

2. Appointment workflow
- Appointments support lead-linked and account-linked scheduling
- Appointments now include timezone, completion notes, actual duration, reminder tracking, reassignment, and optional assigned team linkage
- Reminder processing is handled by the reminder scheduler/service pair

3. Proposal workflow
- Proposals store service schedule data, pricing breakdowns, activities, versions, and public-signature flow
- The frontend includes proposal send, timeline, version history, and public acceptance flows
- Core files:
  - `apps/api/src/services/proposalService.ts`
  - `apps/api/src/services/proposalActivityService.ts`
  - `apps/api/src/services/proposalVersionService.ts`

4. Contract workflow
- Contracts can be created from proposals and then activated, assigned, amended, and publicly signed
- The current codebase includes:
  - contract activities
  - assignment overrides
  - amendment drafting, approval, and auto-apply behavior
  - public contract signing
- Core files:
  - `apps/api/src/services/contractService.ts`
  - `apps/api/src/services/contractActivityService.ts`
  - `apps/api/src/services/contractAssignmentOverrideService.ts`
  - `apps/api/src/services/contractAmendmentService.ts`
  - `apps/api/src/services/contractAmendmentWorkflowService.ts`

5. Job workflow
- Supports recurring jobs and one-time jobs
- Recurring jobs are generated by scheduler-driven autogen logic
- One-time jobs can be generated from accepted quotations
- Assignment model supports internal users and teams
- Related files:
  - `apps/api/src/services/jobService.ts`
  - `apps/api/src/services/recurringJobScheduler.ts`
  - `apps/api/src/services/quotationService.ts`

6. Facility and scope workflow
- Facilities contain areas, service configuration, and task structure
- Proposal and contract pricing depend on facility scope and pricing settings
- Inspection guidance and area/task modeling are now central to the workflow

7. Inspection workflow
- The codebase includes inspections, inspection templates, activities, signoffs, and corrective actions
- Appointments can link to inspections
- Core files:
  - `apps/api/src/services/inspectionService.ts`
  - `apps/api/src/services/inspectionTemplateService.ts`

8. Time tracking and payroll workflow
- Time tracking includes clock-in/out flows, timesheets, approval paths, and geolocation fields
- Financial management now extends into payroll runs and payroll entries
- Core files:
  - `apps/api/src/services/timeTrackingService.ts`
  - `apps/api/src/services/timesheetService.ts`
  - `apps/api/src/services/payrollService.ts`

9. Financial management workflow
- The repo now includes expenses, payroll, and finance reporting modules in both API and web
- Finance routes exist in the API and dedicated finance pages exist in the web app
- This is materially beyond the older CRM-only or billing-only system summary

10. Notifications and realtime
- Notifications are stored in the database and emitted to Socket.IO user rooms
- Email-capable notification flows exist for proposals, quotations, contracts, reminders, and system notifications
- Core files:
  - `apps/api/src/services/notificationService.ts`
  - `apps/api/src/lib/realtime.ts`

## Background Services

These schedulers are started from `apps/api/src/index.ts`:

1. `reminders`
- Daily scheduler with DB-backed runtime settings and run logs
- Sends appointment, contract expiry, proposal follow-up, and contract follow-up reminders

2. `recurring_jobs_autogen`
- Maintains forward-generated recurring jobs for active contracts

3. `job_alerts`
- Checks jobs nearing end time and emits admin notifications when expected check-in/out activity is missing

4. `contract_assignment_overrides`
- Applies scheduled contract assignment changes and can reassign already scheduled jobs

5. `contract_amendment_auto_apply`
- Applies due approved amendments and reconciles downstream job impact

## Public/External Access

1. Implemented public web routes
- `/p/:token` proposal view
- `/c/:token` contract view
- `/q/:token` quotation view

2. Implemented public API routes
- public proposals
- public contracts
- public quotations
- public invoices

3. Important nuance
- The API exposes public invoice endpoints, but the current web router does not include a public invoice page

## Endpoint Surface Summary

Current API route files expose these endpoint groups:

- 29 contract endpoints
- 24 proposal endpoints
- 20 time-tracking endpoints
- 18 inspection endpoints
- 15 job endpoints
- 14 facility endpoints
- 11 pricing-settings endpoints
- 11 quotation endpoints
- 10 expense endpoints
- 10 invoice endpoints
- 9 each for accounts, leads, and users
- plus supporting auth, team, template, finance, public-access, and settings routes

Public API endpoints currently exist for:

- proposals
- contracts
- quotations
- invoices

## Configuration Notes

1. Environment loading
- API explicitly loads the root `.env` from `apps/api/src/env.ts`
- Web uses Vite env handling plus dev proxy configuration in `apps/web/vite.config.ts`

2. URL requirements
- Public proposal, quotation, and contract send flows require `FRONTEND_URL`
- Internal app links require `WEB_APP_URL` or `FRONTEND_URL`
- Current code throws validation errors when those values are missing; it no longer relies on localhost fallback in `appUrl.ts`

3. Port/config drift to be aware of
- `.env.example` and Docker use API port `3001`
- `apps/api/src/index.ts` falls back to `3101` if `PORT` is unset
- `apps/web/vite.config.ts` proxies to `VITE_API_URL` and falls back to `http://localhost:3001`

## Practical Summary

The project is functionally broad and test-covered, not broken in the way the old snapshot suggested. The real current risk is narrower:

- tests are green
- API typecheck is green
- web typecheck is red
- top-level docs needed updating to reflect finance, contract-amendment automation, background-service settings, and current public-route behavior

Update this file after:
- major schema changes
- scheduler changes
- route additions/removals
- any change that moves test or typecheck status
