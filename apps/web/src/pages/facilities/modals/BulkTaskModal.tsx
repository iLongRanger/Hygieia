import { CheckSquare, Square } from 'lucide-react';
import type { Area, TaskTemplate } from '../../../types/facility';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { CLEANING_FREQUENCIES } from '../facility-constants';

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

export function BulkTaskModal({
  isOpen,
  onClose,
  selectedAreaForTask,
  bulkFrequency,
  setBulkFrequency,
  filteredBulkTaskTemplates,
  selectedTaskTemplateIds,
  toggleTaskTemplateSelection,
  selectAllTaskTemplates,
  clearAllTaskTemplates,
  onSave,
  saving,
}: BulkTaskModalProps): React.JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Tasks${selectedAreaForTask ? ` - ${selectedAreaForTask.name || selectedAreaForTask.areaType.name}` : ''}`}
      size="lg"
    >
      <div className="space-y-4">
        <Select
          label="Cleaning Frequency"
          options={CLEANING_FREQUENCIES}
          value={bulkFrequency}
          onChange={(value) => setBulkFrequency(value)}
        />

        <div className="flex items-center justify-between">
          <div className="text-sm text-surface-500 dark:text-surface-400">
            {selectedTaskTemplateIds.size} of {filteredBulkTaskTemplates.length} selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllTaskTemplates}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllTaskTemplates}
            >
              Clear All
            </Button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700 divide-y divide-surface-200 dark:divide-surface-700">
          {filteredBulkTaskTemplates.length === 0 ? (
            <div className="p-4 text-center text-surface-500">
              No task templates for the selected frequency.
            </div>
          ) : (
            filteredBulkTaskTemplates.map((template) => {
              const isSelected = selectedTaskTemplateIds.has(template.id);
              return (
                <div
                  key={template.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-surface-100 dark:bg-surface-800/10 ${
                    isSelected ? 'bg-emerald/10' : ''
                  }`}
                  onClick={() => toggleTaskTemplateSelection(template.id)}
                >
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-emerald" />
                    ) : (
                      <Square className="h-5 w-5 text-surface-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-surface-900 dark:text-white truncate">
                      {template.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-surface-500">
                      <Badge variant="default" className="text-xs">
                        {template.cleaningType}
                      </Badge>
                      {template.estimatedMinutes && (
                        <span>{template.estimatedMinutes} min</span>
                      )}
                      {template.difficultyLevel && (
                        <span>Level {template.difficultyLevel}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

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
            disabled={selectedTaskTemplateIds.size === 0}
          >
            Add {selectedTaskTemplateIds.size} Task{selectedTaskTemplateIds.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
