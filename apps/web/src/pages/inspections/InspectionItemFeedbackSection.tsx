import { useState } from 'react';
import { createInspectionItemFeedback } from '../../lib/inspections';
import type { InspectionItemFeedback } from '../../types/inspection';

interface ItemFeedbackSectionProps {
  inspectionId: string;
  itemId: string;
  initialFeedback: InspectionItemFeedback[];
  disabled?: boolean;
}

export function InspectionItemFeedbackSection({
  inspectionId,
  itemId,
  initialFeedback,
  disabled,
}: ItemFeedbackSectionProps) {
  const [feedback, setFeedback] = useState<InspectionItemFeedback[]>(initialFeedback);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createInspectionItemFeedback(inspectionId, itemId, body.trim());
      setFeedback((prev) => [...prev, created]);
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 border-t border-surface-200 dark:border-surface-700 pt-2">
      <h5 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
        Feedback
      </h5>
      {feedback.length === 0 ? (
        <p className="text-xs text-surface-400 mb-2">No feedback yet.</p>
      ) : (
        <ul className="space-y-2 mb-2">
          {feedback.map((entry) => (
            <li key={entry.id} className="text-xs">
              <span className="font-medium text-surface-700 dark:text-surface-300">
                {entry.authorUser.fullName}
              </span>
              <span className="text-surface-500 ml-2">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-surface-600 dark:text-surface-400">
                {entry.body}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-xs dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
            rows={2}
            placeholder="Add feedback…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
            maxLength={2000}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting || !body.trim()}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      )}
    </div>
  );
}
