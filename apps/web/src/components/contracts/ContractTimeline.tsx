import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Archive,
  RotateCcw,
  RefreshCw,
  Edit2,
  Users,
  FileSignature,
  PlayCircle,
  Sparkles,
  FileDown,
  Clock,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { getContractActivities } from '../../lib/contracts';

interface ContractActivity {
  id: string;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
  performedByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created: { icon: FileText, label: 'Contract created', color: 'text-gray-400' },
  updated: { icon: Edit2, label: 'Contract updated', color: 'text-blue-400' },
  status_changed: { icon: PlayCircle, label: 'Status changed', color: 'text-yellow-400' },
  signed: { icon: FileSignature, label: 'Contract signed', color: 'text-purple-400' },
  activated: { icon: CheckCircle, label: 'Contract activated', color: 'text-green-400' },
  terminated: { icon: XCircle, label: 'Contract terminated', color: 'text-red-400' },
  renewed: { icon: RefreshCw, label: 'Contract renewed', color: 'text-blue-400' },
  archived: { icon: Archive, label: 'Contract archived', color: 'text-orange-400' },
  restored: { icon: RotateCcw, label: 'Contract restored', color: 'text-blue-400' },
  team_assigned: { icon: Users, label: 'Team assigned', color: 'text-teal-400' },
  initial_clean_completed: { icon: Sparkles, label: 'Initial clean completed', color: 'text-emerald-400' },
  pdf_generated: { icon: FileDown, label: 'PDF generated', color: 'text-gray-400' },
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
  contractId: string;
  refreshTrigger?: number;
}

const ContractTimeline: React.FC<Props> = ({ contractId, refreshTrigger }) => {
  const [activities, setActivities] = useState<ContractActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [contractId, refreshTrigger]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const result = await getContractActivities(contractId);
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
                  {activity.action === 'status_changed' && activity.metadata?.newStatus && (
                    <p className="text-xs text-gray-400 mt-1">
                      New status: {activity.metadata.newStatus.replace('_', ' ')}
                    </p>
                  )}
                  {activity.action === 'terminated' && activity.metadata?.reason && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      &ldquo;{activity.metadata.reason}&rdquo;
                    </p>
                  )}
                  {activity.action === 'signed' && activity.metadata?.signedByName && (
                    <p className="text-xs text-gray-400 mt-1">
                      Signed by {activity.metadata.signedByName}
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

export default ContractTimeline;
