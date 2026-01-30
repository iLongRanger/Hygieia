# Hygieia User Testing Workflow

This workflow is a short, repeatable process you can give to test users to validate the system end-to-end. It focuses on the main UI flows, uses seeded data, and produces clear pass/fail results.

## 1) Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker Desktop (optional but recommended)

## 2) One-time Setup

From the project root:

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
```

Seeded admin credentials:

- Email: `admin@company.com`
- Password: `Admin@123`

Note: The seed script prints these credentials and recommends changing the password after first login.

## 3) Start the App

Option A: Local dev servers

```bash
npm run dev
```

Option B: Docker (API, Web, Postgres, Redis)

```bash
docker-compose up
```

If you use Docker, run migrations and seed after containers are up:

```bash
npm run db:migrate
npm run db:seed
```

Open the app:

- Web UI: http://localhost:3000
- API: http://localhost:3001

## 4) Smoke Test Workflow (15-30 minutes)

Goal: validate that a user can sign in and complete the core CRM, facilities, and contract flows without errors.

### A) Authentication

1. Open the web UI and log in with the seeded admin account.
2. Expected: You reach the dashboard and see navigation links.

### B) CRM Basics (Leads, Accounts, Contacts)

1. Leads: create a new lead with name, email, phone, status.
2. Expected: lead appears in the list and can be opened for details.
3. Edit the lead and save changes.
4. Expected: updates persist after refresh.
5. Accounts: create a new account.
6. Contacts: create a new contact and link it to the account.
7. Expected: account and contact are visible in their lists.

### C) Facilities and Areas

1. Facilities: create a facility for the account.
2. Areas: create one or more areas for that facility.
3. Expected: facility and areas show in lists and detail views.

### D) Task Templates and Tasks

1. Task templates: create a template with a few checklist items.
2. Tasks: create a task using the template (if task creation is available).
3. Expected: task appears with the correct template items.

### E) Proposals and Contracts

1. Proposals: create a proposal for the account and facility.
2. Add line items or services and verify pricing updates.
3. Expected: proposal shows calculated totals and status changes.
4. Contracts: create a contract from the proposal (if available).
5. Expected: contract appears in the contracts list and status can be updated.

### F) Users (Admin)

1. Users: create a new user with a role.
2. Expected: new user can log in and see role-based navigation.

## 5) What to Report

Ask testers to capture:

- The step where something failed.
- The exact error message or behavior.
- A screenshot if the UI is involved.
- The browser and OS.

## 6) Resetting the Test Environment (Optional)

If you need a clean slate:

```bash
npm run db:reset
npm run db:seed
```

This will remove existing data and recreate the seeded admin user.

