# Facility Details Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the 2,530-line FacilityDetail.tsx monolith into a tabbed layout with separate components for Overview, Areas (card grid), and Area Detail (contextual tab with tasks).

**Architecture:** Extract the monolith into a parent shell (FacilityDetail) that handles data fetching and tab routing, with child components for each tab. Modals extracted into their own files. State management stays in the parent, passed down as props. Tab state is React state (not URL routing).

**Tech Stack:** React, TypeScript, Tailwind CSS, existing UI components (Card, Badge, Button, Modal, etc.)

---

### Task 1: Create shared constants and types file

**Files:**
- Create: `apps/web/src/pages/facilities/facility-constants.ts`

**Step 1: Create the constants file**

Extract all constants and shared types from FacilityDetail.tsx into a shared file:

```typescript
import type { CleaningFrequency } from '../../types/facility';
import type { CreateAreaInput } from '../../types/facility';

export const BUILDING_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'medical', label: 'Medical' },
  { value: 'retail', label: 'Retail' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'educational', label: 'Educational' },
  { value: 'residential', label: 'Residential' },
  { value: 'mixed', label: 'Mixed Use' },
  { value: 'other', label: 'Other' },
];

export const CONDITION_LEVELS = [
  { value: 'standard', label: 'Standard' },
  { value: 'medium', label: 'Medium Difficulty' },
  { value: 'hard', label: 'Hard/Heavy Traffic' },
];

export const TRAFFIC_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const FLOOR_TYPES = [
  { value: 'vct', label: 'VCT (Vinyl Composition Tile)' },
  { value: 'carpet', label: 'Carpet' },
  { value: 'hardwood', label: 'Hardwood' },
  { value: 'tile', label: 'Ceramic/Porcelain Tile' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'epoxy', label: 'Epoxy' },
];

export const CLEANING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Yearly' },
  { value: 'as_needed', label: 'As Needed' },
];

export const CLEANING_FREQUENCY_VALUES = new Set(
  CLEANING_FREQUENCIES.map((frequency) => frequency.value)
);

export const ORDERED_CLEANING_FREQUENCIES = CLEANING_FREQUENCIES.map(
  (frequency) => frequency.value
) as CleaningFrequency[];

export const isCleaningFrequency = (
  value: string
): value is CleaningFrequency => CLEANING_FREQUENCY_VALUES.has(value);

export type AreaTemplateTaskSelection = {
  id: string;
  taskTemplateId: string | null;
  name: string;
  cleaningType: string;
  estimatedMinutes: number | null;
  baseMinutes: number;
  perSqftMinutes: number;
  perUnitMinutes: number;
  perRoomMinutes: number;
  include: boolean;
};

export type AreaItemInput = NonNullable<CreateAreaInput['fixtures']>[0];

export const TASK_SEQUENCE_RULES = [
  { weight: 10, patterns: [/trash|garbage|litter|empty|liner/i, /restock|refill|replenish|suppl(y|ies)|stock/i, /remove expired/i] },
  { weight: 20, patterns: [/dust|high dust/i, /vent|vents|light fixture|lights|ceiling fan/i, /blinds|sill|sills|racks|shelf|shelves/i] },
  { weight: 70, patterns: [/deep clean|deep-clean|deep extraction|extract/i, /carpet cleaning|shampoo/i] },
  { weight: 40, patterns: [/disinfect|sanitize|sanitise/i] },
  { weight: 30, patterns: [/glass|window|mirror/i, /wipe|wash|clean/i, /counter|desk|table|chair|appliance|fixture|door/i, /toilet|urinal|sink|shower/i, /furniture|wood surface|board/i] },
  { weight: 60, patterns: [/mop|wet mop|scrub|buff|strip|wax|refinish/i, /power wash|pressure wash/i, /floor.*polish|polish.*floor/i] },
  { weight: 50, patterns: [/vacuum|sweep|sweeping/i] },
  { weight: 80, patterns: [/inspect|check|pest|organize|organise/i, /filters|ducts/i] },
];
```

**Step 2: Verify the file compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/pages/facilities/facility-constants.ts
git commit -m "refactor: extract facility constants and types to shared file"
```

---

### Task 2: Extract modals into separate files

**Files:**
- Create: `apps/web/src/pages/facilities/modals/EditFacilityModal.tsx`
- Create: `apps/web/src/pages/facilities/modals/AreaModal.tsx`
- Create: `apps/web/src/pages/facilities/modals/TaskModal.tsx`
- Create: `apps/web/src/pages/facilities/modals/BulkTaskModal.tsx`
- Create: `apps/web/src/pages/facilities/modals/SubmitProposalModal.tsx`

Each modal receives its form state and handlers as props. The parent still owns the state.

**Step 1: Create EditFacilityModal**

Props interface:
```typescript
interface EditFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityForm: UpdateFacilityInput;
  setFacilityForm: React.Dispatch<React.SetStateAction<UpdateFacilityInput>>;
  onSave: () => void;
  saving: boolean;
}
```

Extract lines 1635-1774 from FacilityDetail.tsx into this component. Import BUILDING_TYPES from facility-constants.

**Step 2: Create AreaModal**

Props interface:
```typescript
interface AreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingArea: Area | null;
  areaForm: CreateAreaInput | UpdateAreaInput;
  setAreaForm: React.Dispatch<React.SetStateAction<CreateAreaInput | UpdateAreaInput>>;
  areaTypes: AreaType[];
  fixtureTypes: FixtureType[];
  applyAreaTemplate: (areaTypeId: string) => void;
  areaTemplateLoading: boolean;
  areaTemplateTasks: AreaTemplateTaskSelection[];
  filteredAreaTemplateTasks: AreaTemplateTaskSelection[];
  currentAreaTaskFrequency: string;
  areaTaskPipelineStep: number;
  reviewedAreaTaskFrequencies: Set<CleaningFrequency>;
  allAreaTaskFrequenciesReviewed: boolean;
  newAreaCustomTaskName: string;
  setNewAreaCustomTaskName: (name: string) => void;
  toggleAreaTemplateTaskInclude: (taskId: string, include: boolean) => void;
  addCustomAreaTemplateTask: () => void;
  removeCustomAreaTemplateTask: (taskId: string) => void;
  goToNextAreaTaskFrequencyStep: () => void;
  goToPreviousAreaTaskFrequencyStep: () => void;
  addItemToArea: () => void;
  updateAreaItem: (index: number, patch: Partial<AreaItemInput>) => void;
  removeAreaItem: (index: number) => void;
  onSave: () => void;
  saving: boolean;
}
```

Extract lines 1776-2163 from FacilityDetail.tsx.

**Step 3: Create TaskModal**

Props interface:
```typescript
interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTask: FacilityTask | null;
  selectedAreaForTask: Area | null;
  taskForm: CreateFacilityTaskInput | UpdateFacilityTaskInput;
  setTaskForm: React.Dispatch<React.SetStateAction<CreateFacilityTaskInput | UpdateFacilityTaskInput>>;
  filteredTaskTemplates: TaskTemplate[];
  taskFixtureTypes: FixtureType[];
  getTaskFixtureMinutes: (fixtureTypeId: string) => number;
  updateTaskFixtureMinutes: (fixtureTypeId: string, minutes: number) => void;
  onSave: () => void;
  saving: boolean;
}
```

Extract lines 2166-2410 from FacilityDetail.tsx.

**Step 4: Create BulkTaskModal**

Props interface:
```typescript
interface BulkTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAreaForTask: Area | null;
  bulkFrequency: string;
  setBulkFrequency: (freq: string) => void;
  filteredBulkTaskTemplates: TaskTemplate[];
  selectedTaskTemplateIds: Set<string>;
  toggleTaskTemplateSelection: (id: string) => void;
  selectAllTaskTemplates: () => void;
  clearAllTaskTemplates: () => void;
  onSave: () => void;
  saving: boolean;
}
```

Extract lines 2413-2523 from FacilityDetail.tsx.

**Step 5: Create SubmitProposalModal**

Props interface:
```typescript
interface SubmitProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAreasCount: number;
  activeTasksCount: number;
  submitProposalNotes: string;
  setSubmitProposalNotes: (notes: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}
```

Extract lines 1581-1633 from FacilityDetail.tsx.

**Step 6: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 7: Commit**

```bash
git add apps/web/src/pages/facilities/modals/
git commit -m "refactor: extract facility modals into separate files"
```

---

### Task 3: Create FacilityOverview component

**Files:**
- Create: `apps/web/src/pages/facilities/FacilityOverview.tsx`

**Step 1: Create the overview tab component**

This component displays facility info in a refined layout — the facility details card content from lines 1294-1393, restructured with better information hierarchy.

Props:
```typescript
interface FacilityOverviewProps {
  facility: Facility;
  totalSquareFeet: number;
  activeAreasCount: number;
  activeTasksCount: number;
}
```

Layout:
- Facility details (building type, address, status) in a Card at the top
- Stats strip below: total sqft, active areas count, total tasks count
- Conditional detail sections: access instructions, parking, special requirements, notes

**Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/pages/facilities/FacilityOverview.tsx
git commit -m "feat: add FacilityOverview tab component"
```

---

### Task 4: Create AreaCard and FacilityAreas components

**Files:**
- Create: `apps/web/src/pages/facilities/AreaCard.tsx`
- Create: `apps/web/src/pages/facilities/FacilityAreas.tsx`

**Step 1: Create AreaCard component**

A clickable card for each area:

```typescript
interface AreaCardProps {
  area: Area;
  taskCount: number;
  onSelect: (area: Area) => void;
  onEdit: (area: Area) => void;
  onArchive: (areaId: string) => void;
  onRestore: (areaId: string) => void;
  onDelete: (areaId: string) => void;
}
```

Card displays:
- Area name + type badge
- Square footage + floor type label
- Condition badge + traffic badge
- Task count
- Action buttons (edit, archive/restore, delete) on hover
- Click card body → calls onSelect

Use FLOOR_TYPES, CONDITION_LEVELS, TRAFFIC_LEVELS from facility-constants.

**Step 2: Create FacilityAreas component**

Responsive card grid:

```typescript
interface FacilityAreasProps {
  areas: Area[];
  tasks: FacilityTask[];
  onSelectArea: (area: Area) => void;
  onAddArea: () => void;
  onEditArea: (area: Area) => void;
  onArchiveArea: (areaId: string) => void;
  onRestoreArea: (areaId: string) => void;
  onDeleteArea: (areaId: string) => void;
  totalSquareFeet: number;
}
```

Layout:
- Header with "Areas (count)" + total sqft + "Add Area" button
- Grid of AreaCards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Only shows non-archived areas in the grid (archived at the bottom in a separate collapsible section if any)
- Empty state: "No areas yet. Add your first area to get started."

**Step 3: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add apps/web/src/pages/facilities/AreaCard.tsx apps/web/src/pages/facilities/FacilityAreas.tsx
git commit -m "feat: add AreaCard and FacilityAreas components for card grid layout"
```

---

### Task 5: Create FacilityAreaDetail component

**Files:**
- Create: `apps/web/src/pages/facilities/FacilityAreaDetail.tsx`

**Step 1: Create the area detail tab component**

This replaces the old expandable tasks-by-area section, now as a dedicated tab for a single selected area.

```typescript
interface FacilityAreaDetailProps {
  area: Area;
  tasks: FacilityTask[];
  onBack: () => void;
  onEditArea: (area: Area) => void;
  onAddTask: (area: Area) => void;
  onBulkAddTasks: (area: Area) => void;
  onEditTask: (task: FacilityTask) => void;
  onDeleteTask: (taskId: string) => void;
}
```

Layout:
- Back link: "← Back to Areas"
- Area header card: name, type, dimensions (length × width → sqft), floor type, condition, traffic level, room/unit counts, notes
- Items/Fixtures section (if any): table of fixtures with type, count, minutes/item
- Tasks section: grouped by frequency (reuse the frequency-grouping pattern from original lines 1500-1570)
  - Each frequency group: badge header + task list
  - Each task row: name, estimated minutes, edit/delete on hover
- Action buttons: "Add Tasks" (bulk), "+" (single task)

**Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/pages/facilities/FacilityAreaDetail.tsx
git commit -m "feat: add FacilityAreaDetail component for area detail tab"
```

---

### Task 6: Rewrite FacilityDetail.tsx as parent shell with tabs

**Files:**
- Modify: `apps/web/src/pages/facilities/FacilityDetail.tsx`

**Step 1: Rewrite the component**

The new FacilityDetail becomes a shell that:

1. Keeps all data fetching (fetchFacility, fetchAreas, fetchTasks, etc.)
2. Keeps all handler functions (handleSaveArea, handleSaveTask, etc.)
3. Keeps all form state (facilityForm, areaForm, taskForm, etc.)
4. Keeps all modal show/hide state
5. Adds tab state: `activeTab: 'overview' | 'areas' | 'area-detail'`
6. Adds selectedArea state for area-detail tab

Tab bar implementation (custom, no library):
```tsx
<div className="flex gap-1 border-b border-white/10">
  <button
    className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
      activeTab === 'overview'
        ? 'text-white'
        : 'text-gray-400 hover:text-gray-300'
    }`}
    onClick={() => setActiveTab('overview')}
  >
    Overview
    {activeTab === 'overview' && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald" />
    )}
  </button>
  <button
    className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
      activeTab === 'areas'
        ? 'text-white'
        : 'text-gray-400 hover:text-gray-300'
    }`}
    onClick={() => setActiveTab('areas')}
  >
    Areas ({activeAreasCount})
    {activeTab === 'areas' && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald" />
    )}
  </button>
  {selectedArea && (
    <button
      className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
        activeTab === 'area-detail'
          ? 'text-white'
          : 'text-gray-400 hover:text-gray-300'
      }`}
      onClick={() => setActiveTab('area-detail')}
    >
      {selectedArea.name || selectedArea.areaType.name}
      {activeTab === 'area-detail' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald" />
      )}
    </button>
  )}
</div>
```

Tab content rendering:
```tsx
{activeTab === 'overview' && (
  <FacilityOverview facility={facility} totalSquareFeet={totalSquareFeetFromAreas} activeAreasCount={activeAreasCount} activeTasksCount={activeTasksCount} />
)}
{activeTab === 'areas' && (
  <FacilityAreas areas={areas} tasks={tasks} onSelectArea={handleSelectArea} onAddArea={...} onEditArea={openEditArea} onArchiveArea={handleArchiveArea} onRestoreArea={handleRestoreArea} onDeleteArea={handleDeleteArea} totalSquareFeet={totalSquareFeetFromAreas} />
)}
{activeTab === 'area-detail' && selectedArea && (
  <FacilityAreaDetail area={selectedArea} tasks={getTasksForArea(selectedArea.id)} onBack={() => setActiveTab('areas')} onEditArea={openEditArea} onAddTask={openAddTaskForArea} onBulkAddTasks={openBulkTaskForArea} onEditTask={openEditTask} onDeleteTask={handleDeleteTask} />
)}
```

Handler for selecting an area:
```typescript
const handleSelectArea = (area: Area) => {
  setSelectedArea(area);
  setActiveTab('area-detail');
};
```

Render all 5 modals at the bottom (imported from modals/).

**Step 2: Remove old inline JSX**

Delete the old sidebar + table + tasks-by-area sections entirely. Remove the areaColumns definition. Remove old imports that are no longer needed (Table, ChevronDown, ChevronRight, CheckSquare, Square, ListPlus, ClipboardList, Ruler, Clock, etc. — only keep what's still used in the shell).

**Step 3: Remove old constants from FacilityDetail.tsx**

All constants (BUILDING_TYPES, CONDITION_LEVELS, etc.) and types (AreaTemplateTaskSelection, AreaItemInput) now come from facility-constants.ts. Delete the inline definitions and add imports.

**Step 4: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 5: Test in browser**

Run: `cd apps/web && npm run dev`
Navigate to a facility detail page and verify:
- Overview tab shows facility info
- Areas tab shows card grid
- Clicking an area card opens the area detail tab
- All modals still work (edit facility, add/edit area, add/edit task, bulk tasks, submit proposal)

**Step 6: Commit**

```bash
git add apps/web/src/pages/facilities/FacilityDetail.tsx
git commit -m "feat: restructure FacilityDetail with tabbed layout and component decomposition"
```

---

### Task 7: Visual polish and final cleanup

**Files:**
- Modify: `apps/web/src/pages/facilities/FacilityOverview.tsx`
- Modify: `apps/web/src/pages/facilities/AreaCard.tsx`
- Modify: `apps/web/src/pages/facilities/FacilityAreaDetail.tsx`

**Step 1: Polish the overview tab**

- Ensure consistent spacing with `space-y-6`
- Use icon + label pairs for facility details (Building2 for type, MapPin for address)
- Stats strip uses a `grid grid-cols-2 sm:grid-cols-4 gap-4` layout with subtle card backgrounds

**Step 2: Polish area cards**

- Hover effect: `hover:border-emerald/30 transition-all`
- Subtle shadow on hover
- Clean badge styling for condition/traffic
- Task count as a small pill in bottom right

**Step 3: Polish area detail**

- Clean header layout
- Fixtures in a compact table
- Task groups with clear frequency headers

**Step 4: Verify compilation and test**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Test all tabs and modals in the browser.

**Step 5: Commit**

```bash
git add apps/web/src/pages/facilities/
git commit -m "feat: polish facility detail tab components and visual styling"
```

---

### Task 8: Push to main

**Step 1: Push**

```bash
git push origin main
```
