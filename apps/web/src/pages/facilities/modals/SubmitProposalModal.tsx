import { Button } from '../../../components/ui/Button';
import { Drawer } from '../../../components/ui/Drawer';
import { Textarea } from '../../../components/ui/Textarea';
import type { Area, FacilityTask } from '../../../types/facility';

interface SubmitProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityName: string;
  accountName: string;
  totalSquareFeet: number;
  areas: Area[];
  tasks: FacilityTask[];
  activeAreasCount: number;
  activeTasksCount: number;
  submitProposalNotes: string;
  setSubmitProposalNotes: (notes: string) => void;
  onCompleteWalkthrough: () => void;
  onSaveDraft: () => void;
  submitting: boolean;
  locationLabel?: string;
}

export function SubmitProposalModal({
  isOpen,
  onClose,
  facilityName,
  accountName,
  totalSquareFeet,
  areas,
  tasks,
  activeAreasCount,
  activeTasksCount,
  submitProposalNotes,
  setSubmitProposalNotes,
  onCompleteWalkthrough,
  onSaveDraft,
  submitting,
  locationLabel = 'Facility',
}: SubmitProposalModalProps): React.JSX.Element {
  const activeAreas = areas.filter((area) => !area.archivedAt);
  const activeTasks = tasks.filter((task) => !task.archivedAt);

  const tasksByAreaId = activeTasks.reduce<Record<string, number>>((acc, task) => {
    const areaId = task.area?.id;
    if (!areaId) return acc;
    acc[areaId] = (acc[areaId] || 0) + 1;
    return acc;
  }, {});

  const unassignedTaskCount = activeTasks.filter((task) => !task.area?.id).length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        if (submitting) return;
        onClose();
      }}
      title={`Submit ${locationLabel} for Proposal`}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-900/40 p-4">
          <div className="text-sm text-surface-500 dark:text-surface-400">Final Review</div>
          <div className="mt-2">
            <div className="text-surface-900 dark:text-white font-medium">{facilityName}</div>
            <div className="text-xs text-surface-500 dark:text-surface-400">{accountName}</div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-surface-500">Areas</div>
              <div className="text-surface-900 dark:text-white font-medium">{activeAreasCount}</div>
            </div>
            <div>
              <div className="text-xs text-surface-500">Tasks</div>
              <div className="text-surface-900 dark:text-white font-medium">{activeTasksCount}</div>
            </div>
            <div>
              <div className="text-xs text-surface-500">Total Sq Ft</div>
              <div className="text-surface-900 dark:text-white font-medium">
                {totalSquareFeet.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-surface-500">Unassigned Tasks</div>
              <div className="text-surface-900 dark:text-white font-medium">{unassignedTaskCount}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-900/30 p-4">
          <div className="text-sm text-surface-600 dark:text-surface-400 mb-3">Area Overview</div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {activeAreas.map((area) => {
              const areaName = area.name || area.areaType.name;
              const areaSqFt = (Number(area.squareFeet) || 0) * (area.quantity || 1);
              const areaTaskCount = tasksByAreaId[area.id] || 0;
              return (
                <div
                  key={area.id}
                  className="rounded-md border border-surface-200 dark:border-surface-700 bg-black/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-surface-900 dark:text-white">{areaName}</div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">
                        {areaSqFt.toLocaleString()} sqft
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-surface-900 dark:text-white">{areaTaskCount} task{areaTaskCount === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeAreas.length === 0 && (
              <div className="text-sm text-surface-500 dark:text-surface-400">No active areas found.</div>
            )}
          </div>
          <div className="mt-3 text-sm text-surface-600 dark:text-surface-400">
            {`Choose whether to keep working on this ${locationLabel.toLowerCase()} later or finish the walkthrough now.`}
            Completing the walkthrough will mark it complete and move the pipeline forward to proposal-ready.
          </div>
        </div>

        <Textarea
          label="Review Notes (Optional)"
          placeholder="Add notes for proposal preparation..."
          value={submitProposalNotes}
          onChange={(e) => setSubmitProposalNotes(e.target.value)}
          rows={3}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onSaveDraft}
            disabled={submitting}
          >
            Save as Draft
          </Button>
          <Button
            onClick={onCompleteWalkthrough}
            isLoading={submitting}
            disabled={activeAreasCount === 0 || activeTasksCount === 0}
          >
            Complete Walkthrough
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
