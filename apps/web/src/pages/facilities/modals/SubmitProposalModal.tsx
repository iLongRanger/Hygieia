import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Textarea } from '../../../components/ui/Textarea';

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

export function SubmitProposalModal({
  isOpen,
  onClose,
  activeAreasCount,
  activeTasksCount,
  submitProposalNotes,
  setSubmitProposalNotes,
  onSubmit,
  submitting,
}: SubmitProposalModalProps): React.JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (submitting) return;
        onClose();
      }}
      title="Submit Facility for Proposal"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-white/10 bg-navy-darker/40 p-4">
          <div className="text-sm text-gray-400">Review Summary</div>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Areas</div>
              <div className="text-white font-medium">{activeAreasCount}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Tasks</div>
              <div className="text-white font-medium">{activeTasksCount}</div>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-300">
            This submits the facility as reviewed and ready for proposal creation.
            It also marks the walkthrough as completed and updates lead status.
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
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            isLoading={submitting}
            disabled={activeAreasCount === 0 || activeTasksCount === 0}
          >
            Submit Facility
          </Button>
        </div>
      </div>
    </Modal>
  );
}
