# Financial Management Module Design

## Context

Hygieia has a complete money-in pipeline (proposals, quotations, contracts, invoices, payments) but no money-out tracking (expenses, payroll). The system needs a basic standalone financial module that can produce operational reports for day-to-day business decisions, with QuickBooks handling formal accounting (P&L, balance sheet, tax filings).

This follows the industry-standard Tier 2 pattern used by Jobber, Housecall Pro, and ServiceTitan: the app owns operational financials, QuickBooks owns the books.

## Approach: Thin Financial Layer

Add 4 new models (`ExpenseCategory`, `Expense`, `PayrollRun`, `PayrollEntry`) on top of existing data. Payroll reads from timesheets + contracts. Job costing is a computed view. Reports are query-based.

---

## Data Models

### User model changes (existing, add fields)

```
payType        String?   "hourly" | "percentage"  (null = role default)
hourlyPayRate  Decimal?  (override for hourly employees)
```

- Subcontractors default to `percentage`, using existing contract tier system
- Internal employees: `hourly` or `percentage` set per user
- If `hourly` with no `hourlyPayRate`, falls back to `pricingSettings.laborCostPerHour`

### ExpenseCategory

```
id              UUID PK
name            String (unique)
description     String?
isDefault       Boolean (seed defaults, prevent deletion)
isActive        Boolean (soft disable)
sortOrder       Int
createdAt       DateTime
updatedAt       DateTime
```

Seeded: Cleaning Supplies, Equipment, Fuel/Travel, Insurance, Maintenance, Rent/Utilities, Other

### Expense

```
id                UUID PK
date              DateTime
amount            Decimal
description       String
vendor            String?  (free text)
categoryId        UUID -> ExpenseCategory
jobId             UUID? -> Job
contractId        UUID? -> Contract
facilityId        UUID? -> Facility
receiptUrl        String?
status            String  "pending" | "approved" | "rejected"
createdByUserId   UUID -> User
approvedByUserId  UUID? -> User
approvedAt        DateTime?
notes             String?
createdAt         DateTime
updatedAt         DateTime
```

### PayrollRun

```
id                UUID PK
periodStart       DateTime
periodEnd         DateTime
status            String  "draft" | "approved" | "paid"
totalGrossPay     Decimal
totalEntries      Int
approvedByUserId  UUID? -> User
approvedAt        DateTime?
paidAt            DateTime?
notes             String?
createdAt         DateTime
updatedAt         DateTime
```

### PayrollEntry

```
id                    UUID PK
payrollRunId          UUID -> PayrollRun
userId                UUID -> User
payType               String  "hourly" | "percentage"

// Hourly fields:
scheduledHours        Decimal?
hourlyRate            Decimal?
grossPay              Decimal

// Percentage fields:
contractId            UUID? -> Contract
contractMonthlyValue  Decimal?
tierPercentage        Decimal?

// Validation:
status                String  "valid" | "flagged" | "adjusted"
flagReason            String?
adjustedByUserId      UUID? -> User
adjustmentNotes       String?

createdAt             DateTime
```

---

## Pay Validation Rules

### Subcontractors & percentage-based employees

- For each scheduled job in the pay period: did they clock in AND clock out?
- Duration between check-in/out does not matter — only presence
- All jobs checked in/out = `valid`, any missed = `flagged`
- Payout = `contract.monthlyValue * tierPercentage`

### Hourly employees

- For each scheduled job: check in, complete job within expected scheduled hours, log out
- Pay = scheduled hours (not actual clock time)
- Missing check-in, or incomplete job = `flagged`
- Admin can approve flagged entries, adjust hours, or reject

### Admin overrides

- Approve, reject, or edit any payroll entry
- Add adjustment notes with audit trail
- Manually add entries (bonus, training hours)

---

## API Endpoints

### Expenses

```
GET    /api/v1/expenses              list (filter: date, category, status, job, contract)
GET    /api/v1/expenses/:id          detail
POST   /api/v1/expenses              create
PATCH  /api/v1/expenses/:id          edit
DELETE /api/v1/expenses/:id          delete (draft/pending only)
POST   /api/v1/expenses/:id/approve  approve
POST   /api/v1/expenses/:id/reject   reject
GET    /api/v1/expense-categories    list categories
POST   /api/v1/expense-categories    create category (admin)
PATCH  /api/v1/expense-categories/:id update category
```

### Payroll

```
GET    /api/v1/payroll                    list runs
GET    /api/v1/payroll/:id                run detail with entries
POST   /api/v1/payroll/generate           generate run for period
POST   /api/v1/payroll/:id/approve        approve run
POST   /api/v1/payroll/:id/mark-paid      mark as paid
PATCH  /api/v1/payroll/:id/entries/:entryId  admin adjust entry
DELETE /api/v1/payroll/:id                delete draft run
```

### Financial Reports

```
GET    /api/v1/finance/overview                financial dashboard data
GET    /api/v1/finance/reports/ar-aging         accounts receivable aging
GET    /api/v1/finance/reports/profitability    by contract/facility/job
GET    /api/v1/finance/reports/revenue          by period/client/service
GET    /api/v1/finance/reports/expenses         summary by category/period
GET    /api/v1/finance/reports/labor-costs      by user/team/period
GET    /api/v1/finance/reports/payroll-summary  by period
```

---

## Frontend Pages

```
Sidebar:
  Invoices (existing, unchanged)
  Finance (NEW)
    ├── Overview
    ├── Expenses
    ├── Payroll
    └── Reports
```

### Finance Overview

KPI cards: total revenue (period), total expenses, net income estimate, outstanding AR, upcoming payroll. Revenue vs expenses trend chart.

### Expenses

Table with filters (date range, category, status, job/contract). Create/edit modal. Approve/reject for admins. Receipt image preview.

### Payroll

List of payroll runs by period. Generate button (pick date range). Detail view: entries grouped by employee with valid/flagged indicators. Admin clicks flagged entries to review, adjust, approve. Workflow: draft → approved → paid.

### Reports

Tab or dropdown to switch report types. Each report has date range filter and CSV export.

- **AR Aging:** Buckets (current, 1-30, 31-60, 61-90, 90+) with invoice details
- **Profitability:** Revenue minus costs per contract/facility, with margin %
- **Revenue:** By client, period, service type with totals and trends
- **Expense Summary:** By category and period with totals
- **Labor Costs:** By user, team, period
- **Payroll Summary:** By period with gross pay totals and entry counts

---

## Permissions

```
New permissions:
  expenses_read        view expenses
  expenses_write       create/edit expenses
  expenses_approve     approve/reject expenses
  payroll_read         view payroll runs
  payroll_write        generate payroll runs
  payroll_approve      approve runs, adjust entries
  finance_reports_read view financial reports

Role mapping:
  owner:          all finance permissions
  admin:          all finance permissions
  manager:        expenses_read/write, payroll_read, finance_reports_read
  subcontractor:  expenses_read (own), payroll_read (own entries)
  cleaner:        payroll_read (own entries)
```

---

## QuickBooks Integration Boundary

**Hygieia owns (source of truth):**
- Invoices, payments, expenses, payroll calculations
- Job/contract profitability
- Operational reports

**QuickBooks owns:**
- Chart of accounts, general ledger
- P&L statement, balance sheet, cash flow statement
- Tax-ready reports, payroll tax filing
- Bank reconciliation

**Future sync (one-way, Hygieia → QB):**
- Customers (from accounts)
- Invoices + payments
- Expenses (as bills or journal entries)
- Payroll summary (as journal entries)

---

## Implementation Sequence

1. Schema + migrations (ExpenseCategory, Expense, PayrollRun, PayrollEntry, User fields)
2. Expense service + routes + frontend
3. Payroll generation service (reads timesheets + contracts, applies validation rules)
4. Payroll routes + frontend
5. Financial reports service + routes
6. Finance overview dashboard + reports frontend
7. Permissions + RBAC for all new endpoints
