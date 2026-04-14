# Job-Based Invoicing and Payroll Implementation Plan

**Goal:** Make completed jobs the source of truth for both invoicing and payroll so neither process depends on contract-period assumptions. Jobs with missing completion or clock-out data must be resolved through worker follow-up and manager/admin review before they can be included in invoices or payroll.

**Architecture:** Reuse the existing job settlement review workflow as the primary gate for financial eligibility. Replace contract-period invoice generation and worker/contract-centric payroll generation with job-based settlement allocation. Add durable job-to-invoice and job-to-payroll linkage to prevent duplicate billing and duplicate pay.

**Guiding Rules**
- A job contributes to invoicing only if it is completed and invoice-eligible.
- A job contributes to payroll only if it is completed and payroll-eligible.
- A job with missing completion or missing clock-out cannot flow into either process until follow-up is resolved.
- Worker explanations require admin/manager review before the job becomes eligible again.
- Every billed or paid amount must be traceable back to one or more jobs.

---

### Phase 1: Durable Settlement Allocation Schema

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/<timestamp>_add_job_financial_allocations/migration.sql`

**Objective:** Add durable linkage so completed jobs can be allocated exactly once into invoices and payroll runs.

**Schema changes**
- Add `InvoiceJobAllocation` model.
- Add `PayrollJobAllocation` model.
- Add allocation relations to `Job`, `Invoice`, `InvoiceItem`, and `PayrollEntry`.

**Recommended model shape**

```prisma
model InvoiceJobAllocation {
  id            String   @id @default(uuid()) @db.Uuid
  invoiceId     String   @map("invoice_id") @db.Uuid
  invoiceItemId String?  @map("invoice_item_id") @db.Uuid
  jobId         String   @map("job_id") @db.Uuid
  allocatedAmount Decimal @map("allocated_amount") @db.Decimal(12, 2)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  invoice     Invoice     @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  invoiceItem InvoiceItem? @relation(fields: [invoiceItemId], references: [id], onDelete: SetNull)
  job         Job         @relation(fields: [jobId], references: [id], onDelete: Restrict)

  @@unique([jobId])
  @@index([invoiceId])
  @@index([invoiceItemId])
  @@map("invoice_job_allocations")
}
```

```prisma
model PayrollJobAllocation {
  id             String   @id @default(uuid()) @db.Uuid
  payrollEntryId String   @map("payroll_entry_id") @db.Uuid
  jobId          String   @map("job_id") @db.Uuid
  allocatedHours Decimal? @map("allocated_hours") @db.Decimal(8, 2)
  allocatedGrossPay Decimal @map("allocated_gross_pay") @db.Decimal(12, 2)
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  payrollEntry PayrollEntry @relation(fields: [payrollEntryId], references: [id], onDelete: Cascade)
  job          Job          @relation(fields: [jobId], references: [id], onDelete: Restrict)

  @@unique([jobId])
  @@index([payrollEntryId])
  @@map("payroll_job_allocations")
}
```

**Why this shape**
- Prevents duplicate invoicing and payroll at the database level.
- Keeps allocation history durable even if jobs are later updated.
- Allows invoice detail and payroll detail to show exact job traceability.

---

### Phase 2: Job Settlement as the Financial Gate

**Files:**
- Modify: `apps/api/src/services/jobSettlementService.ts`
- Modify: `apps/api/src/services/jobService.ts`
- Modify: `apps/api/src/schemas/job.ts`
- Modify: `apps/api/src/routes/jobs.ts`
- Modify: `apps/web/src/types/job.ts`
- Modify: `apps/web/src/lib/jobs.ts`
- Modify job-related web pages where settlement status is shown

**Objective:** Make the existing settlement review workflow the actual gate for invoice/payroll eligibility.

**Target settlement meaning**
- `ready`: job is completed normally and eligible for both invoice and payroll.
- `needs_review`: financial eligibility blocked until review.
- `approved_invoice_only`: invoice yes, payroll no.
- `approved_payroll_only`: payroll yes, invoice no.
- `approved_both`: both allowed after exception review.
- `excluded`: neither allowed.

**Trigger follow-up when**
- Worker clocked in but did not clock out.
- Worker clocked out but did not complete the job.
- Job remains `in_progress` past cutoff.
- Job has inconsistent completion/time-entry data discovered by a scheduled sweep.

**Behavior**
- Notify assigned worker to complete the job or submit explanation.
- Notify manager/admin when explanation is submitted.
- Persist review decision and notes on the existing `JobSettlementReview` record.

---

### Phase 3: Rewrite Invoice Generation Around Completed Jobs

**Files:**
- Modify: `apps/api/src/services/invoiceService.ts`
- Modify: `apps/api/src/routes/invoices.ts`
- Modify: `apps/api/src/schemas/invoice.ts`
- Modify: `apps/web/src/lib/invoices.ts`
- Modify invoice pages in `apps/web/src/pages/invoices`

**Objective:** Replace contract-period billing as the primary path with completed-job aggregation.

**New primary flow**
1. Select billing window.
2. Query jobs where:
   - `status = completed`
   - settlement is invoice-eligible
   - job has no `InvoiceJobAllocation`
3. Group eligible jobs by account.
4. Create one invoice per account for the selected window.
5. Create invoice line items from completed jobs.
6. Create `InvoiceJobAllocation` rows for every included job.

**Implementation notes**
- Keep manual invoice creation for exceptions/admin use.
- Mark contract-period invoice generation as legacy or secondary.
- Invoice detail should expose linked jobs.
- Prevent overlapping reruns by skipping already allocated jobs rather than only checking invoice periods.

---

### Phase 4: Rewrite Payroll Generation Around Completed Jobs

**Files:**
- Modify: `apps/api/src/services/payrollService.ts`
- Modify: `apps/api/src/routes/payroll.ts`
- Modify: `apps/api/src/schemas/payroll.ts`
- Modify: `apps/web/src/lib/payroll.ts`
- Modify: `apps/web/src/pages/finance/PayrollPage.tsx`
- Modify: `apps/web/src/types/payroll.ts`

**Objective:** Make payroll generation read from completed, payroll-eligible jobs instead of contract/monthly assumptions.

**New payroll flow**
1. Select payroll window.
2. Query jobs where:
   - `status = completed`
   - settlement is payroll-eligible
   - job has no `PayrollJobAllocation`
3. Group jobs by worker.
4. Build payroll entries from those jobs.
5. Create `PayrollJobAllocation` rows for every included job.

**Pay calculation policy to finalize in implementation**
- For cleaners: hourly based on approved actual hours or approved payable hours per job.
- For subcontractors: choose one of:
  - percentage of completed settled job value
  - per-job agreed payout
  - hourly if subcontractors are paid that way

**Constraint**
- Do not keep monthly contract value as the payroll source if payroll must be based on completed jobs.

---

### Phase 5: Scheduled Follow-Up for Missing Completion

**Files:**
- Modify: `apps/api/src/services/jobService.ts`
- Modify or add scheduler service next to current reminder/scheduler services

**Objective:** Automatically prevent unresolved jobs from silently blocking settlement.

**Scheduled job behavior**
- Find unresolved jobs with active work evidence but no valid completion.
- Flag them for settlement review if not already flagged.
- Notify worker first.
- Notify manager/admin on worker response and on unresolved aging thresholds.

**Examples**
- Missing completion after clock-out.
- Missing clock-out after clock-in.
- Job still `in_progress` after end of scheduled day.

---

### Phase 6: UI and Traceability

**Files:**
- Modify job list/detail pages
- Modify invoice list/detail pages
- Modify payroll run/detail pages

**Objective:** Make the new workflow visible and operable.

**Job UI**
- Show settlement badge and explanation/review actions.
- Workers can submit explanation.
- Managers/admins can approve or exclude.

**Invoice UI**
- Generate invoices from completed jobs.
- Show linked jobs on invoice detail.
- Explain skipped jobs and blocked jobs.

**Payroll UI**
- Show linked jobs per payroll entry.
- Show flagged/excluded jobs and reason.

---

### Phase 7: Tests

**API tests**
- Settlement eligibility for normal completed jobs.
- Missing clock-out or missing completion triggers `needs_review`.
- Worker explanation submission permissions.
- Manager/admin review decisions.
- Invoice generation includes only invoice-eligible, unallocated jobs.
- Payroll generation includes only payroll-eligible, unallocated jobs.
- Duplicate reruns do not rebill or repay jobs.

**Web tests**
- Settlement explanation and review actions.
- Invoice generation from completed jobs.
- Payroll detail rendering linked jobs and blocked states.

---

### Delivery Order

1. Add allocation schema and migration.
2. Update invoice generation to use settled completed jobs.
3. Update payroll generation to use settled completed jobs.
4. Add scheduled unresolved-job follow-up automation.
5. Update UI for settlement-driven operations and traceability.
6. Add tests around duplicate prevention and approval gating.

---

### Current Codebase Notes

- Existing settlement review foundation: `apps/api/src/services/jobSettlementService.ts`
- Existing job completion and unresolved-job scan logic: `apps/api/src/services/jobService.ts`
- Existing invoice implementation still contract/period oriented: `apps/api/src/services/invoiceService.ts`
- Existing payroll implementation still worker/contract oriented: `apps/api/src/services/payrollService.ts`

This document is the recovery reference for continuing the job-based invoicing and payroll refactor if the session is interrupted.
