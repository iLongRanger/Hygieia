# Hygieia - Cleaning Business Management System

Single-tenant web application for managing cleaning operations across CRM, sales, operations, inspections, time tracking, billing, and finance. Supports both commercial and residential accounts.

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL 14+
- Redis (recommended for local development)
- Docker and Docker Compose (optional but recommended)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Run database migrations
npm run db:migrate

# 4. (Optional) Seed baseline data
npm run db:seed

# 5. Start API + Web
npm run dev
```

By default this starts:
- API: `http://localhost:3001`
- Web: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Current Modules

| Module | Description |
|--------|-------------|
| **CRM** | Leads, Accounts (commercial + residential), Contacts, Appointments, Opportunities |
| **Sales** | Proposals, Quotations (one-time), Residential Quotes, One-Time Service Catalog |
| **Contracts** | Contracts, Amendments, Team/Employee Assignment with Override Scheduling, Renewal |
| **Operations** | Jobs (recurring + one-time), Teams, Facilities, Residential Properties, Task Templates |
| **Quality** | Inspections, Inspection Templates, Corrective Actions, Signoffs |
| **Workforce** | Time Tracking (clock-in/out, breaks), Timesheets (generate, approve), Manual Entries |
| **Billing** | Invoices (manual + contract-based + batch generation), Payment Recording |
| **Finance** | Expenses (with categories + approval), Payroll (generate, approve, pay), Finance Reports |
| **Settings** | Global Settings, Pricing Plans (commercial + residential), Area/Proposal Templates, Users, Background Services |
| **Public Links** | Proposal, Contract, Contract Amendment, Quotation, Residential Quote, Invoice public views |
| **Notifications** | In-app realtime (Socket.IO) + database-stored notifications |

## Architecture

### Monorepo Layout

```text
hygieia/
  apps/
    api/        Express + TypeScript API (40 route modules + 6 public)
    web/        React + Vite + TypeScript app
  packages/
    database/   Prisma schema + migrations
    types/      Shared TypeScript types
    utils/      Shared utilities
    ui/         Shared UI components
    shared/     Shared code
```

### Backend Runtime
- Entry: `apps/api/src/index.ts`
- Auth: JWT middleware + 5-role RBAC (owner, admin, manager, cleaner, subcontractor)
- ORM: Prisma + PostgreSQL
- Validation: Zod-based request schemas
- Realtime: Socket.IO user-room notifications
- Rate Limiting: Redis-backed (global + sensitive + public endpoint limiters)
- Background Schedulers:
  - Appointment/contract/proposal reminders
  - Recurring job auto-generation
  - Job nearing-end alerts
  - Contract assignment override application
  - Contract amendment auto-apply

### Frontend Runtime
- Entry: `apps/web/src/main.tsx`
- Router: `apps/web/src/App.tsx`
- State: Zustand stores + React Query
- API client: Axios with access-token refresh
- Route access control: Permission-based route guards via `routeAccess.ts`
- UI: Tailwind CSS + Lucide React icons

### Security
- JWT authentication with token refresh
- Role-based access control (RBAC) with 75 permission constants
- IDOR protection via ownership middleware (8 resource types)
- Rate limiting on auth, sensitive operations, and public endpoints
- Helmet security headers, CORS validation

## API Surface

All routes at `/api/v1/`. See [SYSTEM_UNDERSTANDING.md](./SYSTEM_UNDERSTANDING.md) for the complete endpoint listing.

**Authenticated modules (40):** Auth, Users, Lead Sources, Leads, Appointments, Notifications, Accounts, Contacts, Opportunities, Facilities, Area Types, Areas, Task Templates, Facility Tasks, Pricing Settings, Residential (pricing plans, properties, quotes), Fixture Types, Area Templates, Proposals, Proposal Templates, Contracts (with amendments), Teams, Global Settings, Dashboard, Jobs, Inspections, Inspection Templates, Time Tracking (with timesheets), Invoices, Quotations, One-Time Service Catalog, Expenses, Payroll, Finance.

**Public modules (6):** Proposals, Contracts, Contract Amendments, Invoices, Quotations, Residential Quotes.

## Scripts

### Root Scripts
- `npm run dev` - Start API and web in parallel
- `npm run dev:api` - Start API only
- `npm run dev:web` - Start web only
- `npm run build` - Build all workspaces
- `npm run test` - Run workspace tests via Turbo
- `npm run test:unit` - Run workspace unit tests via Turbo
- `npm run test:integration` - Run workspace integration tests via Turbo
- `npm run test:e2e` - Run Playwright tests in `tests/e2e`
- `npm run lint` - Lint all workspaces
- `npm run lint:fix` - Autofix lint issues
- `npm run typecheck` - Typecheck all workspaces
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

### Coverage Scripts
- API coverage: `cd apps/api && npm run test:coverage`
- Web coverage: `cd apps/web && npm run test:coverage`

## Environment Notes

- API defaults come from `.env.example`.
- Web dev proxy defaults are defined in `apps/web/vite.config.ts`.
- Ensure `CORS_ORIGIN` and `VITE_API_BASE_URL` match your local/prod URLs.
- In production, set `FRONTEND_URL` and `WEB_APP_URL` so outbound public and app links can be generated correctly.

## Documentation

Core docs live in `Documentation/` and project root:
- [System Understanding](./SYSTEM_UNDERSTANDING.md)
- [Development Guide](./DEVELOPMENT.md)
- [Testing Guide](./TESTING.md)
- [Production Checklist](./PRODUCTION_CHECKLIST.md)
- [RBAC Diagram](./Documentation/RBAC_DIAGRAM.html)
- [Frontend RBAC Model](./Documentation/FRONTEND_RBAC_MODEL.md)

## Project Status

Active development. As of 2026-03-26:
- API typecheck passes
- Web typecheck has known TypeScript drift (active release risk)
- 40 authenticated + 6 public API route modules
- 5 public web routes (proposal, contract, amendment, quotation, residential quote)

Before production deployment:
- Keep migrations clean and applied in all environments
- Require passing tests and typechecks
- Run manual UAT on critical business flows
- Verify scheduler/notification behavior in staging

## License

MIT
