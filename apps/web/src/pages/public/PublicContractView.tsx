import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Download,
  CheckCircle,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
} from 'lucide-react';
import {
  getPublicContract,
  signPublicContract,
  downloadPublicContractPdf,
} from '../../lib/publicContracts';
import type { PublicContract } from '../../types/publicContract';
import type { GlobalBranding } from '../../types/globalSettings';

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  bi_weekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  custom: 'Custom',
};

const billingCycleLabels: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatAddress = (address: any): string => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const lines: string[] = [];
  if (address.street) lines.push(address.street);
  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
  if (cityLine) lines.push(cityLine);
  return lines.join(', ');
};

const PUBLIC_DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const formatTime24h = (value: string): string => {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const PublicContractView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<PublicContract | null>(null);
  const [branding, setBranding] = useState<GlobalBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sign modal
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signedByName, setSignedByName] = useState('');
  const [signedByEmail, setSignedByEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionComplete, setActionComplete] = useState(false);

  useEffect(() => {
    if (token) fetchContract();
  }, [token]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await getPublicContract(token!);
      setContract(response.data);
      setBranding(response.branding);
    } catch (err: any) {
      setError(
        err.response?.status === 404
          ? 'This contract was not found or the link has expired.'
          : 'Failed to load contract. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signedByName.trim() || !signedByEmail.trim()) return;
    try {
      setSubmitting(true);
      const updated = await signPublicContract(token!, signedByName, signedByEmail);
      setContract(updated);
      setSignModalOpen(false);
      setActionComplete(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to sign contract');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contract) return;
    try {
      await downloadPublicContractPdf(token!, contract.contractNumber);
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Contract Not Available</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const canSign = ['sent', 'viewed'].includes(contract.status);
  const scheduleDays = (contract.serviceSchedule?.days || [])
    .map((day) => day.toLowerCase())
    .filter((day) => PUBLIC_DAY_LABELS[day]);
  const scheduleWindow =
    contract.serviceSchedule?.allowedWindowStart && contract.serviceSchedule?.allowedWindowEnd
      ? `${formatTime24h(contract.serviceSchedule.allowedWindowStart)} to ${formatTime24h(contract.serviceSchedule.allowedWindowEnd)}`
      : null;
  const facilityTimezone =
    (contract.facility?.address?.timezone as string | undefined) ||
    (contract.facility?.address?.timeZone as string | undefined) ||
    null;

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
                {branding?.companyName || contract.account.name}
              </h1>
              <p className="text-gray-300 text-sm mt-1">Contract {contract.contractNumber}</p>
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

      {/* Signed Banner */}
      {actionComplete && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">Contract Signed</p>
              <p className="text-sm text-green-600">
                Thank you for signing this contract.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Already signed banner */}
      {!actionComplete && ['pending_signature', 'active'].includes(contract.status) && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">
                This contract has been signed
              </p>
              {contract.signedByName && (
                <p className="text-sm text-green-600">
                  Signed by {contract.signedByName} on {formatDate(contract.signedDate)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Title & Meta */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold" style={{ color: textColor }}>{contract.title}</h2>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {contract.account.name}
            </span>
            {contract.facility && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {contract.facility.name}
              </span>
            )}
          </div>
        </div>

        {/* Service Terms */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Terms</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Start Date</div>
                <div className="font-medium text-gray-900 flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(contract.startDate)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">End Date</div>
                <div className="font-medium text-gray-900">{formatDate(contract.endDate)}</div>
              </div>
              {contract.serviceFrequency && (
                <div>
                  <div className="text-sm text-gray-500">Service Frequency</div>
                  <div className="font-medium text-gray-900">
                    {frequencyLabels[contract.serviceFrequency] || contract.serviceFrequency}
                  </div>
                </div>
              )}
              {scheduleDays.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500">Scheduled Days</div>
                  <div className="font-medium text-gray-900">
                    {scheduleDays.map((day) => PUBLIC_DAY_LABELS[day] || day).join(', ')}
                  </div>
                </div>
              )}
              {scheduleWindow && (
                <div>
                  <div className="text-sm text-gray-500">Allowed Service Window</div>
                  <div className="font-medium text-gray-900">{scheduleWindow}</div>
                </div>
              )}
              {(facilityTimezone || scheduleWindow) && (
                <div>
                  <div className="text-sm text-gray-500">Timezone / Anchor</div>
                  <div className="font-medium text-gray-900">
                    {(facilityTimezone || 'Facility timezone')} (start day anchor)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Terms */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Financial Terms</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Monthly Value</div>
                <div className="text-xl font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                  <DollarSign className="h-5 w-5" />
                  {formatCurrency(contract.monthlyValue)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Billing Cycle</div>
                <div className="font-medium text-gray-900">
                  {billingCycleLabels[contract.billingCycle] || contract.billingCycle}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Payment Terms</div>
                <div className="font-medium text-gray-900">{contract.paymentTerms}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Facility Details */}
        {contract.facility?.address && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Location</h3>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="font-medium text-gray-900">{contract.facility.name}</div>
              <div className="text-sm text-gray-500 mt-1">{formatAddress(contract.facility.address)}</div>
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        {contract.termsAndConditions && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                {contract.termsAndConditions}
              </div>
            </div>
          </div>
        )}

        {/* Sign Button */}
        {canSign && !actionComplete && (
          <div className="flex justify-center py-8 border-t border-gray-200">
            <button
              onClick={() => setSignModalOpen(true)}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
              Sign Contract
            </button>
          </div>
        )}
      </main>

      {/* Sign Modal */}
      {signModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Sign Contract</h3>
            <p className="text-sm text-gray-600 mb-4">
              By signing, you agree to the terms and conditions outlined in this contract.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Full Name (as signature)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter your full name"
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter your email address"
                value={signedByEmail}
                onChange={(e) => setSignedByEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSignModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={!signedByName.trim() || !signedByEmail.trim() || submitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Signing...' : 'Confirm & Sign'}
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

export default PublicContractView;
