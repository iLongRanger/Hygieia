import { History } from 'lucide-react';
import type { AccountActivity, AccountActivityEntryType } from '../../types/crm';
import { formatDateTime } from './account-constants';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';

interface AccountHistoryProps {
  activities: AccountActivity[];
  activitiesLoading: boolean;
  canWriteAccounts: boolean;
  activityNote: string;
  setActivityNote: (note: string) => void;
  activityType: AccountActivityEntryType;
  setActivityType: (type: AccountActivityEntryType) => void;
  onAddActivity: () => void;
  addingActivity: boolean;
}

export function AccountHistory({
  activities,
  activitiesLoading,
  canWriteAccounts,
  activityNote,
  setActivityNote,
  activityType,
  setActivityType,
  onAddActivity,
  addingActivity,
}: AccountHistoryProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-navy-dark/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-emerald" />
          <h3 className="text-lg font-semibold text-white">Account History</h3>
        </div>
      </div>

      {canWriteAccounts && (
        <div className="space-y-3 mb-4">
          <Select
            label="Entry Type"
            value={activityType}
            onChange={(value) => setActivityType(value as AccountActivityEntryType)}
            options={[
              { value: 'note', label: 'General Note' },
              { value: 'request', label: 'Customer Request' },
              { value: 'complaint', label: 'Customer Complaint' },
            ]}
          />
          <Textarea
            label="New History Note"
            placeholder="Log customer call, request, complaint, or other account note..."
            value={activityNote}
            onChange={(e) => setActivityNote(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={onAddActivity} disabled={addingActivity}>
              {addingActivity ? 'Saving...' : 'Add History Note'}
            </Button>
          </div>
        </div>
      )}

      {activitiesLoading ? (
        <div className="text-sm text-gray-400">Loading history...</div>
      ) : activities.length === 0 ? (
        <div className="text-sm text-gray-400">No account history yet.</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-lg border border-white/10 bg-surface-50/5 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge
                  variant={
                    activity.entryType === 'complaint'
                      ? 'error'
                      : activity.entryType === 'request'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {activity.entryType}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatDateTime(activity.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">
                {activity.note}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Logged by {activity.performedByUser?.fullName || 'System'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
