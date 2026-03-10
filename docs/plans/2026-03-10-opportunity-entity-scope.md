# Opportunity Entity Scope

Date: March 10, 2026

## Goal

Add an `opportunity` entity so CRM can support more than one sales cycle per account without overloading `lead` and `account.sourceLead`.

## Current Constraint

- `Lead.convertedToAccountId` is unique.
- `Account.sourceLead` points to a single lead.
- Proposal and contract readiness/status automation hangs off that single source lead.

This works for one sales cycle per customer, but it blocks:

- multiple concurrent bids for one customer
- renewals tracked as new sales work
- upsells / cross-sells as distinct pipeline records
- historical separation of one lost cycle vs a later won cycle

## Proposed Model

### Core entities

1. `lead`
- inbound person/company signal
- can exist before an account exists
- remains useful for attribution and first-touch capture

2. `account`
- customer/company master record
- may have many opportunities

3. `opportunity`
- the actual sales-cycle record
- owns pipeline status, expected close, value, outcome, and related workflow records

### Relationship direction

- one `lead` can create zero or more `opportunities`
- one `account` can have zero or more `opportunities`
- one `opportunity` belongs to one account after qualification/conversion
- walkthrough appointments, proposal flows, and contract flows should target `opportunityId`

## Suggested Schema Additions

### `opportunities`

Recommended fields:

- `id`
- `leadId` nullable
- `accountId` nullable initially, required after conversion
- `primaryContactId` nullable
- `status`
- `title`
- `source`
- `estimatedValue`
- `probability`
- `expectedCloseDate`
- `lostReason`
- `closedAt`
- `wonAt`
- `lostAt`
- `ownerUserId`
- `createdByUserId`
- `createdAt`
- `updatedAt`
- `archivedAt`

### Linking updates

- add `opportunityId` to `appointments`
- add `opportunityId` to `proposals`
- add `opportunityId` to `contracts`
- optionally add `opportunityId` to activities / notifications later

## Status Ownership

Move pipeline status ownership from `lead.status` to `opportunity.status`.

Suggested opportunity statuses:

- `lead`
- `walk_through_booked`
- `walk_through_completed`
- `proposal_sent`
- `negotiation`
- `won`
- `lost`
- `reopened`

`lead.status` should either:

- be deprecated, or
- become a lightweight intake state only

## Migration Strategy

### Phase 1

- add `opportunities` table
- backfill one opportunity per existing lead/account source-lead pair
- do not remove old lead status yet

### Phase 2

- write new appointments/proposals/contracts against `opportunityId`
- switch auto-status logic from account/sourceLead to explicit opportunity linkage

### Phase 3

- update CRM UI to list opportunities under accounts
- keep leads as intake records
- remove dependence on `account.sourceLead`

### Phase 4

- deprecate old lead-driven pipeline automation

## API Impact

New likely endpoints:

- `GET /opportunities`
- `POST /opportunities`
- `GET /opportunities/:id`
- `PATCH /opportunities/:id`
- `POST /opportunities/:id/archive`
- `POST /opportunities/:id/reopen`
- `POST /opportunities/:id/mark-lost`

Existing flows to retarget:

- walkthrough booking/completion
- proposal creation/send/accept/reject
- contract send/sign/activate/terminate

## UI Impact

- account detail should show an `Opportunities` section
- leads list may eventually become intake-only or become opportunities-first
- proposals/contracts should display the owning opportunity when present

## Main Risks

- dual-write period while both lead-based and opportunity-based linkage exist
- historical reporting drift if old dashboards read lead status while new flows write opportunity status
- migration ambiguity for accounts that already have multiple related records

## Recommended Next Build Order

1. add schema and backfill plan
2. add read-only opportunity service/routes
3. retarget appointment linkage
4. retarget proposal linkage
5. retarget contract linkage
6. move pipeline UI to opportunities
