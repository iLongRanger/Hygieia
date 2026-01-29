# Implementation Plan: Consolidate Area Templates and Task Templates

## Goal
Reduce duplication by making Task Templates the single source of truth for task definitions and having Area Templates reference Task Templates while retaining area-specific item defaults.

## Scope
- Area Templates (area type defaults, items, tasks)
- Task Templates (cleaning type, timing model, fixtures, instructions)
- API, DB, and UI changes

## Phase 0 — Decisions
- Area Templates reference Task Templates (no inline task fields).
- Use a join table for ordering (and optional overrides later).
- Legacy fields are deprecated after migration and validation.

## Phase 1 — Database & Schema
1. Add join table `AreaTemplateTask`:
   - `areaTemplateId`
   - `taskTemplateId`
   - `sortOrder`
   - optional override columns (nullable, for future needs)
2. Add indexes:
   - `(areaTemplateId, sortOrder)`
   - `(taskTemplateId)`
3. Keep legacy area template tasks storage for a short transition window.

## Phase 2 — Backend APIs
1. Update schemas:
   - Area Template create/update accepts `taskTemplateIds` or `{ id, sortOrder }[]`.
2. Service changes:
   - If legacy `tasks` payload is received, convert to Task Templates and link.
   - Area Template responses include linked task template summaries + sortOrder.
3. Update list/get endpoints to include linked tasks.

## Phase 3 — Migration
1. Backfill script:
   - For each Area Template task, create Task Template if not already present.
   - Link to Area Template with preserved `sortOrder`.
2. De-dupe strategy:
   - Hash key: `name + areaTypeId + base/perSqft/perUnit/perRoom + cleaningType`.
3. Generate migration report for collisions and manual review.

## Phase 4 — Frontend
1. Update Area Templates editor:
   - Replace inline task fields with Task Template picker (multi-select).
   - Add Quick Create Task Template modal.
2. Update types and API calls accordingly.
3. Use feature flag to toggle new model until migration validation is complete.

## Phase 5 — Rollout & Cleanup
1. Enable new model for internal users.
2. Monitor for data integrity issues.
3. Remove legacy fields and routes after 2–4 weeks.
4. Add tests and update docs/training.

## Deliverables
- DB migration scripts
- Backend API updates
- Frontend UI updates
- Backfill/migration report
- Tests + documentation updates
