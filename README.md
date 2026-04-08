# Hygieia

Single-tenant cleaning operations platform covering CRM, sales, contracts, field operations, inspections, workforce management, billing, and finance. The system supports both commercial and residential business lines.

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+ or a compatible workspace-aware package manager
- PostgreSQL 14+
- Redis 7+ for rate limiting, notifications, and background workers
- Docker and Docker Compose for local infrastructure, if desired

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Start local infrastructure if needed
docker compose up -d postgres redis

# 4. Apply database migrations and generate Prisma client
npm run db:migrate:deploy:local

# 5. (Optional) Seed baseline data
npm run db:seed

# 6. Start the API and web apps
npm run dev
```

### Local Runtime Defaults
- API dev server: `http://localhost:3001`
- Web dev server: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Docker compose also exposes a containerized web app on `http://localhost:3000`.

## Product Surface

| Area | Capabilities |
|------|--------------|
| Identity & Access | JWT auth, refresh tokens, SMS login verification, password setup/reset, RBAC |
| CRM | Lead sources, leads, opportunities, accounts, contacts, appointments |
| Sales | Commercial proposals, one-time quotations, residential quotes, proposal templates |
| Contracts | Contracts, amendments, renewals, public signing, team assignment overrides |
| Operations | Facilities, areas, facility tasks, task templates, teams, jobs |
| Residential | Residential pricing plans, residential properties, residential quote workflow |
| Quality | Inspections, templates, signoffs, corrective actions |
| Workforce | Time tracking, breaks, manual entries, timesheets |
| Billing | Invoices, contract-based generation, batch generation, public invoice view, payment recording |
| Finance | Expenses, payroll, finance reports |
| Notifications | Database-backed notifications, Socket.IO realtime delivery, email/SMS reminders |
| Settings | Global branding/settings, background service controls, pricing settings |

## Architecture

### Monorepo Layout

```text
hygieia/
  apps/
    api/        Express + TypeScript API
    web/        React + Vite + TypeScript frontend
  packages/
    database/   Prisma schema, migrations, seed, backfill scripts
    shared/     Shared workspace code
    types/      Shared TypeScript types
    ui/         Shared UI package
    utils/      Shared utilities
```

### Backend
- Entry point: `apps/api/src/index.ts`
- Stack: Express, TypeScript, Prisma, PostgreSQL
- Validation: Zod schemas
- Realtime: Socket.IO
- Rate limiting: Redis-backed middleware
- Notifications: email + SMS delivery helpers plus in-app notifications
- Background services started from the API entrypoint:
  - reminders
  - recurring job auto-generation
  - job end alerts
  - contract assignment override application
  - contract amendment auto-apply

### Frontend
- Entry point: `apps/web/src/main.tsx`
- Router: `apps/web/src/App.tsx`
- State: Zustand
- Data fetching: TanStack React Query
- HTTP client: Axios with access-token refresh
- Styling: Tailwind CSS

### Authentication and Security
- Email/password login is a two-step flow with SMS verification
- Refresh tokens are also stored in an HTTP-only cookie for the auth routes
- 5 system roles: `owner`, `admin`, `manager`, `cleaner`, `subcontractor`
- Permission-based route gating in the web app
- Ownership middleware protects sensitive resource access
- Helmet, CORS validation, and request rate limiting are enabled in the API

## API and Web Surface

All API routes are mounted under `/api/v1/`.

- Authenticated API route modules: `34`
- Public API route modules: `6`
- Public web routes: landing page plus 6 tokenized public document pages

Public document routes currently include:
- proposals
- contracts
- contract amendments
- quotations
- residential quotes
- invoices

## Scripts

### Root
- `npm run dev`
- `npm run dev:api`
- `npm run dev:web`
- `npm run build`
- `npm run test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run lint`
- `npm run lint:fix`
- `npm run typecheck`
- `npm run db:migrate`
- `npm run db:migrate:deploy:local`
- `npm run db:migrate:deploy:local:safe`
- `npm run db:generate`
- `npm run db:seed`
- `npm run db:studio`
- `npm run db:reset`

### Workspace Highlights
- API tests: `cd apps/api && npm test`
- Web tests: `cd apps/web && npm test`
- API typecheck: `cd apps/api && npm run typecheck`
- Web typecheck: `cd apps/web && npm run typecheck`

## Environment Notes

Root `.env.example` defines the development defaults used by the API. Important settings include:
- `DATABASE_URL`
- `REDIS_URL`
- `FRONTEND_URL`
- `WEB_APP_URL`
- `CORS_ORIGIN`
- `RESEND_API_KEY`
- `TWILIO_*`
- `REMINDERS_ENABLED`
- `GEOCODING_ENABLED`

For local API runtime, the app resolves a direct PostgreSQL URL even if a Prisma proxy URL is present in the process environment.

## Current Status

Status checked on 2026-04-08:
- API typecheck is currently failing
- Web typecheck is currently failing
- Public invoice API and web page both exist
- Auth flow includes SMS verification for login and conditional password setup verification

This README is intended to stay high-signal. For detailed endpoint, workflow, and route-access coverage, see [SYSTEM_UNDERSTANDING.md](A:\Projects\Hygieia\SYSTEM_UNDERSTANDING.md).
