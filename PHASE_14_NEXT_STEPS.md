# Phase 14: Remaining Implementation Tasks

## Completed So Far ✅

### Backend (100% Complete)
- ✅ Data model documentation
- ✅ Prisma schema with Contract model
- ✅ Database migration file
- ✅ Contract service layer with all business logic
- ✅ API routes with validation schemas
- ✅ Routes registered in Express app

### Frontend (50% Complete)
- ✅ TypeScript types (`apps/web/src/types/contract.ts`)
- ✅ API client functions (`apps/web/src/lib/contracts.ts`)
- ✅ ContractsList page with full functionality

## Still To Do 🔄

### 1. Frontend Pages (2 remaining)

#### ContractDetail Page
**File:** `apps/web/src/pages/contracts/ContractDetail.tsx`

**Features needed:**
- Display all contract information
- Show account and facility details
- Display service terms and financial information
- Status-specific action buttons:
  - Draft → "Edit" and "Activate"
  - Pending Signature → "Sign Contract"
  - Active → "Terminate"
  - Terminated/Expired → View only
- Link to source proposal (if exists)
- Link to account and facility detail pages

#### ContractForm Page
**File:** `apps/web/src/pages/contracts/ContractForm.tsx`

**Features needed:**
- Create and edit contract forms
- Account selector (required, searchable)
- Facility selector (optional, filtered by account)
- Service terms section:
  - Start date (required)
  - End date (optional)
  - Service frequency dropdown
  - Service schedule JSON editor or form
  - Auto-renew checkbox
  - Renewal notice days
- Financial terms section:
  - Monthly value (required)
  - Total value (optional, calculated)
  - Billing cycle dropdown
  - Payment terms input
- Additional fields:
  - Terms and conditions (textarea)
  - Special instructions (textarea)
- Form validation matching backend Zod schemas
- Submit and cancel buttons

### 2. Routing & Navigation

**File:** `apps/web/src/App.tsx`

Add routes:
```typescript
<Route path="/contracts" element={<ContractsList />} />
<Route path="/contracts/new" element={<ContractForm />} />
<Route path="/contracts/:id" element={<ContractDetail />} />
<Route path="/contracts/:id/edit" element={<ContractForm />} />
```

**Navigation Menu:**
Add "Contracts" link to main navigation (likely in a layout component or header)

**Proposal Integration:**
Add "Create Contract" button on `ProposalDetail.tsx` for accepted proposals

### 3. Testing

#### Backend Tests
**Files to create:**
- `apps/api/src/services/__tests__/contractService.test.ts`
- `apps/api/src/routes/__tests__/contracts.routes.test.ts`

**Test coverage needed:**
- Contract service CRUD operations
- Proposal-to-contract conversion
- Status workflow transitions
- Validation rules
- Archive/restore functionality
- Error handling

#### Frontend Tests
**Files to create:**
- `apps/web/src/pages/contracts/__tests__/ContractsList.test.tsx`
- `apps/web/src/pages/contracts/__tests__/ContractDetail.test.tsx`
- `apps/web/src/pages/contracts/__tests__/ContractForm.test.tsx`

**Test coverage needed:**
- Component rendering
- User interactions
- API call mocking
- Form validation
- Error states

### 4. Final Steps

1. **Install Dependencies & Migrate:**
   ```bash
   npm install
   npm run db:migrate
   ```

2. **Test the Full Workflow:**
   - Create a contract manually
   - Create a contract from an accepted proposal
   - Edit a draft contract
   - Activate a contract
   - Sign a contract
   - Terminate a contract
   - Archive and restore

3. **Documentation:**
   - Already updated CHANGELOG.md
   - Update main README.md if needed

## Estimated Work Remaining

- **ContractDetail page:** 1-2 hours
- **ContractForm page:** 2-3 hours
- **Routing & navigation:** 30 minutes
- **Backend tests:** 2-3 hours
- **Frontend tests:** 2-3 hours
- **Integration testing:** 1 hour

**Total:** ~10-15 hours of development work

## Quick Reference

### Contract Status Flow
```
draft → pending_signature → active → expired
                                   ↘ terminated
```

### Key Business Rules
- Only draft contracts can be edited
- Only accepted proposals can be converted to contracts
- End date must be after start date
- Monthly value must be positive
- Cannot delete active contracts (must terminate first)

### API Endpoints
- `GET    /api/v1/contracts` - List
- `GET    /api/v1/contracts/:id` - Get one
- `POST   /api/v1/contracts` - Create
- `POST   /api/v1/contracts/from-proposal/:proposalId` - Create from proposal
- `PATCH  /api/v1/contracts/:id` - Update
- `PATCH  /api/v1/contracts/:id/status` - Update status
- `POST   /api/v1/contracts/:id/sign` - Sign
- `POST   /api/v1/contracts/:id/terminate` - Terminate
- `DELETE /api/v1/contracts/:id` - Archive
- `POST   /api/v1/contracts/:id/restore` - Restore
