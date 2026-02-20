# Auto-apply Inspection Template from Contract — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When creating a new inspection and selecting a contract, automatically find (or create) the inspection template for that contract and pre-fill the template field.

**Architecture:** New API endpoint `GET /inspection-templates/by-contract/:contractId` wraps existing `autoCreateInspectionTemplate` logic with a "find first" guard. Frontend adds a contract dropdown to the inspection form that triggers template auto-fill on selection.

**Tech Stack:** Express route, Prisma service, React form with existing Select/Card components

---

### Task 1: Add `getOrCreateTemplateForContract` service method

**Files:**
- Modify: `apps/api/src/services/inspectionTemplateService.ts` (append after line 277)

**Step 1: Write the service method**

Add this export at the end of `inspectionTemplateService.ts`:

```typescript
/**
 * Find the existing inspection template for a contract, or auto-create one.
 * Returns { id, name } or null if the contract has no proposal tasks.
 */
export async function getOrCreateTemplateForContract(contractId: string, createdByUserId: string) {
  // Check for existing non-archived template
  const existing = await prisma.inspectionTemplate.findFirst({
    where: { contractId, archivedAt: null },
    select: { id: true, name: true },
  });
  if (existing) return existing;

  // Auto-create from proposal tasks
  const created = await autoCreateInspectionTemplate(contractId, createdByUserId);
  if (!created) return null;

  return { id: created.id, name: created.name };
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/api && npx tsc --noEmit --pretty 2>&1 | grep -i "inspectionTemplateService" || echo "No errors in file"`

**Step 3: Commit**

```bash
git add apps/api/src/services/inspectionTemplateService.ts
git commit -m "feat: add getOrCreateTemplateForContract service method"
```

---

### Task 2: Add API route `GET /inspection-templates/by-contract/:contractId`

**Files:**
- Modify: `apps/api/src/routes/inspectionTemplates.ts` (add route + import)

**Step 1: Update the import to include the new service method**

In `inspectionTemplates.ts`, add `getOrCreateTemplateForContract` to the import from `../services/inspectionTemplateService`.

**Step 2: Add the route**

Add this route after the `GET /:id` route (after line 51) and before the `POST /` route:

```typescript
// Get or create template for a contract
router.get(
  '/by-contract/:contractId',
  requirePermission(PERMISSIONS.INSPECTIONS_READ),
  async (req: Request, res: Response) => {
    const template = await getOrCreateTemplateForContract(
      req.params.contractId,
      req.user!.id
    );
    res.json({ data: template });
  }
);
```

**Important:** This route MUST be placed before `/:id` to avoid Express treating `"by-contract"` as an `:id` parameter. Move it after the `GET /` list route but before `GET /:id`.

**Step 3: Verify TypeScript compiles**

Run: `cd apps/api && npx tsc --noEmit --pretty 2>&1 | grep -i "inspectionTemplates" || echo "No errors in file"`

**Step 4: Commit**

```bash
git add apps/api/src/routes/inspectionTemplates.ts
git commit -m "feat: add GET /inspection-templates/by-contract/:contractId route"
```

---

### Task 3: Add frontend API function `getTemplateForContract`

**Files:**
- Modify: `apps/web/src/lib/inspections.ts` (add after line 58, before the Inspections section)

**Step 1: Add the function**

```typescript
export async function getTemplateForContract(
  contractId: string
): Promise<{ id: string; name: string } | null> {
  const response = await api.get(`/inspection-templates/by-contract/${contractId}`);
  return response.data.data;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/inspections.ts
git commit -m "feat: add getTemplateForContract API client function"
```

---

### Task 4: Update InspectionForm — add contract dropdown and auto-fill template

**Files:**
- Modify: `apps/web/src/pages/inspections/InspectionForm.tsx`

**Step 1: Add imports**

Add to the imports at the top:
- Import `listContracts` from `../../lib/contracts`
- Import `getTemplateForContract` from `../../lib/inspections` (add to existing import)

```typescript
import { listContracts } from '../../lib/contracts';
```

Update the existing import from `../../lib/inspections`:
```typescript
import {
  createInspection,
  updateInspection,
  getInspection,
  listInspectionTemplates,
  getTemplateForContract,
} from '../../lib/inspections';
```

**Step 2: Add ContractOption interface and contracts state**

After the `JobOption` interface (line 51), add:

```typescript
interface ContractOption {
  id: string;
  contractNumber: string;
  title: string;
}
```

Inside the component, after `const [jobs, setJobs] = useState<JobOption[]>([]);` (line 64), add:

```typescript
const [contracts, setContracts] = useState<ContractOption[]>([]);
```

**Step 3: Add `fetchContractsForFacility` callback**

After `fetchJobsForFacility` (after line 108), add:

```typescript
const fetchContractsForFacility = useCallback(async (facilityId: string) => {
  if (!facilityId) {
    setContracts([]);
    return;
  }
  try {
    const res = await listContracts({ facilityId, status: 'active', limit: 100 });
    setContracts(res?.data || []);
  } catch {
    setContracts([]);
  }
}, []);
```

**Step 4: Add `handleContractChange` function**

After `handleJobChange` (after line 170), add:

```typescript
const handleContractChange = async (contractId: string) => {
  setFormData((prev) => ({
    ...prev,
    contractId: contractId || null,
  }));

  // Auto-fill template from contract
  if (contractId) {
    try {
      const template = await getTemplateForContract(contractId);
      if (template) {
        setFormData((prev) => ({ ...prev, templateId: template.id }));
      }
    } catch {
      // Silently fail — user can still pick a template manually
    }
  }
};
```

**Step 5: Update `handleFacilityChange` to also load contracts and clear contractId/templateId**

Replace the existing `handleFacilityChange` (lines 151-161):

```typescript
const handleFacilityChange = (facilityId: string) => {
  const facility = facilities.find((f) => f.id === facilityId);
  setFormData((prev) => ({
    ...prev,
    facilityId,
    accountId: facility?.account?.id || '',
    jobId: null,
    contractId: null,
    templateId: null,
  }));
  fetchJobsForFacility(facilityId);
  fetchContractsForFacility(facilityId);
};
```

**Step 6: Update `handleJobChange` to auto-set contract and trigger template lookup**

Replace the existing `handleJobChange` (lines 163-170):

```typescript
const handleJobChange = (jobId: string) => {
  const job = jobs.find((j) => j.id === jobId);
  const contractId = job?.contract?.id || null;
  setFormData((prev) => ({
    ...prev,
    jobId: jobId || null,
    contractId,
  }));
  // Trigger template auto-fill when job sets a contract
  if (contractId) {
    handleContractChange(contractId);
  }
};
```

**Step 7: Update `fetchReferenceData`/initial load to also fetch contracts when editing**

In `fetchInspection` callback (around line 130), add `fetchContractsForFacility` call:

```typescript
await fetchContractsForFacility(inspection.facilityId);
```

(Add after the existing `await fetchJobsForFacility(inspection.facilityId);` line.)

**Step 8: Add the Contract `<Select>` to the form**

In the Facility & Inspector card, after the Inspector `<Select>` (after line 290) and before the Template `<Select>`:

```tsx
<Select
  label="Contract"
  placeholder="Select a contract (optional)"
  value={formData.contractId || ''}
  onChange={(val) => handleContractChange(val)}
  options={[
    { value: '', label: 'None' },
    ...contracts.map((c) => ({
      value: c.id,
      label: `${c.contractNumber} — ${c.title}`,
    })),
  ]}
  disabled={isEditMode || !formData.facilityId}
/>
```

**Step 9: Add contract to Summary panel**

After the Job summary block (after line 381), add:

```tsx
{formData.contractId && (
  <div>
    <span className="text-surface-500 dark:text-surface-400">Contract</span>
    <p className="font-medium text-surface-900 dark:text-surface-100">
      {contracts.find((c) => c.id === formData.contractId)?.contractNumber || formData.contractId}
    </p>
  </div>
)}
```

**Step 10: Verify the app compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 11: Commit**

```bash
git add apps/web/src/pages/inspections/InspectionForm.tsx
git commit -m "feat: auto-fill inspection template when contract selected"
```

---

### Task 5: Manual smoke test

**Steps:**
1. Start the dev server: `npm run dev` (or whatever the monorepo command is)
2. Navigate to `/inspections/new`
3. Select a facility that has an active contract
4. Verify the Contract dropdown populates with active contracts
5. Select a contract — verify the Template field auto-fills
6. Change the template to a different one — verify it's editable
7. Clear the contract — verify template stays as-is (doesn't clear)
8. Select a Job — verify it auto-fills the Contract dropdown and triggers template auto-fill
9. Submit the form — verify inspection is created with correct contractId and templateId
