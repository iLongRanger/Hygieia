# Auto-apply Inspection Template from Contract

## Problem
When creating a new inspection, the user must manually select an inspection template. The system should auto-apply the template linked to the selected contract, since templates are already auto-generated from contract proposal tasks at activation time.

## Design Decisions
- **Use existing template** linked to contract (created at activation), not a new one each time
- **Auto-create on the fly** if no template exists yet for the contract (reuse `autoCreateInspectionTemplate`)
- **Add direct contract dropdown** to the inspection form (filtered by facility + active status)
- **Auto-fill but editable** — user can override the template selection

## Data Flow

```
User selects Facility
  -> Load active contracts for facility
  -> Load scheduled jobs for facility (existing)

User selects Contract (new dropdown)
  -> GET /inspection-templates/by-contract/:contractId
  -> Returns existing template OR auto-creates from proposal tasks
  -> templateId auto-filled (user can change)

User selects Job (optional)
  -> Auto-fill contractId from job.contract (existing)
  -> Triggers same template lookup
```

## Changes

### API: New endpoint + service method
- Route: `GET /inspection-templates/by-contract/:contractId` in `inspectionTemplates.ts`
- Service: `getOrCreateTemplateForContract(contractId, userId)` in `inspectionTemplateService.ts`
  - Finds existing non-archived template for contractId
  - If missing, calls existing `autoCreateInspectionTemplate` logic
  - Returns template `{ id, name }` or null if contract has no proposal tasks

### Frontend: InspectionForm.tsx
- Add `contracts` state, `fetchContractsForFacility(facilityId)` using `listContracts({ facilityId, status: 'active' })`
- Add Contract `<Select>` between Inspector and Template
- `handleContractChange(contractId)` -> calls API, sets `templateId`
- Update `handleJobChange` -> also sets contract and triggers template lookup
- Update `handleFacilityChange` -> clears contract + template
- Add `getTemplateForContract(contractId)` in `apps/web/src/lib/inspections.ts`

### No DB/Prisma changes needed
Existing FKs: `Inspection.contractId`, `InspectionTemplate.contractId`
