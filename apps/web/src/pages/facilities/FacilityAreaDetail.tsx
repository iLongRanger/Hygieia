import { ArrowLeft, Edit2, ListPlus, Plus, Ruler, Trash2 } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { Area, CleaningFrequency, FacilityTask } from '../../types/facility';
import {
  CLEANING_FREQUENCIES,
  CONDITION_LEVELS,
  FLOOR_TYPES,
  TASK_SEQUENCE_RULES,
  TRAFFIC_LEVELS,
} from './facility-constants';

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

const CONDITION_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  standard: 'success',
  medium: 'warning',
  hard: 'error',
};

const TRAFFIC_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
};

function getTaskSequenceWeight(name: string): number {
  if (!name) return 90;
  for (const rule of TASK_SEQUENCE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(name))) return rule.weight;
  }
  return 90;
}

function getTaskName(task: FacilityTask): string {
  return task.customName || task.taskTemplate?.name || 'Unnamed Task';
}

function findLabel(
  items: { value: string; label: string }[],
  value: string
): string {
  return items.find((item) => item.value === value)?.label ?? value;
}

function groupTasksByFrequency(
  tasks: FacilityTask[]
): Map<CleaningFrequency, FacilityTask[]> {
  const groups = new Map<CleaningFrequency, FacilityTask[]>();

  for (const freq of CLEANING_FREQUENCIES) {
    const matching = tasks
      .filter((t) => t.cleaningFrequency === freq.value)
      .sort(
        (a, b) =>
          getTaskSequenceWeight(getTaskName(a)) -
          getTaskSequenceWeight(getTaskName(b))
      );

    if (matching.length > 0) {
      groups.set(freq.value as CleaningFrequency, matching);
    }
  }

  return groups;
}

export function FacilityAreaDetail({
  area,
  tasks,
  onBack,
  onEditArea,
  onAddTask,
  onBulkAddTasks,
  onEditTask,
  onDeleteTask,
}: FacilityAreaDetailProps): React.JSX.Element {
  const sqft = area.squareFeet
    ? Number(area.squareFeet).toLocaleString()
    : '-';

  const hasDimensions = area.length && area.width;
  const hasFixtures = area.fixtures.length > 0;
  const frequencyGroups = groupTasksByFrequency(tasks);

  return (
    <div>
      {/* Back link */}
      <button
        onClick={onBack}
        className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Areas
      </button>

      {/* Area header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">
            {area.name || area.areaType.name}
          </h2>
          <p className="text-gray-400">{area.areaType.name}</p>
        </div>
        <Button variant="secondary" onClick={() => onEditArea(area)}>
          <Edit2 className="h-4 w-4" />
          Edit Area
        </Button>
      </div>

      {/* Area info card */}
      <Card className="mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <InfoField label="Square Feet" value={sqft} />
          <InfoField
            label="Floor Type"
            value={findLabel(FLOOR_TYPES, area.floorType)}
          />
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Condition
            </div>
            <Badge variant={CONDITION_BADGE_VARIANT[area.conditionLevel]}>
              {findLabel(CONDITION_LEVELS, area.conditionLevel)}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Traffic
            </div>
            <Badge variant={TRAFFIC_BADGE_VARIANT[area.trafficLevel]}>
              {findLabel(TRAFFIC_LEVELS, area.trafficLevel)}
            </Badge>
          </div>
          {area.roomCount > 0 && (
            <InfoField label="Room Count" value={String(area.roomCount)} />
          )}
          {area.unitCount > 0 && (
            <InfoField label="Unit Count" value={String(area.unitCount)} />
          )}
          {hasDimensions && (
            <InfoField
              label="Dimensions"
              value={`${area.length} x ${area.width} ft`}
            />
          )}
        </div>
      </Card>

      {/* Items/Fixtures section */}
      {hasFixtures && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Items & Fixtures
          </h3>
          <div className="space-y-2">
            {area.fixtures.map((fixture) => (
              <div
                key={fixture.id}
                className="rounded-lg bg-white/5 px-4 py-3 flex justify-between items-center"
              >
                <span className="text-white">{fixture.fixtureType.name}</span>
                <span className="text-gray-300">
                  {fixture.count}
                  {Number(fixture.minutesPerItem) > 0 &&
                    ` \u00d7 ${fixture.minutesPerItem} min/item`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Tasks ({tasks.length})
          </h3>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onBulkAddTasks(area)}
            >
              <ListPlus className="h-4 w-4" />
              Add Tasks
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTask(area)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No tasks assigned to this area yet. Use the buttons above to add
            tasks.
          </p>
        ) : (
          <div className="space-y-6">
            {Array.from(frequencyGroups.entries()).map(
              ([frequency, groupTasks]) => (
                <div key={frequency}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">
                      {findLabel(CLEANING_FREQUENCIES, frequency)}
                    </Badge>
                    <span className="text-gray-400 text-sm">
                      ({groupTasks.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {groupTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg bg-white/5 px-3 py-2 flex items-center justify-between group"
                      >
                        <span className="text-white">
                          {getTaskName(task)}
                          {task.estimatedMinutes != null && (
                            <span className="text-gray-400 ml-1">
                              ({task.estimatedMinutes} min)
                            </span>
                          )}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTask(task)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Notes section */}
      {area.notes && (
        <Card className="mt-6">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Notes
          </div>
          <p className="text-white">{area.notes}</p>
        </Card>
      )}
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-white font-medium">{value}</div>
    </div>
  );
}
