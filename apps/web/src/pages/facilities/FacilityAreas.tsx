import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import type { Area, FacilityTask } from '../../types/facility';
import { AreaCard } from './AreaCard';

interface FacilityAreasProps {
  areas: Area[];
  tasks: FacilityTask[];
  onSelectArea: (area: Area) => void;
  onAddArea: () => void;
  onAddTask: (area: Area) => void;
  onEditArea: (area: Area) => void;
  onArchiveArea: (areaId: string) => void;
  onRestoreArea: (areaId: string) => void;
  onDeleteArea: (areaId: string) => void;
  totalSquareFeet: number;
}

function getTaskCountForArea(tasks: FacilityTask[], areaId: string): number {
  return tasks.filter((t) => t.area?.id === areaId && !t.archivedAt).length;
}

export function FacilityAreas({
  areas,
  tasks,
  onSelectArea,
  onAddArea,
  onAddTask,
  onEditArea,
  onArchiveArea,
  onRestoreArea,
  onDeleteArea,
  totalSquareFeet,
}: FacilityAreasProps): React.JSX.Element {
  const [showArchived, setShowArchived] = useState(false);

  const activeAreas = areas.filter((a) => !a.archivedAt);
  const archivedAreas = areas.filter((a) => a.archivedAt);

  if (areas.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">Areas (0)</h2>
          <Button size="sm" onClick={onAddArea}>
            <Plus className="mr-2 h-4 w-4" />
            Add Area
          </Button>
        </div>
        <div className="text-center py-12 text-surface-500 dark:text-surface-400">
          No areas yet. Add your first area to get started.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Areas ({activeAreas.length})
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            {totalSquareFeet.toLocaleString()} total sqft
          </p>
        </div>
        <Button size="sm" onClick={onAddArea}>
          <Plus className="mr-2 h-4 w-4" />
          Add Area
        </Button>
      </div>

      {/* Active areas grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeAreas.map((area) => (
          <AreaCard
            key={area.id}
            area={area}
            taskCount={getTaskCountForArea(tasks, area.id)}
            onSelect={onSelectArea}
            onEdit={onEditArea}
            onAddTask={onAddTask}
            onArchive={onArchiveArea}
            onRestore={onRestoreArea}
            onDelete={onDeleteArea}
          />
        ))}
      </div>

      {/* Archived section */}
      {archivedAreas.length > 0 && (
        <div className="mt-6">
          <button
            className="flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-600 dark:text-surface-400 transition-colors"
            onClick={() => setShowArchived((prev) => !prev)}
          >
            {showArchived ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Archived Areas ({archivedAreas.length})
          </button>

          {showArchived && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 opacity-60">
              {archivedAreas.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  taskCount={getTaskCountForArea(tasks, area.id)}
                  onSelect={onSelectArea}
                  onEdit={onEditArea}
                  onAddTask={onAddTask}
                  onArchive={onArchiveArea}
                  onRestore={onRestoreArea}
                  onDelete={onDeleteArea}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
