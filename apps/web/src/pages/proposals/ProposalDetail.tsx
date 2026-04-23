import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Edit2,
  Send,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  FileText,
  Building2,
  User,
  Calendar,
  DollarSign,
  Clock,
  Eye,
  RotateCcw,
  Lock,
  Settings,
  Download,
  Link2,
  RefreshCw,
  PenTool,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plus,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import ProposalTimeline from '../../components/proposals/ProposalTimeline';
import ProposalVersionHistory from '../../components/proposals/ProposalVersionHistory';
import SendProposalModal from '../../components/proposals/SendProposalModal';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import {
  getProposal,
  sendProposal,
  remindProposal,
  acceptProposal,
  rejectProposal,
  archiveProposal,
  restoreProposal,
  deleteProposal,
  downloadProposalPdf,
  issueProposalPublicLink,
  updateProposalServiceTasks,
  setProposalPricingApproval,
} from '../../lib/proposals';
import { extractApiErrorMessage } from '../../lib/api';
import type { Proposal, ProposalStatus } from '../../types/proposal';

interface AppliedAreaMultiplier {
  areaId?: string;
  areaName?: string;
  quantity?: number;
  squareFeet?: number;
  floorType?: string | null;
  floorMultiplier?: number;
  conditionLevel?: string | null;
  conditionMultiplier?: number;
  trafficLevel?: string | null;
  trafficMultiplier?: number;
}

type ProposalDetailTab = 'overview' | 'services' | 'activity';

const getStatusVariant = (status: ProposalStatus) => {
  const variants: Record<ProposalStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    sent: 'info',
    viewed: 'warning',
    accepted: 'success',
    rejected: 'error',
    expired: 'default',
  };
  return variants[status];
};

const getStatusIcon = (status: ProposalStatus) => {
  const icons: Record<ProposalStatus, React.ElementType> = {
    draft: FileText,
    sent: Send,
    viewed: Eye,
    accepted: CheckCircle,
    rejected: XCircle,
    expired: Clock,
  };
  return icons[status];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatShortDate = (date: string | null | undefined) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const toTimeString = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
};

const formatPercent = (val: number | undefined | null) => {
  if (val == null) return '0%';
  return `${(val * 100).toFixed(1)}%`;
};

const formatHours = (val: number | undefined | null) => {
  if (val == null || Number.isNaN(Number(val))) return '-';
  return `${Number(val).toFixed(1)} hrs`;
};

const formatFrequencyLabel = (frequency: string | null | undefined): string => {
  if (!frequency) return '';
  const labels: Record<string, string> = {
    '1x_week': '1x Week',
    '2x_week': '2x Week',
    '3x_week': '3x Week',
    '4x_week': '4x Week',
    '5x_week': '5x Week',
    '7x_week': '7x Week',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    annual: 'Annually',
  };
  const key = frequency.trim().toLowerCase();
  return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const getFrequencyCandidates = (frequency: string | null | undefined): string[] => {
  if (!frequency) return [];
  const normalized = frequency.trim().toLowerCase();
  const candidates = new Set<string>([normalized]);
  if (normalized === '7x_week') candidates.add('daily');
  if (normalized === 'daily') candidates.add('7x_week');
  if (normalized === 'annually') candidates.add('annual');
  if (normalized === 'annual') candidates.add('annually');
  return Array.from(candidates);
};

const findAppliedFrequencyMultiplier = (
  frequencyMultipliers: Record<string, number> | null | undefined,
  proposalFrequency: string | null | undefined,
  fallbackServiceFrequency: string | null | undefined
): { key: string; value: number } | null => {
  if (!frequencyMultipliers || Object.keys(frequencyMultipliers).length === 0) return null;
  const entries = Object.entries(frequencyMultipliers).map(([key, value]) => [
    key.trim().toLowerCase(),
    value as number,
  ] as const);
  const byKey = new Map(entries);
  const candidates = [
    ...getFrequencyCandidates(proposalFrequency),
    ...getFrequencyCandidates(fallbackServiceFrequency),
  ];

  for (const candidate of candidates) {
    if (byKey.has(candidate)) {
      return { key: candidate, value: byKey.get(candidate)! };
    }
  }

  return null;
};

interface TaskGroup { key: string; label: string; tasks: string[] }

const TaskGroupStepper = ({
  serviceId,
  groups,
}: {
  serviceId: string;
  groups: TaskGroup[];
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [serviceId, groups.length]);

  if (groups.length === 0) return null;

  const activeGroup = groups[Math.min(activeIndex, groups.length - 1)];

  return (
    <div className="mt-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-black/10 p-3">
      <div className="flex flex-wrap gap-2">
        {groups.map((group, index) => (
          <button
            key={`${serviceId}-${group.key}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              index === activeIndex
                ? 'bg-gold text-navy'
                : 'border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 text-surface-600 dark:text-surface-400 hover:border-surface-300 dark:border-surface-600 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
          {activeGroup.label}
        </p>
        <span className="text-xs text-surface-500">
          {activeIndex + 1} of {groups.length}
        </span>
      </div>
      <ul className="mt-2 space-y-1 ml-1">
        {activeGroup.tasks.map((task, index) => (
          <li key={`${serviceId}-${activeGroup.key}-${index}`} className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
            {task}
          </li>
        ))}
      </ul>
      {groups.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={activeIndex >= groups.length - 1}
            onClick={() => setActiveIndex((current) => Math.min(groups.length - 1, current + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

const TASK_GROUP_ORDER = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'manual'];

const taskGroupLabel = (key: string): string => {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    manual: 'Manual',
  };
  return labels[key] || key;
};

const normalizeTaskGroupKey = (raw: string): string => {
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (key.includes('asneeded') || key.includes('manual')) return 'manual';
  if (key.includes('annual') || key.includes('yearly')) return 'yearly';
  if (key.includes('biweekly')) return 'biweekly';
  if (key.includes('quarterly')) return 'quarterly';
  if (key.includes('monthly')) return 'monthly';
  if (key.includes('weekly')) return 'weekly';
  if (key.includes('daily')) return 'daily';
  return raw.trim().toLowerCase();
};

const isZeroQuantityTask = (task: string): boolean =>
  /\bx\s*0(?:\.0+)?\b/i.test(task.trim());

const buildTaskGroups = (
  description: string | null | undefined,
  includedTasks: string[]
): TaskGroup[] => {
  const grouped = new Map<string, Set<string>>();
  const addTask = (rawLabel: string, taskList: string[]) => {
    const key = normalizeTaskGroupKey(rawLabel);
    if (!grouped.has(key)) grouped.set(key, new Set<string>());
    const bucket = grouped.get(key)!;
    for (const task of taskList.map((value) => value.trim()).filter(Boolean)) {
      if (isZeroQuantityTask(task)) continue;
      bucket.add(task);
    }
  };

  const lines = description?.split('\n') || [];
  for (const line of lines) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (!match) continue;
    addTask(match[1], match[2].split(','));
  }

  const uncategorized: string[] = [];
  for (const taskLine of includedTasks) {
    const match = taskLine.match(/^(.+?):\s*(.+)$/);
    if (match) {
      addTask(match[1], match[2].split(','));
    } else if (taskLine.trim()) {
      if (!isZeroQuantityTask(taskLine)) {
        uncategorized.push(taskLine.trim());
      }
    }
  }

  if (uncategorized.length > 0) {
    addTask('manual', uncategorized);
  }

  return Array.from(grouped.entries())
    .map(([key, tasks]) => ({
      key,
      label: taskGroupLabel(key),
      tasks: Array.from(tasks),
    }))
    .sort((a, b) => {
      const aIndex = TASK_GROUP_ORDER.indexOf(a.key);
      const bIndex = TASK_GROUP_ORDER.indexOf(b.key);
      if (aIndex === -1 && bIndex === -1) return a.label.localeCompare(b.label);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
};

const ProposalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [activityRefresh, setActivityRefresh] = useState(0);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rateCardOpen, setRateCardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProposalDetailTab>('overview');
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWriteProposals = hasPermission(PERMISSIONS.PROPOSALS_WRITE);
  const canAdminProposals = hasPermission(PERMISSIONS.PROPOSALS_ADMIN);
  const canDeleteProposals = hasPermission(PERMISSIONS.PROPOSALS_DELETE);

  // Task quick-edit state
  const [editingService, setEditingService] = useState<{ id: string; serviceName: string } | null>(null);
  const [editTasks, setEditTasks] = useState<string[]>([]);
  const [savingTasks, setSavingTasks] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProposal(id);
    }
  }, [id]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuOpen]);

  const fetchProposal = async (proposalId: string) => {
    try {
      setLoading(true);
      const data = await getProposal(proposalId);
      setProposal(data);
      setActivityRefresh((n) => n + 1);
    } catch (error) {
      console.error('Failed to fetch proposal:', error);
      toast.error('Failed to load proposal');
      navigate('/proposals');
    } finally {
      setLoading(false);
    }
  };

  const openTaskEditor = (service: { id: string; serviceName: string; includedTasks?: string[] | unknown }) => {
    setEditingService(service);
    const tasks = Array.isArray(service.includedTasks) ? service.includedTasks as string[] : [];
    setEditTasks(tasks.length > 0 ? [...tasks] : ['']);
  };

  const handleSaveTasks = async () => {
    if (!proposal || !editingService) return;
    try {
      setSavingTasks(true);
      const cleanTasks = editTasks.map((t) => t.trim()).filter(Boolean);
      await updateProposalServiceTasks(proposal.id, editingService.id, cleanTasks);
      toast.success('Tasks updated');
      setEditingService(null);
      fetchProposal(proposal.id);
    } catch {
      toast.error('Failed to update tasks');
    } finally {
      setSavingTasks(false);
    }
  };

  const handleSend = async (data?: import('../../types/proposal').SendProposalInput) => {
    if (!proposal) return;

    try {
      if (['sent', 'viewed'].includes(proposal.status)) {
        await remindProposal(proposal.id, data);
        toast.success('Reminder sent successfully');
      } else {
        await sendProposal(proposal.id, data);
        toast.success('Proposal sent successfully');
      }
      setSendModalOpen(false);
      fetchProposal(proposal.id);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to send proposal'));
      throw error;
    }
  };

  const handleAccept = async () => {
    if (!proposal || !confirm('Mark this proposal as accepted?')) return;

    try {
      await acceptProposal(proposal.id);
      toast.success('Proposal accepted');
      fetchProposal(proposal.id);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to accept proposal'));
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    try {
      await rejectProposal(proposal.id, { rejectionReason: reason });
      toast.success('Proposal rejected');
      fetchProposal(proposal.id);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to reject proposal'));
    }
  };

  const handlePricingApproval = async (action: 'approved' | 'rejected') => {
    if (!proposal) return;
    const reason = action === 'rejected'
      ? prompt('Please provide a pricing rejection reason:')
      : null;
    if (action === 'rejected' && !reason) return;

    try {
      await setProposalPricingApproval(proposal.id, { action, reason });
      toast.success(action === 'approved' ? 'Pricing approved' : 'Pricing rejected');
      fetchProposal(proposal.id);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to update pricing approval'));
    }
  };

  const handleArchive = async () => {
    if (!proposal || !confirm('Archive this proposal?')) return;

    try {
      await archiveProposal(proposal.id);
      toast.success('Proposal archived');
      fetchProposal(proposal.id);
    } catch (error) {
      toast.error('Failed to archive proposal');
    }
  };

  const handleRestore = async () => {
    if (!proposal) return;

    try {
      await restoreProposal(proposal.id);
      toast.success('Proposal restored');
      fetchProposal(proposal.id);
    } catch (error) {
      toast.error('Failed to restore proposal');
    }
  };

  const handleCopyPublicLink = async () => {
    if (!proposal || !['sent', 'viewed', 'accepted'].includes(proposal.status)) {
      toast.error('Send the proposal first to create a shareable link.');
      return;
    }

    try {
      const url = await issueProposalPublicLink(proposal.id);
      await navigator.clipboard.writeText(url);
      toast.success('Public link copied to clipboard');
    } catch {
      toast.error('Failed to generate public link');
    }
  };

  const handleResend = () => {
    if (!proposal) return;
    setSendModalOpen(true);
  };

  const handleDownloadPdf = async () => {
    if (!proposal) return;
    try {
      await downloadProposalPdf(proposal.id, proposal.proposalNumber);
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleDelete = async () => {
    if (
      !proposal ||
      !confirm(
        'Are you sure you want to permanently delete this proposal? This action cannot be undone.'
      )
    )
      return;

    try {
      await deleteProposal(proposal.id);
      toast.success('Proposal deleted');
      navigate('/proposals');
    } catch (error) {
      toast.error('Failed to delete proposal');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!proposal) {
    return <div className="text-center text-surface-500 dark:text-surface-400">Proposal not found</div>;
  }
  const appliedFrequencyMultiplier = findAppliedFrequencyMultiplier(
    proposal.pricingSnapshot?.frequencyMultipliers as Record<string, number> | undefined,
    proposal.serviceFrequency || null,
    proposal.proposalServices?.[0]?.frequency || null
  );
  const appliedAreaMultipliers = Array.isArray(proposal.pricingSnapshot?.appliedAreaMultipliers)
    ? proposal.pricingSnapshot.appliedAreaMultipliers
    : [];

  const StatusIcon = getStatusIcon(proposal.status);
  const visibleProposalItems = (proposal.proposalItems || []).filter(
    (item) => Number(item.totalPrice || 0) > 0
  );
  const isSpecializedProposal = ['one_time', 'specialized'].includes(proposal.proposalType || '');
  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'services' as const, label: 'Services' },
    { id: 'activity' as const, label: 'Activity' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white truncate">{proposal.title}</h1>
            <Badge variant={getStatusVariant(proposal.status)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </Badge>
            {isSpecializedProposal && (
              <Badge variant="info">Specialized Job</Badge>
            )}
            {proposal.pricingApprovalStatus === 'pending' && (
              <Badge variant="warning">Pricing Approval Required</Badge>
            )}
          </div>
          <p className="text-surface-500 dark:text-surface-400">{proposal.proposalNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Primary actions based on status */}
          {['draft', 'sent', 'viewed', 'rejected'].includes(proposal.status) && canWriteProposals && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/proposals/${id}/edit`)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {proposal.status === 'rejected' ? 'Revise' : 'Edit'}
            </Button>
          )}
          {proposal.status === 'draft' && canWriteProposals && (
            <Button onClick={() => setSendModalOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          )}
          {proposal.pricingApprovalStatus === 'pending' && canAdminProposals && (
            <>
              <Button variant="secondary" onClick={() => handlePricingApproval('rejected')}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject Pricing
              </Button>
              <Button onClick={() => handlePricingApproval('approved')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Pricing
              </Button>
            </>
          )}
          {['sent', 'viewed'].includes(proposal.status) && canWriteProposals && (
            <Button
              onClick={handleAccept}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept
            </Button>
          )}
          {proposal.archivedAt && canAdminProposals && (
            <Button variant="secondary" onClick={handleRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          )}

          {/* More actions dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-800 shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={handleDownloadPdf}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:bg-surface-800/10 hover:text-surface-900 dark:hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                {['sent', 'viewed', 'accepted'].includes(proposal.status) && (
                  <button
                    onClick={handleCopyPublicLink}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:bg-surface-800/10 hover:text-surface-900 dark:hover:text-white"
                  >
                    <Link2 className="h-4 w-4" />
                    Copy Public Link
                  </button>
                )}
                {['sent', 'viewed'].includes(proposal.status) && canWriteProposals && (
                  <>
                    <button
                      onClick={handleResend}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:bg-surface-800/10 hover:text-surface-900 dark:hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resend Email
                    </button>
                    <div className="my-1 border-t border-surface-200 dark:border-surface-700" />
                    <button
                      onClick={handleReject}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-100 dark:bg-surface-800/10 hover:text-red-300"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}
                {!proposal.archivedAt && canAdminProposals && (
                  <>
                    <div className="my-1 border-t border-surface-200 dark:border-surface-700" />
                    <button
                      onClick={handleArchive}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-surface-100 dark:bg-surface-800/10 hover:text-orange-300"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  </>
                )}
                {canDeleteProposals && (
                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-100 dark:bg-surface-800/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Archived Warning */}
      {proposal.archivedAt && (
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
          <div className="flex items-center gap-2 text-orange-400">
            <Archive className="h-5 w-5" />
            <span className="font-medium">This proposal is archived</span>
          </div>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Archived on {formatDate(proposal.archivedAt)}
          </p>
        </div>
      )}

      {/* Status Progress Tracker */}
      {(() => {
        const isRejected = proposal.status === 'rejected';
        const isExpired = proposal.status === 'expired';
        const steps = [
          { label: 'Draft', date: proposal.createdAt, done: true },
          { label: 'Sent', date: proposal.sentAt, done: !!proposal.sentAt },
          { label: 'Viewed', date: proposal.viewedAt, done: !!proposal.viewedAt },
          {
            label: isRejected ? 'Rejected' : 'Accepted',
            date: isRejected ? proposal.rejectedAt : proposal.acceptedAt,
            done: !!proposal.acceptedAt || isRejected,
            rejected: isRejected,
            expired: isExpired && !proposal.acceptedAt && !isRejected,
          },
        ];
        // Find the current (latest completed) step index
        const currentIdx = steps.reduce((acc, s, i) => (s.done ? i : acc), 0);

        return (
          <Card>
            <div className="flex items-center justify-between overflow-x-auto px-2 py-1">
              {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const isCurrent = i === currentIdx && !isExpired;
                return (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center min-w-[56px]">
                      {/* Circle */}
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                          step.rejected
                            ? 'border-red-500 bg-red-500/20 text-red-400'
                            : step.expired
                              ? 'border-surface-300 dark:border-surface-600 bg-surface-600/20 text-surface-500'
                              : step.done
                                ? `border-gold bg-gold/20 text-gold ${isCurrent ? 'ring-2 ring-gold/40 ring-offset-2 ring-offset-surface-800' : ''}`
                                : 'border-surface-300 dark:border-surface-600 bg-transparent text-surface-600'
                        }`}
                      >
                        {step.rejected ? (
                          <XCircle className="h-4 w-4" />
                        ) : step.done ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-surface-600" />
                        )}
                      </div>
                      {/* Label */}
                      <span
                        className={`mt-1.5 text-xs font-medium ${
                          step.rejected
                            ? 'text-red-400'
                            : step.expired
                              ? 'text-surface-500'
                              : step.done
                                ? 'text-surface-900 dark:text-white'
                                : 'text-surface-500'
                        }`}
                      >
                        {step.label}
                      </span>
                      {/* Date */}
                      <span className="text-[10px] text-surface-500 mt-0.5">
                        {step.done && step.date ? formatShortDate(step.date) : '\u00A0'}
                      </span>
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div
                        className={`h-0.5 flex-1 mx-1 mt-[-18px] ${
                          steps[i + 1]?.done
                            ? steps[i + 1]?.rejected
                              ? 'bg-red-500/50'
                              : 'bg-gold/60'
                            : 'bg-surface-700'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {isRejected && proposal.rejectionReason && (
              <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                Rejection reason: {proposal.rejectionReason}
              </div>
            )}
            {isExpired && (
              <div className="mt-2 rounded-md bg-surface-500/10 border border-surface-500/20 px-3 py-2 text-sm text-surface-500 dark:text-surface-400">
                This proposal has expired
              </div>
            )}
          </Card>
        );
      })()}

      <div className="flex gap-1 border-b border-surface-200 dark:border-surface-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <Card>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Details</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-1 h-4 w-4 text-surface-500 dark:text-surface-400" />
                    <div>
                      <div className="text-sm text-surface-500 dark:text-surface-400">Account</div>
                      <div className="text-surface-900 dark:text-white">{proposal.account.name}</div>
                    </div>
                  </div>

                  {proposal.facility && (
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-1 h-4 w-4 text-surface-500 dark:text-surface-400" />
                      <div>
                        <div className="text-sm text-surface-500 dark:text-surface-400">Service Location</div>
                        <div className="text-surface-900 dark:text-white">{proposal.facility.name}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <User className="mt-1 h-4 w-4 text-surface-500 dark:text-surface-400" />
                    <div>
                      <div className="text-sm text-surface-500 dark:text-surface-400">Created By</div>
                      <div className="text-surface-900 dark:text-white">{proposal.createdByUser.fullName}</div>
                      <div className="text-xs text-surface-500">
                        {proposal.createdByUser.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="mt-1 h-4 w-4 text-surface-500 dark:text-surface-400" />
                    <div>
                      <div className="text-sm text-surface-500 dark:text-surface-400">Valid Until</div>
                      <div className="text-surface-900 dark:text-white">{formatDate(proposal.validUntil)}</div>
                    </div>
                  </div>

                  {isSpecializedProposal && (
                    <div className="flex items-start gap-3">
                      <Clock className="mt-1 h-4 w-4 text-surface-500 dark:text-surface-400" />
                      <div>
                        <div className="text-sm text-surface-500 dark:text-surface-400">Scheduled Job</div>
                        <div className="text-surface-900 dark:text-white">
                          {formatDate(proposal.scheduledDate)}{' '}
                          {proposal.scheduledStartTime ? toTimeString(proposal.scheduledStartTime) : ''}
                          {proposal.scheduledEndTime ? ` - ${toTimeString(proposal.scheduledEndTime)}` : ''}
                        </div>
                      </div>
                    </div>
                  )}

                  {proposal.pricingPlanId && (
                    <div className="flex items-start gap-3">
                      <Settings className="mt-1 h-4 w-4 text-surface-500 dark:text-surface-400" />
                      <div>
                        <div className="text-sm text-surface-500 dark:text-surface-400">Pricing Plan</div>
                        <div className="text-surface-900 dark:text-white flex items-center gap-2">
                          {proposal.pricingSnapshot?.pricingPlanName || proposal.pricingPlanId}
                          {proposal.pricingLocked && (
                            <Badge variant="warning" className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Locked
                            </Badge>
                          )}
                        </div>
                        {proposal.pricingSnapshot?.pricingType && (
                          <div className="text-xs text-surface-500">
                            Type: {proposal.pricingSnapshot.pricingType === 'hourly' ? 'Hourly' : 'Per Sq Ft'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {proposal.signatureName && (
                    <div className="flex items-start gap-3">
                      <PenTool className="mt-1 h-4 w-4 text-green-400" />
                      <div>
                        <div className="text-sm text-surface-500 dark:text-surface-400">Signed By</div>
                        <div className="text-surface-900 dark:text-white">{proposal.signatureName}</div>
                        {proposal.signatureDate && (
                          <div className="text-xs text-surface-500">
                            {formatDate(proposal.signatureDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {['sent', 'viewed', 'accepted'].includes(proposal.status) && (
                    <div className="flex items-start gap-3">
                      <Link2 className="mt-1 h-4 w-4 text-surface-500 dark:text-surface-400" />
                      <div>
                        <div className="text-sm text-surface-500 dark:text-surface-400">Public Link</div>
                        <button
                          onClick={handleCopyPublicLink}
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          Click to copy
                        </button>
                        {proposal.publicTokenExpiresAt && (
                          <div className="text-xs text-surface-500">
                            Expires {formatDate(proposal.publicTokenExpiresAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-gold" />
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Financial Summary</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500 dark:text-surface-400">Subtotal:</span>
                    <span className="text-surface-900 dark:text-white font-medium">
                      {formatCurrency(Number(proposal.subtotal) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500 dark:text-surface-400">
                      Tax ({((Number(proposal.taxRate) || 0) * 100).toFixed(1)}%):
                    </span>
                    <span className="text-surface-900 dark:text-white font-medium">
                      {formatCurrency(Number(proposal.taxAmount) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t border-surface-200 dark:border-surface-700 pt-3">
                    <span className="text-surface-900 dark:text-white">Total:</span>
                    <span className="text-emerald">{formatCurrency(Number(proposal.totalAmount) || 0)}</span>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Proposal Services (Areas) */}
          {activeTab === 'services' && proposal.proposalServices && proposal.proposalServices.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Services</h2>
              <div className="space-y-6">
                {proposal.proposalServices.map((service, idx) => {
                  const includedTasks = Array.isArray(service.includedTasks)
                    ? (service.includedTasks as string[])
                    : [];
                  const lines = service.description?.split('\n') || [];
                  const areaInfo = lines[0] || '';
                  const taskGroups = buildTaskGroups(service.description, includedTasks);

                  return (
                    <div
                      key={idx}
                      className="border-b border-surface-200 dark:border-surface-700 pb-5 last:border-0 last:pb-0"
                    >
                      {/* Area header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-surface-900 dark:text-white text-base">{service.serviceName}</h3>
                          {canWriteProposals && (
                            <button
                              onClick={() => {
                                if (!service.id) return;
                                openTaskEditor({
                                  id: service.id,
                                  serviceName: service.serviceName,
                                  includedTasks: service.includedTasks,
                                });
                              }}
                              className="text-surface-500 hover:text-surface-600 dark:text-surface-400 transition-colors"
                              title="Edit tasks"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-emerald">
                            {formatCurrency(Number(service.monthlyPrice) || 0)}/month
                          </div>
                          {service.estimatedHours && service.hourlyRate && (
                            <div className="text-sm text-surface-500 dark:text-surface-400">
                              {service.estimatedHours} hrs x{' '}
                              {formatCurrency(service.hourlyRate)}/hr
                            </div>
                          )}
                        </div>
                      </div>

                      {areaInfo && (
                        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{areaInfo}</p>
                      )}

                      {/* Tasks grouped by category/frequency */}
                      <TaskGroupStepper serviceId={service.id || String(idx)} groups={taskGroups} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeTab === 'services' && visibleProposalItems.length > 0 && (
            <Card noPadding>
              <div className="p-6 border-b border-surface-200 dark:border-surface-700">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-100 dark:bg-surface-800/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Unit Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {visibleProposalItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-100 dark:bg-surface-800/10">
                        <td className="px-6 py-4">
                          <Badge variant="default">
                            {item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{item.description}</td>
                        <td className="px-6 py-4 text-right text-surface-600 dark:text-surface-400">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-surface-600 dark:text-surface-400">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-6 py-4 text-right font-medium text-surface-900 dark:text-white">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pricing Breakdown */}
          {activeTab === 'overview' && proposal.pricingSnapshot && (() => {
            const pricingSnapshot = proposal.pricingSnapshot;
            return (
            <Card>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Pricing Breakdown</h2>

              {/* Strategy header row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-surface-100 dark:bg-surface-800/10 p-3 mb-4">
                <div>
                  <div className="text-xs text-surface-500 dark:text-surface-400">Strategy</div>
                  <div className="text-sm font-medium text-surface-900 dark:text-white">
                    {pricingSnapshot.pricingBasis === 'sqft_price_with_derived_hours'
                      ? 'Per Sq Ft + Derived Hours'
                      : pricingSnapshot.pricingType === 'hourly'
                        ? 'Per Hour v1'
                        : 'Per Sq Ft v1'}
                  </div>
                </div>
                {pricingSnapshot.hourlyRate != null && (
                  <div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">Hourly Rate</div>
                    <div className="text-sm font-medium text-surface-900 dark:text-white">
                      {formatCurrency(pricingSnapshot.hourlyRate)}
                    </div>
                  </div>
                )}
                {pricingSnapshot.targetProfitMargin != null && (
                  <div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">Profit Margin</div>
                    <div className="text-sm font-medium text-surface-900 dark:text-white">
                      {formatPercent(pricingSnapshot.targetProfitMargin)}
                    </div>
                  </div>
                )}
              </div>

              {pricingSnapshot.operationalEstimate && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 mb-4">
                  <div className="text-sm font-semibold text-blue-200 mb-2">Client Service Time Estimate</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-blue-200/80">Estimated Time On Site</div>
                      <div className="text-surface-900 dark:text-white font-medium">
                        {formatHours(pricingSnapshot.operationalEstimate.durationRangePerVisit?.minHours)}
                        {' - '}
                        {formatHours(pricingSnapshot.operationalEstimate.durationRangePerVisit?.maxHours)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-200/80">Crew Size Assumption</div>
                      <div className="text-surface-900 dark:text-white font-medium">
                        {pricingSnapshot.operationalEstimate.recommendedCrewSize || 1} cleaners
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-200/80">Labor Hours / Visit</div>
                      <div className="text-surface-900 dark:text-white font-medium">
                        {formatHours(pricingSnapshot.operationalEstimate.hoursPerVisit)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-100/80 mt-2">
                    Duration is an operational estimate and may vary by site conditions.
                  </div>
                </div>
              )}

              {/* Cost stack */}
              {pricingSnapshot.pricingType === 'hourly' && (() => {
                const laborCostPerHour = pricingSnapshot.laborCostPerHour ?? 0;
                const hourlyRate = pricingSnapshot.hourlyRate ?? 0;
                return (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2">Cost Stack (per labor hour)</h3>
                  <div className="space-y-1.5 text-sm">
                    {pricingSnapshot.laborCostPerHour != null && (
                      <div className="flex justify-between">
                        <span className="text-surface-500 dark:text-surface-400">Labor Cost</span>
                        <span className="text-surface-900 dark:text-white">{formatCurrency(laborCostPerHour)}/hr</span>
                      </div>
                    )}
                    {pricingSnapshot.laborBurdenPercentage != null && (
                      <div className="flex justify-between">
                        <span className="text-surface-500 dark:text-surface-400">Labor Burden ({formatPercent(pricingSnapshot.laborBurdenPercentage)})</span>
                        <span className="text-surface-900 dark:text-white">
                          {formatCurrency(laborCostPerHour * pricingSnapshot.laborBurdenPercentage)}/hr
                        </span>
                      </div>
                    )}
                    {pricingSnapshot.insurancePercentage != null && pricingSnapshot.insurancePercentage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-surface-500 dark:text-surface-400">Insurance ({formatPercent(pricingSnapshot.insurancePercentage)})</span>
                        <span className="text-surface-900 dark:text-white">
                          {formatCurrency(laborCostPerHour * pricingSnapshot.insurancePercentage)}/hr
                        </span>
                      </div>
                    )}
                    {pricingSnapshot.adminOverheadPercentage != null && pricingSnapshot.adminOverheadPercentage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-surface-500 dark:text-surface-400">Admin Overhead ({formatPercent(pricingSnapshot.adminOverheadPercentage)})</span>
                        <span className="text-surface-900 dark:text-white">
                          {formatCurrency(laborCostPerHour * pricingSnapshot.adminOverheadPercentage)}/hr
                        </span>
                      </div>
                    )}
                    {pricingSnapshot.equipmentPercentage != null && pricingSnapshot.equipmentPercentage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-surface-500 dark:text-surface-400">Equipment ({formatPercent(pricingSnapshot.equipmentPercentage)})</span>
                        <span className="text-surface-900 dark:text-white">
                          {formatCurrency(laborCostPerHour * pricingSnapshot.equipmentPercentage)}/hr
                        </span>
                      </div>
                    )}
                    {pricingSnapshot.supplyCostPercentage != null && pricingSnapshot.supplyCostPercentage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-surface-500 dark:text-surface-400">Supplies ({formatPercent(pricingSnapshot.supplyCostPercentage)})</span>
                        <span className="text-surface-900 dark:text-white">
                          {formatCurrency(laborCostPerHour * pricingSnapshot.supplyCostPercentage)}/hr
                        </span>
                      </div>
                    )}
                    {pricingSnapshot.travelCostPerVisit != null && pricingSnapshot.travelCostPerVisit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-surface-500 dark:text-surface-400">Travel (per visit)</span>
                        <span className="text-surface-900 dark:text-white">{formatCurrency(pricingSnapshot.travelCostPerVisit)}</span>
                      </div>
                    )}
                    <div className="border-t border-surface-200 dark:border-surface-700 pt-1.5 mt-1.5">
                      <div className="flex justify-between font-medium">
                        <span className="text-surface-600 dark:text-surface-400">Loaded Rate</span>
                        <span className="text-surface-900 dark:text-white">
                          {formatCurrency(hourlyRate)}/hr
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })()}

              {/* Monthly summary */}
              {proposal.proposalServices && proposal.proposalServices.length > 0 && (
                <div className="rounded-lg bg-surface-100 dark:bg-surface-800/10 p-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500 dark:text-surface-400">Monthly Subtotal</span>
                    <span className="text-surface-900 dark:text-white font-medium">{formatCurrency(Number(proposal.subtotal) || 0)}</span>
                  </div>
                  {(Number(pricingSnapshot.minimumMonthlyCharge) || 0) > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-surface-500 dark:text-surface-400">Minimum Monthly Charge</span>
                      <span className="text-surface-900 dark:text-white">{formatCurrency(Number(pricingSnapshot.minimumMonthlyCharge) || 0)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-emerald/30 bg-emerald/10 p-3 mb-4">
                <div className="text-sm font-semibold text-emerald-200 mb-2">Applied Multipliers</div>
                <div className="space-y-1 text-sm">
                  {appliedFrequencyMultiplier ? (
                    <div className="flex justify-between">
                      <span className="text-emerald-100/90">
                        Frequency ({formatFrequencyLabel(appliedFrequencyMultiplier.key)})
                      </span>
                      <span className="text-surface-900 dark:text-white font-semibold">{appliedFrequencyMultiplier.value.toFixed(2)}x</span>
                    </div>
                  ) : (
                    <div className="text-emerald-100/90">
                      Frequency multiplier could not be derived from this snapshot.
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Area Multiplier Review */}
              <button
                onClick={() => setRateCardOpen(!rateCardOpen)}
                className="flex w-full items-center justify-between rounded-lg bg-surface-100 dark:bg-surface-800/10 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:bg-surface-800/20 transition-colors"
              >
                <span>Area Multiplier Review</span>
                {rateCardOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {rateCardOpen && (
                <div className="mt-3 space-y-4 text-sm">
                  {appliedAreaMultipliers.length === 0 ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      This proposal snapshot does not include per-area multiplier usage. Recalculate pricing to generate area-level review data.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700">
                      <table className="w-full min-w-[700px] text-sm">
                        <thead className="bg-surface-100 dark:bg-surface-800/10">
                          <tr className="text-xs uppercase tracking-wider text-surface-500 dark:text-surface-400">
                            <th className="px-3 py-2 text-left font-medium">Area</th>
                            <th className="px-3 py-2 text-right font-medium">Sq Ft</th>
                            <th className="px-3 py-2 text-left font-medium">Floor</th>
                            <th className="px-3 py-2 text-left font-medium">Condition</th>
                            <th className="px-3 py-2 text-left font-medium">Traffic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                          {appliedAreaMultipliers.map((area: AppliedAreaMultiplier, index: number) => (
                            <tr key={`${area.areaId || area.areaName || 'area'}-${index}`} className="bg-surface-50/[0.02]">
                              <td className="px-3 py-2 text-surface-900 dark:text-white">
                                {area.areaName || 'Area'}
                                {Number(area.quantity || 1) > 1 && (
                                  <span className="ml-1 text-xs text-surface-500 dark:text-surface-400">(x{Number(area.quantity)})</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-surface-600 dark:text-surface-400">{Number(area.squareFeet || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-surface-600 dark:text-surface-400">
                                <span className="capitalize">{String(area.floorType || '').replace(/_/g, ' ')}</span>
                                <span className="ml-2 inline-flex rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-200">
                                  {Number(area.floorMultiplier || 1).toFixed(2)}x
                                </span>
                              </td>
                              <td className="px-3 py-2 text-surface-600 dark:text-surface-400">
                                <span className="capitalize">{String(area.conditionLevel || '').replace(/_/g, ' ')}</span>
                                <span className="ml-2 inline-flex rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-200">
                                  {Number(area.conditionMultiplier || 1).toFixed(2)}x
                                </span>
                              </td>
                              <td className="px-3 py-2 text-surface-600 dark:text-surface-400">
                                {area.trafficLevel ? (
                                  <>
                                    <span className="capitalize">{String(area.trafficLevel).replace(/_/g, ' ')}</span>
                                    <span className="ml-2 inline-flex rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-200">
                                      {Number(area.trafficMultiplier || 1).toFixed(2)}x
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-surface-500">n/a</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Snapshot timestamp */}
              {pricingSnapshot.capturedAt && (
                <div className="mt-3 text-xs text-surface-500">
                  Pricing snapshot captured {formatDate(pricingSnapshot.capturedAt)}
                </div>
              )}
            </Card>
            );
          })()}

          {activeTab === 'overview' && proposal.description && (
            <Card>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Description</h2>
              <p className="text-surface-600 dark:text-surface-400 whitespace-pre-wrap">{proposal.description}</p>
            </Card>
          )}

          {/* Facility & Areas */}
          {activeTab === 'services' && proposal.facility && proposal.proposalServices && proposal.proposalServices.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Facility & Areas</h2>

              {/* Facility header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-surface-900 dark:text-white font-medium">
                  <Building2 className="h-4 w-4 text-surface-500 dark:text-surface-400" />
                  {proposal.facility.name}
                </div>
                {proposal.facility.address && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-surface-500 dark:text-surface-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {typeof proposal.facility.address === 'string'
                      ? proposal.facility.address
                      : [
                          proposal.facility.address.street,
                          proposal.facility.address.city,
                          proposal.facility.address.state,
                          proposal.facility.address.zip,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                  </div>
                )}
              </div>

              {/* Areas table */}
              {(() => {
                const showHoursColumn = proposal.proposalServices.some(
                  (service) => service.estimatedHours != null && Number(service.estimatedHours) > 0
                );
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-700">
                          <th className="pb-2 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Area</th>
                          {showHoursColumn && (
                            <th className="pb-2 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Hours</th>
                          )}
                          <th className="pb-2 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Frequency</th>
                          <th className="pb-2 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase">Monthly</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                        {proposal.proposalServices.map((svc, idx) => (
                          <tr key={idx} className="hover:bg-surface-100 dark:bg-surface-800/10">
                            <td className="py-2 text-surface-600 dark:text-surface-400">{svc.serviceName}</td>
                            {showHoursColumn && (
                              <td className="py-2 text-right text-surface-600 dark:text-surface-400">
                                {svc.estimatedHours != null ? `${svc.estimatedHours} hrs` : '-'}
                              </td>
                            )}
                            <td className="py-2 text-right">
                              <span className="text-surface-600 dark:text-surface-400">
                                {formatFrequencyLabel(proposal.serviceFrequency || svc.frequency || svc.serviceType)}
                              </span>
                            </td>
                            <td className="py-2 text-right font-medium text-surface-900 dark:text-white">
                              {formatCurrency(Number(svc.monthlyPrice) || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-surface-200 dark:border-surface-700">
                          <td className="pt-2 font-medium text-surface-900 dark:text-white">Total</td>
                          {showHoursColumn && (
                            <td className="pt-2 text-right text-surface-600 dark:text-surface-400">
                              {proposal.proposalServices.reduce((sum, s) => sum + (Number(s.estimatedHours) || 0), 0)} hrs
                            </td>
                          )}
                          <td />
                          <td className="pt-2 text-right font-semibold text-emerald">
                            {formatCurrency(proposal.proposalServices.reduce((sum, s) => sum + (Number(s.monthlyPrice) || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Notes */}
          {activeTab === 'overview' && proposal.notes && (
            <Card>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Internal Notes</h2>
              <p className="text-surface-600 dark:text-surface-400 whitespace-pre-wrap">{proposal.notes}</p>
            </Card>
          )}

          {activeTab === 'activity' && (
            <>
              <ProposalVersionHistory proposalId={proposal.id} refreshTrigger={activityRefresh} />
              <ProposalTimeline proposalId={proposal.id} refreshTrigger={activityRefresh} />
            </>
          )}
        </div>

      </div>

      {/* Send Proposal Modal */}
      {['draft', 'sent', 'viewed'].includes(proposal.status) && canWriteProposals && (
        <SendProposalModal
          isOpen={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          proposal={proposal}
          onSend={handleSend}
        />
      )}

      {/* Task Quick-Edit Modal */}
      <Drawer
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title={`Edit Tasks - ${editingService?.serviceName || ''}`}
        size="lg"
      >
        <div className="space-y-3">
          {editTasks.map((task, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={task}
                onChange={(e) => {
                  const updated = [...editTasks];
                  updated[idx] = e.target.value;
                  setEditTasks(updated);
                }}
                placeholder={`Task ${idx + 1}`}
              />
              <button
                onClick={() => setEditTasks(editTasks.filter((_, i) => i !== idx))}
                className="shrink-0 text-surface-400 hover:text-danger-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setEditTasks([...editTasks, ''])}
            className="flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </button>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setEditingService(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTasks} isLoading={savingTasks}>
              Save Tasks
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default ProposalDetail;
