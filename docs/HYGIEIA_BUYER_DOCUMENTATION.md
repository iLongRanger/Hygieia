# Hygieia Buyer Documentation

Prepared for prospective buyers or technical evaluators.

Last updated: 2026-05-06

## 1. Executive Summary

Hygieia is a single-tenant operations platform for cleaning companies. It is designed to manage the full operating cycle of a commercial and residential cleaning business: lead capture, account management, service locations, walkthrough appointments, proposals, contracts, job execution, inspections, time tracking, invoicing, expenses, payroll, reporting, and user access.

The product is built as a modern TypeScript monorepo with a React web application, an Express API, PostgreSQL persistence through Prisma, Redis-backed runtime services, role-based access control, and public client-facing document links for proposals, contracts, amendments, quotes, and invoices.

The system is best suited for a cleaning company, franchise operator, local-service software buyer, or SaaS acquirer looking for a vertical operations product with a broad feature surface already implemented.

## 2. Product Positioning

### Target Customer

Hygieia is built for cleaning businesses that manage multiple client types and recurring or one-time work:

- Commercial cleaning providers
- Residential cleaning providers
- Mixed commercial/residential operators
- Cleaning businesses that use subcontractors
- Operators that need proposals, contracts, jobs, inspections, invoices, and payroll in one workflow

### Core Value Proposition

Most cleaning companies operate across disconnected tools: spreadsheets, calendar apps, email, invoice software, payroll systems, and paper checklists. Hygieia consolidates those workflows into one operational system:

- Sales work flows into contracts.
- Contracts flow into jobs.
- Jobs flow into inspections, payroll, and invoicing.
- Service locations hold the operational scope for both commercial and residential accounts.
- Public links allow clients to review and accept documents without a client login.

## 3. High-Level Workflow

1. Configure company profile, tax rate, branding, email settings, pricing rules, workers, teams, area templates, and task templates.
2. Capture leads and convert qualified opportunities into accounts.
3. Create contacts and service locations for each account.
4. Book walkthroughs and document site notes.
5. Build service-location areas and task scope.
6. Create commercial, residential, or specialized proposals.
7. Send a public proposal link for client review.
8. Convert accepted work into contracts.
9. Activate contracts and assign teams.
10. Generate and manage jobs.
11. Track work, time entries, inspections, and corrective actions.
12. Generate invoices, record payments, capture expenses, and run payroll.
13. Review finance and operations reports.

## 4. Module Inventory

The app sidebar currently exposes these primary modules.

### Dashboard

Daily command center for owners, admins, and managers. It surfaces high-level metrics, active work, alerts, and quick links into overdue or high-priority records.

### CRM

CRM is split into four operational pages:

- Leads: capture and qualify new opportunities.
- Accounts: manage commercial and residential customer records.
- Contacts: manage people tied to accounts, billing, and decisions.
- Service Locations: manage the physical locations where service is delivered, including areas and task scope.

### Sales

Sales is split into:

- Proposals: create commercial, residential, and specialized proposals.
- Contracts: convert accepted work into service agreements.
- Invoices: bill clients and track payment status.

### Operations

Operations is split into:

- Jobs: schedule, assign, and track cleaning work.
- Inspections: perform quality checks and document issues.
- Time Tracking: record hourly work and support payroll.
- Appointments: book walkthroughs, visits, inspections, and customer meetings.

### Finance

Finance is split into:

- Overview: financial health dashboard.
- Expenses: record and review operating costs.
- Payroll: calculate worker and subcontractor pay.
- Reports: review financial and operational reporting.

### Pricing

Pricing is split into:

- Commercial Pricing: recurring commercial pricing rules.
- Residential Pricing: residential plans, frequencies, and add-ons.
- Specialized Job: catalog for one-time or specialized services.

### Manage

Manage is split into:

- Area: reusable service-location area templates.
- Task: reusable cleaning task templates.
- People: users, workers, roles, compensation setup, and access.
- Subcontractor Access: subcontractor team management and invites.
- Global Settings: company profile, branding, tax, email, and background services.

### Support Guide

In-app product guide covering setup, workflow order, and module responsibilities.

## 5. Client-Facing Public Links

Hygieia includes public routes for customers to review documents without logging into the admin app:

- Proposal view
- Contract view
- Contract amendment view
- Specialized quotation view
- Residential quote view
- Invoice view

These routes are tokenized and intended for email delivery to customers.

## 6. User Roles and Access Model

The system supports role and permission-based access. Current role concepts include:

- Owner
- Admin
- Manager
- Cleaner
- Subcontractor

The web app gates protected routes through route-access rules, and the API includes RBAC middleware and ownership checks for sensitive resources. Field workers and subcontractors receive a reduced navigation experience focused on assigned work, expenses where applicable, and support.

## 7. Technical Architecture

### Repository Layout

```text
Hygieia/
  apps/
    api/        Express + TypeScript backend
    web/        React + Vite + TypeScript frontend
  packages/
    database/   Prisma schema, migrations, seed scripts
    shared/     Shared application code
    types/      Shared TypeScript types
    ui/         Shared UI package
    utils/      Shared utilities
```

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack React Query
- Zustand
- Axios
- React Router
- Lucide icons

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- Socket.IO
- Zod validation
- JWT authentication and refresh tokens

### Database

The database is PostgreSQL, managed through Prisma migrations. The schema includes core entities for users, roles, leads, accounts, contacts, service locations, proposals, contracts, appointments, jobs, inspections, time entries, invoices, expenses, payroll, notifications, background service settings, residential quotes, and specialized quotations.

## 8. Operational Capabilities

### Sales Operations

- Lead and account management
- Commercial proposals
- Residential proposals
- Specialized one-time job proposals
- Public proposal acceptance or rejection
- Contract creation and activation
- Contract amendments
- Public contract signing
- Invoice generation and public invoice view

### Field Operations

- Service-location scope management
- Area and task templates
- Walkthrough appointments
- Job scheduling
- Worker assignments
- Subcontractor assignments
- Time tracking
- Inspections and corrective actions

### Financial Operations

- Invoice management
- Payment recording
- Expense capture
- Payroll calculation
- Finance overview
- Financial reports

### Automation and Runtime Services

The backend includes background service concepts for reminders, recurring job generation, job end alerts, contract assignment overrides, and contract amendment auto-application. Redis is used for runtime services such as rate limiting, notifications, and background worker support.

## 9. Security and Data Handling

Security-related features include:

- JWT authentication
- Refresh tokens
- Password setup and reset flows
- SMS and email verification challenge models
- Role-based access control
- Route-level permission checks
- API ownership middleware
- Tokenized public document links
- Hashed public tokens for supported public document flows
- CORS validation
- Helmet middleware
- Rate limiting

For a transaction or production deployment, a buyer should perform a standard security review covering environment management, production CORS origins, token lifetime policy, secrets handling, dependency audit, database backup policy, and SMTP/SMS provider configuration.

## 10. Deployment Requirements

Typical runtime requirements:

- Node.js 18 or newer
- npm 9 or workspace-compatible package manager
- PostgreSQL 14 or newer
- Redis 7 or newer
- Environment variables for database, Redis, frontend URL, API URL, email provider, SMS provider, and auth secrets

The repository includes Docker Compose support for local infrastructure and workspace scripts for development, build, database migration, seeding, testing, linting, and typechecking.

## 11. Buyer Handoff Package

A buyer should expect the following assets in the repository:

- Source code for web and API applications
- Prisma schema and migration history
- Seed and backfill scripts
- Shared workspace packages
- Tests for many backend and frontend workflows
- Public document pages
- Admin dashboard and module pages
- In-app support guide
- README, changelog, and buyer documentation

Recommended handoff items outside the repository:

- Production environment variables
- Database backup or seed dataset, if applicable
- Hosting account access
- Email/SMS provider access
- Domain and DNS ownership transfer details
- Any active customer data agreements
- License/IP assignment documentation

## 12. Current Verification Notes

As of this documentation update:

- The web workspace typecheck command passes: `npm run typecheck -w @hygieia/web`.
- The updated support guide page passes a direct ESLint check.
- A full web lint run currently reports unrelated pre-existing issues in other files. These should be reviewed before a production handoff or buyer technical audit.

This document is product-facing and does not replace a technical due-diligence audit.

## 13. Suggested Buyer Due Diligence

Before purchasing or deploying, a buyer should review:

- Code ownership and IP assignment
- Open-source dependency licenses
- Production readiness of authentication and public links
- Database migration history
- Backup and restore procedure
- Test coverage around critical financial and signing workflows
- Payment integration status, if online payments are expected
- Email and SMS provider configuration
- Hosting, monitoring, and incident-response plan
- Accessibility and mobile usability
- Data privacy obligations for customer, worker, and subcontractor data

## 14. Commercialization Opportunities

Potential paths to market:

- Sell as a single-tenant internal operations platform for cleaning companies.
- Convert to a multi-tenant SaaS product.
- License to regional cleaning franchises.
- Use as a custom CRM/ERP base for service businesses beyond cleaning.
- Package as a managed software + implementation service.

Potential roadmap items:

- Multi-tenant billing and subscription management
- Payment processor integration
- Customer portal
- Mobile-first field worker app
- Route optimization
- Inventory and supply tracking
- Advanced KPI dashboards
- Automated email/SMS workflows
- Accounting software integrations
- Production monitoring and audit log dashboard

## 15. Summary for Buyers

Hygieia is a substantial vertical operations platform for cleaning businesses. It already contains a broad set of modules that many operators normally stitch together from several products: CRM, pricing, proposals, contracts, jobs, inspections, time tracking, invoices, expenses, payroll, reporting, and subcontractor access.

The strongest buyer fit is someone who understands cleaning operations or local-service software and wants a working product foundation that can be deployed internally, sold as a managed solution, or expanded into a broader SaaS offering.
