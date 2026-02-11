import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Archive,
  RotateCcw,
  Lock,
  Unlock,
  RefreshCw,
  Settings,
  Edit2,
  Trash2,
  Clock,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { getProposalActivities } from '../../lib/proposals';

interface ProposalActivity {
  id: string;
  action: string;
  metadata: Record<string, any>;
  ipAddress: string | null;
  createdAt: string;
  performedByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created: { icon: FileText, label: 'Proposal created', color: 'text-gray-400' },
  updated: { icon: Edit2, label: 'Proposal updated', color: 'text-blue-400' },
  sent: { icon: Send, label: 'Proposal sent', color: 'text-blue-400' },
  viewed: { icon: Eye, label: 'Proposal viewed', color: 'text-yellow-400' },
  accepted: { icon: CheckCircle, label: 'Proposal accepted', color: 'text-green-400' },
  rejected: { icon: XCircle, label: 'Proposal rejected', color: 'text-red-400' },
  archived: { icon: Archive, label: 'Proposal archived', color: 'text-orange-400' },
  restored: { icon: RotateCcw, label: 'Proposal restored', color: 'text-blue-400' },
  deleted: { icon: Trash2, label: 'Proposal deleted', color: 'text-red-400' },
  pricing_locked: { icon: Lock, label: 'Pricing locked', color: 'text-yellow-400' },
  pricing_unlocked: { icon: Unlock, label: 'Pricing unlocked', color: 'text-blue-400' },
  pricing_plan_changed: { icon: Settings, label: 'Pricing plan changed', color: 'text-purple-400' },
  pricing_recalculated: { icon: RefreshCw, label: 'Pricing recalculated', color: 'text-emerald-400' },
  public_viewed: { icon: Eye, label: 'Viewed by client', color: 'text-yellow-400' },
  public_accepted: { icon: CheckCircle, label: 'Accepted by client', color: 'text-green-400' },
  public_rejected: { icon: XCircle, label: 'Rejected by client', color: 'text-red-400' },
  version_created: { icon: FileText, label: 'Version snapshot created', color: 'text-gray-400' },
  email_sent: { icon: Send, label: 'Email sent', color: 'text-blue-400' },
  reminder_sent: { icon: Send, label: 'Reminder sent', color: 'text-blue-400' },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { icon: Clock, label: action, color: 'text-gray-400' };
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface Props {
  proposalId: string;
  refreshTrigger?: number;
}

const ProposalTimeline: React.FC<Props> = ({ proposalId, refreshTrigger }) => {
  const [activities, setActivities] = useState<ProposalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [proposalId, refreshTrigger]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const result = await getProposalActivities(proposalId);
      setActivities(result.data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-gold" />
          <h2 className="text-lg font-semibold text-white">Activity</h2>
        </div>
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-gold" />
        <h2 className="text-lg font-semibold text-white">Activity</h2>
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-gray-400">No activity recorded yet.</p>
      ) : (
        <div className="space-y-0">
          {activities.map((activity, idx) => {
            const config = getActionConfig(activity.action);
            const Icon = config.icon;
            const isLast = idx === activities.length - 1;

            return (
              <div key={activity.id} className="flex gap-3 relative">
                {/* Vertical line */}
                {!isLast && (
                  <div className="absolute left-[11px] top-[24px] bottom-0 w-px bg-white/10" />
                )}
                {/* Icon */}
                <div className={`mt-0.5 shrink-0 ${config.color}`}>
                  <Icon className="h-[22px] w-[22px]" />
                </div>
                {/* Content */}
                <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
                  <p className="text-sm font-medium text-white">{config.label}</p>
                  <p className="text-xs text-gray-500">
                    {activity.performedByUser
                      ? `by ${activity.performedByUser.fullName}`
                      : 'System'}
                    {' \u00b7 '}
                    {formatDateTime(activity.createdAt)}
                  </p>
                  {activity.action === 'rejected' && activity.metadata?.rejectionReason && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      &ldquo;{activity.metadata.rejectionReason}&rdquo;
                    </p>
                  )}
                  {activity.action === 'sent' && activity.metadata?.emailTo && (
                    <p className="text-xs text-gray-400 mt-1">
                      Sent to {activity.metadata.emailTo}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ProposalTimeline;
