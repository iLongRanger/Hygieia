import { Plus } from 'lucide-react';
import type {
  Area,
  AreaType,
  CleaningFrequency,
  CreateAreaInput,
  FixtureType,
  TrafficLevel,
  UpdateAreaInput,
} from '../../../types/facility';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import type { AreaItemInput, AreaTemplateTaskSelection } from '../facility-constants';
import {
  CLEANING_FREQUENCIES,
  CONDITION_LEVELS,
  FLOOR_TYPES,
  ORDERED_CLEANING_FREQUENCIES,
  TRAFFIC_LEVELS,
} from '../facility-constants';

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

export function AreaModal({
  isOpen,
  onClose,
  editingArea,
  areaForm,
  setAreaForm,
  areaTypes,
  fixtureTypes,
  applyAreaTemplate,
  areaTemplateLoading,
  filteredAreaTemplateTasks,
  currentAreaTaskFrequency,
  areaTaskPipelineStep,
  reviewedAreaTaskFrequencies,
  allAreaTaskFrequenciesReviewed,
  newAreaCustomTaskName,
  setNewAreaCustomTaskName,
  toggleAreaTemplateTaskInclude,
  addCustomAreaTemplateTask,
  removeCustomAreaTemplateTask,
  goToNextAreaTaskFrequencyStep,
  goToPreviousAreaTaskFrequencyStep,
  addItemToArea,
  updateAreaItem,
  removeAreaItem,
  onSave,
  saving,
}: AreaModalProps): React.JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingArea ? 'Edit Area' : 'Add Area'}
      size="xl"
    >
      <div className="space-y-4">
        <Select
          label="Area Type"
          placeholder="Select area type"
          options={areaTypes.map((at) => ({ value: at.id, label: at.name }))}
          value={(areaForm as CreateAreaInput).areaTypeId || ''}
          onChange={(value) => {
            setAreaForm({ ...areaForm, areaTypeId: value });
            applyAreaTemplate(value);
          }}
        />

        <Input
          label="Custom Name (optional)"
          placeholder="Leave blank to use area type name"
          value={areaForm.name || ''}
          onChange={(e) =>
            setAreaForm({ ...areaForm, name: e.target.value || null })
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Length (ft)"
            type="number"
            min={0}
            step="0.01"
            placeholder="Length"
            value={(areaForm as CreateAreaInput).length || ''}
            onChange={(e) => {
              const length = e.target.value ? Number(e.target.value) : null;
              const width = (areaForm as CreateAreaInput).width ? Number((areaForm as CreateAreaInput).width) : null;
              setAreaForm({
                ...areaForm,
                length,
                squareFeet: length && width ? Math.round(length * width) : areaForm.squareFeet,
              });
            }}
          />
          <Input
            label="Width (ft)"
            type="number"
            min={0}
            step="0.01"
            placeholder="Width"
            value={(areaForm as CreateAreaInput).width || ''}
            onChange={(e) => {
              const width = e.target.value ? Number(e.target.value) : null;
              const length = (areaForm as CreateAreaInput).length ? Number((areaForm as CreateAreaInput).length) : null;
              setAreaForm({
                ...areaForm,
                width,
                squareFeet: length && width ? Math.round(length * width) : areaForm.squareFeet,
              });
            }}
          />
          <Input
            label="Square Feet"
            type="number"
            min={0}
            placeholder="Auto or manual"
            value={areaForm.squareFeet || ''}
            onChange={(e) =>
              setAreaForm({
                ...areaForm,
                squareFeet: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Floor Type"
            options={FLOOR_TYPES}
            value={areaForm.floorType || 'vct'}
            onChange={(value) =>
              setAreaForm({
                ...areaForm,
                floorType: value as CreateAreaInput['floorType'],
              })
            }
          />
          <Select
            label="Condition Level"
            options={CONDITION_LEVELS}
            value={areaForm.conditionLevel || 'standard'}
            onChange={(value) =>
              setAreaForm({
                ...areaForm,
                conditionLevel: value as 'standard' | 'medium' | 'hard',
              })
            }
          />
        </div>

        <Select
          label="Traffic Level"
          options={TRAFFIC_LEVELS}
          value={(areaForm as CreateAreaInput).trafficLevel || 'medium'}
          onChange={(value) =>
            setAreaForm({
              ...areaForm,
              trafficLevel: value as TrafficLevel,
            })
          }
        />

        <Textarea
          label="Notes"
          value={areaForm.notes || ''}
          onChange={(e) =>
            setAreaForm({ ...areaForm, notes: e.target.value || null })
          }
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-surface-600 dark:text-surface-300">Items</div>
            <Button variant="ghost" size="sm" onClick={addItemToArea}>
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Button>
          </div>
          {fixtureTypes.length === 0 ? (
            <div className="text-sm text-surface-500">No item types available.</div>
          ) : (areaForm as CreateAreaInput).fixtures?.length ? (
            <div className="space-y-3">
              {(areaForm as CreateAreaInput).fixtures?.map((item, index) => (
                <div
                  key={`${item.fixtureTypeId}-${index}`}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-3 sm:grid-cols-4"
                >
                  <Select
                    label="Item Type"
                    options={fixtureTypes.map((type) => ({
                      value: type.id,
                      label: `${type.name} (${type.category})`,
                    }))}
                    value={item.fixtureTypeId}
                    onChange={(value) => {
                      const selected = fixtureTypes.find((type) => type.id === value);
                      updateAreaItem(index, {
                        fixtureTypeId: value,
                        minutesPerItem: selected ? Number(selected.defaultMinutesPerItem) || 0 : item.minutesPerItem,
                      });
                    }}
                  />
                  <Input
                    label="Count"
                    type="number"
                    min={0}
                    value={item.count}
                    onChange={(e) =>
                      updateAreaItem(index, { count: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                  <Input
                    label="Minutes/Item"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.minutesPerItem ?? 0}
                    disabled
                  />
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={() => removeAreaItem(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-surface-500">No items added.</div>
          )}
        </div>

        {!editingArea && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-surface-600 dark:text-surface-300">Default Tasks</div>
            {areaTemplateLoading ? (
              <div className="text-sm text-surface-500">Loading template tasks...</div>
            ) : (
              <div className="space-y-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/20 p-3">
                <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-surface-900 dark:text-white">
                      Step {areaTaskPipelineStep + 1} of{' '}
                      {ORDERED_CLEANING_FREQUENCIES.length}
                    </div>
                    <Badge variant="info" className="text-xs">
                      {CLEANING_FREQUENCIES.find(
                        (f) => f.value === currentAreaTaskFrequency
                      )?.label || 'Daily'}
                    </Badge>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-surface-100 dark:bg-surface-800/20">
                    <div
                      className="h-full rounded-full bg-emerald transition-all"
                      style={{
                        width: `${
                          ((areaTaskPipelineStep + 1) /
                            ORDERED_CLEANING_FREQUENCIES.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                    Reviewed categories: {reviewedAreaTaskFrequencies.size}/
                    {ORDERED_CLEANING_FREQUENCIES.length}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={`Add custom ${
                      CLEANING_FREQUENCIES.find(
                        (f) => f.value === currentAreaTaskFrequency
                      )?.label || 'Daily'
                    } task`}
                    value={newAreaCustomTaskName}
                    onChange={(e) => setNewAreaCustomTaskName(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCustomAreaTemplateTask();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addCustomAreaTemplateTask}
                  >
                    Add
                  </Button>
                </div>

                {filteredAreaTemplateTasks.length === 0 ? (
                  <div className="text-sm text-surface-500">
                    No tasks for this category yet. Add one above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAreaTemplateTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-surface-900 dark:text-white">{task.name}</div>
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
                              onClick={() => removeCustomAreaTemplateTask(task.id)}
                            >
                              Remove
                            </Button>
                          )}
                          <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                            <input
                              type="checkbox"
                              checked={task.include}
                              onChange={(e) =>
                                toggleAreaTemplateTaskInclude(task.id, e.target.checked)
                              }
                              className="rounded border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-primary-600 dark:text-primary-500 focus:ring-primary-500"
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
                    onClick={goToPreviousAreaTaskFrequencyStep}
                    disabled={areaTaskPipelineStep === 0}
                  >
                    Previous Category
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={goToNextAreaTaskFrequencyStep}
                  >
                    {areaTaskPipelineStep ===
                    ORDERED_CLEANING_FREQUENCIES.length - 1
                      ? 'Mark Final Category Reviewed'
                      : 'Next Category'}
                  </Button>
                </div>
              </div>
            )}
            <div className="text-xs text-surface-500">
              Review each frequency category in order. `Add Area` is disabled
              until all categories are reviewed.
            </div>
          </div>
        )}

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
            disabled={
              !(areaForm as CreateAreaInput).areaTypeId ||
              (!editingArea && !allAreaTaskFrequenciesReviewed)
            }
          >
            {editingArea ? 'Save Changes' : 'Add Area'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
