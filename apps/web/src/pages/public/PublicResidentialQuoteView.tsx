import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Home, Mail, Phone, XCircle } from 'lucide-react';
import {
  acceptPublicResidentialQuote,
  declinePublicResidentialQuote,
  getPublicResidentialQuote,
} from '../../lib/residential';
import { extractApiErrorMessage } from '../../lib/api';
import type { GlobalBranding } from '../../types/globalSettings';
import type { PublicResidentialQuote } from '../../types/residential';

function formatCurrency(amount: number | string | null | undefined) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const serviceLabelMap: Record<string, string> = {
  recurring_standard: 'Recurring Standard',
  one_time_standard: 'One-Time Standard',
  deep_clean: 'Deep Clean',
  move_in_out: 'Move In / Out',
  turnover: 'Vacation Rental Turnover',
  post_construction: 'Post Construction',
};

const frequencyLabelMap: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  every_4_weeks: 'Every 4 Weeks',
  one_time: 'One Time',
};

export default function PublicResidentialQuoteView() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<PublicResidentialQuote | null>(null);
  const [branding, setBranding] = useState<GlobalBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionComplete, setActionComplete] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const result = await getPublicResidentialQuote(token);
        setQuote(result.data);
        setBranding(result.branding);
      } catch {
        setError('This residential quote link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const primaryColor = branding?.themePrimaryColor || '#1a1a2e';
  const accentColor = branding?.themeAccentColor || '#d4af37';
  const companyName = branding?.companyName || 'Hygieia Cleaning Services';
  const canRespond = quote ? ['sent', 'viewed'].includes(quote.status) : false;

  const homeSummary = useMemo(() => {
    if (!quote?.homeProfile) return [];
    return [
      `${quote.homeProfile.squareFeet} sqft`,
      `${quote.homeProfile.bedrooms} bed`,
      `${quote.homeProfile.fullBathrooms} bath`,
      quote.homeProfile.halfBathrooms ? `${quote.homeProfile.halfBathrooms} half bath` : null,
      `${quote.homeProfile.levels} level${quote.homeProfile.levels === 1 ? '' : 's'}`,
    ].filter(Boolean);
  }, [quote]);

  const handleAccept = async () => {
    if (!token || !signatureName.trim()) return;
    try {
      setSubmitting(true);
      const updated = await acceptPublicResidentialQuote(token, signatureName);
      setQuote(updated);
      setAcceptOpen(false);
      setActionComplete('accepted');
    } catch (err) {
      alert(extractApiErrorMessage(err, 'Failed to accept residential quote'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!token || !declineReason.trim()) return;
    try {
      setSubmitting(true);
      const updated = await declinePublicResidentialQuote(token, declineReason);
      setQuote(updated);
      setDeclineOpen(false);
      setActionComplete('declined');
    } catch (err) {
      alert(extractApiErrorMessage(err, 'Failed to decline residential quote'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-300 dark:border-surface-600 border-t-blue-600" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="max-w-md text-center">
          <Home className="mx-auto mb-4 h-16 w-16 text-surface-600 dark:text-surface-400" />
          <h1 className="mb-2 text-2xl font-bold text-surface-800">Residential Quote Not Found</h1>
          <p className="text-surface-500">{error || 'This link may have expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div style={{ backgroundColor: primaryColor }} className="px-4 py-8">
        <div className="mx-auto max-w-4xl text-center">
          {branding?.logoDataUrl && (
            <img src={branding.logoDataUrl} alt="Logo" className="mx-auto mb-4 h-16" />
          )}
          <h1 style={{ color: accentColor }} className="text-2xl font-bold">{companyName}</h1>
          <p className="mt-1 text-sm text-white/70">Residential Quote</p>
        </div>
      </div>

      {actionComplete && (
        <div className={`px-4 py-4 text-center text-white ${actionComplete === 'accepted' ? 'bg-green-600' : 'bg-red-600'}`}>
          <p className="text-lg font-semibold">
            {actionComplete === 'accepted'
              ? 'Residential quote accepted. Thank you.'
              : 'Residential quote declined. Thank you for your response.'}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-surface-800">{quote.title}</h2>
              <p className="text-sm text-surface-500">{quote.quoteNumber}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${
              quote.status === 'accepted'
                ? 'bg-green-100 text-green-700'
                : quote.status === 'declined'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
            }`}>
              {quote.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-surface-500">Prepared for</p>
              <p className="font-medium text-surface-800">{quote.customerName}</p>
              <p className="mt-1 text-surface-600">
                {serviceLabelMap[quote.serviceType] || quote.serviceType} · {frequencyLabelMap[quote.frequency] || quote.frequency}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-surface-500">Preferred Start</p>
              <p className="font-medium text-surface-800">{formatDate(quote.preferredStartDate)}</p>
              <p className="mt-1 text-xs text-surface-600">Sent {formatDate(quote.sentAt)}</p>
            </div>
          </div>

          {!!homeSummary.length && (
            <div className="mt-4 rounded-lg bg-surface-50 p-4 text-sm text-surface-700">
              <div className="font-medium text-surface-900">Home summary</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {homeSummary.map((item) => (
                  <span key={item} className="rounded-full bg-surface-50 px-3 py-1 text-xs shadow-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6">
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-surface-800">Quote Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Base service</span>
                  <span className="font-medium text-surface-800">{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Recurring discount</span>
                  <span className="font-medium text-surface-800">-{formatCurrency(quote.recurringDiscount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">First clean surcharge</span>
                  <span className="font-medium text-surface-800">{formatCurrency(quote.firstCleanSurcharge)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Add-ons</span>
                  <span className="font-medium text-surface-800">{formatCurrency(quote.addOnTotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-3 text-lg font-bold">
                  <span>Total quote</span>
                  <span style={{ color: primaryColor }}>{formatCurrency(quote.totalAmount)}</span>
                </div>
              </div>
            </div>

            {!!quote.addOns?.length && (
              <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-surface-800">Included Add-Ons</h3>
                <div className="space-y-3">
                  {quote.addOns.map((addOn) => (
                    <div key={addOn.id} className="flex items-start justify-between gap-4 border-b border-surface-100 pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <div className="font-medium text-surface-800">{addOn.label}</div>
                        {addOn.description && <div className="text-sm text-surface-500">{addOn.description}</div>}
                        <div className="mt-1 text-xs text-surface-500">
                          {addOn.pricingType === 'per_unit'
                            ? `${addOn.quantity} ${addOn.unitLabel || 'unit'}${addOn.quantity === 1 ? '' : 's'}`
                            : 'Flat add-on'}
                        </div>
                      </div>
                      <div className="font-medium text-surface-800">{formatCurrency(addOn.lineTotal)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {quote.notes && (
              <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold text-surface-800">Service Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-surface-600">{quote.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-surface-800">Visit Overview</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Estimated hours</span>
                  <span className="font-medium text-surface-800">{quote.estimatedHours || 'TBD'} hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Condition</span>
                  <span className="font-medium text-surface-800">{quote.homeProfile?.condition || 'standard'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Occupancy</span>
                  <span className="font-medium text-surface-800">{quote.homeProfile?.occupiedStatus?.replace(/_/g, ' ') || 'occupied'}</span>
                </div>
              </div>
            </div>

            {quote.signatureName && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Accepted</span>
                </div>
                <p className="text-sm text-green-700">
                  Signed by <strong>{quote.signatureName}</strong> on {formatDate(quote.signatureDate)}
                </p>
              </div>
            )}

            {canRespond && !actionComplete && (
              <div className="space-y-3 rounded-lg border border-surface-200 bg-surface-50 p-6 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAcceptOpen(true)}
                  style={{ backgroundColor: primaryColor }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white hover:opacity-90"
                >
                  <CheckCircle className="h-5 w-5" />
                  Accept Quote
                </button>
                <button
                  type="button"
                  onClick={() => setDeclineOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-3 font-semibold text-surface-700 hover:bg-surface-50"
                >
                  <XCircle className="h-5 w-5" />
                  Decline Quote
                </button>
              </div>
            )}

            <div className="text-sm text-surface-500">
              <p>Questions? Contact us:</p>
              <div className="mt-2 space-y-2">
                {branding?.companyEmail && (
                  <a href={`mailto:${branding.companyEmail}`} className="flex items-center gap-2 hover:text-surface-700">
                    <Mail className="h-4 w-4" />
                    {branding.companyEmail}
                  </a>
                )}
                {branding?.companyPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {branding.companyPhone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {acceptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface-50 p-6">
            <h3 className="mb-4 text-lg font-bold text-surface-800">Accept Residential Quote</h3>
            <p className="mb-4 text-sm text-surface-500">
              By signing below, you confirm you would like to move forward with this residential quote for{' '}
              <strong>{formatCurrency(quote.totalAmount)}</strong>.
            </p>
            <label className="mb-1 block text-sm font-medium text-surface-700">Your Full Name</label>
            <input
              type="text"
              value={signatureName}
              onChange={(event) => setSignatureName(event.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setAcceptOpen(false)} className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-surface-700 hover:bg-surface-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={!signatureName.trim() || submitting}
                style={{ backgroundColor: primaryColor }}
                className="flex-1 rounded-lg px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Accept & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {declineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface-50 p-6">
            <h3 className="mb-4 text-lg font-bold text-surface-800">Decline Residential Quote</h3>
            <label className="mb-1 block text-sm font-medium text-surface-700">Reason for Declining</label>
            <textarea
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              rows={4}
              placeholder="Let us know what needs to change..."
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeclineOpen(false)} className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-surface-700 hover:bg-surface-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={!declineReason.trim() || submitting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
