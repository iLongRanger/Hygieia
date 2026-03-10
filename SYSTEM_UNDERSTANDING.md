# System Understanding and Current Status

Date: 2026-03-10

## Current Status

1. Repository status
- Branch: `main`
- Local branch is ahead of `origin/main` by 5 commits
- Latest CRM commits:
  - `be35a74` `feat: strengthen crm dedupe and scope opportunities`
  - `380a7d7` `feat: wire opportunities through crm pipeline`
  - `09b9772` `fix: align crm readiness with opportunities`
  - `9ac8e18` `fix: clear reopened opportunity close state`
  - `74539d5` `refactor: centralize active opportunity selection`

2. Test and typecheck status
- Verified on 2026-03-10
- API-focused CRM test suites are passing
- `apps/api` typecheck is passing
- Root `npm run typecheck` is still failing because `apps/web` has active TypeScript drift

3. Current web typecheck drift
- Calendar appointment fixtures are missing expanded appointment fields:
  - `completionNotes`
  - `actualDuration`
  - `reminderSentAt`
  - `assignedTeam`
  - related appointment fields added since earlier fixture snapshots
- Facility fixtures are missing required `areas`
- Area fixtures are missing required `length` and `width`
- Contact type drift still exists between:
  - `apps/web/src/types/crm.ts`
  - `apps/web/src/types/contact.ts`
- Case-sensitive import drift still exists in:
  - `apps/web/src/pages/accounts/AccountHero.tsx`
  - lowercase `button` / `card` imports vs `Button.tsx` / `Card.tsx`
- Remaining known web TS issues still include:
  - `apps/web/src/pages/contracts/ContractDetail.tsx` (`nextDays` possibly undefined)
  - `apps/web/src/pages/public/PublicContractView.tsx` (`companyTimezone` missing from branding state)
  - `apps/web/src/pages/public/PublicProposalView.tsx` (`companyTimezone` missing from branding state)

4. Important documentation drift corrected by this snapshot
- The system is no longer accurately described as lead-centric CRM
- Opportunity-backed CRM flow is now partially implemented in runtime code
- `account.sourceLead` still exists for backward compatibility but should no longer be treated as the workflow authority
- Public invoice API access exists, but there is still no public invoice web route

## Verified Architecture

1. Monorepo layout
- `apps/api`: Express + TypeScript backend
- `apps/web`: React + Vite + TypeScript frontend
- `packages/database`: Prisma schema, migrations, seed, backfill scripts
- `packages/shared`, `packages/types`, `packages/ui`, `packages/utils`: shared workspace packages

2. Runtime entry points
- API entry: `apps/api/src/index.ts`
- Web entry: `apps/web/src/main.tsx`
- Frontend router: `apps/web/src/App.tsx`

3. Persistence and infra
- Database: PostgreSQL via Prisma
- Realtime/cache support: Redis and Socket.IO support are present
- Local infrastructure: `docker-compose.yml` provisions Postgres, Redis, API, and web

4. Security and auth model
- API auth: JWT middleware in `apps/api/src/middleware/auth.ts`
- API permission enforcement: `apps/api/src/middleware/rbac.ts`
- API ownership/IDOR protection: `apps/api/src/middleware/ownership.ts`
- API validation: Zod-based request validation in `apps/api/src/middleware/validate.ts`
- API rate limiting: Redis-backed limiters in `apps/api/src/middleware/rateLimiter.ts`
- Frontend route gating: `apps/web/src/components/auth/ProtectedRoute.tsx` and `apps/web/src/lib/routeAccess.ts`
- Frontend API token handling: `apps/web/src/lib/api.ts`

5. Security documentation caveat
- Older auth/security docs are still partially stale
- Live runtime behavior is:
  - verify Hygieia-issued JWT locally
  - load user from Prisma by `decoded.sub`
  - reject inactive users
  - resolve effective role from DB-backed assigned roles
  - enforce permissions and ownership in middleware

## Domain Model

The system is a commercial cleaning business platform that runs:
- CRM
- sales
- service scoping
- operations
- inspections
- workforce/time tracking
- billing
- finance reporting

The important business entities are:

1. `Lead`
- intake and attribution record
- first-touch inquiry context
- may exist before any customer account exists

2. `Account`
- customer/company master record
- outlives any single bid or sales cycle

3. `Opportunity`
- active sales-cycle record
- owns pipeline state and outcome
- links CRM workflow to walkthrough appointments, proposals, and contracts

4. `Facility`
- physical service location for an account
- contains scope structure used for pricing, inspections, and jobs

5. `Proposal`
- recurring-service sales document
- tied to account, optional facility, and optional opportunity

6. `Contract`
- post-sale service agreement
- handoff point from sales into operations

7. `Job`
- operational work item generated from contracts or one-time sales

8. `Inspection`
- quality-control record tied to facilities, jobs, accounts, or contracts

9. `Invoice`
- billing record tied to account/facility/contract

## How The System Works

### 1. CRM workflow

- Leads are captured, deduped, assigned, and moved through the pipeline
- Leads can be converted into:
  - account
  - primary contact
  - facility
- The CRM pipeline is in transition from `lead.status` ownership to `opportunity.status` ownership
- Current runtime behavior now dual-writes lead and opportunity pipeline state

Current supported pipeline statuses:
- `lead`
- `walk_through_booked`
- `walk_through_completed`
- `proposal_sent`
- `negotiation`
- `won`
- `lost`

### 2. Opportunity workflow

- An `Opportunity` now exists in the Prisma schema and local dev database
- Lead conversion creates or updates an opportunity
- Walkthrough appointments, proposals, and contracts can all link to `opportunityId`
- Proposal, contract, and walkthrough events now update opportunity status
- Reopened opportunities now clear stale `wonAt` / `lostAt` / `closedAt` values
- Active opportunity selection is centralized in:
  - `apps/api/src/services/opportunityResolver.ts`

Current practical rule:
- when an account or lead has multiple active opportunities, the system prefers the most advanced open opportunity instead of blindly using the newest row

Important transition note:
- `Lead.convertedToAccountId`
- `Account.sourceLead`
- `Appointment.leadId`

still exist and are still used in some compatibility paths, but they are no longer the intended long-term workflow authority.

### 3. Appointment workflow

- Supports lead-linked and account-linked scheduling
- Walkthrough appointments are the CRM bridge into proposal readiness
- Appointments include:
  - timezone
  - completion notes
  - actual duration
  - reminder tracking
  - reassignment support
  - optional inspection linkage
- Walkthrough completion updates both lead and opportunity pipeline state
- Reminder processing is handled by the reminder service/scheduler pair

### 4. Facility and scope workflow

- Facilities belong to accounts
- Facilities contain areas, fixtures, and facility tasks
- Facility scope is required before proposal creation
- Facilities can be submitted for proposal only after:
  - a valid opportunity exists
  - walkthrough requirements are satisfied
  - area/task scope is present
- Time breakdown calculations exist for scoped work

### 5. Proposal workflow

- Proposals support:
  - draft creation
  - service items and recurring service lines
  - service schedule data
  - pricing plan resolution
  - pricing snapshots
  - pricing locking/unlocking
  - pricing recalculation
  - proposal activities
  - proposal version history
  - public token viewing and acceptance/rejection
- Proposal readiness now resolves through opportunities rather than `account.sourceLead`
- Proposal updates now validate `opportunityId` ownership even when only the opportunity link changes
- Proposal send/accept/reject flows now sync opportunity state

### 6. Contract workflow

- Contracts can be created:
  - directly
  - from accepted proposals
- Contracts support:
  - send/view/sign lifecycle
  - public signing
  - assignment to teams/users
  - assignment overrides
  - amendments
  - renewal
  - termination
  - initial clean tracking
- Contract flows now sync linked opportunity state when `opportunityId` is present

### 7. Job workflow

- Supports recurring and one-time jobs
- Recurring jobs are generated from active contracts
- Job workflow includes:
  - creation
  - update
  - start
  - completion
  - cancellation
  - assignment
  - notes
  - tasks
  - activity history
- Background services maintain recurring-job horizon and alert on jobs nearing end without expected activity

### 8. Inspection workflow

- The system includes:
  - inspections
  - templates
  - activities
  - corrective actions
  - signoffs
  - reinspections
- Appointments can link to inspections
- Contract-related logic can auto-create inspection templates from scoped work

### 9. Time tracking and payroll workflow

- Time tracking includes clock-in/out flows and timesheets
- Timesheets support:
  - generation
  - submission
  - approval
  - rejection
  - deletion constraints
- Payroll includes payroll runs and payroll entries

### 10. Financial management workflow

- Billing includes invoices, payments, voiding, and contract-based invoice generation
- Finance module includes:
  - expenses
  - payroll
  - finance overview/reporting
- This system is materially broader than a CRM-only app

### 11. Notifications and realtime

- Notifications are stored in the database
- Socket.IO user-room realtime delivery is present
- Notification flows exist for:
  - assignments
  - proposals
  - quotations
  - contracts
  - reminders
  - system events

## Background Services

These schedulers are started from `apps/api/src/index.ts`:

1. `reminders`
- Sends appointment, contract expiry, proposal follow-up, and contract follow-up reminders

2. `recurring_jobs_autogen`
- Maintains forward-generated recurring jobs for active contracts

3. `job_alerts`
- Detects jobs nearing end time without expected check-in/out activity

4. `contract_assignment_overrides`
- Applies scheduled contract assignment changes and can reassign scheduled jobs

5. `contract_amendment_auto_apply`
- Applies due approved amendments and reconciles downstream operational impact

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
- Public invoice API access exists
- The current web router still does not include a public invoice page

## Endpoint Surface Summary

Major API route groups currently include:
- leads
- accounts
- contacts
- appointments
- facilities
- proposals
- contracts
- jobs
- inspections
- invoices
- time tracking
- payroll
- finance
- notifications
- quotations
- pricing/settings/templates

This is a CRM-to-operations system, not a standalone CRM.

## Current Project Risks

1. Web typecheck remains red
- This is the main current release risk

2. Opportunity transition is not finished
- runtime wiring exists in API flows
- schema is live locally
- compatibility fields still exist
- some UI/reporting paths still need to move fully from leads to opportunities

3. Documentation can still drift quickly
- update this file after schema, route, scheduler, or status changes

## Practical Summary

As of 2026-03-10:
- CRM dedupe hardening is in place
- opportunity schema is in place
- appointments, proposals, and contracts are opportunity-aware
- CRM readiness logic now prefers opportunities over `sourceLead`
- active opportunity selection is centralized
- API typecheck is green
- focused CRM suites are green
- root typecheck is still blocked by web TypeScript drift

Update this file after:
- major schema changes
- scheduler changes
- route additions/removals
- opportunity model changes
- any change that moves test or typecheck status
