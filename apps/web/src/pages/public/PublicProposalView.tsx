import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  DollarSign,
} from 'lucide-react';
import {
  getPublicProposal,
  acceptPublicProposal,
  rejectPublicProposal,
  downloadPublicProposalPdf,
} from '../../lib/publicProposals';
import type { PublicProposal } from '../../types/publicProposal';
import type { GlobalBranding } from '../../types/globalSettings';

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const PublicProposalView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [branding, setBranding] = useState<GlobalBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionComplete, setActionComplete] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    if (token) fetchProposal();
  }, [token]);

  const fetchProposal = async () => {
    try {
      setLoading(true);
      const response = await getPublicProposal(token!);
      setProposal(response.data);
      setBranding(response.branding);
    } catch (err: any) {
      setError(
        err.response?.status === 404
          ? 'This proposal was not found or the link has expired.'
          : 'Failed to load proposal. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!signatureName.trim()) return;
    try {
      setSubmitting(true);
      const updated = await acceptPublicProposal(token!, signatureName);
      setProposal(updated);
      setAcceptModalOpen(false);
      setActionComplete('accepted');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      setSubmitting(true);
      const updated = await rejectPublicProposal(token!, rejectionReason);
      setProposal(updated);
      setRejectModalOpen(false);
      setActionComplete('rejected');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!proposal) return;
    try {
      await downloadPublicProposalPdf(token!, proposal.proposalNumber);
    } catch {
      alert('Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Proposal Not Available</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!proposal) return null;

  const canAct = ['sent', 'viewed'].includes(proposal.status);

  const primaryColor = branding?.themePrimaryColor || '#1a1a2e';
  const accentColor = branding?.themeAccentColor || '#d4af37';
  const backgroundColor = branding?.themeBackgroundColor || '#f8fafc';
  const textColor = branding?.themeTextColor || '#111827';

  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      {/* Header */}
      <header className="text-white" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              {branding?.logoDataUrl && (
                <img src={branding.logoDataUrl} alt={branding.companyName} className="mb-2 max-h-10 w-auto" />
              )}
              <h1 className="text-xl font-bold" style={{ color: accentColor }}>
                {branding?.companyName || proposal.account.name}
              </h1>
              <p className="text-gray-300 text-sm mt-1">Proposal {proposal.proposalNumber}</p>
            </div>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>
      </header>

      {/* Action Complete Banner */}
      {actionComplete && (
        <div
          className={`${
            actionComplete === 'accepted' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          } border-b`}
        >
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center gap-3">
            {actionComplete === 'accepted' ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-green-800">Proposal Accepted</p>
                  <p className="text-sm text-green-600">Thank you for accepting this proposal.</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Proposal Rejected</p>
                  <p className="text-sm text-red-600">The proposal has been declined.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Already accepted/rejected banner */}
      {!actionComplete && proposal.status === 'accepted' && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">This proposal has been accepted</p>
              {proposal.signatureName && (
                <p className="text-sm text-green-600">
                  Signed by {proposal.signatureName} on {formatDate(proposal.signatureDate)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {!actionComplete && proposal.status === 'rejected' && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <p className="font-medium text-red-800">This proposal has been declined</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Title & Meta */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold" style={{ color: textColor }}>{proposal.title}</h2>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            {proposal.facility && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {proposal.facility.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Valid until {formatDate(proposal.validUntil)}
            </span>
          </div>
        </div>

        {/* Description */}
        {proposal.description && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{proposal.description}</p>
          </div>
        )}

        {/* Services */}
        {proposal.proposalServices.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Services</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monthly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proposal.proposalServices.map((service, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{service.serviceName}</div>
                        {service.description && (
                          <div className="text-sm text-gray-500 mt-0.5">{service.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {frequencyLabels[service.frequency] || service.frequency}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(service.monthlyPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Line Items */}
        {proposal.proposalItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Line Items</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proposal.proposalItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="mb-8 flex justify-end">
            <div className="w-72 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(proposal.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500">Tax ({(Number(proposal.taxRate) * 100).toFixed(1)}%)</span>
              <span className="text-gray-900">{formatCurrency(proposal.taxAmount)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold" style={{ color: primaryColor }}>{formatCurrency(proposal.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canAct && !actionComplete && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center py-8 border-t border-gray-200">
            <button
              onClick={() => setAcceptModalOpen(true)}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
              Accept Proposal
            </button>
            <button
              onClick={() => setRejectModalOpen(true)}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-white hover:bg-gray-50 text-red-600 border border-red-200 rounded-lg font-medium transition-colors"
            >
              <XCircle className="h-5 w-5" />
              Decline Proposal
            </button>
          </div>
        )}
      </main>

      {/* Accept Modal */}
      {acceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Accept Proposal</h3>
            <p className="text-sm text-gray-600 mb-4">
              By accepting, you agree to the terms outlined in this proposal.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Full Name (as signature)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter your full name"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setAcceptModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!signatureName.trim() || submitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Accepting...' : 'Confirm Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Decline Proposal</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for declining
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={4}
                placeholder="Please let us know why you're declining..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || submitting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 text-center text-sm text-gray-400">
          <p>Powered by {branding?.companyName || 'Hygieia'}</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicProposalView;
