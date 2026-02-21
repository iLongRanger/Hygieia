# SQFT Price + Derived Hours Implementation

## Objective
- Keep client pricing anchored to the square-foot pricing model.
- Still present expected on-site cleaning duration to the client.
- Preserve existing pricing multipliers and cost-stack behavior.

## Implemented Rule
- Commercial price is calculated by the selected pricing strategy.
- For `square_foot` plans, the snapshot now includes a derived operational estimate:
  - labor hours per month
  - labor hours per visit
  - recommended crew size
  - duration per visit and duration range

## Backend Changes
- Extended pricing snapshot in `apps/api/src/services/pricing/types.ts`:
  - `pricingBasis`
  - `operationalEstimate`
- Added operational estimate generation in:
  - `apps/api/src/services/pricing/strategies/sqftSettingsV1Strategy.ts`
  - `apps/api/src/services/pricing/strategies/perHourV1Strategy.ts`
- Proposal payload schemas now accept `pricingSnapshot`:
  - `apps/api/src/schemas/proposal.ts`
- Proposal create/update routes now pass through `pricingSnapshot`:
  - `apps/api/src/routes/proposals.ts`

## Frontend Changes
- Proposal form now persists pricing snapshot captured from facility pricing auto-populate:
  - `apps/web/src/pages/proposals/ProposalForm.tsx`
- Proposal detail shows a dedicated "Client Service Time Estimate" section:
  - `apps/web/src/pages/proposals/ProposalDetail.tsx`
- Public proposal page shows "Estimated Time On Site":
  - `apps/web/src/pages/public/PublicProposalView.tsx`
- Shared typing updates:
  - `apps/web/src/lib/pricing.ts`
  - `apps/web/src/types/proposal.ts`
  - `apps/web/src/types/publicProposal.ts`

## Current Estimate Formula
- `hoursPerVisit = monthlyLaborHours / monthlyVisits`
- `durationHoursPerVisit = hoursPerVisit / recommendedCrewSize`
- `durationRange = durationHoursPerVisit +/- 20%`

## Notes
- This duration is explicitly presented as an estimate.
- Existing pricing multipliers and profitability settings are unchanged.
- No database migration is required since snapshot is stored as JSON.
