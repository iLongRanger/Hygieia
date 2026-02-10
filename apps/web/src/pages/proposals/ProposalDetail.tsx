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

const ProposalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [activityRefresh, setActivityRefresh] = useState(0);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWriteProposals = hasPermission(PERMISSIONS.PROPOSALS_WRITE);
  const canAdminProposals = hasPermission(PERMISSIONS.PROPOSALS_ADMIN);
  const canDeleteProposals = hasPermission(PERMISSIONS.PROPOSALS_DELETE);

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
                  // Parse description: first line is area info, remaining are "Frequency: task1, task2"
                  const lines = service.description?.split('\n') || [];
                  const areaInfo = lines[0] || '';
                  const taskGroups: { label: string; tasks: string[] }[] = [];
                  for (let i = 1; i < lines.length; i++) {
                    const match = lines[i].match(/^(.+?):\s*(.+)$/);
                    if (match) {
                      taskGroups.push({
                        label: match[1].trim(),
                        tasks: match[2].split(',').map((t) => t.trim()).filter(Boolean),
                      });
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className="border-b border-white/10 pb-5 last:border-0 last:pb-0"
                    >
                      {/* Area header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-white text-base">{service.serviceName}</h3>
                          {areaInfo && (
                            <p className="text-sm text-gray-400 mt-1">{areaInfo}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-emerald">
                            {formatCurrency(service.monthlyPrice)}/month
                          </div>
                          {service.estimatedHours && service.hourlyRate && (
                            <div className="text-sm text-gray-400">
                              {service.estimatedHours} hrs x{' '}
                              {formatCurrency(service.hourlyRate)}/hr
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tasks grouped by frequency */}
                      {taskGroups.length > 0 && (
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
                  {formatCurrency(proposal.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  Tax ({(proposal.taxRate * 100).toFixed(1)}%):
                </span>
                <span className="text-white font-medium">
                  {formatCurrency(proposal.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t border-white/10 pt-3">
                <span className="text-white">Total:</span>
                <span className="text-emerald">{formatCurrency(proposal.totalAmount)}</span>
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
    </div>
  );
};

export default ProposalDetail;
