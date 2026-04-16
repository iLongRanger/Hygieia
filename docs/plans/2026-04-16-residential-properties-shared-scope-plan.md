# Residential Properties with Shared Scope Implementation Plan

**Goal:** Keep residential and commercial clearly separated in the product while reusing the same operational scope engine for areas, tasks, walkthroughs, and downstream service setup.

**User-facing model**
- Residential account -> multiple `properties`
- Commercial account -> multiple `facilities`

**Operational model**
- Commercial continues to use `Facility`
- Residential `Property` gets one linked internal `Facility`
- Areas, facility tasks, walkthroughs, pricing readiness, and scope-driven operations run from that linked facility for both account types

**Why this approach**
- Preserves clear UX language for residential vs commercial
- Avoids duplicating area/task/walkthrough logic
- Makes residential walkthroughs useful because they can build structured scope

---

## Core Rules

1. A residential account can have multiple properties.
2. A commercial account can have multiple facilities.
3. Each residential property must map to exactly one internal facility.
4. Residential UI should use `property/properties`, never `facility/facilities`.
5. Commercial UI should continue using `facility/facilities`.
6. Areas, tasks, walkthroughs, and operational scope attach to the linked facility for both flows.

---

## Phase 1: Schema and Type Contracts

**Goal:** Make the residential property -> operational facility relationship explicit and durable.

**Files**
- `packages/database/prisma/schema.prisma`
- `apps/api/src/schemas/taskTemplate.ts`
- `apps/api/src/schemas/facility.ts`
- `apps/web/src/types/task.ts`
- `apps/web/src/types/facility.ts`
- `apps/web/src/types/residential.ts`

**Changes**
- Add `TaskTemplate.scope` with values:
  - `residential`
  - `commercial`
  - `both`
- Make the residential property -> facility relationship one-to-one.
- Expose `residentialPropertyId` in facility types where needed.
- Add task-template query support for scope-aware filtering.

---

## Phase 2: Residential Property Creates the Facility

**Goal:** Do not wait until quote conversion to create the shared operational scope container.

**Files**
- `apps/api/src/services/residentialService.ts`
- `apps/api/src/routes/residential.ts`
- `apps/api/src/services/facilityService.ts`

**Changes**
- Move the `ensureResidentialFacility()` concept into the residential property lifecycle.
- On `createResidentialProperty()`:
  - create the linked facility in the same transaction
- On `updateResidentialProperty()`:
  - sync linked facility metadata:
    - name
    - address
    - building type
    - access instructions
    - parking info
    - special requirements
- Do not overwrite existing areas/tasks during metadata sync.

**Result**
- Every residential property is immediately ready for areas, tasks, and walkthroughs.

---

## Phase 3: Separate Residential from Commercial Lists

**Goal:** Residential-linked facilities should not appear in the normal commercial facilities module.

**Files**
- `apps/api/src/services/facilityService.ts`
- `apps/api/src/routes/facilities.ts`
- `apps/web/src/lib/facilities.ts`
- `apps/web/src/pages/facilities/FacilitiesList.tsx`

**Changes**
- Exclude facilities with `residentialPropertyId != null` from generic facility list queries by default.
- Add an explicit opt-in filter only if admins need to view residential-linked operational facilities.
- Keep residential users on property pages instead of generic facility pages.

---

## Phase 4: Build Property Detail on Shared Scope

**Goal:** Residential properties should support the same area/task flow as commercial facilities.

**Files**
- `apps/web/src/pages/facilities/FacilityDetail.tsx`
- `apps/web/src/pages/facilities/FacilityOverview.tsx`
- `apps/web/src/pages/facilities/FacilityAreas.tsx`
- `apps/web/src/pages/facilities/FacilityAreaDetail.tsx`
- `apps/web/src/pages/properties/PropertyDetail.tsx` (new)
- optional shared location-scope components if extraction is needed

**Changes**
- Extract shared area/task scope UI from `FacilityDetail`.
- Build `PropertyDetail` that:
  - loads residential property
  - resolves linked facility
  - uses linked facility id for area/task CRUD
  - uses residential wording in the UI

**Required workflow**
1. Create property
2. Add areas
3. Auto-populate tasks from templates
4. Edit tasks as needed

**Important note**
- Reuse the existing facility/area/task engine rather than creating a second residential-only implementation.

---

## Phase 5: Residential-Only Task Template Scope

**Goal:** Residential flows should use residential task templates only.

**Files**
- `apps/api/src/services/taskTemplateService.ts`
- `apps/api/src/routes/taskTemplates.ts`
- `apps/web/src/lib/tasks.ts`
- `apps/web/src/pages/tasks/TaskTemplatesList.tsx`
- `apps/web/src/pages/facilities/FacilityDetail.tsx`

**Changes**
- Add `scope` to task template create/edit/list flows.
- Filter template availability:
  - residential property: `residential` + `both`
  - commercial facility: `commercial` + `both`
- Update area-template fallback logic and task pickers to respect scope.

---

## Phase 6: Property Entry Points and Navigation

**Goal:** Residential flows should start from properties, not facilities.

**Files**
- `apps/web/src/pages/accounts/AccountDetail.tsx`
- `apps/web/src/lib/accountRoutes.ts`
- `apps/web/src/App.tsx`

**Changes**
- Add residential property routes such as:
  - `/properties/:id`
  - optional `/accounts/:id/properties`
- Update residential account actions to navigate to property views.
- Keep commercial facility routes unchanged.
- Apply naming consistently:
  - residential = property/properties
  - commercial = facility/facilities

---

## Phase 7: Walkthrough Integration

**Goal:** Residential walkthroughs should operate on structured property scope the same way commercial walkthroughs operate on facility scope.

**Files**
- walkthrough-related web pages and API services around appointments/inspections/facility-scoped walkthroughs

**Changes**
- Start residential walkthroughs from property detail.
- Route walkthrough scope internally to the linked facility id.
- Allow walkthroughs to create or refine:
  - areas
  - tasks

**Result**
- Residential walkthroughs become scope-building tools instead of flat note capture.

---

## Phase 8: Quote Flow Prefers Structured Scope

**Goal:** Residential quotes should use property areas/tasks first.

**Files**
- `apps/api/src/services/residentialService.ts`
- `apps/web/src/pages/residential/ResidentialQuotesPage.tsx`

**Changes**
- Update quote scope resolution order:
  1. linked facility tasks/areas
  2. property `defaultTasks`
  3. account `residentialTaskLibrary`
- Keep flat task lists only as temporary fallback behavior during development.
- Surface scope readiness in residential/property flows:
  - no areas
  - no tasks
  - ready for quote

---

## Phase 9: Tests

**Files**
- `apps/api/src/services/__tests__/residentialService.test.ts`
- `apps/api/src/services/__tests__/facilityService.test.ts`
- `apps/api/src/services/__tests__/taskTemplateService.test.ts`
- `apps/web/src/pages/__tests__/AccountDetail.test.tsx`
- `apps/web/src/pages/__tests__/FacilityDetail.test.tsx`
- new property detail tests

**Coverage**
- Property creation auto-creates linked facility
- Property update syncs facility metadata
- Residential-linked facilities are excluded from commercial facility lists by default
- Property detail supports area/task management via linked facility
- Residential template filtering works
- Commercial facility behavior remains unchanged

---

## Delivery Order

1. Schema and API contracts
2. Residential property -> linked facility lifecycle
3. Facility list filtering
4. Task template scope
5. Property detail page on shared scope
6. Navigation updates
7. Walkthrough integration
8. Quote scope update
9. Tests

---

## Current Codebase Notes

- Residential already has:
  - `ResidentialProperty`
  - `ResidentialQuote`
  - account-level residential task library
- Shared operational scope already exists through:
  - `Facility`
  - `Area`
  - `FacilityTask`
  - facility detail area/task workflow
- Residential property -> facility linkage already exists in schema via `Facility.residentialPropertyId`
- Current gap: the linked facility is created too late and residential quotes still rely primarily on flat task lists instead of structured scope

---

## Development Assumption

No backfill is required. This project is still in development, so the implementation should prefer a clean cutover rather than migration-heavy compatibility work.

This document is the recovery reference for continuing the residential property/shared scope implementation if the session is interrupted.
