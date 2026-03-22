import type {
  Area,
  CleaningFrequency,
  CreateFacilityTaskInput,
  FacilityTask,
  FixtureType,
  TaskTemplate,
  UpdateFacilityTaskInput,
} from '../../../types/facility';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { CLEANING_FREQUENCIES } from '../facility-constants';

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

export function TaskModal({
  isOpen,
  onClose,
  editingTask,
  selectedAreaForTask,
  taskForm,
  setTaskForm,
  filteredTaskTemplates,
  taskFixtureTypes,
  getTaskFixtureMinutes,
  updateTaskFixtureMinutes,
  onSave,
  saving,
}: TaskModalProps): React.JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingTask
          ? 'Edit Task'
          : `Add Task${selectedAreaForTask ? ` - ${selectedAreaForTask.name || selectedAreaForTask.areaType.name}` : ''}`
      }
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-surface-600 dark:text-surface-300">
            Task Source
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              className={`rounded-lg border p-3 text-left transition-colors ${
                !taskForm.taskTemplateId
                  ? 'border-emerald bg-emerald/10 text-surface-900 dark:text-white'
                  : 'border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 hover:border-surface-300 dark:border-surface-600'
              }`}
              onClick={() =>
                setTaskForm({ ...taskForm, taskTemplateId: null })
              }
            >
              <div className="font-medium">Custom Task</div>
              <div className="text-xs text-surface-500">
                Enter task name manually
              </div>
            </button>
            <button
              type="button"
              className={`rounded-lg border p-3 text-left transition-colors ${
                taskForm.taskTemplateId
                  ? 'border-emerald bg-emerald/10 text-surface-900 dark:text-white'
                  : 'border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 hover:border-surface-300 dark:border-surface-600'
              }`}
              onClick={() =>
                setTaskForm({
                  ...taskForm,
                  taskTemplateId: filteredTaskTemplates[0]?.id || null,
                  customName: '',
                })
              }
            >
              <div className="font-medium">From Template</div>
              <div className="text-xs text-surface-500">
                Select predefined task
              </div>
            </button>
          </div>
        </div>

        {taskForm.taskTemplateId ? (
          <Select
            label="Task Template"
            placeholder="Select a task template"
            options={filteredTaskTemplates.map((tt) => ({
              value: tt.id,
              label: `${tt.name} (${tt.cleaningType})`,
            }))}
            value={taskForm.taskTemplateId || ''}
            onChange={(value) =>
              setTaskForm({ ...taskForm, taskTemplateId: value || null })
            }
          />
        ) : (
          <Input
            label="Task Name"
            placeholder="e.g., Vacuum floors, Empty trash"
            value={taskForm.customName || ''}
            onChange={(e) =>
              setTaskForm({ ...taskForm, customName: e.target.value })
            }
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Frequency"
            options={CLEANING_FREQUENCIES}
            value={taskForm.cleaningFrequency || 'daily'}
            onChange={(value) =>
              setTaskForm({
                ...taskForm,
                cleaningFrequency: value as CleaningFrequency,
              })
            }
          />
          <Input
            label="Est. Minutes"
            type="number"
            placeholder="Optional"
            value={taskForm.estimatedMinutes || ''}
            onChange={(e) =>
              setTaskForm({
                ...taskForm,
                estimatedMinutes: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Base Minutes Override"
            type="number"
            min={0}
            step="0.01"
            value={(taskForm as CreateFacilityTaskInput).baseMinutesOverride ?? ''}
            onChange={(e) =>
              setTaskForm({
                ...taskForm,
                baseMinutesOverride: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
          <Input
            label="Per Sq Ft Minutes Override"
            type="number"
            min={0}
            step="0.0001"
            value={(taskForm as CreateFacilityTaskInput).perSqftMinutesOverride ?? ''}
            onChange={(e) =>
              setTaskForm({
                ...taskForm,
                perSqftMinutesOverride: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-surface-600 dark:text-surface-300">Fixture Minutes Overrides</div>
          {taskFixtureTypes.length === 0 ? (
            <div className="text-sm text-surface-500">No fixture types available.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {taskFixtureTypes.map((fixtureType) => (
                <Input
                  key={fixtureType.id}
                  label={fixtureType.name}
                  type="number"
                  min={0}
                  step="0.01"
                  value={getTaskFixtureMinutes(fixtureType.id)}
                  onChange={(e) =>
                    updateTaskFixtureMinutes(
                      fixtureType.id,
                      Math.max(0, Number(e.target.value) || 0)
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        <Select
          label="Priority"
          options={[
            { value: '1', label: '1 - Highest' },
            { value: '2', label: '2 - High' },
            { value: '3', label: '3 - Normal' },
            { value: '4', label: '4 - Low' },
            { value: '5', label: '5 - Lowest' },
          ]}
          value={String(taskForm.priority || 3)}
          onChange={(value) =>
            setTaskForm({ ...taskForm, priority: Number(value) })
          }
        />

        <Textarea
          label="Instructions (optional)"
          placeholder="Special instructions for this task..."
          value={
            (taskForm as UpdateFacilityTaskInput).customInstructions || ''
          }
          onChange={(e) =>
            setTaskForm({
              ...taskForm,
              customInstructions: e.target.value || null,
            } as UpdateFacilityTaskInput)
          }
          rows={2}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            isLoading={saving}
            disabled={!taskForm.taskTemplateId && !taskForm.customName}
          >
            {editingTask ? 'Save Changes' : 'Add Task'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
