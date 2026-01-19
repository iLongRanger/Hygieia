# Phase 14: Contracts & Agreements Module - Implementation Status

## Overview
Phase 14 implements a complete Contracts & Agreements module for the Hygieia cleaning management platform. This enables conversion of accepted proposals into formal service contracts with terms, schedules, and billing arrangements.

## Completed Tasks ✅

### 1. Documentation
- ✅ Added comprehensive Contract table specification to `Documentation/Complete_Data_Model.md`
- ✅ Defined complete database schema with constraints and indexes
- ✅ Added trigger for automatic timestamp updates

### 2. Database Schema
- ✅ Added Contract model to Prisma schema (`packages/database/prisma/schema.prisma`)
- ✅ Created migration file: `20260118144017_add_contracts_table/migration.sql`
- ✅ Added relationships to User, Account, Facility, and Proposal models
- ✅ Migration ready to be applied (requires `npm install` first)

### 3. Backend API

#### Service Layer
- ✅ Created `apps/api/src/services/contractService.ts` with:
  - Contract listing with pagination and filtering
  - CRUD operations (create, read, update)
  - Automatic contract number generation (`CONT-YYYYMM-XXXX`)
  - Create contract from accepted proposal
  - Status workflow management
  - Sign contract functionality
  - Terminate contract with reason
  - Archive/restore (soft delete)

#### Validation Schemas
- ✅ Created `apps/api/src/schemas/contract.ts` with Zod schemas for:
  - Contract creation
  - Contract from proposal
  - Contract updates
  - Status updates
  - Signing
  - Termination
  - List query parameters

#### API Routes
- ✅ Created `apps/api/src/routes/contracts.ts` with endpoints:
  - `GET /api/v1/contracts` - List contracts
  - `GET /api/v1/contracts/:id` - Get contract by ID
  - `POST /api/v1/contracts` - Create contract
  - `POST /api/v1/contracts/from-proposal/:proposalId` - Create from proposal
  - `PATCH /api/v1/contracts/:id` - Update contract
  - `PATCH /api/v1/contracts/:id/status` - Update status
  - `POST /api/v1/contracts/:id/sign` - Sign contract
  - `POST /api/v1/contracts/:id/terminate` - Terminate contract
  - `DELETE /api/v1/contracts/:id` - Archive contract
  - `POST /api/v1/contracts/:id/restore` - Restore contract
- ✅ Registered routes in `apps/api/src/index.ts`

## Remaining Tasks 🔄

### 4. Frontend Implementation

#### Types & API Client
- ⏳ Create `apps/web/src/types/contract.ts` - Contract TypeScript types
- ⏳ Create `apps/web/src/lib/contracts.ts` - API client functions

#### Pages
- ⏳ Create `apps/web/src/pages/contracts/ContractsList.tsx` - List view with:
  - Search and filtering
  - Status badges and actions
  - Pagination
  - Create/view/edit/archive actions
  - "Create from Proposal" action for accepted proposals

- ⏳ Create `apps/web/src/pages/contracts/ContractDetail.tsx` - Detail view with:
  - Contract information display
  - Account and facility details
  - Service terms and schedule
  - Financial terms
  - Status workflow buttons (activate, sign, terminate)
  - Link to source proposal (if applicable)

- ⏳ Create `apps/web/src/pages/contracts/ContractForm.tsx` - Create/Edit form with:
  - Account selector (required)
  - Facility selector (optional, filtered by account)
  - Service terms (dates, frequency, schedule)
  - Financial configuration (monthly value, billing cycle, payment terms)
  - Contract terms and special instructions
  - Form validation

#### Routing & Navigation
- ⏳ Add routes to `apps/web/src/App.tsx`:
  - `/contracts` → ContractsList
  - `/contracts/:id` → ContractDetail
  - `/contracts/new` → ContractForm
  - `/contracts/:id/edit` → ContractForm

- ⏳ Add "Contracts" to main navigation menu
- ⏳ Add "Create Contract" button on Proposal detail page (for accepted proposals)

### 5. Testing

#### Backend Tests
- ⏳ Unit tests for contract service functions
- ⏳ Integration tests for API endpoints
- ⏳ Test proposal-to-contract conversion
- ⏳ Test status workflow transitions
- ⏳ Test validation rules

#### Frontend Tests
- ⏳ Component tests for ContractsList
- ⏳ Component tests for ContractDetail
- ⏳ Component tests for ContractForm
- ⏳ Test user interactions and workflows

### 6. Documentation Updates
- ⏳ Update `CHANGELOG.md` with Phase 14 changes
- ⏳ Update `Documentation/README.md` roadmap - mark Phase 14 complete
- ⏳ Add Phase 14 notes to README

## Data Model Summary

### Contract Table Fields

**Identification:**
- `id` (UUID) - Primary key
- `contract_number` (VARCHAR) - Auto-generated unique number
- `title` (VARCHAR) - Contract title

**Status & Workflow:**
- `status` (ENUM) - draft, pending_signature, active, expired, terminated, renewed

**Relationships:**
- `account_id` (UUID) - Required link to Account
- `facility_id` (UUID) - Optional link to Facility
- `proposal_id` (UUID) - Optional link to source Proposal

**Service Terms:**
- `start_date` (DATE) - Contract start date
- `end_date` (DATE) - Optional end date
- `service_frequency` (ENUM) - daily, weekly, bi_weekly, monthly, quarterly, custom
- `service_schedule` (JSONB) - Detailed schedule configuration
- `auto_renew` (BOOLEAN)
- `renewal_notice_days` (INTEGER)

**Financial Terms:**
- `monthly_value` (DECIMAL) - Monthly contract value
- `total_value` (DECIMAL) - Optional total contract value
- `billing_cycle` (ENUM) - monthly, quarterly, semi_annual, annual
- `payment_terms` (VARCHAR) - e.g., "Net 30"

**Contract Details:**
- `terms_and_conditions` (TEXT)
- `special_instructions` (TEXT)

**Document Management:**
- `signed_document_url` (TEXT)
- `signed_date` (DATE)
- `signed_by_name` (VARCHAR)
- `signed_by_email` (VARCHAR)

**Workflow:**
- `approved_by_user_id` (UUID)
- `approved_at` (TIMESTAMPTZ)
- `termination_reason` (TEXT)
- `terminated_at` (TIMESTAMPTZ)

**Audit:**
- `created_by_user_id` (UUID)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `archived_at` (TIMESTAMPTZ)

## Key Features Implemented

1. **Contract Creation Workflows:**
   - Manual creation from scratch
   - Auto-generation from accepted proposals (copies pricing, services, terms)

2. **Status Workflow:**
   - Draft → Pending Signature → Active → Expired/Terminated

3. **Business Logic:**
   - Auto-generate contract numbers with year-month prefix
   - Prevent editing active or terminated contracts
   - Require approval for activation
   - Track termination with reason
   - Soft delete with archive/restore

4. **Validation:**
   - End date must be after start date
   - Monthly value must be positive
   - Cannot activate without required fields
   - Cannot delete active contracts (must terminate first)

## Next Steps

1. **Install Dependencies** - Run `npm install` to install Prisma and other dependencies
2. **Apply Migration** - Run `npm run db:migrate` to create the contracts table
3. **Implement Frontend** - Create the three main pages (List, Detail, Form)
4. **Add Navigation** - Integrate into routing and navigation menu
5. **Write Tests** - Comprehensive testing for backend and frontend
6. **Update Documentation** - Final changelog and readme updates

## Technical Notes

- Contract numbers format: `CONT-YYYYMM-XXXX` (e.g., CONT-202601-0001)
- Status changes are tracked with timestamps
- Soft delete pattern allows recovery of archived contracts
- Service schedule stored as flexible JSONB for custom configurations
- Integration with existing Proposal workflow for seamless conversion
