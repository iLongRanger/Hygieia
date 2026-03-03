# Account Dashboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the 1,350-line AccountDetail.tsx monolith into a dashboard layout with hero section (active contract banner + KPIs) and a card grid (contacts, facilities, financials, service overview, history).

**Architecture:** Extract into a parent shell (AccountDetail) for data fetching and state, with child components for each dashboard section. Modals extracted into separate files. Add two new data fetches (contacts, jobs) for new sections. Frontend-only — no new API endpoints.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing UI components (Card, Badge, Button, Modal, etc.)

---

### Task 1: Create shared constants file

**Files:**
- Create: `apps/web/src/pages/accounts/account-constants.ts`

**Step 1: Create the constants file**

Extract all constants from AccountDetail.tsx:

```typescript
import type { Proposal } from '../../types/proposal';
import type { ContractStatus } from '../../types/contract';

export const ACCOUNT_TYPES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
];

export const INDUSTRIES = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'education', label: 'Education' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_TERMS = [
  { value: 'NET15', label: 'Net 15' },
  { value: 'NET30', label: 'Net 30' },
  { value: 'NET45', label: 'Net 45' },
  { value: 'NET60', label: 'Net 60' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
];

export const BUILDING_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'medical', label: 'Medical' },
  { value: 'educational', label: 'Educational' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'residential', label: 'Residential' },
  { value: 'other', label: 'Other' },
];

export const FACILITY_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

export const CONTRACT_STATUS_VARIANTS: Record<
  ContractStatus,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  draft: 'default',
  sent: 'info',
  viewed: 'info',
  pending_signature: 'success',
  active: 'success',
  expired: 'default',
  terminated: 'error',
};

export const PROPOSAL_STATUS_VARIANTS: Record<
  Proposal['status'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  draft: 'default',
  sent: 'info',
  viewed: 'warning',
  accepted: 'success',
  rejected: 'error',
  expired: 'default',
};

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
  }).format(value);
}

export function getTypeVariant(type: string): 'info' | 'success' | 'default' {
  switch (type) {
    case 'commercial': return 'info';
    case 'residential': return 'success';
    default: return 'default';
  }
}
```

**Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep "error TS" | grep -v "__tests__" | grep -v "calendar/"`

**Step 3: Commit**

```bash
git add apps/web/src/pages/accounts/account-constants.ts
git commit -m "refactor: extract account constants and helpers to shared file"
```

---

### Task 2: Extract modals into separate files

**Files:**
- Create: `apps/web/src/pages/accounts/modals/EditAccountModal.tsx`
- Create: `apps/web/src/pages/accounts/modals/AddFacilityModal.tsx`

**Step 1: Create EditAccountModal**

Extract lines 1033-1170 from AccountDetail.tsx. Props:
```typescript
interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: UpdateAccountInput;
  setFormData: React.Dispatch<React.SetStateAction<UpdateAccountInput>>;
  users: User[];
  activeContract: Contract | null;
  onSave: () => void;
  saving: boolean;
}
```
Import ACCOUNT_TYPES, INDUSTRIES, PAYMENT_TERMS from `../account-constants`.

**Step 2: Create AddFacilityModal**

Extract lines 1172-1345 from AccountDetail.tsx. Props:
```typescript
interface AddFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityFormData: Omit<CreateFacilityInput, 'accountId'>;
  setFacilityFormData: React.Dispatch<React.SetStateAction<Omit<CreateFacilityInput, 'accountId'>>>;
  onSave: () => void;
  saving: boolean;
}
```
Import BUILDING_TYPES, FACILITY_STATUSES from `../account-constants`.

**Step 3: Verify and commit**

```bash
git add apps/web/src/pages/accounts/modals/
git commit -m "refactor: extract account modals into separate files"
```

---

### Task 3: Create AccountHero component

**Files:**
- Create: `apps/web/src/pages/accounts/AccountHero.tsx`

**Step 1: Create the hero component**

This combines the header, active contract banner, and KPI strip into one cohesive top section.

```typescript
interface AccountHeroProps {
  account: Account;
  activeContract: Contract | null;
  proposalTotal: number;
  contractTotal: number;
  contacts: Contact[];
  recentJobs: Job[];
  canAdminAccounts: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onNavigate: (path: string) => void;
}
```

Layout:
- **Header**: Back button, account name + type badge + industry, action buttons (Edit, Archive/Restore)
- **Active Contract Banner** (full-width, redesigned):
  - If active: emerald-tinted card (`border-emerald/20 bg-emerald/5`) with contract number, monthly value (large text), assigned team, end date, "View Contract" link
  - If none: muted card with "No active contract" and suggestion text
- **KPI Strip** (grid-cols-2 sm:grid-cols-4):
  - Monthly Value: from activeContract.monthlyValue, formatted as currency
  - Facilities: account._count.facilities, clickable
  - Next Service: find earliest upcoming job from recentJobs, show date or "None scheduled"
  - Account Health: derive from data — "Active" (has active contract), "At Risk" (contract expiring within 30 days), "New" (no contracts at all)

**Step 2: Verify and commit**

```bash
git add apps/web/src/pages/accounts/AccountHero.tsx
git commit -m "feat: add AccountHero component with contract banner and KPIs"
```

---

### Task 4: Create AccountContacts component

**Files:**
- Create: `apps/web/src/pages/accounts/AccountContacts.tsx`

**Step 1: Create the contacts card component**

```typescript
interface AccountContactsProps {
  contacts: Contact[];
  accountId: string;
  onNavigate: (path: string) => void;
}
```

Layout (Card):
- Header: "Contacts" + count + "View All" button linking to /contacts?accountId=
- Primary contact (isPrimary=true) highlighted at top with star/badge
- Billing contact (isBilling=true) shown with billing badge
- Other contacts listed below
- Each contact shows: name, title, email, phone
- Empty state if no contacts

**Step 2: Verify and commit**

```bash
git add apps/web/src/pages/accounts/AccountContacts.tsx
git commit -m "feat: add AccountContacts component with contact hierarchy"
```

---

### Task 5: Create AccountFacilities component

**Files:**
- Create: `apps/web/src/pages/accounts/AccountFacilities.tsx`

**Step 1: Create the facilities card component**

```typescript
interface AccountFacilitiesProps {
  facilities: Facility[];
  canWriteFacilities: boolean;
  onAddFacility: () => void;
  onNavigate: (path: string) => void;
}
```

Layout (Card):
- Header: "Facilities" + "Add Facility" button (if permission)
- Mini facility cards in a grid (grid-cols-1 md:grid-cols-2):
  - Each: facility name, address (street, city, state), building type badge, status badge
  - Clickable → navigates to /facilities/:id
- Empty state if no facilities

**Step 2: Verify and commit**

```bash
git add apps/web/src/pages/accounts/AccountFacilities.tsx
git commit -m "feat: add AccountFacilities component"
```

---

### Task 6: Create AccountFinancials component

**Files:**
- Create: `apps/web/src/pages/accounts/AccountFinancials.tsx`

**Step 1: Create the financials card component**

```typescript
interface AccountFinancialsProps {
  account: Account;
  activeContract: Contract | null;
  proposals: Proposal[];
  contracts: Contract[];
  proposalTotal: number;
  contractTotal: number;
  onNavigate: (path: string) => void;
}
```

Layout (Card):
- Header: "Financial Summary"
- Stats grid (grid-cols-2 gap-4):
  - Monthly Value: from active contract or "-"
  - Payment Terms: from account.paymentTerms
  - Total Proposals: proposalTotal count
  - Total Contracts: contractTotal count
- Recent Proposals section (3 most recent):
  - Each: proposal number, title, amount, status badge
  - Clickable → navigates to proposal detail
  - "View all" link to /proposals?accountId=
- Recent Contracts section (3 most recent):
  - Each: contract number, title, monthly value, status badge
  - Clickable → navigates to contract detail
  - "View all" link to /contracts?accountId=

Import PROPOSAL_STATUS_VARIANTS, CONTRACT_STATUS_VARIANTS, formatCurrency, formatShortDate from `./account-constants`.

**Step 2: Verify and commit**

```bash
git add apps/web/src/pages/accounts/AccountFinancials.tsx
git commit -m "feat: add AccountFinancials component with proposal/contract summaries"
```

---

### Task 7: Create AccountServiceOverview component

**Files:**
- Create: `apps/web/src/pages/accounts/AccountServiceOverview.tsx`

**Step 1: Create the service overview card component**

```typescript
interface AccountServiceOverviewProps {
  activeContract: Contract | null;
  recentJobs: Job[];
  onNavigate: (path: string) => void;
}
```

Layout (Card):
- Header: "Service Overview"
- Stats grid:
  - Assigned Team: from activeContract.assignedTeam?.name or "Unassigned"
  - Last Service: most recent completed job date, or "No services yet"
  - Upcoming Jobs: count of jobs with status scheduled/in_progress
  - Service Frequency: from contract billing frequency or "N/A"
- Placeholder section for quality metrics (future): "Quality metrics coming soon" in muted text

**Step 2: Verify and commit**

```bash
git add apps/web/src/pages/accounts/AccountServiceOverview.tsx
git commit -m "feat: add AccountServiceOverview component"
```

---

### Task 8: Create AccountHistory component

**Files:**
- Create: `apps/web/src/pages/accounts/AccountHistory.tsx`

**Step 1: Create the history card component**

Extract the account history section (lines 958-1031) and the add-note form (lines 967-992).

```typescript
interface AccountHistoryProps {
  activities: AccountActivity[];
  activitiesLoading: boolean;
  canWriteAccounts: boolean;
  activityNote: string;
  setActivityNote: (note: string) => void;
  activityType: AccountActivityEntryType;
  setActivityType: (type: AccountActivityEntryType) => void;
  onAddActivity: () => void;
  addingActivity: boolean;
}
```

Layout (Card, full-width):
- Header: "Account History"
- Add note form (if canWriteAccounts): entry type select, textarea, submit button
- Activity list (max-h-96 overflow-y-auto): each entry has type badge, timestamp, note, user attribution

Import formatDateTime from `./account-constants`.

**Step 2: Verify and commit**

```bash
git add apps/web/src/pages/accounts/AccountHistory.tsx
git commit -m "feat: add AccountHistory component"
```

---

### Task 9: Rewrite AccountDetail.tsx as parent shell with dashboard layout

**Files:**
- Modify: `apps/web/src/pages/accounts/AccountDetail.tsx`

**Step 1: Rewrite the component**

The new AccountDetail becomes a shell that:

1. Keeps all data fetching functions
2. Adds two new fetches: `fetchContacts` (listContacts with accountId) and `fetchRecentJobs` (listJobs with accountId, limit 10)
3. Keeps all handler functions
4. Keeps all form/modal state
5. Imports and renders child components in dashboard layout

New state:
```typescript
const [contacts, setContacts] = useState<Contact[]>([]);
const [recentJobs, setRecentJobs] = useState<Job[]>([]);
```

New layout:
```tsx
<div className="space-y-6">
  <AccountHero ... />

  {/* Dashboard Cards - Row 1 */}
  <div className="grid gap-6 lg:grid-cols-2">
    <AccountContacts ... />
    <AccountFacilities ... />
  </div>

  {/* Dashboard Cards - Row 2 */}
  <div className="grid gap-6 lg:grid-cols-2">
    <AccountFinancials ... />
    <AccountServiceOverview ... />
  </div>

  {/* Full-width */}
  <AccountHistory ... />

  {/* Modals */}
  <EditAccountModal ... />
  <AddFacilityModal ... />
</div>
```

Remove all inline JSX, old constants, unused imports.

**Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep "error TS" | grep -v "__tests__" | grep -v "calendar/"`

**Step 3: Commit**

```bash
git add apps/web/src/pages/accounts/AccountDetail.tsx
git commit -m "feat: restructure AccountDetail as dashboard with component decomposition"
```

---

### Task 10: Visual polish and push

**Step 1: Polish**

Review all components for consistent dark theme styling:
- Replace `text-surface-900 dark:text-surface-100` with `text-white` (matching facility redesign)
- Replace `text-surface-500 dark:text-surface-400` with `text-gray-400`
- Replace `border-surface-200 dark:border-surface-700` with `border-white/10`
- Replace `bg-surface-50 dark:bg-surface-800/50` with `bg-navy-dark/30`
- Ensure icon colors use `text-emerald` / `text-gold` pattern from facility redesign

**Step 2: Verify and commit**

```bash
git add apps/web/src/pages/accounts/
git commit -m "feat: polish account dashboard styling to match facility redesign"
```

**Step 3: Push**

```bash
git push origin main
```
