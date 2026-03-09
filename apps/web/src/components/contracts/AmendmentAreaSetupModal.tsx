import { Plus } from 'lucide-react';

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import type {
  ContractAmendmentDraftArea,
  ContractAmendmentDraftTask,
} from '../../types/contract';
import type { AreaType, CleaningFrequency } from '../../types/facility';
import type { AreaTemplateTaskSelection } from '../../pages/facilities/facility-constants';
import {
  CLEANING_FREQUENCIES,
  CONDITION_LEVELS,
  FLOOR_TYPES,
  ORDERED_CLEANING_FREQUENCIES,
  TRAFFIC_LEVELS,
} from '../../pages/facilities/facility-constants';

interface AmendmentAreaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaForm: ContractAmendmentDraftArea;
  setAreaForm: React.Dispatch<React.SetStateAction<ContractAmendmentDraftArea>>;
  areaTypes: AreaType[];
  areaTemplateLoading: boolean;
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
  applyAreaTemplate: (areaTypeId: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function AmendmentAreaSetupModal({
  isOpen,
  onClose,
  areaForm,
  setAreaForm,
  areaTypes,
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
  applyAreaTemplate,
  onSave,
  saving,
}: AmendmentAreaSetupModalProps): React.JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Area"
      size="xl"
    >
      <div className="space-y-4">
        <Select
          label="Area Type"
          placeholder="Select area type"
          options={areaTypes.map((areaType) => ({ value: areaType.id, label: areaType.name }))}
          value={areaForm.areaTypeId || ''}
          onChange={(value) => {
            const selectedType = areaTypes.find((areaType) => areaType.id === value);
            setAreaForm((current) => ({
              ...current,
              areaTypeId: value || null,
              areaType: selectedType
                ? { id: selectedType.id, name: selectedType.name }
                : null,
              name: current.name || selectedType?.name || '',
            }));
            applyAreaTemplate(value);
          }}
        />

        <Input
          label="Area Name"
          placeholder="Leave blank to use area type name"
          value={areaForm.name || ''}
          onChange={(e) =>
            setAreaForm((current) => ({
              ...current,
              name: e.target.value || null,
            }))
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Square Feet"
            type="number"
            min={0}
            value={areaForm.squareFeet ?? ''}
            onChange={(e) =>
              setAreaForm((current) => ({
                ...current,
                squareFeet: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
          <Input
            label="Quantity"
            type="number"
            min={1}
            value={areaForm.quantity ?? 1}
            onChange={(e) =>
              setAreaForm((current) => ({
                ...current,
                quantity: Math.max(1, Number(e.target.value) || 1),
              }))
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Floor Type"
            options={FLOOR_TYPES}
            value={areaForm.floorType || 'vct'}
            onChange={(value) =>
              setAreaForm((current) => ({
                ...current,
                floorType: value,
              }))
            }
          />
          <Select
            label="Condition"
            options={CONDITION_LEVELS}
            value={areaForm.conditionLevel || 'standard'}
            onChange={(value) =>
              setAreaForm((current) => ({
                ...current,
                conditionLevel: value,
              }))
            }
          />
          <Select
            label="Traffic"
            options={TRAFFIC_LEVELS}
            value={areaForm.trafficLevel || 'medium'}
            onChange={(value) =>
              setAreaForm((current) => ({
                ...current,
                trafficLevel: value,
              }))
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Room Count"
            type="number"
            min={0}
            value={areaForm.roomCount ?? 0}
            onChange={(e) =>
              setAreaForm((current) => ({
                ...current,
                roomCount: Math.max(0, Number(e.target.value) || 0),
              }))
            }
          />
          <Input
            label="Unit Count"
            type="number"
            min={0}
            value={areaForm.unitCount ?? 0}
            onChange={(e) =>
              setAreaForm((current) => ({
                ...current,
                unitCount: Math.max(0, Number(e.target.value) || 0),
              }))
            }
          />
        </div>

        <Textarea
          label="Notes"
          value={areaForm.notes || ''}
          onChange={(e) =>
            setAreaForm((current) => ({
              ...current,
              notes: e.target.value || null,
            }))
          }
        />

        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-200">Default Tasks</div>
          {areaTemplateLoading ? (
            <div className="text-sm text-gray-500">Loading template tasks...</div>
          ) : (
            <div className="space-y-3 rounded-lg border border-white/10 bg-navy-dark/20 p-3">
              <div className="rounded-lg border border-white/10 bg-navy-dark/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-white">
                    Step {areaTaskPipelineStep + 1} of {ORDERED_CLEANING_FREQUENCIES.length}
                  </div>
                  <Badge variant="info" className="text-xs">
                    {CLEANING_FREQUENCIES.find(
                      (frequency) => frequency.value === currentAreaTaskFrequency
                    )?.label || 'Daily'}
                  </Badge>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald transition-all"
                    style={{
                      width: `${((areaTaskPipelineStep + 1) / ORDERED_CLEANING_FREQUENCIES.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Reviewed categories: {reviewedAreaTaskFrequencies.size}/{ORDERED_CLEANING_FREQUENCIES.length}
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder={`Add custom ${
                    CLEANING_FREQUENCIES.find(
                      (frequency) => frequency.value === currentAreaTaskFrequency
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
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>

              {filteredAreaTemplateTasks.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No tasks for this category yet. Add one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAreaTemplateTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-navy-dark/30 p-3"
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
                        <div className="text-xs text-gray-500">
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
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={task.include}
                            onChange={(e) =>
                              toggleAreaTemplateTaskInclude(task.id, e.target.checked)
                            }
                            className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                          />
                          Include
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between border-t border-white/10 pt-3">
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
                  {areaTaskPipelineStep === ORDERED_CLEANING_FREQUENCIES.length - 1
                    ? 'Mark Final Category Reviewed'
                    : 'Next Category'}
                </Button>
              </div>
            </div>
          )}
          <div className="text-xs text-gray-500">
            Review each frequency category in order. `Add Area` stays disabled until all categories are reviewed.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            isLoading={saving}
            disabled={!areaForm.areaTypeId || !allAreaTaskFrequenciesReviewed}
          >
            Add Area
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const buildAmendmentTasksFromSelections = (
  areaId: string,
  areaTemplateTasks: AreaTemplateTaskSelection[]
): ContractAmendmentDraftTask[] =>
  areaTemplateTasks
    .filter((task) => task.include)
    .map((task) => ({
      tempId: `task-${Math.random().toString(36).slice(2, 10)}`,
      areaId,
      taskTemplateId: task.taskTemplateId,
      taskTemplate: task.taskTemplateId ? { id: task.taskTemplateId, name: task.name } : null,
      customName: task.taskTemplateId ? null : task.name,
      cleaningFrequency: task.cleaningType,
      estimatedMinutes: task.estimatedMinutes,
      baseMinutesOverride: task.baseMinutes || null,
      perSqftMinutesOverride: task.perSqftMinutes || null,
      perUnitMinutesOverride: task.perUnitMinutes || null,
      perRoomMinutesOverride: task.perRoomMinutes || null,
    }));
