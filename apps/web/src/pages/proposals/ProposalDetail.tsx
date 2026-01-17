import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  Download,
  Archive,
  Trash2,
  FileText,
  Building2,
  User,
  Calendar,
  DollarSign,
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
  deleteProposal,
} from '../../lib/proposals';
import type { Proposal, ProposalStatus } from '../../types/proposal';

const getStatusBadge = (status: ProposalStatus) => {
  const statusConfig = {
    draft: { variant: 'secondary' as const, label: 'Draft' },
    sent: { variant: 'info' as const, label: 'Sent' },
    viewed: { variant: 'warning' as const, label: 'Viewed' },
    accepted: { variant: 'success' as const, label: 'Accepted' },
    rejected: { variant: 'danger' as const, label: 'Rejected' },
    expired: { variant: 'secondary' as const, label: 'Expired' },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
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
      navigate('/proposals');
    } catch (error) {
      toast.error('Failed to archive proposal');
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate('/proposals')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{proposal.title}</h1>
            <p className="text-gray-600 mt-1">{proposal.proposalNumber}</p>
          </div>
          {getStatusBadge(proposal.status)}
        </div>
        <div className="flex gap-2">
          {proposal.status === 'draft' && (
            <>
              <Button variant="secondary" onClick={() => navigate(`/proposals/${id}/edit`)}>
                <Edit className="w-5 h-5 mr-2" />
                Edit
              </Button>
              <Button onClick={handleSend}>
                <Send className="w-5 h-5 mr-2" />
                Send
              </Button>
            </>
          )}
          {['sent', 'viewed'].includes(proposal.status) && (
            <>
              <Button variant="success" onClick={handleAccept}>
                <CheckCircle className="w-5 h-5 mr-2" />
                Accept
              </Button>
              <Button variant="danger" onClick={handleReject}>
                <XCircle className="w-5 h-5 mr-2" />
                Reject
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={handleArchive}>
            <Archive className="w-5 h-5 mr-2" />
            Archive
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="w-5 h-5 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {proposal.description && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{proposal.description}</p>
            </Card>
          )}

          {/* Proposal Items */}
          {proposal.proposalItems && proposal.proposalItems.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">Line Items</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {proposal.proposalItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="secondary">{item.itemType}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
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
              <h2 className="text-lg font-semibold mb-4">Services</h2>
              <div className="space-y-4">
                {proposal.proposalServices.map((service, idx) => (
                  <div key={idx} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{service.serviceName}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="info">{service.serviceType}</Badge>
                          <Badge variant="secondary">{service.frequency}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(service.monthlyPrice)}/month
                        </div>
                        {service.estimatedHours && service.hourlyRate && (
                          <div className="text-sm text-gray-600">
                            {service.estimatedHours} hrs × {formatCurrency(service.hourlyRate)}/hr
                          </div>
                        )}
                      </div>
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-700 mt-2">{service.description}</p>
                    )}
                    {service.includedTasks && service.includedTasks.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Included Tasks:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
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
              <h2 className="text-lg font-semibold mb-4">Terms & Conditions</h2>
              <p className="text-gray-700 whitespace-pre-wrap text-sm">
                {proposal.termsAndConditions}
              </p>
            </Card>
          )}

          {/* Notes */}
          {proposal.notes && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">Internal Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{proposal.notes}</p>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Financial Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(proposal.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({(proposal.taxRate * 100).toFixed(1)}%):</span>
                <span className="font-medium">{formatCurrency(proposal.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                <span>Total:</span>
                <span className="text-blue-600">{formatCurrency(proposal.totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Details */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Account</p>
                  <p className="text-sm text-gray-600">{proposal.account.name}</p>
                </div>
              </div>

              {proposal.opportunity && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Opportunity</p>
                    <p className="text-sm text-gray-600">{proposal.opportunity.name}</p>
                  </div>
                </div>
              )}

              {proposal.facility && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Facility</p>
                    <p className="text-sm text-gray-600">{proposal.facility.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created By</p>
                  <p className="text-sm text-gray-600">{proposal.createdByUser.fullName}</p>
                  <p className="text-xs text-gray-500">{proposal.createdByUser.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Valid Until</p>
                  <p className="text-sm text-gray-600">{formatDate(proposal.validUntil)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Created</p>
                <p className="text-sm text-gray-600">{formatDate(proposal.createdAt)}</p>
              </div>
              {proposal.sentAt && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Sent</p>
                  <p className="text-sm text-gray-600">{formatDate(proposal.sentAt)}</p>
                </div>
              )}
              {proposal.viewedAt && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Viewed</p>
                  <p className="text-sm text-gray-600">{formatDate(proposal.viewedAt)}</p>
                </div>
              )}
              {proposal.acceptedAt && (
                <div>
                  <p className="text-sm font-medium text-green-900">Accepted</p>
                  <p className="text-sm text-green-600">{formatDate(proposal.acceptedAt)}</p>
                </div>
              )}
              {proposal.rejectedAt && (
                <div>
                  <p className="text-sm font-medium text-red-900">Rejected</p>
                  <p className="text-sm text-red-600">{formatDate(proposal.rejectedAt)}</p>
                  {proposal.rejectionReason && (
                    <p className="text-sm text-gray-600 mt-1 italic">
                      "{proposal.rejectionReason}"
                    </p>
                  )}
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
