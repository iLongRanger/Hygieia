# Inspection Workflow Update: Area-First Hygieia Standard

## Goal
- Reduce inspection noise from long task-level checklists.
- Make inspections clearly aligned with Hygieia quality promises.
- Score facility quality by area, not by every service task.

## What Changed

### 1. Auto-generated templates are now area-first
- File: `apps/api/src/services/inspectionTemplateService.ts`
- Contract/facility templates now generate one inspection item per area.
- Each area item uses the Hygieia standard statement:
  - `Area is clean, maintained, stocked, and safe per Hygieia Standard.`
- Item weight is set to `2` for stronger scoring impact.

### 2. Existing manual templates are preserved
- If a contract already has a non-auto/manual template, it is not overwritten.
- Auto-generated templates are refreshed to keep area lists current.

### 3. Inspection form preview now shows areas only
- File: `apps/web/src/pages/inspections/InspectionForm.tsx`
- Replaced task-list preview with area list preview.
- UI messaging updated to "Hygieia Standard Inspection Areas".

### 4. Inspection execution is area-scored
- File: `apps/web/src/pages/inspections/InspectionDetail.tsx`
- Completion UI now scores each area (PASS/FAIL/NA + 1-5 rating).
- Score/rating actions apply to all underlying items in that area category.
- Read-only view now summarizes by area instead of showing all task rows.

## Resulting Workflow
1. User selects contract/facility in New Inspection.
2. System builds/refreshes an area-first Hygieia template.
3. Inspector scores each area quickly against brand standards.
4. Completion and corrective actions remain available in the same module.

## Why This Helps
- Faster inspections in field operations.
- Cleaner reports for managers and clients.
- Stronger consistency with Hygieia service quality standards.
