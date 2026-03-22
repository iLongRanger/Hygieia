import {
  Archive,
  ClipboardList,
  Edit2,
  Plus,
  RotateCcw,
  Ruler,
  Trash2,
} from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Area } from '../../types/facility';
import { CONDITION_LEVELS, FLOOR_TYPES, TRAFFIC_LEVELS } from './facility-constants';

interface AreaCardProps {
  area: Area;
  taskCount: number;
  onSelect: (area: Area) => void;
  onEdit: (area: Area) => void;
  onAddTask: (area: Area) => void;
  onArchive: (areaId: string) => void;
  onRestore: (areaId: string) => void;
  onDelete: (areaId: string) => void;
}

const CONDITION_BADGE_VARIANT = {
  standard: 'success',
  medium: 'warning',
  hard: 'error',
} as const;

const TRAFFIC_BADGE_VARIANT = {
  low: 'success',
  medium: 'warning',
  high: 'error',
} as const;

function formatSquareFeet(sqft: string | null): string {
  if (!sqft) return '-';
  const num = Number(sqft);
  if (isNaN(num)) return '-';
  return num.toLocaleString() + ' sqft';
}

function findLabel(
  items: { value: string; label: string }[],
  value: string
): string {
  return items.find((item) => item.value === value)?.label ?? value;
}

export function AreaCard({
  area,
  taskCount,
  onSelect,
  onEdit,
  onAddTask,
  onArchive,
  onRestore,
  onDelete,
}: AreaCardProps): React.JSX.Element {
  const isArchived = area.archivedAt !== null;
  const quantitySuffix = area.quantity > 1 ? ` (x${area.quantity})` : '';

  return (
    <div
      className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4 cursor-pointer hover:border-primary-300 dark:hover:border-emerald/30 hover:bg-surface-200 dark:hover:bg-surface-800/50 transition-all group"
      onClick={() => onSelect(area)}
    >
      {/* Top section */}
      <div>
        <div className="font-medium text-surface-900 dark:text-white">
          {area.name || area.areaType.name}
        </div>
        {(area.name && area.name !== area.areaType.name) && (
          <div className="text-sm text-surface-500 dark:text-surface-400">
            {area.areaType.name}
            {quantitySuffix}
          </div>
        )}
        {(!area.name || area.name === area.areaType.name) && area.quantity > 1 && (
          <div className="text-sm text-surface-500 dark:text-surface-400">{quantitySuffix.trim()}</div>
        )}
      </div>

      {/* Middle section */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
          <Ruler className="h-4 w-4 text-surface-500" />
          {formatSquareFeet(area.squareFeet)}
        </div>
        <div className="text-sm text-surface-600 dark:text-surface-400">
          {findLabel(FLOOR_TYPES, area.floorType)}
        </div>
        <div>
          <Badge variant={CONDITION_BADGE_VARIANT[area.conditionLevel]} size="sm">
            {findLabel(CONDITION_LEVELS, area.conditionLevel)}
          </Badge>
        </div>
        <div>
          <Badge variant={TRAFFIC_BADGE_VARIANT[area.trafficLevel]} size="sm">
            {findLabel(TRAFFIC_LEVELS, area.trafficLevel)}
          </Badge>
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
            <ClipboardList className="h-3.5 w-3.5" />
            {taskCount} task{taskCount !== 1 ? 's' : ''}
          </div>
          {!isArchived && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddTask(area);
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Task
            </Button>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(area);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {isArchived ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(area.id);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(area.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(area.id);
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
