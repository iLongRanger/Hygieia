# Per-Hour Pricing Strategy (per_hour_v1)

## Status
Draft - documentation-first spec. No implementation yet.

## Goal
Add a new pricing strategy module that calculates pricing based on task-level minutes, area data, and per-worker hourly rate. This strategy must:
- Be selectable independently from the existing sqft strategy.
- Use normalized fixtures for reporting and proposal documents.
- Support per-worker pricing and optional worker count multiplier.
- Default all new counts to zero, but allow editing in UI/API.
- Use the existing monthly-visits model for final totals.

## Strategy Key and Version
- key: `per_hour_v1`
- version: `1.0.0`
- name: "Per Hour (Task Minutes V1)"

## Calculation Model (Monthly Visits)
Inputs:
- hourly_rate
- multipliers: floor, condition, traffic, frequency, building, complexity
- worker_count (default 1)
- areas[] with tasks[] and unit counts, fixtures, room_count

Per area:
```
total_minutes =
  sum(
    task.base_minutes
    + task.per_sqft_minutes * area.sqft
    + sum(task.per_fixture_minutes[fixture_type] * fixture_count)
    + task.per_unit_minutes * area.unit_count
    + task.per_room_minutes * area.room_count
  )

area_hours = total_minutes / 60
```

Facility total:
```
total_hours = sum(area_hours)

price_per_visit =
  total_hours
  * hourly_rate
  * floor_multiplier
  * condition_multiplier
  * traffic_multiplier
  * frequency_multiplier
  * building_multiplier
  * complexity_multiplier

monthly_visits = getMonthlyVisits(frequency)
monthly_total = price_per_visit * monthly_visits

final_price = monthly_total * worker_count
```

Notes:
- Multipliers are applied to per-visit pricing, then converted to monthly totals.
- `worker_count` defaults to 1; when >1, final price scales linearly.
- Frequency uses the existing monthly visits mapping to align with proposals and comparisons.

## Data Model Changes (Proposed)

### New / Extended Entities
1) Area (existing)
- Add:
  - `room_count` (int, default 0)
  - `unit_count` (int, default 0) // trash cans, chairs, etc.
  - `traffic_level` (string enum: low/medium/high or custom)

2) TaskTemplate (existing)
- Add per-hour fields:
  - `base_minutes` (decimal, default 0)
  - `per_sqft_minutes` (decimal, default 0)
  - `per_fixture_minutes` (JSONB or join table - see below)
  - `per_unit_minutes` (decimal, default 0)
  - `per_room_minutes` (decimal, default 0)

3) FacilityTask (existing, per-facility overrides)
- Allow per-hour overrides:
  - `base_minutes_override` (decimal, nullable)
  - `per_sqft_minutes_override` (decimal, nullable)
  - `per_fixture_minutes_override` (JSONB or join table, nullable)
  - `per_unit_minutes_override` (decimal, nullable)
  - `per_room_minutes_override` (decimal, nullable)

4) Fixtures (normalized; required for proposal output)
- New tables:
  - `fixture_types`:
    - `id`, `name`, `description`, `is_active`
  - `area_fixtures`:
    - `id`, `area_id`, `fixture_type_id`, `count`
  - `task_fixture_minutes`:
    - `id`, `task_template_id`, `fixture_type_id`, `minutes_per_fixture`
  - `facility_task_fixture_minutes`:
    - `id`, `facility_task_id`, `fixture_type_id`, `minutes_per_fixture`

Rationale:
- Normalized fixtures enable reporting and clean proposal rendering.
- Per-task fixture minutes can be overridden at facility level.

5) Pricing Settings
- Add `hourly_rate` to pricing settings (per-hour strategy default).
- Add `traffic_multipliers` (JSONB) for Low/Medium/High:
  - Values are dynamic and editable by users at any time via Pricing Settings UI/API.
  - No hardcoded multipliers in code; defaults can be seeded but must remain configurable.

## Strategy Selection and Rules
- Separate strategy for per-hour vs sqft.
- Users can select which strategy to apply to a proposal:
  - `sqft_settings_v1` (existing)
  - `per_hour_v1` (new)
- Pricing rules should also be separated by strategy:
  - `pricing_rules.pricing_type = 'hourly'` for per-hour strategy
  - `pricing_rules.pricing_type = 'square_foot'` for sqft strategy

Proposed behavior:
- When a proposal selects `per_hour_v1`, only hourly rules are available.
- When a proposal selects `sqft_settings_v1`, only sqft rules are available.
- Strategy selection is explicit and stored on proposals (existing `pricing_strategy_key`).

## Proposal Snapshot Requirements
Ensure proposal pricing snapshot includes:
- Strategy key + version
- Selected hourly rule or settings identifier
- Hourly rate used
- Multipliers (floor, condition, traffic, frequency, building, complexity)
- Worker count
- Full area/task breakdown (minutes per area, hours per area)
- Fixture counts per area (for proposal output and audit)

## API Impact (High Level)
- Areas:
  - read/write `room_count`, `unit_count`, `traffic_level`
  - read/write fixtures (`area_fixtures`)
- Task templates:
  - read/write per-hour fields
  - read/write per-fixture minutes (`task_fixture_minutes`)
- Facility tasks:
  - read/write per-hour overrides
  - read/write per-fixture overrides (`facility_task_fixture_minutes`)
- Pricing:
  - `per_hour_v1` strategy endpoint support
  - Strategy list includes new strategy
  - Pricing rules filtered by strategy/pricing type

## UI Impact (High Level)
- Pricing Strategy selector includes "Per Hour (Task Minutes V1)"
- Areas UI:
  - editable `room_count`, `unit_count`, `traffic_level`
  - fixtures grid (type, count)
- Task Templates UI:
  - per-hour fields (base, per sqft, per unit, per room)
  - fixture minutes matrix
- Facility Tasks UI:
  - override inputs for per-hour fields + fixtures
- Proposal detail/print:
  - show fixtures per area
  - show per-hour breakdown summary (minutes/hours)

## Defaults and Validation
- All new numeric fields default to 0.
- No negative values allowed.
- `worker_count` defaults to 1.
- Unknown fixture types are not allowed (must be defined in `fixture_types`).
- If a task has no per-hour values and no overrides, it contributes 0 minutes.

## Test Plan (TDD)
Unit tests:
- Per-hour calculator computes minutes correctly:
  - base, per sqft, per fixture, per unit, per room
  - overrides at facility task level
- Multipliers applied in correct order for per-visit price.
- Monthly visits mapping produces correct monthly totals.
- Worker count scales final price.

Integration tests:
- Strategy selection and pricing snapshot stored on proposal.
- API validation for fixtures and per-hour fields.
- Proposal output includes fixture lists.

## Detailed TDD Checklist
Unit (pricing calculator):
- Calculates per-task minutes with all components set.
- Uses area-level fixtures with task fixture minutes.
- Uses facility task overrides when present (per-field override).
- Defaults missing values to 0 with no NaN propagation.
- Applies multipliers in the correct sequence for per-visit price.
- Uses monthly visits mapping for totals.
- Scales final price by worker_count (default 1).

Unit (strategy + registry):
- Registers `per_hour_v1` and returns metadata.
- Resolves and executes per-hour strategy by key.
- Captures strategy key/version and settings snapshot.

Unit (API validation):
- Rejects negative values for minutes/counts.
- Validates fixture types exist before linking.
- Enforces traffic_level enum.

Integration (proposal flow):
- Selecting `per_hour_v1` stores pricing_strategy_key/version.
- Pricing snapshot includes hourly_rate, multipliers, worker_count.
- Proposal services generated with per-area summaries.

Integration (fixtures):
- Fixtures CRUD for area and template/facility overrides.
- Proposal print output lists fixtures under their area.

## Implementation Task Breakdown (No Code Yet)
Documentation
- Finalize per-hour pricing spec (this file).
- Add proposal print layout notes (fixtures under area).

Database + Prisma
- Add pricing settings fields: hourly_rate, traffic_multipliers.
- Extend Area with room_count, unit_count, traffic_level.
- Extend TaskTemplate with per-hour fields.
- Extend FacilityTask with per-hour override fields.
- Add new tables: fixture_types, area_fixtures, task_fixture_minutes, facility_task_fixture_minutes.
- Update Prisma schema + generate client.

API
- Add CRUD endpoints/services for fixture_types and area_fixtures.
- Expand area/task schemas for new fields.
- Add per-hour calculator service module.
- Add per-hour strategy module and register in registry.
- Filter pricing rules based on selected strategy (hourly vs sqft).
- Add pricing snapshot fields for per-hour strategy.

Web UI
- Pricing Settings: hourly_rate + traffic multipliers editor.
- Area form: room_count, unit_count, traffic_level, fixtures grid.
- Task templates: per-hour fields, fixture minutes matrix.
- Facility tasks: overrides for per-hour fields + fixtures.
- Proposal form: strategy selector + worker_count input.
- Proposal detail/print: fixture lists under area + per-hour summary.

Tests
- Add unit tests for per-hour calculator + strategy.
- Add API validation tests for new fields and fixtures.
- Add integration tests for proposal snapshot and print output.

## Module Boundaries (Separate Module)
- New per-hour calculator module (separate from sqft calculator):
  - `apps/api/src/services/pricing/perHourCalculatorService.ts`
- New strategy module:
  - `apps/api/src/services/pricing/strategies/perHourV1Strategy.ts`
- Strategy registry adds new key without affecting existing sqft strategy behavior.

## Implementation Plan (No Code Yet)
1) Documentation (this file) approved.
2) Database schema and migrations:
   - Add `hourly_rate` and `traffic_multipliers` to pricing settings.
   - Add `room_count`, `unit_count`, `traffic_level` to areas.
   - Add per-hour fields to task templates and facility task overrides.
   - Add normalized fixtures tables: `fixture_types`, `area_fixtures`,
     `task_fixture_minutes`, `facility_task_fixture_minutes`.
3) Prisma updates and types.
4) API:
   - Expand schemas for areas, tasks, fixtures, pricing settings.
   - Add CRUD for fixture types and area fixtures.
   - Add per-hour pricing calculator and strategy.
5) UI:
   - Pricing Settings: hourly rate + traffic multipliers editor.
   - Area editor: room/unit counts + traffic level + fixtures grid.
   - Task templates: per-hour fields + fixture minutes matrix.
   - Facility tasks: per-hour overrides + fixture overrides.
   - Proposal: strategy selector, per-hour breakdown, fixture list.
6) Proposal document rendering:
   - Include fixtures listed under their respective areas.
   - Include per-hour summary.
7) TDD:
   - Unit tests for calculator and strategy.
   - Integration tests for API and proposal snapshots.

## Open Items
- None.
