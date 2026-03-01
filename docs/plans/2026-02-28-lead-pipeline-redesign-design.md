# Lead Pipeline Redesign

Date: 2026-02-28

## Problem

The current lead pipeline kanban in `/leads` has plain cards, cramped 8-column layout, and shows too little data per card. Users must click into each lead to see value, probability, and activity info.

## Design

### Column Headers

Each stage column header shows:
- Human-readable stage name (e.g. "Walk-Through Booked")
- Lead count badge
- Total estimated value formatted as $XX.Xk
- Colored top border per stage — gradient from blue (early stages) through yellow (mid) to green (won) / red (lost)

### Lead Cards

Each card displays:
- **Company name** (bold, primary) with contact name below (muted)
- **Estimated value** — prominent badge with colored background
- **Probability bar** — thin horizontal bar at card bottom, green/yellow/red based on %, with percentage text
- **Last activity** — relative time ("3d ago") with stale indicator (orange dot > 7 days, red dot > 14 days)
- **Expected close date** — small text, orange if approaching (< 7 days), red if overdue
- **Assigned user** — initials avatar circle, or "Unassigned" muted text
- **Lead source** — small colored dot

### Layout

- Horizontal scroll kanban with `min-w-[260px]` per column
- Remove current 6-card limit — vertical scroll per column with `max-h` and overflow
- Sticky column headers during vertical scroll
- Equal-width columns when viewport allows, horizontal scroll when it doesn't

### Visual Polish

- Card hover: subtle lift (`-translate-y-0.5`) + left border accent matching stage color
- Smooth transitions (`transition-all duration-200`)
- Consistent spacing (`gap-3` between cards)
- Stage-specific accent colors on all column headers (not just the active one)

## Files to Modify

- `apps/web/src/pages/leads/LeadsList.tsx` — pipeline rendering section (lines ~849-931)

## Out of Scope

- Drag-and-drop (future enhancement)
- Real-time updates
- Bulk actions
