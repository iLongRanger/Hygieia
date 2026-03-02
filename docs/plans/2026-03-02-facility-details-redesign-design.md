# Facility Details Page Redesign

## Problem
The current FacilityDetail.tsx is a 2,530-line monolith that shows all facility information (details, areas, tasks) on a single page. This causes:
- Visual overload with too much information at once
- Poor information hierarchy where important details get buried
- Difficult navigation between areas and tasks
- Dated visual design compared to the rest of the app

## Design

### Layout: Tabbed Interface

Replace the single-page layout with a tabbed interface:
- **Overview** | **Areas** | **Area Detail** (contextual)

The tab bar sits directly below the existing header (back button, facility name, account, actions).

### Header (unchanged position, refined)
- Back button + Facility name (h1) + Account name (subtitle)
- Status badge (active/pending/archived)
- Actions: "Edit Facility" button, "Submit for Proposal" button

### Tab: Overview
Primary focus on facility details:
- **Facility Info Card**: building type with icon, full address, status, total sqft (from areas), area count, task count
- **Details Section**: access instructions, parking info, special requirements, notes (conditionally rendered)
- Compact stats strip: total sqft, active areas, total tasks, estimated hours

### Tab: Areas
Card grid layout (responsive: 1 col mobile, 2 col md, 3 col lg):
- Each **Area Card** shows: name + type badge, sqft + floor type, condition & traffic indicators, task count, quick actions (edit, archive/delete)
- Clicking a card body navigates to the Area Detail tab
- "Add Area" button in the tab header

### Tab: Area Detail (contextual, shown when area selected)
- Area header: name, type, dimensions, floor type, condition, traffic
- Items/Fixtures section: fixtures with counts
- Tasks section: grouped by cleaning frequency with add/edit/delete
- Back link to Areas tab

### Component Decomposition

Split the monolith into:
| File | Responsibility |
|------|---------------|
| `FacilityDetail.tsx` | Shell: header, tab routing, data loading, shared state |
| `FacilityOverview.tsx` | Overview tab content |
| `FacilityAreas.tsx` | Area card grid |
| `FacilityAreaDetail.tsx` | Single area detail with tasks |
| `AreaCard.tsx` | Individual area card |
| `modals/EditFacilityModal.tsx` | Edit facility form |
| `modals/AreaModal.tsx` | Add/edit area form (with template pipeline) |
| `modals/TaskModal.tsx` | Add/edit task form |
| `modals/BulkTaskModal.tsx` | Bulk add tasks |
| `modals/SubmitProposalModal.tsx` | Submit for proposal |

### Visual Style
- Match existing Tailwind/shadcn aesthetic
- Consistent spacing: `space-y-6` between sections, `gap-4`/`gap-6` for grids
- No new component library dependencies - build tab component with Tailwind

### State Management
- Data fetching stays in the parent `FacilityDetail.tsx`
- Tab state managed via React state (not URL routing)
- Selected area ID tracked in state, triggers Area Detail tab
- Modal states stay in parent, passed down as props
