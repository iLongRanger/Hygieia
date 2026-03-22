import { Plus } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import type { CleaningFrequency } from '../../../types/facility';
import type { AreaTemplateTaskSelection } from '../facility-constants';
import {
  CLEANING_FREQUENCIES,
  ORDERED_CLEANING_FREQUENCIES,
} from '../facility-constants';

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAreaForTask: {
    name?: string | null;
    areaType?: {
      name?: string | null;
    } | null;
  } | null;
  filteredTaskSelectionTasks: AreaTemplateTaskSelection[];
  currentTaskSelectionFrequency: string;
  taskSelectionStep: number;
  reviewedTaskSelectionFrequencies: Set<CleaningFrequency>;
  newTaskSelectionCustomName: string;
  setNewTaskSelectionCustomName: (name: string) => void;
  toggleTaskSelectionInclude: (taskId: string, include: boolean) => void;
  addCustomTaskSelectionTask: () => void;
  removeCustomTaskSelectionTask: (taskId: string) => void;
  goToNextTaskSelectionStep: () => void;
  goToPreviousTaskSelectionStep: () => void;
  onSave: () => void;
  saving: boolean;
  hasSelectedTasks: boolean;
}

export function TaskSelectionModal({
  isOpen,
  onClose,
  selectedAreaForTask,
  filteredTaskSelectionTasks,
  currentTaskSelectionFrequency,
  taskSelectionStep,
  reviewedTaskSelectionFrequencies,
  newTaskSelectionCustomName,
  setNewTaskSelectionCustomName,
  toggleTaskSelectionInclude,
  addCustomTaskSelectionTask,
  removeCustomTaskSelectionTask,
  goToNextTaskSelectionStep,
  goToPreviousTaskSelectionStep,
  onSave,
  saving,
  hasSelectedTasks,
}: TaskSelectionModalProps): React.JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Tasks${
        selectedAreaForTask
          ? ` - ${selectedAreaForTask.name || selectedAreaForTask.areaType?.name || 'Area'}`
          : ''
      }`}
      size="xl"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-surface-600 dark:text-surface-300">Default Tasks</div>
          <div className="space-y-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/20 p-3">
            <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">
                  Step {taskSelectionStep + 1} of {ORDERED_CLEANING_FREQUENCIES.length}
                </div>
                <Badge variant="info" className="text-xs">
                  {CLEANING_FREQUENCIES.find(
                    (frequency) => frequency.value === currentTaskSelectionFrequency
                  )?.label || 'Daily'}
                </Badge>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-surface-100 dark:bg-surface-800/20">
                <div
                  className="h-full rounded-full bg-emerald transition-all"
                  style={{
                    width: `${((taskSelectionStep + 1) / ORDERED_CLEANING_FREQUENCIES.length) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                Reviewed categories: {reviewedTaskSelectionFrequencies.size}/{ORDERED_CLEANING_FREQUENCIES.length}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder={`Add custom ${
                  CLEANING_FREQUENCIES.find(
                    (frequency) => frequency.value === currentTaskSelectionFrequency
                  )?.label || 'Daily'
                } task`}
                value={newTaskSelectionCustomName}
                onChange={(e) => setNewTaskSelectionCustomName(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomTaskSelectionTask();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addCustomTaskSelectionTask}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {filteredTaskSelectionTasks.length === 0 ? (
              <div className="text-sm text-surface-500">
                No tasks for this category yet. Add one above.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTaskSelectionTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-white">{task.name}</div>
                        {task.taskTemplateId ? (
                          <Badge variant="info" className="text-xs">
                            Template
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-surface-500">
                        {task.taskTemplateId
                          ? `${task.cleaningType} - Est ${task.estimatedMinutes ?? 0} min`
                          : `Custom ${task.cleaningType} task`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!task.taskTemplateId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomTaskSelectionTask(task.id)}
                        >
                          Remove
                        </Button>
                      )}
                      <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                        <input
                          type="checkbox"
                          checked={task.include}
                          onChange={(e) =>
                            toggleTaskSelectionInclude(task.id, e.target.checked)
                          }
                          className="rounded border-surface-300 dark:border-surface-600 bg-surface-200 dark:bg-surface-900 text-primary-500 focus:ring-primary-500"
                        />
                        Include
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between border-t border-surface-200 dark:border-surface-700 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={goToPreviousTaskSelectionStep}
                disabled={taskSelectionStep === 0}
              >
                Previous Category
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={goToNextTaskSelectionStep}
              >
                {taskSelectionStep === ORDERED_CLEANING_FREQUENCIES.length - 1
                  ? 'Mark Final Category Reviewed'
                  : 'Next Category'}
              </Button>
            </div>
          </div>
          <div className="text-xs text-surface-500">
            Review categories and include the tasks you want to add for this area.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            isLoading={saving}
            disabled={!hasSelectedTasks}
          >
            Add Task{hasSelectedTasks ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
