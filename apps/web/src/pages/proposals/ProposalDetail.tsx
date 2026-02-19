import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
import { Modal } from '../../components/ui/Modal';
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
  updateProposalServiceTasks,
} from '../../lib/proposals';
import type { Proposal, ProposalStatus } from '../../types/proposal';

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

const formatPercent = (val: number | undefined | null) => {
  if (val == null) return '0%';
  return `${(val * 100).toFixed(1)}%`;
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

  const handleSend = async (data?: any) => {
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send proposal');
      throw error;
    }
  };

  const handleAccept = async () => {
    if (!proposal || !confirm('Mark this proposal as accepted?')) return;

    try {
      await acceptProposal(proposal.id);
      toast.success('Proposal accepted');
      fetchProposal(proposal.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to accept proposal');
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject proposal');
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
    if (!proposal?.publicToken) {
      toast.error('No public link available. Send the proposal first.');
      return;
    }
    const url = `${window.location.origin}/p/${proposal.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Public link copied to clipboard');
    } catch {
      // Fallback for non-HTTPS
      prompt('Copy this link:', url);
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
    return <div className="text-center text-gray-400">Proposal not found</div>;
  }

  const StatusIcon = getStatusIcon(proposal.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/proposals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white truncate">{proposal.title}</h1>
            <Badge variant={getStatusVariant(proposal.status)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </Badge>
          </div>
          <p className="text-gray-400">{proposal.proposalNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Primary actions based on status */}
          {['draft', 'sent', 'viewed'].includes(proposal.status) && canWriteProposals && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/proposals/${id}/edit`)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {proposal.status === 'draft' && canWriteProposals && (
            <Button onClick={() => setSendModalOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
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
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-white/10 bg-surface-800 shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={handleDownloadPdf}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                {proposal.publicToken && (
                  <button
                    onClick={handleCopyPublicLink}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    <Link2 className="h-4 w-4" />
                    Copy Public Link
                  </button>
                )}
                {['sent', 'viewed'].includes(proposal.status) && canWriteProposals && (
                  <>
                    <button
                      onClick={handleResend}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resend Email
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={handleReject}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}
                {!proposal.archivedAt && canAdminProposals && (
                  <>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={handleArchive}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-white/5 hover:text-orange-300"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  </>
                )}
                {canDeleteProposals && (
                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300"
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
          <p className="mt-1 text-sm text-gray-400">
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
                    <div className="flex flex-col items-center min-w-[64px]">
                      {/* Circle */}
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                          step.rejected
                            ? 'border-red-500 bg-red-500/20 text-red-400'
                            : step.expired
                              ? 'border-gray-600 bg-gray-600/20 text-gray-500'
                              : step.done
                                ? `border-gold bg-gold/20 text-gold ${isCurrent ? 'ring-2 ring-gold/40 ring-offset-2 ring-offset-surface-800' : ''}`
                                : 'border-gray-600 bg-transparent text-gray-600'
                        }`}
                      >
                        {step.rejected ? (
                          <XCircle className="h-4 w-4" />
                        ) : step.done ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-gray-600" />
                        )}
                      </div>
                      {/* Label */}
                      <span
                        className={`mt-1.5 text-xs font-medium ${
                          step.rejected
                            ? 'text-red-400'
                            : step.expired
                              ? 'text-gray-500'
                              : step.done
                                ? 'text-white'
                                : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </span>
                      {/* Date */}
                      <span className="text-[10px] text-gray-500 mt-0.5">
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
                            : 'bg-gray-700'
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
              <div className="mt-2 rounded-md bg-gray-500/10 border border-gray-500/20 px-3 py-2 text-sm text-gray-400">
                This proposal has expired
              </div>
            )}
          </Card>
        );
      })()}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {proposal.description && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{proposal.description}</p>
            </Card>
          )}

          {/* Proposal Items */}
          {proposal.proposalItems && proposal.proposalItems.length > 0 && (
            <Card noPadding>
              <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {proposal.proposalItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="px-6 py-4">
                          <Badge variant="default">
                            {item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{item.description}</td>
                        <td className="px-6 py-4 text-right text-gray-300">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-300">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-white">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Proposal Services (Areas) */}
          {proposal.proposalServices && proposal.proposalServices.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Services</h2>
              <div className="space-y-6">
                {proposal.proposalServices.map((service, idx) => {
                  // Prefer includedTasks array; fall back to parsing description
                  const hasIncludedTasks = Array.isArray(service.includedTasks) && (service.includedTasks as string[]).length > 0;
                  const lines = service.description?.split('\n') || [];
                  const areaInfo = lines[0] || '';
                  const taskGroups: { label: string; tasks: string[] }[] = [];
                  if (!hasIncludedTasks) {
                    for (let i = 1; i < lines.length; i++) {
                      const match = lines[i].match(/^(.+?):\s*(.+)$/);
                      if (match) {
                        taskGroups.push({
                          label: match[1].trim(),
                          tasks: match[2].split(',').map((t) => t.trim()).filter(Boolean),
                        });
                      }
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className="border-b border-white/10 pb-5 last:border-0 last:pb-0"
                    >
                      {/* Area header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white text-base">{service.serviceName}</h3>
                          {canWriteProposals && (
                            <button
                              onClick={() => openTaskEditor(service)}
                              className="text-gray-500 hover:text-gray-300 transition-colors"
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
                            <div className="text-sm text-gray-400">
                              {service.estimatedHours} hrs x{' '}
                              {formatCurrency(service.hourlyRate)}/hr
                            </div>
                          )}
                        </div>
                      </div>

                      {areaInfo && (
                        <p className="text-sm text-gray-400 mt-1">{areaInfo}</p>
                      )}

                      {/* Prefer includedTasks array */}
                      {hasIncludedTasks && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Included Tasks
                          </p>
                          <ul className="space-y-1 ml-1">
                            {(service.includedTasks as string[]).map((task, tIdx) => (
                              <li key={tIdx} className="flex items-start gap-2 text-sm text-gray-300">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Fallback: Tasks grouped by frequency from description */}
                      {!hasIncludedTasks && taskGroups.length > 0 && (
                        <div className="mt-3 space-y-3">
                          {taskGroups.map((group, gIdx) => (
                            <div key={gIdx}>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                {group.label}
                              </p>
                              <ul className="space-y-1 ml-1">
                                {group.tasks.map((task, tIdx) => (
                                  <li key={tIdx} className="flex items-start gap-2 text-sm text-gray-300">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
                                    {task}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Pricing Breakdown */}
          {proposal.pricingSnapshot && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Pricing Breakdown</h2>

              {/* Strategy header row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-white/5 p-3 mb-4">
                <div>
                  <div className="text-xs text-gray-400">Strategy</div>
                  <div className="text-sm font-medium text-white">
                    {proposal.pricingSnapshot.pricingType === 'hourly' ? 'Per Hour v1' : 'Per Sq Ft v1'}
                  </div>
                </div>
                {proposal.pricingSnapshot.hourlyRate != null && (
                  <div>
                    <div className="text-xs text-gray-400">Hourly Rate</div>
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(proposal.pricingSnapshot.hourlyRate)}
                    </div>
                  </div>
                )}
                {proposal.pricingSnapshot.targetProfitMargin != null && (
                  <div>
                    <div className="text-xs text-gray-400">Profit Margin</div>
                    <div className="text-sm font-medium text-white">
                      {formatPercent(proposal.pricingSnapshot.targetProfitMargin)}
                    </div>
                  </div>
                )}
              </div>

              {/* Cost stack */}
              {proposal.pricingSnapshot.pricingType === 'hourly' && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Cost Stack (per labor hour)</h3>
                  <div className="space-y-1.5 text-sm">
                    {proposal.pricingSnapshot.laborCostPerHour != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Labor Cost</span>
                        <span className="text-white">{formatCurrency(proposal.pricingSnapshot.laborCostPerHour)}/hr</span>
                      </div>
                    )}
                    {proposal.pricingSnapshot.laborBurdenPercentage != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Labor Burden ({formatPercent(proposal.pricingSnapshot.laborBurdenPercentage)})</span>
                        <span className="text-white">
                          {formatCurrency(proposal.pricingSnapshot.laborCostPerHour * proposal.pricingSnapshot.laborBurdenPercentage)}/hr
                        </span>
                      </div>
                    )}
                    {proposal.pricingSnapshot.insurancePercentage != null && proposal.pricingSnapshot.insurancePercentage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Insurance ({formatPercent(proposal.pricingSnapshot.insurancePercentage)})</span>
                        <span className="text-white">
                          {formatCurrency(proposal.pricingSnapshot.laborCostPerHour * proposal.pricingSnapshot.insurancePercentage)}/hr
                        </span>
                      </div>
                    )}
                    {proposal.pricingSnapshot.adminOverheadPercentage != null && proposal.pricingSnapshot.adminOverheadPercentage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Admin Overhead ({formatPercent(proposal.pricingSnapshot.adminOverheadPercentage)})</span>
                        <span className="text-white">
                          {formatCurrency(proposal.pricingSnapshot.laborCostPerHour * proposal.pricingSnapshot.adminOverheadPercentage)}/hr
                        </span>
                      </div>
                    )}
                    {proposal.pricingSnapshot.equipmentPercentage != null && proposal.pricingSnapshot.equipmentPercentage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Equipment ({formatPercent(proposal.pricingSnapshot.equipmentPercentage)})</span>
                        <span className="text-white">
                          {formatCurrency(proposal.pricingSnapshot.laborCostPerHour * proposal.pricingSnapshot.equipmentPercentage)}/hr
                        </span>
                      </div>
                    )}
                    {proposal.pricingSnapshot.supplyCostPercentage != null && proposal.pricingSnapshot.supplyCostPercentage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Supplies ({formatPercent(proposal.pricingSnapshot.supplyCostPercentage)})</span>
                        <span className="text-white">
                          {formatCurrency(proposal.pricingSnapshot.laborCostPerHour * proposal.pricingSnapshot.supplyCostPercentage)}/hr
                        </span>
                      </div>
                    )}
                    {proposal.pricingSnapshot.travelCostPerVisit != null && proposal.pricingSnapshot.travelCostPerVisit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Travel (per visit)</span>
                        <span className="text-white">{formatCurrency(proposal.pricingSnapshot.travelCostPerVisit)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-1.5 mt-1.5">
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-300">Loaded Rate</span>
                        <span className="text-white">
                          {formatCurrency(proposal.pricingSnapshot.hourlyRate)}/hr
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly summary */}
              {proposal.proposalServices && proposal.proposalServices.length > 0 && (
                <div className="rounded-lg bg-white/5 p-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Monthly Subtotal</span>
                    <span className="text-white font-medium">{formatCurrency(Number(proposal.subtotal) || 0)}</span>
                  </div>
                  {(Number(proposal.pricingSnapshot.minimumMonthlyCharge) || 0) > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-400">Minimum Monthly Charge</span>
                      <span className="text-white">{formatCurrency(Number(proposal.pricingSnapshot.minimumMonthlyCharge) || 0)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Rate Card */}
              <button
                onClick={() => setRateCardOpen(!rateCardOpen)}
                className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors"
              >
                <span>Rate Card (Multipliers)</span>
                {rateCardOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {rateCardOpen && (
                <div className="mt-3 space-y-4 text-sm">
                  {/* Frequency multipliers */}
                  {proposal.pricingSnapshot.frequencyMultipliers && Object.keys(proposal.pricingSnapshot.frequencyMultipliers).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Frequency Multipliers</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(proposal.pricingSnapshot.frequencyMultipliers).map(([key, val]) => (
                          <div key={key} className="flex justify-between px-2 py-1 rounded bg-white/5">
                            <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-white">{(val as number).toFixed(2)}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Floor type multipliers */}
                  {proposal.pricingSnapshot.floorTypeMultipliers && Object.keys(proposal.pricingSnapshot.floorTypeMultipliers).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Floor Type Multipliers</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(proposal.pricingSnapshot.floorTypeMultipliers).map(([key, val]) => (
                          <div key={key} className="flex justify-between px-2 py-1 rounded bg-white/5">
                            <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-white">{(val as number).toFixed(2)}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Condition multipliers */}
                  {proposal.pricingSnapshot.conditionMultipliers && Object.keys(proposal.pricingSnapshot.conditionMultipliers).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Condition Multipliers</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(proposal.pricingSnapshot.conditionMultipliers).map(([key, val]) => (
                          <div key={key} className="flex justify-between px-2 py-1 rounded bg-white/5">
                            <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-white">{(val as number).toFixed(2)}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Sqft per labor hour by building type */}
                  {proposal.pricingSnapshot.sqftPerLaborHour && Object.keys(proposal.pricingSnapshot.sqftPerLaborHour).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Productivity (Sq Ft / Labor Hour)</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(proposal.pricingSnapshot.sqftPerLaborHour).map(([key, val]) => (
                          <div key={key} className="flex justify-between px-2 py-1 rounded bg-white/5">
                            <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-white">{val as number} sqft/hr</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Snapshot timestamp */}
              {proposal.pricingSnapshot.capturedAt && (
                <div className="mt-3 text-xs text-gray-500">
                  Pricing snapshot captured {formatDate(proposal.pricingSnapshot.capturedAt)}
                </div>
              )}
            </Card>
          )}

          {/* Facility & Areas */}
          {proposal.facility && proposal.proposalServices && proposal.proposalServices.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Facility & Areas</h2>

              {/* Facility header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {proposal.facility.name}
                </div>
                {proposal.facility.address && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
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
                const isHourlyPricing = proposal.pricingSnapshot?.pricingType !== 'square_foot';
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="pb-2 text-left text-xs font-medium text-gray-400 uppercase">Area</th>
                          {isHourlyPricing && (
                            <th className="pb-2 text-right text-xs font-medium text-gray-400 uppercase">Hours</th>
                          )}
                          <th className="pb-2 text-right text-xs font-medium text-gray-400 uppercase">Frequency</th>
                          <th className="pb-2 text-right text-xs font-medium text-gray-400 uppercase">Monthly</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {proposal.proposalServices.map((svc, idx) => (
                          <tr key={idx} className="hover:bg-white/5">
                            <td className="py-2 text-gray-300">{svc.serviceName}</td>
                            {isHourlyPricing && (
                              <td className="py-2 text-right text-gray-300">
                                {svc.estimatedHours != null ? `${svc.estimatedHours} hrs` : '-'}
                              </td>
                            )}
                            <td className="py-2 text-right">
                              <span className="text-gray-300 capitalize">{svc.frequency?.replace(/_/g, ' ') || svc.serviceType}</span>
                            </td>
                            <td className="py-2 text-right font-medium text-white">
                              {formatCurrency(Number(svc.monthlyPrice) || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10">
                          <td className="pt-2 font-medium text-white">Total</td>
                          {isHourlyPricing && (
                            <td className="pt-2 text-right text-gray-300">
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
          {proposal.notes && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Internal Notes</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{proposal.notes}</p>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold text-white">Financial Summary</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white font-medium">
                  {formatCurrency(Number(proposal.subtotal) || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  Tax ({((Number(proposal.taxRate) || 0) * 100).toFixed(1)}%):
                </span>
                <span className="text-white font-medium">
                  {formatCurrency(Number(proposal.taxAmount) || 0)}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t border-white/10 pt-3">
                <span className="text-white">Total:</span>
                <span className="text-emerald">{formatCurrency(Number(proposal.totalAmount) || 0)}</span>
              </div>
            </div>
          </Card>

          {/* Details */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Account</div>
                  <div className="text-white">{proposal.account.name}</div>
                </div>
              </div>

              {proposal.facility && (
                <div className="flex items-start gap-3">
                  <Building2 className="mt-1 h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-400">Facility</div>
                    <div className="text-white">{proposal.facility.name}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <User className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Created By</div>
                  <div className="text-white">{proposal.createdByUser.fullName}</div>
                  <div className="text-xs text-gray-500">
                    {proposal.createdByUser.email}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Valid Until</div>
                  <div className="text-white">{formatDate(proposal.validUntil)}</div>
                </div>
              </div>

              {/* Pricing Plan Info */}
              {proposal.pricingPlanId && (
                <div className="flex items-start gap-3">
                  <Settings className="mt-1 h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-400">Pricing Plan</div>
                    <div className="text-white flex items-center gap-2">
                      {proposal.pricingSnapshot?.pricingPlanName || proposal.pricingPlanId}
                      {proposal.pricingLocked && (
                        <Badge variant="warning" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    {proposal.pricingSnapshot?.pricingType && (
                      <div className="text-xs text-gray-500">
                        Type: {proposal.pricingSnapshot.pricingType === 'hourly' ? 'Hourly' : 'Per Sq Ft'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Signature details for accepted proposals */}
              {proposal.signatureName && (
                <div className="flex items-start gap-3">
                  <PenTool className="mt-1 h-4 w-4 text-green-400" />
                  <div>
                    <div className="text-sm text-gray-400">Signed By</div>
                    <div className="text-white">{proposal.signatureName}</div>
                    {proposal.signatureDate && (
                      <div className="text-xs text-gray-500">
                        {formatDate(proposal.signatureDate)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Public link status */}
              {proposal.publicToken && (
                <div className="flex items-start gap-3">
                  <Link2 className="mt-1 h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-400">Public Link</div>
                    <button
                      onClick={handleCopyPublicLink}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Click to copy
                    </button>
                    {proposal.publicTokenExpiresAt && (
                      <div className="text-xs text-gray-500">
                        Expires {formatDate(proposal.publicTokenExpiresAt)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Version History */}
          <ProposalVersionHistory proposalId={proposal.id} refreshTrigger={activityRefresh} />

          {/* Activity Timeline */}
          <ProposalTimeline proposalId={proposal.id} refreshTrigger={activityRefresh} />
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
      <Modal
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
      </Modal>
    </div>
  );
};

export default ProposalDetail;
