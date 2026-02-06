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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  getProposal,
  sendProposal,
  acceptProposal,
  rejectProposal,
  archiveProposal,
  restoreProposal,
  deleteProposal,
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

  useEffect(() => {
    if (id) {
      fetchProposal(id);
    }
  }, [id]);

  const fetchProposal = async (proposalId: string) => {
    try {
      setLoading(true);
      const data = await getProposal(proposalId);
      setProposal(data);
    } catch (error) {
      console.error('Failed to fetch proposal:', error);
      toast.error('Failed to load proposal');
      navigate('/proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!proposal || !confirm('Send this proposal to the client?')) return;

    try {
      await sendProposal(proposal.id);
      toast.success('Proposal sent successfully');
      fetchProposal(proposal.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send proposal');
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
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{proposal.title}</h1>
            <Badge variant={getStatusVariant(proposal.status)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </Badge>
          </div>
          <p className="text-gray-400">{proposal.proposalNumber}</p>
        </div>
        <div className="flex gap-2">
          {proposal.status === 'draft' && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/proposals/${id}/edit`)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={handleSend}>
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </>
          )}
          {['sent', 'viewed'].includes(proposal.status) && (
            <>
              <Button
                variant="primary"
                onClick={handleAccept}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button variant="danger" onClick={handleReject}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {proposal.archivedAt ? (
            <Button variant="secondary" onClick={handleRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleArchive}
              className="text-orange-400 hover:text-orange-300"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
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

          {/* Proposal Services */}
          {proposal.proposalServices && proposal.proposalServices.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Services</h2>
              <div className="space-y-4">
                {proposal.proposalServices.map((service, idx) => (
                  <div
                    key={idx}
                    className="border-b border-white/10 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-white">{service.serviceName}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="info">
                            {service.serviceType.charAt(0).toUpperCase() +
                              service.serviceType.slice(1).replace('_', ' ')}
                          </Badge>
                          <Badge variant="default">
                            {service.frequency.charAt(0).toUpperCase() +
                              service.frequency.slice(1)}
                          </Badge>
                        </div>
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
                    {service.description && (
                      <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap">{service.description}</p>
                    )}
                    {service.includedTasks && service.includedTasks.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-300 mb-1">
                          Included Tasks:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-400">
                          {service.includedTasks.map((task, taskIdx) => (
                            <li key={taskIdx}>{task}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Terms and Conditions */}
          {proposal.termsAndConditions && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">
                Terms & Conditions
              </h2>
              <p className="text-gray-300 whitespace-pre-wrap text-sm">
                {proposal.termsAndConditions}
              </p>
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
            </div>
          </Card>

          {/* Timeline */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold text-white">Timeline</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-gray-400" />
                <div>
                  <div className="text-sm font-medium text-white">Created</div>
                  <div className="text-sm text-gray-400">
                    {formatDate(proposal.createdAt)}
                  </div>
                </div>
              </div>
              {proposal.sentAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Sent</div>
                    <div className="text-sm text-gray-400">
                      {formatDate(proposal.sentAt)}
                    </div>
                  </div>
                </div>
              )}
              {proposal.viewedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-yellow-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Viewed</div>
                    <div className="text-sm text-gray-400">
                      {formatDate(proposal.viewedAt)}
                    </div>
                  </div>
                </div>
              )}
              {proposal.acceptedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-400" />
                  <div>
                    <div className="text-sm font-medium text-green-400">Accepted</div>
                    <div className="text-sm text-gray-400">
                      {formatDate(proposal.acceptedAt)}
                    </div>
                  </div>
                </div>
              )}
              {proposal.rejectedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-red-400" />
                  <div>
                    <div className="text-sm font-medium text-red-400">Rejected</div>
                    <div className="text-sm text-gray-400">
                      {formatDate(proposal.rejectedAt)}
                    </div>
                    {proposal.rejectionReason && (
                      <p className="text-sm text-gray-500 mt-1 italic">
                        "{proposal.rejectionReason}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProposalDetail;
