# System Understanding and Current Status

Date: 2026-03-26

## Current Status

1. Repository status
- Branch: `main`
- Latest commits focus on: residential quote delivery, contract assignment fix, account detail UI restructure

2. Test and typecheck status
- `apps/api` typecheck is passing
- Root `npm run typecheck` still failing due to `apps/web` TypeScript drift
- Pre-existing TS errors: facilities.ts:278 accountId, appointmentService.ts:417, pricing/types.ts:10 AreaPricingBreakdown, proposalService.ts snapshot types, test files

3. Known web typecheck drift
- Calendar appointment fixtures missing expanded fields (completionNotes, actualDuration, reminderSentAt, assignedTeam)
- Facility fixtures missing required `areas`
- Area fixtures missing required `length` and `width`
- Contact type drift between `apps/web/src/types/crm.ts` and `apps/web/src/types/contact.ts`
- Contract-related TS issues (nextDays, companyTimezone on public views)

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
- Realtime/cache: Redis + Socket.IO
- Local infrastructure: `docker-compose.yml` provisions Postgres, Redis, API, and web

4. Security and auth model
- JWT middleware: `apps/api/src/middleware/auth.ts`
- Permission enforcement: `apps/api/src/middleware/rbac.ts`
- Ownership/IDOR protection: `apps/api/src/middleware/ownership.ts`
- Request validation: Zod schemas in `apps/api/src/schemas/`
- Rate limiting: Redis-backed limiters in `apps/api/src/middleware/rateLimiter.ts`
- Frontend route gating: `apps/web/src/components/auth/ProtectedRoute.tsx` + `apps/web/src/lib/routeAccess.ts`
- Frontend API token handling: `apps/web/src/lib/api.ts`

5. Roles (5 total, hierarchical)
- **owner** (level 100): full access
- **admin** (level 75): all except delete-level permissions
- **manager** (level 50): read/write, no admin/delete
- **cleaner** (level 25): dashboard, jobs, time tracking, facilities (read)
- **subcontractor** (level 10): dashboard, assigned contracts, jobs, time tracking, expenses (read)

## Domain Model

The system is a cleaning business management platform spanning CRM, sales, operations, inspections, workforce, billing, and finance.

### Core Entities

1. **Lead** — intake/attribution record; first-touch inquiry context
2. **Opportunity** — active sales-cycle record; owns pipeline state and outcome
3. **Account** — customer master record (commercial or residential)
4. **Contact** — people linked to accounts (primary, billing, etc.)
5. **Facility** — physical service location (commercial); contains areas, fixtures, tasks
6. **Residential Property** — service location (residential); contains home profile, access info
7. **Proposal** — recurring-service sales document with pricing plans
8. **Quotation** — one-time service sales document
9. **Residential Quote** — residential-specific quote with home profile pricing
10. **Contract** — post-sale service agreement; handoff from sales to operations
11. **Contract Amendment** — mid-contract scope/pricing changes with approval workflow
12. **Job** — operational work item (recurring from contracts, or one-time)
13. **Inspection** — quality-control record with templates, corrective actions, signoffs
14. **Invoice** — billing record with payment tracking
15. **Expense** — expense tracking with category management and approval workflow
16. **Payroll** — payroll runs with entries per employee
17. **Time Entry / Timesheet** — clock-in/out flows, timesheet generation, approval

## How The System Works

### 1. CRM Workflow
- Leads are captured, deduped, assigned, and moved through the pipeline
- Leads convert into: account + primary contact + facility/property
- Pipeline statuses: lead → walk_through_booked → walk_through_completed → proposal_sent → negotiation → won → lost
- CRM pipeline is opportunity-backed; lead and opportunity state are dual-written

### 2. Opportunity Workflow
- Opportunity owns pipeline state and outcome
- Lead conversion creates/updates an opportunity
- Walkthrough appointments, proposals, and contracts link to `opportunityId`
- Active opportunity selection centralized in `apps/api/src/services/opportunityResolver.ts`

### 3. Account Types
- **Commercial**: has facilities with areas/fixtures/tasks for scope-based pricing
- **Residential**: has residential properties with home profiles; uses residential pricing plans and quotes
- Account detail page uses shared tabbed layout (Overview, Service, History) with sidebar (Contacts, Service Overview)

### 4. Appointment Workflow
- Supports lead-linked and account-linked scheduling
- Types: walkthrough, service booking
- Includes: timezone, completion notes, duration, reminders, reassignment, inspection linkage
- Walkthrough completion updates both lead and opportunity pipeline state

### 5. Facility and Scope Workflow (Commercial)
- Facilities belong to accounts; contain areas, fixtures, facility tasks
- Scope required before proposal creation
- Pricing readiness checks, pricing comparison, task time breakdowns
- Submit-for-proposal workflow with opportunity/walkthrough validation

### 6. Residential Property Workflow
- Properties belong to residential accounts
- Home profile: home type, sqft, bedrooms, bathrooms, levels
- Property-level journey tracking (per-property pipeline stage)
- Access/entry notes, parking, pet information

### 7. Proposal Workflow (Commercial)
- Draft → send → view → accept/reject lifecycle
- Pricing plan resolution, snapshots, locking/unlocking, recalculation
- Version history, activity tracking
- Public token viewing and acceptance/rejection
- PDF generation

### 8. Quotation Workflow (Commercial One-Time)
- Similar lifecycle to proposals
- One-time service catalog for standardized services
- Pricing approval workflow
- Public token viewing, PDF generation

### 9. Residential Quote Workflow
- Quote generation with home profile-based pricing
- Manual review workflow (request review → approve review)
- Send → accept/decline lifecycle
- Convert accepted quotes to contracts
- Public token viewing
- PDF generation

### 10. Contract Workflow
- Created directly, from proposals, or as standalone
- Lifecycle: draft → send → view → sign → active → terminated
- Team/employee assignment with override scheduling (future-dated changes)
- Amendments with approval, recalculation, and auto-apply
- Renewal, initial clean tracking
- Contract assignment overrides now immediately reassign scheduled jobs on/after effectivity date
- Public signing, PDF generation

### 11. Job Workflow
- Recurring jobs auto-generated from active contracts
- One-time jobs created manually
- Lifecycle: scheduled → in_progress → completed/canceled
- Tasks, notes, assignment, activity history
- Initial clean completion flow

### 12. Inspection Workflow
- Templates (per-contract or global)
- Lifecycle: created → in_progress → completed/canceled
- Inspection items, corrective actions, verification
- Signoff workflow, reinspection
- Activity history

### 13. Time Tracking and Payroll
- Clock-in/out with break tracking
- Manual entry support
- Timesheet generation (individual + bulk), submission, approval/rejection
- Payroll run generation from approved timesheets
- Payroll entry editing, approval, mark-as-paid

### 14. Financial Management
- **Invoices**: manual creation, contract-based generation, batch generation, payment recording, voiding
- **Expenses**: category management, expense tracking, approval/rejection workflow
- **Payroll**: run generation, approval, payment marking
- **Finance Reports**: overview, AR aging, profitability, revenue, expense summary, labor cost, payroll summary

### 15. Notifications and Realtime
- Database-stored notifications
- Socket.IO user-room realtime delivery
- Notification flows: assignments, proposals, quotations, contracts, reminders, system events
- Unread count, mark-as-read, mark-all-read

## Background Services

Started from `apps/api/src/index.ts`:

1. **reminders** — appointment, contract expiry, proposal follow-up, contract follow-up reminders
2. **recurring_jobs_autogen** — forward-generates recurring jobs for active contracts
3. **job_alerts** — detects jobs nearing end time without expected check-in/out activity
4. **contract_assignment_overrides** — applies scheduled contract assignment changes and reassigns jobs
5. **contract_amendment_auto_apply** — applies due approved amendments and reconciles downstream impact

## API Endpoint Surface

All routes mounted at `/api/v1/`:

### Authenticated Routes (40 modules)

| Module | Prefix | Key Endpoints |
|--------|--------|--------------|
| Auth | `/auth` | login, logout, refresh, me, set-password |
| Users | `/users` | CRUD, roles, password reset |
| Lead Sources | `/lead-sources` | CRUD |
| Leads | `/leads` | CRUD, archive/restore, convert, can-convert |
| Appointments | `/appointments` | CRUD, reschedule, complete |
| Notifications | `/notifications` | list, unread-count, mark-read, mark-all-read |
| Accounts | `/accounts` | CRUD, archive/restore, activities |
| Contacts | `/contacts` | CRUD, archive/restore |
| Opportunities | `/opportunities` | list |
| Facilities | `/facilities` | CRUD, archive/restore, pricing, pricing-readiness, pricing-comparison, proposal-template, tasks-grouped, task-time-breakdown, submit-for-proposal |
| Area Types | `/area-types` | CRUD, guidance |
| Areas | `/areas` | CRUD, archive/restore |
| Task Templates | `/task-templates` | CRUD, archive/restore |
| Facility Tasks | `/facility-tasks` | CRUD, bulk create, archive/restore |
| Pricing Settings | `/pricing-settings` | CRUD, active, default, set-active, set-default, archive/restore |
| Residential | `/residential` | pricing-plans (CRUD, set-default, archive/restore), properties (list, create, update), quotes (CRUD, preview, approve-review, request-review, send, pdf, accept, decline, convert, archive/restore) |
| Fixture Types | `/fixture-types` | CRUD |
| Area Templates | `/area-templates` | CRUD, by-area-type |
| Proposals | `/proposals` | CRUD, archive/restore, send, viewed, accept, reject, remind, pdf, activities, versions, pricing lock/unlock/plan/recalculate/preview, service tasks |
| Proposal Templates | `/proposal-templates` | CRUD, default, archive/restore |
| Contracts | `/contracts` | CRUD, from-proposal, standalone, status, team assign, sign, send, terminate, archive/restore, renew, initial-clean, expiring, tasks, amendments (CRUD, recalculate, apply, reject, approve), activities, pdf, summary |
| Teams | `/teams` | CRUD, restore, resend-subcontractor-invite |
| Global Settings | `/settings/global` | get/put, logo upload/delete, background-services (list, logs, update, run-now) |
| Dashboard | `/dashboard` | stats, export |
| Jobs | `/jobs` | CRUD, generate, start, complete, complete-initial-clean, cancel, assign, tasks (CRUD), notes (create, delete), activities |
| Inspections | `/inspections` | CRUD, start, complete, cancel, items (CRUD), corrective-actions (CRUD, verify), signoffs, signoff, reinspect, activities |
| Inspection Templates | `/inspection-templates` | CRUD, by-contract, archive/restore |
| Time Tracking | `/time-tracking` | entries (CRUD), active, clock-in, clock-out, break start/end, manual-entry, timesheets (CRUD, generate, generate-bulk, submit, approve, reject) |
| Invoices | `/invoices` | CRUD, send, record-payment, void, generate from-contract, generate batch, activities |
| Quotations | `/quotations` | CRUD, by-number, send, viewed, accept, reject, approve-pricing, archive/restore, pdf |
| One-Time Service Catalog | `/one-time-service-catalog` | list, create, update, delete |
| Expenses | `/expenses` | categories (CRUD), expenses (CRUD), approve, reject |
| Payroll | `/payroll` | list, get, generate, approve, mark-paid, entry update, delete |
| Finance | `/finance` | overview, reports (ar-aging, profitability, revenue, expense-summary, labor-cost, payroll-summary) |

### Public Routes (no auth, rate-limited)

| Module | Prefix | Endpoints |
|--------|--------|-----------|
| Public Proposals | `/public/proposals` | get, viewed, accept, reject, pdf |
| Public Contracts | `/public/contracts` | get, viewed, sign, pdf |
| Public Contract Amendments | `/public/contract-amendments` | get, viewed, sign |
| Public Invoices | `/public/invoices` | get |
| Public Quotations | `/public/quotations` | get, viewed, accept, reject, pdf |
| Public Residential Quotes | `/public/residential-quotes` | get, accept, decline |

### Public Web Routes

| Path | View |
|------|------|
| `/p/:token` | Public proposal |
| `/c/:token` | Public contract |
| `/ca/:token` | Public contract amendment |
| `/q/:token` | Public quotation |
| `/rq/:token` | Public residential quote |

## Frontend Route Access

Permission-based route guards (from `routeAccess.ts`):

| Route | Required Permission |
|-------|-------------------|
| `/` | all authenticated |
| `/leads` | LEADS_READ |
| `/accounts` | ACCOUNTS_READ |
| `/residential/accounts/:id` | ACCOUNTS_READ |
| `/contacts` | CONTACTS_READ |
| `/facilities` | (no guard — open to all authenticated) |
| `/proposals` | PROPOSALS_READ |
| `/quotations` | QUOTATIONS_READ |
| `/quotations/catalog` | QUOTATIONS_ADMIN |
| `/contracts` | CONTRACTS_READ |
| `/jobs` | JOBS_READ |
| `/appointments` | APPOINTMENTS_READ |
| `/inspections` | INSPECTIONS_READ |
| `/inspections/new` | INSPECTIONS_WRITE |
| `/inspection-templates` | INSPECTIONS_ADMIN |
| `/time-tracking` | TIME_TRACKING_READ |
| `/timesheets` | TIME_TRACKING_APPROVE |
| `/invoices` | INVOICES_READ |
| `/pricing` | PRICING_READ |
| `/residential/pricing` | PRICING_READ |
| `/residential/quotes` | QUOTATIONS_READ |
| `/teams` | TEAMS_READ |
| `/tasks` | TASK_TEMPLATES_READ |
| `/area-templates` | AREA_TEMPLATES_READ_BY_TYPE |
| `/users` | USERS_READ |
| `/settings/global` | SETTINGS_WRITE |
| `/settings/proposal-templates` | PROPOSAL_TEMPLATES_READ |
| `/finance` | FINANCE_REPORTS_READ |
| `/finance/expenses` | EXPENSES_READ |
| `/finance/payroll` | PAYROLL_READ |
| `/finance/reports` | FINANCE_REPORTS_READ |

## Current Project Risks

1. **Web typecheck remains red** — main release risk
2. **Opportunity transition not finished** — runtime wiring exists, some UI paths still lead-centric
3. **No public invoice web page** — API endpoint exists but no frontend route

## Practical Summary

As of 2026-03-26:
- 40 authenticated API route modules + 6 public route modules
- 5-role RBAC system with hierarchical permissions and IDOR protection
- Residential and commercial account types with shared UI structure
- Full CRM-to-operations pipeline: leads → opportunities → proposals/quotes → contracts → jobs → invoices
- Background services: reminders, job auto-gen, job alerts, contract assignment overrides, amendment auto-apply
- API typecheck green; web typecheck red (known drift)

Update this file after major schema, route, scheduler, or permission changes.
