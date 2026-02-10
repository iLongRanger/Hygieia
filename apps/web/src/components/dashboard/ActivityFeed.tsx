import React from 'react';
import { Card } from '../ui/Card';
import { FileText, FileSignature, Building2, Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  action: string;
  performedBy: string;
  createdAt: string;
}

interface ActivityFeedProps {
  data: ActivityItem[];
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  proposal: FileText,
  contract: FileSignature,
  account: Building2,
};

const ENTITY_COLORS: Record<string, string> = {
  proposal: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  contract: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  account: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Recent Activity
        </h3>
        <div className="mt-8 flex flex-col items-center justify-center">
          <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-700">
            <Activity className="h-8 w-8 text-surface-400 dark:text-surface-500" />
          </div>
          <p className="mt-4 text-sm text-surface-400 dark:text-surface-500">
            No data yet
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <h3 className="mb-4 text-lg font-semibold text-surface-900 dark:text-surface-100">
        Recent Activity
      </h3>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {data.map((item) => {
          const Icon = ENTITY_ICONS[item.entityType] || Activity;
          const colorClass =
            ENTITY_COLORS[item.entityType] ||
            'text-surface-500 bg-surface-100 dark:bg-surface-700';

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-surface-100 p-3 dark:border-surface-700"
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-surface-800 dark:text-surface-200">
                  <span className="font-medium">{item.performedBy}</span>{' '}
                  <span className="text-surface-500 dark:text-surface-400">
                    {formatAction(item.action).toLowerCase()}
                  </span>{' '}
                  <span className="font-medium">{item.entityLabel}</span>
                </p>
                <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
                  {formatTimeAgo(item.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ActivityFeed;
