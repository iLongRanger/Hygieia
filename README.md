# Hygieia - Commercial Cleaning Management System

Single-tenant web application for managing commercial cleaning operations across CRM, sales, operations, inspections, time tracking, and billing.

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
cp apps/web/.env.example apps/web/.env

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

- CRM: Leads, Accounts, Contacts, Appointments
- Sales: Proposals, Quotations, Contracts
- Operations: Jobs (recurring + one-time), Teams, Facilities, Tasks
- Quality: Inspections + templates
- Workforce: Time tracking + timesheets
- Billing: Invoices (manual + bulk generation)
- Settings: Global settings, pricing plans, area/proposal templates, users
- Public links: Proposal, quotation, contract, and invoice public views
- Notifications: In-app realtime + optional email

## Architecture

### Monorepo Layout

```text
hygieia/
  apps/
    api/        Express + TypeScript API
    web/        React + Vite + TypeScript app
  packages/
    database/   Prisma schema + migrations
    types/      Shared TypeScript types
    utils/      Shared utilities
    ui/         Shared UI components
```

### Backend Runtime
- Entry: `apps/api/src/index.ts`
- Auth: JWT middleware + permission checks
- ORM: Prisma + PostgreSQL
- Realtime: Socket.IO user-room notifications
- Schedulers:
  - reminder scheduler
  - recurring job auto-regeneration scheduler
  - job nearing-end alert scheduler

### Frontend Runtime
- Entry: `apps/web/src/main.tsx`
- Router: `apps/web/src/App.tsx`
- API client: Axios with access-token refresh
- Route access control: permission-based route guards

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
- Web defaults come from `apps/web/.env.example`.
- Ensure `CORS_ORIGIN` and `VITE_API_BASE_URL` match your local/prod URLs.
- In production, set `FRONTEND_URL`/`WEB_APP_URL` so outbound public links do not fallback to localhost.

## Documentation

Core docs live in `Documentation/` and project root:
- [Development Guide](./DEVELOPMENT.md)
- [Testing Guide](./TESTING.md)
- [Production Checklist](./PRODUCTION_CHECKLIST.md)
- [System Understanding](./SYSTEM_UNDERSTANDING.md)

## Project Status

This project is in active development and feature-hardening. Before production deployment:
- keep migrations clean and applied in all environments
- require passing tests and typechecks
- run manual UAT on critical business flows
- verify scheduler/notification behavior in staging

## License

MIT
