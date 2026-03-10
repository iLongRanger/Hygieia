# Opportunity Entity Scope

Date: March 10, 2026

## Goal

Add an `opportunity` entity so CRM can support more than one sales cycle per account without overloading `lead` and `account.sourceLead`.

## Why This Is Needed

The current model works for one sales cycle per customer:

- `Lead.convertedToAccountId` is unique
- `Account.sourceLead` points to a single lead
- appointment, proposal, and contract automation infers pipeline state from that single source lead

That breaks down when the same customer needs:

- multiple concurrent bids
- a renewal as a new sales cycle
- an upsell or cross-sell tracked separately
- a later won cycle after an earlier lost cycle

## Intended Role Of Each Entity

1. `lead`
- inbound inquiry or first-touch record
- attribution and intake context
- may exist before any account exists

2. `account`
- customer/company master record
- can outlive any one sales cycle

3. `opportunity`
- the actual pipeline record
- owns sales status, expected close, value, outcome, and workflow linkage

## Current Schema Constraints

These current relationships create the one-opportunity-per-account ceiling:

- [`Lead`](/A:/Projects/Hygieia/packages/database/prisma/schema.prisma#L192) has unique `convertedToAccountId`
- [`Account`](/A:/Projects/Hygieia/packages/database/prisma/schema.prisma#L296) has one `sourceLead`
- [`Appointment`](/A:/Projects/Hygieia/packages/database/prisma/schema.prisma#L236) links only to `leadId` and `accountId`
- [`Proposal`](/A:/Projects/Hygieia/packages/database/prisma/schema.prisma#L759) links only to `accountId` and `facilityId`
- [`Contract`](/A:/Projects/Hygieia/packages/database/prisma/schema.prisma#L916) links only to `accountId` and `facilityId`

## Draft Prisma Model

Recommended first-pass model:

```prisma
model Opportunity {
  id                String    @id @default(uuid()) @db.Uuid
  leadId            String?   @map("lead_id") @db.Uuid
  accountId         String?   @map("account_id") @db.Uuid
  primaryContactId  String?   @map("primary_contact_id") @db.Uuid
  title             String    @db.VarChar(255)
  status            String    @default("lead") @db.VarChar(30)
  source            String?   @db.VarChar(100)
  estimatedValue    Decimal?  @map("estimated_value") @db.Decimal(12, 2)
  probability       Int?      @default(0)
  expectedCloseDate DateTime? @map("expected_close_date") @db.Date
  lostReason        String?   @map("lost_reason") @db.Text
  ownerUserId       String?   @map("owner_user_id") @db.Uuid
  createdByUserId   String    @map("created_by_user_id") @db.Uuid
  wonAt             DateTime? @map("won_at") @db.Timestamptz(6)
  lostAt            DateTime? @map("lost_at") @db.Timestamptz(6)
  closedAt          DateTime? @map("closed_at") @db.Timestamptz(6)
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  archivedAt        DateTime? @map("archived_at") @db.Timestamptz(6)

  lead           Lead?      @relation(fields: [leadId], references: [id], onDelete: SetNull)
  account        Account?   @relation(fields: [accountId], references: [id], onDelete: SetNull)
  primaryContact Contact?   @relation(fields: [primaryContactId], references: [id], onDelete: SetNull)
  ownerUser      User?      @relation("OpportunityOwner", fields: [ownerUserId], references: [id], onDelete: SetNull)
  createdByUser  User       @relation("CreatedOpportunities", fields: [createdByUserId], references: [id], onDelete: Restrict)
  appointments   Appointment[]
  proposals      Proposal[]
  contracts      Contract[]

  @@index([leadId])
  @@index([accountId])
  @@index([primaryContactId])
  @@index([ownerUserId])
  @@index([status])
  @@index([expectedCloseDate])
  @@map("opportunities")
}
```

## Required Linkage Changes

Add nullable `opportunityId` fields first, then migrate runtime flows to use them.

### Appointment

Current shape:
- `leadId`
- `accountId`

Add:

```prisma
opportunityId String? @map("opportunity_id") @db.Uuid
opportunity   Opportunity? @relation(fields: [opportunityId], references: [id], onDelete: SetNull)
@@index([opportunityId])
```

### Proposal

Add:

```prisma
opportunityId String? @map("opportunity_id") @db.Uuid
opportunity   Opportunity? @relation(fields: [opportunityId], references: [id], onDelete: SetNull)
@@index([opportunityId])
```

### Contract

Add:

```prisma
opportunityId String? @map("opportunity_id") @db.Uuid
opportunity   Opportunity? @relation(fields: [opportunityId], references: [id], onDelete: SetNull)
@@index([opportunityId])
```

## Recommended Relation Adjustments

Do not remove these on day one:

- `Lead.convertedToAccountId`
- `Account.sourceLead`
- `Appointment.leadId`

Keep them during transition, but stop treating them as the authoritative sales-link once `opportunityId` is live.

Longer-term target:

- `Lead` can have many `opportunities`
- `Account` can have many `opportunities`
- `Appointment`, `Proposal`, and `Contract` should resolve pipeline state through `opportunityId`

## Status Ownership

Move pipeline status ownership from `lead.status` to `opportunity.status`.

Recommended opportunity statuses:

- `lead`
- `walk_through_booked`
- `walk_through_completed`
- `proposal_sent`
- `negotiation`
- `won`
- `lost`
- `reopened`

Transition rule:

- `lead.status` remains temporarily dual-written for backward compatibility
- new reporting should read `opportunity.status`

## Backfill Plan

### Backfill rule v1

Create one opportunity for every active lead that is already part of the CRM sales path:

- if `lead.convertedToAccountId` exists:
  - create opportunity linked to that `lead`
  - set `accountId = lead.convertedToAccountId`
- else:
  - create an intake-only opportunity linked to `lead`
  - leave `accountId = null`

Recommended field mapping:

- `Opportunity.title`:
  - `lead.companyName` if present
  - else `lead.contactName`
- `Opportunity.status = lead.status`
- `Opportunity.estimatedValue = lead.estimatedValue`
- `Opportunity.probability = lead.probability`
- `Opportunity.expectedCloseDate = lead.expectedCloseDate`
- `Opportunity.lostReason = lead.lostReason`
- `Opportunity.ownerUserId = lead.assignedToUserId`
- `Opportunity.createdByUserId = lead.createdByUserId`
- `Opportunity.createdAt = lead.createdAt`
- `Opportunity.updatedAt = lead.updatedAt`
- `Opportunity.archivedAt = lead.archivedAt`
- `wonAt/lostAt/closedAt` inferred from status where possible, otherwise null

### Backfill linkage rule

After opportunity rows exist:

- set `appointments.opportunity_id` from `appointments.lead_id`
- set `proposals.opportunity_id` from `account.sourceLead`
- set `contracts.opportunity_id` from `account.sourceLead`

This is not perfect historically, but it is the least disruptive first migration.

## Dual-Write Transition

### Phase 1: schema-only

- add `opportunities`
- add nullable `opportunityId` to appointments, proposals, contracts
- backfill all rows

### Phase 2: create/update flows

- lead conversion creates an opportunity
- walkthrough booking/completion writes `opportunity.status`
- proposal creation/send/accept/reject writes `opportunity.status`
- contract sign/activate/terminate writes `opportunity.status`
- keep `lead.status` in sync temporarily

### Phase 3: read paths

- dashboard funnel reads opportunities
- account detail shows opportunities
- proposals/contracts display their owning opportunity

### Phase 4: cleanup

- remove lead-based pipeline inference
- retire `account.sourceLead` as workflow authority
- decide whether `lead.status` stays as intake-only or is removed

## API Surface Draft

Likely endpoints:

- `GET /opportunities`
- `POST /opportunities`
- `GET /opportunities/:id`
- `PATCH /opportunities/:id`
- `POST /opportunities/:id/archive`
- `POST /opportunities/:id/reopen`
- `POST /opportunities/:id/mark-lost`

Existing endpoints that should start accepting or returning `opportunityId`:

- walkthrough booking/completion
- proposal create/edit/send/accept/reject
- contract create/send/sign/activate/terminate

## UI Impact

Recommended first UI landing points:

- account detail: add `Opportunities` section
- lead detail: show linked opportunity once conversion/sales cycle starts
- proposal detail and contract detail: show owning opportunity

Later:

- move the current sales pipeline from leads to opportunities
- keep leads as intake/marketing-origin records

## Main Risks

- dual-write drift between `lead.status` and `opportunity.status`
- imperfect historical backfill for old proposal/contract records
- temporary complexity while both source-lead and opportunity linkage exist

## Recommended Next Build Order

1. add Prisma schema draft and migration file
2. add backfill script for opportunities and linkage fields
3. add read-only opportunity service/routes
4. retarget appointment flows
5. retarget proposal flows
6. retarget contract flows
7. switch dashboard/pipeline UI to opportunities
