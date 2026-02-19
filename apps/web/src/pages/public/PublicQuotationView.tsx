import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  Mail,
  Phone,
  Globe,
} from 'lucide-react';
import {
  getPublicQuotation,
  acceptPublicQuotation,
  rejectPublicQuotation,
  type PublicQuotation,
} from '../../lib/publicQuotations';
import type { GlobalBranding } from '../../types/globalSettings';

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const PublicQuotationView = () => {
  const { token } = useParams<{ token: string }>();
  const [quotation, setQuotation] = useState<PublicQuotation | null>(null);
  const [branding, setBranding] = useState<GlobalBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionComplete, setActionComplete] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const result = await getPublicQuotation(token);
        setQuotation(result.data);
        setBranding(result.branding);
      } catch {
        setError('This quotation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !signatureName.trim()) return;
    setSubmitting(true);
    try {
      const updated = await acceptPublicQuotation(token, signatureName);
      setQuotation(updated);
      setAcceptModalOpen(false);
      setActionComplete('accepted');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!token || !rejectionReason.trim()) return;
    setSubmitting(true);
    try {
      const updated = await rejectPublicQuotation(token, rejectionReason);
      setQuotation(updated);
      setRejectModalOpen(false);
      setActionComplete('rejected');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryColor = branding?.themePrimaryColor || '#1a1a2e';
  const accentColor = branding?.themeAccentColor || '#d4af37';
  const companyName = branding?.companyName || 'Hygieia Cleaning Services';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Quotation Not Found</h1>
          <p className="text-gray-500">{error || 'This link may have expired.'}</p>
        </div>
      </div>
    );
  }

  const canRespond = ['sent', 'viewed'].includes(quotation.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: primaryColor }} className="py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {branding?.logoDataUrl && (
            <img src={branding.logoDataUrl} alt="Logo" className="h-16 mx-auto mb-4" />
          )}
          <h1 style={{ color: accentColor }} className="text-2xl font-bold">{companyName}</h1>
          <p className="text-white/70 text-sm mt-1">Quotation</p>
        </div>
      </div>

      {/* Action Complete Banner */}
      {actionComplete && (
        <div
          className={`py-4 px-4 text-center text-white ${
            actionComplete === 'accepted' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          <p className="font-semibold text-lg">
            {actionComplete === 'accepted'
              ? 'Quotation accepted! Thank you.'
              : 'Quotation declined. Thank you for your response.'}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Quotation Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{quotation.title}</h2>
              <p className="text-sm text-gray-500">{quotation.quotationNumber}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                quotation.status === 'accepted'
                  ? 'bg-green-100 text-green-700'
                  : quotation.status === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Prepared for</p>
              <p className="font-medium text-gray-800">{quotation.account.name}</p>
              {quotation.facility && (
                <p className="text-gray-600">{quotation.facility.name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-gray-500">Date</p>
              <p className="font-medium text-gray-800">{formatDate(quotation.createdAt)}</p>
              {quotation.validUntil && (
                <p className="text-gray-600 text-xs mt-1">
                  Valid until {formatDate(quotation.validUntil)}
                </p>
              )}
            </div>
          </div>

          {quotation.description && (
            <p className="mt-4 text-sm text-gray-600 whitespace-pre-wrap">
              {quotation.description}
            </p>
          )}
        </div>

        {/* Services */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Services</h3>
          <div className="space-y-3">
            {quotation.services.map((service, i) => (
              <div key={i} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{service.serviceName}</p>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{service.description}</p>
                  )}
                  {service.includedTasks?.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {service.includedTasks.map((task, j) => (
                        <li key={j} className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-gray-400" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="font-semibold text-gray-800 ml-4">
                  {formatCurrency(service.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-56 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(quotation.subtotal)}</span>
                </div>
                {Number(quotation.taxRate) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Tax ({(Number(quotation.taxRate) * 100).toFixed(1)}%)
                    </span>
                    <span>{formatCurrency(quotation.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>{formatCurrency(quotation.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        {quotation.termsAndConditions && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Terms & Conditions
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {quotation.termsAndConditions}
            </p>
          </div>
        )}

        {/* Signature info */}
        {quotation.signatureName && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Accepted</span>
            </div>
            <p className="text-sm text-green-700">
              Signed by <strong>{quotation.signatureName}</strong> on{' '}
              {formatDate(quotation.signatureDate)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {canRespond && !actionComplete && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setAcceptModalOpen(true)}
              style={{ backgroundColor: primaryColor }}
              className="px-8 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition flex items-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Accept Quotation
            </button>
            <button
              onClick={() => setRejectModalOpen(true)}
              className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-2"
            >
              <XCircle className="h-5 w-5" />
              Decline
            </button>
          </div>
        )}

        {/* Contact */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Questions? Contact us:</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {branding?.companyEmail && (
              <a href={`mailto:${branding.companyEmail}`} className="flex items-center gap-1 hover:text-gray-700">
                <Mail className="h-3.5 w-3.5" /> {branding.companyEmail}
              </a>
            )}
            {branding?.companyPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {branding.companyPhone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Accept Modal */}
      {acceptModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Accept Quotation</h3>
            <p className="text-sm text-gray-500 mb-4">
              By signing below, you agree to the terms of quotation{' '}
              <strong>{quotation.quotationNumber}</strong> for{' '}
              <strong>{formatCurrency(quotation.totalAmount)}</strong>.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Full Name (Signature)
            </label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAcceptModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!signatureName.trim() || submitting}
                style={{ backgroundColor: primaryColor }}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Accept & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Decline Quotation</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Declining
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please let us know why..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicQuotationView;
