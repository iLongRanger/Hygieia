# Data Flow Alignment Plan

## Overview

This plan addresses the misalignment between the documented data flow and the actual implementation in Hygieia. The goal is to establish clear, enforced relationships between modules from Lead to Contract.

**Status**: APPROVED
**Created**: 2025-01-20
**Approved**: 2025-01-20
**Phase**: 1 - Core Data Flow (Lead → Account → Proposal → Contract)

---

## Current Problems

### 1. Lead → Account: No Relationship
- **Issue**: Leads and Accounts are completely disconnected
- **Impact**: No way to track which leads converted to customers
- **Evidence**: No `sourceLeadId` on Account, no `convertedToAccountId` on Lead

### 2. Opportunity: Unnecessary Complexity
- **Issue**: Opportunity adds complexity without clear value for cleaning businesses
- **Impact**: Confusing data model, multiple paths to same outcome
- **Decision**: Remove Opportunity entirely

### 3. Contract → Proposal: Optional (Should Be Required)
- **Issue**: `proposalId` on Contract is nullable
- **Impact**: Contracts can exist without pricing basis, no audit trail
- **Solution**: Require proposal for normal flow, allow exceptions with `contractSource`

### 4. Proposal Status Not Enforced
- **Issue**: No enforcement that Proposal must be "accepted" before Contract creation
- **Impact**: Invalid business states possible
- **Solution**: Application-level validation with clear state machine

---

## Target Data Flow

```
LeadSource
    │
    ▼
LEAD ────────────────────────────────────────────────────────────────────────
│ Status: lead → walk_through_booked → walk_through_completed
│         → proposal_sent → negotiation → won | lost
│
│ Conversion: Can happen anytime (user decision)
│ When converted: Sets convertedToAccountId, convertedAt, convertedByUserId
│ When WON: Must have convertedToAccountId (enforced)
└────────────────────────────────────────────────────────────────────────────
                    │
                    │ [Convert to Account]
                    │ • Creates Account (or links to existing)
                    │ • Creates primary Contact from Lead data
                    │ • Optionally creates Facility from Lead address
                    ▼
ACCOUNT ─────────────────────────────────────────────────────────────────────
│ sourceLeadId: tracks origin (optional - accounts can exist without leads)
│
├──> Contact (multiple, one isPrimary)
├──> Facility (multiple)
└──> Proposal (multiple)
         │
         │ Status: draft → sent → viewed → accepted | rejected
         │ Only "accepted" proposals can create contracts
         ▼
     CONTRACT
         │ contractSource: proposal | imported | legacy | renewal
         │ When source = 'proposal': proposalId required
         │ Status: draft → pending_signature → active
         │         → expired | terminated | renewed
         │
         │ Renewal chain supported via renewedFromContractId
         └──────────────────────────────────────────────────────────────────
```

---

## Schema Changes

### 1. Lead Model Updates

```prisma
model Lead {
  // ... existing fields ...

  // NEW: Conversion tracking
  convertedToAccountId String?   @map("converted_to_account_id") @db.Uuid
  convertedAt          DateTime? @map("converted_at") @db.Timestamptz(6)
  convertedByUserId    String?   @map("converted_by_user_id") @db.Uuid

  // NEW: Relations
  convertedToAccount   Account?  @relation("LeadToAccount", fields: [convertedToAccountId], references: [id])
  convertedByUser      User?     @relation("ConvertedLeads", fields: [convertedByUserId], references: [id])

  // REMOVE: opportunities relation
}
```

### 2. Account Model Updates

```prisma
model Account {
  // ... existing fields ...

  // NEW: Lead origin tracking
  sourceLeadId String? @unique @map("source_lead_id") @db.Uuid

  // NEW: Relations
  sourceLead   Lead?   @relation("LeadToAccount", fields: [sourceLeadId], references: [id])

  // REMOVE: opportunities relation
}
```

### 3. User Model Updates

```prisma
model User {
  // ... existing fields ...

  // NEW: Conversion tracking
  convertedLeads Lead[] @relation("ConvertedLeads")

  // REMOVE: assignedToOpportunities, createdOpportunities relations
}
```

### 4. Contract Model Updates

```prisma
// NEW: Enum for contract source
enum ContractSource {
  proposal
  imported
  legacy
  renewal
}

model Contract {
  // ... existing fields ...

  // UPDATE: Add contract source
  contractSource ContractSource @default(proposal) @map("contract_source")

  // NEW: Renewal tracking
  renewedFromContractId String?   @unique @map("renewed_from_contract_id") @db.Uuid
  renewalNumber         Int       @default(0) @map("renewal_number")

  // NEW: Self-relation for renewals
  renewedFromContract   Contract? @relation("ContractRenewal", fields: [renewedFromContractId], references: [id])
  renewedToContract     Contract? @relation("ContractRenewal")

  // UPDATE: Status enum to include 'renewed'
  // status values: draft, pending_signature, active, expired, terminated, renewed
}
```

### 5. Proposal Model Updates

```prisma
model Proposal {
  // ... existing fields ...

  // REMOVE: opportunityId field and relation
  // REMOVE: opportunityId     String?   @map("opportunity_id") @db.Uuid
  // REMOVE: opportunity       Opportunity? @relation(...)
}
```

### 6. Remove Opportunity Model

```prisma
// DELETE ENTIRE MODEL
// model Opportunity { ... }
```

---

## Business Rules Implementation

### 1. Lead Status Transitions

```typescript
const LEAD_STATUS_TRANSITIONS: Record<string, string[]> = {
  'lead': ['walk_through_booked', 'walk_through_completed', 'lost', 'reopened'],
  'walk_through_booked': ['walk_through_completed', 'lead', 'lost'],
  'walk_through_completed': ['proposal_sent', 'negotiation', 'lost'],
  'proposal_sent': ['negotiation', 'won', 'lost'],
  'negotiation': ['won', 'lost', 'proposal_sent'],
  'won': ['reopened'],
  'lost': ['reopened'],
  'reopened': ['lead', 'walk_through_booked'],
};

// Validation: "won" status requires conversion
function validateLeadStatusChange(lead: Lead, newStatus: string): void {
  if (newStatus === 'won' && !lead.convertedToAccountId) {
    throw new BusinessRuleError(
      'Lead must be converted to an Account before marking as won'
    );
  }
}
```

### 2. Lead Conversion Logic

```typescript
interface ConvertLeadInput {
  leadId: string;
  createNewAccount: boolean;
  existingAccountId?: string; // If linking to existing account
  accountData?: {
    name: string;
    type: string;
    industry?: string;
    // ... other account fields
  };
  createFacility: boolean;
  facilityData?: {
    name: string;
    // ... facility fields populated from lead.address
  };
  userId: string; // Who is performing the conversion
}

async function convertLeadToAccount(input: ConvertLeadInput): Promise<{
  account: Account;
  contact: Contact;
  facility?: Facility;
}> {
  const lead = await getLead(input.leadId);

  // Validation
  if (lead.convertedToAccountId) {
    throw new BusinessRuleError('Lead has already been converted');
  }

  if (lead.archivedAt) {
    throw new BusinessRuleError('Cannot convert archived lead');
  }

  return prisma.$transaction(async (tx) => {
    let account: Account;

    if (input.createNewAccount) {
      // Create new account
      account = await tx.account.create({
        data: {
          ...input.accountData,
          sourceLeadId: lead.id,
          createdByUserId: input.userId,
        },
      });
    } else {
      // Link to existing account
      account = await tx.account.findUniqueOrThrow({
        where: { id: input.existingAccountId },
      });

      // Update account to track lead source if not already set
      if (!account.sourceLeadId) {
        await tx.account.update({
          where: { id: account.id },
          data: { sourceLeadId: lead.id },
        });
      }
    }

    // Create primary contact from lead data
    const contact = await tx.contact.create({
      data: {
        accountId: account.id,
        name: lead.contactName,
        email: lead.primaryEmail,
        phone: lead.primaryPhone,
        isPrimary: true,
        createdByUserId: input.userId,
      },
    });

    // Optionally create facility from lead address
    let facility: Facility | undefined;
    if (input.createFacility && lead.address) {
      facility = await tx.facility.create({
        data: {
          accountId: account.id,
          name: input.facilityData?.name || `${account.name} - Main`,
          address: lead.address,
          createdByUserId: input.userId,
        },
      });
    }

    // Update lead with conversion tracking
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        convertedToAccountId: account.id,
        convertedAt: new Date(),
        convertedByUserId: input.userId,
      },
    });

    return { account, contact, facility };
  });
}
```

### 3. Proposal Status Rules

```typescript
const PROPOSAL_STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': ['sent', 'archived'],
  'sent': ['viewed', 'accepted', 'rejected'],
  'viewed': ['accepted', 'rejected'],
  'accepted': [], // Terminal state - no transitions allowed
  'rejected': ['draft'], // Can revise and resend
};

// Validation: Proposal becomes immutable once accepted
function validateProposalEdit(proposal: Proposal): void {
  if (proposal.status === 'accepted') {
    throw new BusinessRuleError(
      'Cannot edit an accepted proposal. Create a new proposal instead.'
    );
  }
}
```

### 4. Contract Creation Rules

```typescript
interface CreateContractFromProposalInput {
  proposalId: string;
  startDate: Date;
  endDate?: Date;
  serviceFrequency?: string;
  serviceSchedule?: object;
  specialInstructions?: string;
  userId: string;
}

async function createContractFromProposal(
  input: CreateContractFromProposalInput
): Promise<Contract> {
  const proposal = await getProposalWithRelations(input.proposalId);

  // Validation
  if (proposal.status !== 'accepted') {
    throw new BusinessRuleError(
      'Contract can only be created from an accepted proposal'
    );
  }

  if (proposal.archivedAt) {
    throw new BusinessRuleError('Cannot create contract from archived proposal');
  }

  // Check no existing contract for this proposal
  const existingContract = await getContractByProposalId(input.proposalId);
  if (existingContract) {
    throw new BusinessRuleError(
      'A contract already exists for this proposal'
    );
  }

  // Create contract
  const contract = await prisma.contract.create({
    data: {
      contractNumber: generateContractNumber(),
      title: `Service Agreement - ${proposal.account.name}`,
      status: 'draft',
      contractSource: 'proposal',
      accountId: proposal.accountId,
      facilityId: proposal.facilityId,
      proposalId: proposal.id,
      startDate: input.startDate,
      endDate: input.endDate,
      serviceFrequency: input.serviceFrequency,
      serviceSchedule: input.serviceSchedule,
      monthlyValue: proposal.totalAmount, // Or calculated from services
      billingCycle: 'monthly',
      paymentTerms: proposal.account.paymentTerms,
      termsAndConditions: proposal.termsAndConditions,
      specialInstructions: input.specialInstructions,
      createdByUserId: input.userId,
    },
  });

  return contract;
}

// For imported/legacy contracts (without proposal)
async function createStandaloneContract(
  input: CreateStandaloneContractInput
): Promise<Contract> {
  // Validate source is not 'proposal'
  if (input.contractSource === 'proposal') {
    throw new BusinessRuleError(
      'Use createContractFromProposal for proposal-based contracts'
    );
  }

  // Allow creation without proposalId
  return prisma.contract.create({
    data: {
      ...input,
      proposalId: null,
    },
  });
}
```

### 5. Contract Renewal Logic

```typescript
async function renewContract(
  contractId: string,
  renewalData: RenewalInput,
  userId: string
): Promise<Contract> {
  const originalContract = await getContract(contractId);

  // Validation
  if (originalContract.status !== 'active' && originalContract.status !== 'expired') {
    throw new BusinessRuleError(
      'Only active or expired contracts can be renewed'
    );
  }

  if (originalContract.renewedToContract) {
    throw new BusinessRuleError('This contract has already been renewed');
  }

  return prisma.$transaction(async (tx) => {
    // Create renewal contract
    const renewalContract = await tx.contract.create({
      data: {
        contractNumber: generateContractNumber(),
        title: originalContract.title,
        status: 'draft',
        contractSource: 'renewal',
        accountId: originalContract.accountId,
        facilityId: originalContract.facilityId,
        proposalId: null, // Renewals don't need proposals
        renewedFromContractId: originalContract.id,
        renewalNumber: originalContract.renewalNumber + 1,
        startDate: renewalData.startDate,
        endDate: renewalData.endDate,
        serviceFrequency: renewalData.serviceFrequency || originalContract.serviceFrequency,
        serviceSchedule: renewalData.serviceSchedule || originalContract.serviceSchedule,
        monthlyValue: renewalData.monthlyValue || originalContract.monthlyValue,
        billingCycle: originalContract.billingCycle,
        paymentTerms: originalContract.paymentTerms,
        termsAndConditions: originalContract.termsAndConditions,
        autoRenew: renewalData.autoRenew ?? originalContract.autoRenew,
        createdByUserId: userId,
      },
    });

    // Update original contract status
    await tx.contract.update({
      where: { id: originalContract.id },
      data: { status: 'renewed' },
    });

    return renewalContract;
  });
}
```

---

## Contract Status State Machine

```
                                    ┌─────────────────┐
                                    │                 │
                                    ▼                 │
┌─────────┐    ┌───────────────────┐    ┌────────┐   │
│  draft  │───>│ pending_signature │───>│ active │───┘ (auto-renew)
└─────────┘    └───────────────────┘    └────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
              ┌─────────┐             ┌────────────┐            ┌─────────┐
              │ expired │             │ terminated │            │ renewed │
              └─────────┘             └────────────┘            └─────────┘
                    │                                                 │
                    │                                                 │
                    └──────────────> [Can be renewed] <───────────────┘
```

### Status Definitions

| Status | Description | Allowed Transitions |
|--------|-------------|---------------------|
| `draft` | Contract created, not yet sent for signature | `pending_signature` |
| `pending_signature` | Sent for signature, awaiting customer | `active`, `draft` (revise) |
| `active` | Signed and in effect | `expired`, `terminated`, `renewed` |
| `expired` | End date passed without renewal | `renewed` (late renewal) |
| `terminated` | Ended early by either party | None (terminal) |
| `renewed` | Superseded by a renewal contract | None (terminal) |

---

## Implementation Tasks

### Phase 1A: Schema Changes (Database)

- [ ] 1.1 Add conversion fields to Lead model
- [ ] 1.2 Add sourceLeadId to Account model
- [ ] 1.3 Add ContractSource enum
- [ ] 1.4 Add contractSource field to Contract model
- [ ] 1.5 Add renewal fields to Contract model (renewedFromContractId, renewalNumber)
- [ ] 1.6 Add self-relation for Contract renewals
- [ ] 1.7 Remove opportunityId from Proposal model
- [ ] 1.8 Remove Opportunity model entirely
- [ ] 1.9 Update User model relations (remove opportunity relations, add convertedLeads)
- [ ] 1.10 Create and run migration
- [ ] 1.11 Update seed data (remove opportunity references)

### Phase 1B: Backend - Shared/Schema Package

- [ ] 1.12 Update Zod schemas for Lead (add conversion fields)
- [ ] 1.13 Update Zod schemas for Account (add sourceLeadId)
- [ ] 1.14 Update Zod schemas for Contract (add contractSource, renewal fields)
- [ ] 1.15 Create ContractSource enum in shared schemas
- [ ] 1.16 Remove Opportunity schemas
- [ ] 1.17 Update Proposal schemas (remove opportunityId)
- [ ] 1.18 Add lead conversion input/output schemas
- [ ] 1.19 Add contract renewal input/output schemas

### Phase 1C: Backend - API Routes & Services

- [ ] 1.20 Create Lead conversion endpoint (POST /api/leads/:id/convert)
- [ ] 1.21 Implement Lead conversion service logic
- [ ] 1.22 Update Lead status validation (require conversion for "won")
- [ ] 1.23 Update Proposal validation (remove opportunity references)
- [ ] 1.24 Update Contract creation endpoint (validate proposal status)
- [ ] 1.25 Create standalone contract endpoint (for imports/legacy)
- [ ] 1.26 Create contract renewal endpoint (POST /api/contracts/:id/renew)
- [ ] 1.27 Implement contract renewal service logic
- [ ] 1.28 Remove Opportunity routes entirely
- [ ] 1.29 Remove Opportunity service entirely
- [ ] 1.30 Update any dashboard/stats that reference opportunities

### Phase 1D: Frontend Updates

- [ ] 1.31 Create Lead conversion UI (modal/page)
- [ ] 1.32 Add "Convert to Account" button on Lead detail page
- [ ] 1.33 Update Lead status change to validate conversion for "won"
- [ ] 1.34 Remove Opportunity from navigation/menu
- [ ] 1.35 Remove Opportunity list page
- [ ] 1.36 Remove Opportunity detail page
- [ ] 1.37 Remove Opportunity form
- [ ] 1.38 Update Proposal form (remove opportunity field)
- [ ] 1.39 Update Proposal list (remove opportunity column)
- [ ] 1.40 Update Contract creation flow (enforce proposal selection)
- [ ] 1.41 Add "Create Contract" button on accepted Proposal detail
- [ ] 1.42 Create contract renewal UI
- [ ] 1.43 Add "Renew Contract" button on active/expired Contract detail
- [ ] 1.44 Update dashboard widgets (remove opportunity metrics)
- [ ] 1.45 Update Account detail to show source lead
- [ ] 1.46 Update Lead detail to show converted account link

### Phase 1E: Testing & Validation

- [ ] 1.47 Write unit tests for lead conversion logic
- [ ] 1.48 Write unit tests for contract creation validation
- [ ] 1.49 Write unit tests for contract renewal logic
- [ ] 1.50 Write integration tests for full lead → contract flow
- [ ] 1.51 Manual testing of complete workflow

---

## Migration Strategy

Since we're in development with no important data:

1. **Create migration** with all schema changes
2. **Drop and recreate** database if needed
3. **Update seed data** to reflect new structure
4. **Remove all Opportunity references** from codebase

---

## Success Criteria

1. ✅ Lead can be converted to Account with tracking
2. ✅ Lead status "won" requires conversion to Account
3. ✅ Opportunity model completely removed
4. ✅ Contract creation requires accepted Proposal (for normal flow)
5. ✅ Contract source tracks how contract was created
6. ✅ Contract renewal creates linked chain
7. ✅ All status transitions enforced at application level
8. ✅ Frontend guides users through correct workflow

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| When can Lead be converted? | Anytime (user decision) |
| Should Opportunity be removed? | Yes, remove entirely |
| Contract without Proposal allowed? | Yes, with contractSource = imported/legacy/renewal |
| Track contract renewals? | Yes, with renewedFromContractId chain |

---

## Future Phases

- **Phase 2**: Facility, Area, Task alignment
- **Phase 3**: Pricing rules and calculation flow
- **Phase 4**: Reporting and analytics updates

---

## Approval

- [x] Technical Lead Approval
- [x] Product Owner Approval
- [x] Ready for Implementation

**Approved on**: 2025-01-20
