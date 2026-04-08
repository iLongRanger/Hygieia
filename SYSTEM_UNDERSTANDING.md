# System Understanding and Current Status

Date: 2026-04-08

## Current Status

### Repository Snapshot
- Primary branch: `main`
- Monorepo with `apps/api`, `apps/web`, and shared workspace packages under `packages/`
- Current route file count in `apps/api/src/routes`: `40` total
- Route split: `34` authenticated modules and `6` public modules

### Build and Typecheck Status
- `apps/api` typecheck is failing
- `apps/web` typecheck is failing
- Root `npm run typecheck` is therefore failing

Current failures include:
- API contract route/service typing mismatches
- API proposal/pricing typing drift
- API test setup typing for `@jest/globals`
- Web test fixture drift against current shared types
- Web contact, contract form, task template, and React Query typing issues

### Current Documentation Corrections vs Previous State
- Public invoice support exists in both API and web
- The API does not have 40 authenticated route modules; it has 34 authenticated and 6 public
- API typecheck is not green at the moment
- Login is a two-step email/password plus SMS verification flow

## Verified Architecture

### Monorepo Layout
- `apps/api`: Express + TypeScript backend
- `apps/web`: React + Vite + TypeScript frontend
- `packages/database`: Prisma schema, migrations, seed, and DB scripts
- `packages/shared`: shared cross-workspace code
- `packages/types`: shared TypeScript contracts
- `packages/ui`: shared UI components
- `packages/utils`: shared utilities

### Runtime Entry Points
- API entry: `apps/api/src/index.ts`
- Web entry: `apps/web/src/main.tsx`
- Frontend router: `apps/web/src/App.tsx`

### Persistence and Infrastructure
- Database: PostgreSQL via Prisma
- Cache / rate limiting / worker support: Redis
- Realtime transport: Socket.IO
- Local infrastructure: `docker-compose.yml` provisions Postgres, Redis, API, and web containers

### Backend Platform
- Express API using route modules under `apps/api/src/routes`
- Request validation primarily via Zod schemas in `apps/api/src/schemas`
- Prisma client bootstrap in `apps/api/src/lib/prisma.ts`
- Environment loading and local DB URL resolution in `apps/api/src/env.ts`
- Email delivery via Resend / notification email helpers
- SMS delivery via Twilio-backed `smsService`

### Frontend Platform
- React 18 + Vite
- TanStack React Query for server-state fetching
- Zustand for client-side auth and UI state
- Tailwind CSS for styling
- Route protection via `ProtectedRoute` and `routeAccess.ts`

## Security and Identity Model

### Authentication
- Primary login entrypoint: `POST /api/v1/auth/login`
- Login is not completed on password validation alone
- Successful credential validation issues an SMS verification challenge
- Login completion happens through `POST /api/v1/auth/login/verify`
- Access tokens are returned in the response
- Refresh tokens are set in an HTTP-only cookie and also handled by auth endpoints

### Password and Onboarding Flows
- Forgot-password flow exists
- Password reset flow exists
- Set-password flow exists for invited users
- Subcontractor password setup can require SMS verification before password creation

### Authorization
- JWT middleware: `apps/api/src/middleware/auth.ts`
- RBAC middleware: `apps/api/src/middleware/rbac.ts`
- Ownership protection / IDOR controls: `apps/api/src/middleware/ownership.ts`
- Frontend route access map: `apps/web/src/lib/routeAccess.ts`

### Roles
- `owner`
- `admin`
- `manager`
- `cleaner`
- `subcontractor`

## Domain Model

Hygieia is a cleaning business operating system spanning CRM, sales, service delivery, workforce coordination, billing, and finance.

### Core Records
1. Lead
2. Opportunity
3. Account
4. Contact
5. Facility
6. Residential Property
7. Appointment
8. Proposal
9. Quotation
10. Residential Quote
11. Contract
12. Contract Amendment
13. Team
14. Job
15. Inspection
16. Time Entry
17. Timesheet
18. Invoice
19. Expense
20. Payroll Run / Payroll Entry
21. Notification

## Major Business Workflows

### CRM and Sales
- Leads are captured and attributed through lead sources
- Opportunities represent active sales pipeline records
- Leads, appointments, proposals, quotations, and contracts can link through opportunity context
- Accounts support both commercial and residential customers

### Commercial Service Design
- Facilities belong to accounts
- Facilities contain areas, fixtures, and facility tasks
- Commercial pricing and proposal generation rely on facility scope definition

### Residential Workflow
- Residential accounts can have residential properties
- Residential pricing plans and residential quotes are managed separately from commercial proposals
- Residential quotes have public review / decision flows and contract conversion behavior

### Proposal and Quotation Workflow
- Proposals handle recurring commercial service sales
- Quotations handle one-time service sales
- Both support send, view, public access, PDF generation, and decision tracking

### Contract Workflow
- Contracts can be created directly or from proposals
- Public contract signing exists
- Contracts support renewals, assignment changes, amendments, reminders, and job generation
- Contract amendments can be approved and auto-applied by background services

### Operations and Quality
- Jobs can be manual or recurring
- Teams and assigned workers execute service
- Inspections track quality checks, signoffs, and corrective actions

### Workforce
- Clock-in / clock-out and break tracking exist
- Manual time entries exist
- Timesheets support generation, submission, approval, and rejection
- Payroll runs are generated from workforce data and then approved / marked paid

### Billing and Finance
- Invoices support manual creation, contract-based generation, and batch generation
- Payment recording exists
- Expenses include category management and approval/rejection
- Finance reports cover AR, profitability, revenue, expense, labor cost, and payroll summary views

### Notifications
- Notifications are stored in the database
- Socket.IO delivers realtime notifications to user rooms
- Email and SMS are also used for specific reminder and verification flows

## Background Services

Started from `apps/api/src/index.ts`:

1. `startReminderScheduler`
2. `startRecurringJobScheduler`
3. `startJobAlertScheduler`
4. `startContractAssignmentOverrideScheduler`
5. `startContractAmendmentAutoApplyScheduler`

Responsibilities:
- appointment / contract / proposal reminder processing
- recurring job forward-generation
- near-end or missed-job alerting
- scheduled contract assignment override application
- approved amendment auto-application

## API Surface

All routes are mounted under `/api/v1/`.

### Authenticated Route Modules (34)

| Module | Prefix | Notes |
|--------|--------|-------|
| Auth | `/auth` | login, SMS verify, refresh, me, profile, password flows |
| Users | `/users` | user management |
| Lead Sources | `/lead-sources` | lead source CRUD |
| Leads | `/leads` | lead CRUD and conversion |
| Appointments | `/appointments` | scheduling and completion |
| Notifications | `/notifications` | inbox and read-state management |
| Accounts | `/accounts` | account CRUD and activities |
| Contacts | `/contacts` | contact CRUD |
| Opportunities | `/opportunities` | opportunity views |
| Facilities | `/facilities` | facility CRUD, pricing readiness, proposal prep |
| Area Types | `/area-types` | area type CRUD |
| Areas | `/areas` | area CRUD |
| Task Templates | `/task-templates` | task template CRUD |
| Facility Tasks | `/facility-tasks` | facility task CRUD and bulk operations |
| Pricing Settings | `/pricing-settings` | pricing config management |
| Residential | `/residential` | pricing plans, properties, residential quotes |
| Fixture Types | `/fixture-types` | fixture type CRUD |
| Area Templates | `/area-templates` | template CRUD |
| Proposals | `/proposals` | proposal lifecycle and pricing operations |
| Proposal Templates | `/proposal-templates` | template CRUD |
| Contracts | `/contracts` | contracts, assignment, signing, amendments, renewals |
| Teams | `/teams` | team CRUD and subcontractor invite resend |
| Global Settings | `/settings/global` | branding and background service controls |
| Dashboard | `/dashboard` | overview and export |
| Jobs | `/jobs` | job CRUD and lifecycle |
| Inspections | `/inspections` | inspection lifecycle and corrective actions |
| Inspection Templates | `/inspection-templates` | template CRUD |
| Time Tracking | `/time-tracking` | entries, breaks, timesheets |
| Invoices | `/invoices` | invoice lifecycle and payment recording |
| Quotations | `/quotations` | quotation lifecycle and pricing approval |
| One-Time Service Catalog | `/one-time-service-catalog` | one-time catalog management |
| Expenses | `/expenses` | categories and expenses |
| Payroll | `/payroll` | payroll runs and entries |
| Finance | `/finance` | finance dashboards and reports |

### Public Route Modules (6)

| Module | Prefix | Notes |
|--------|--------|-------|
| Public Proposals | `/public/proposals` | view, viewed, accept, reject, pdf |
| Public Contracts | `/public/contracts` | view, viewed, sign, pdf |
| Public Contract Amendments | `/public/contract-amendments` | view, viewed, sign |
| Public Invoices | `/public/invoices` | public invoice retrieval |
| Public Quotations | `/public/quotations` | view, viewed, accept, reject, pdf |
| Public Residential Quotes | `/public/residential-quotes` | view, accept, decline |

## Frontend Route Surface

### Public Web Routes
- `/`
- `/login`
- `/auth/forgot-password`
- `/auth/set-password`
- `/auth/reset-password`
- `/p/:token`
- `/c/:token`
- `/ca/:token`
- `/q/:token`
- `/rq/:token`
- `/i/:token`
- `/unauthorized`

### Authenticated App Shell
- `/app`
- `/profile`
- leads, appointments, accounts, contacts
- facilities, tasks, area templates
- pricing and residential pricing
- proposals, quotations, contracts
- jobs, inspections, inspection templates
- time tracking and timesheets
- invoices
- finance, expenses, payroll, finance reports
- notifications
- teams
- settings
- users

## Frontend Route Access

Permission-guarded routes are defined in `apps/web/src/lib/routeAccess.ts`.

Current guarded groups include:
- area templates
- global settings
- proposal templates
- users
- jobs
- appointments
- inspections and inspection templates
- time tracking and timesheets
- invoices
- leads
- accounts
- contacts
- proposals
- quotations and quotation catalog
- contracts
- pricing and residential pricing
- residential quotes
- teams
- facilities
- tasks
- finance overview, expenses, payroll, and reports

## Operational Notes

### Environment
- Root `.env.example` is the main API development template
- `packages/database/.env` also exists for Prisma tooling
- Local runtime needs correct direct PostgreSQL connection strings for Prisma-backed app execution
- Web/API link generation depends on `FRONTEND_URL` and `WEB_APP_URL`

### Current Risks
1. API typecheck is red
2. Web typecheck is red
3. Docs can go stale quickly when route counts or auth flows change

## Practical Summary

As of 2026-04-08:
- The product is a single-tenant commercial + residential cleaning operations system
- The API exposes 34 authenticated route modules and 6 public route modules
- The web app includes 6 public tokenized document pages, including invoices
- Authentication now includes SMS verification during login
- Background schedulers handle reminders, job generation, job alerts, assignment overrides, and contract amendment auto-apply
- Both API and web currently have unresolved TypeScript drift

Update this file whenever any of the following change:
- route module counts
- public document support
- auth / verification flow
- scheduler inventory
- major domain workflows
- current typecheck status
