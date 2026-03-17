import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';
import {
  getPublicContractAmendment,
  signPublicContractAmendment,
} from '../../lib/publicContractAmendments';
import type { PublicContractAmendment } from '../../types/publicContractAmendment';
import type { GlobalBranding } from '../../types/globalSettings';

const formatCurrency = (amount: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount || 0));

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
  const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  return lines.join(', ');
};

const formatSchedule = (schedule: { days?: string[] } | null | undefined) =>
  (schedule?.days || []).map((day) => day.slice(0, 3)).join(', ') || 'Not configured';

const frequencyLabels: Record<string, string> = {
  '1x_week': '1x Week',
  '2x_week': '2x Week',
  '3x_week': '3x Week',
  '4x_week': '4x Week',
  '5x_week': '5x Week',
  '7x_week': '7x Week',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  bi_weekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const formatFrequency = (value: string | null | undefined) => {
  if (!value) return 'Not configured';
  return frequencyLabels[value] || value.replace(/_/g, ' ');
};

type AmendmentWorkingScope = {
  areas?: Array<Record<string, any>>;
  tasks?: Array<Record<string, any>>;
};

const getLatestWorkingScope = (
  amendment: PublicContractAmendment
): { areas: Array<Record<string, any>>; tasks: Array<Record<string, any>> } => {
  const workingSnapshot = [...(amendment.snapshots || [])]
    .reverse()
    .find((snapshot) => snapshot.snapshotType === 'working');
  const scope = (workingSnapshot?.scopeJson || {}) as AmendmentWorkingScope;
  return {
    areas: Array.isArray(scope.areas) ? scope.areas : [],
    tasks: Array.isArray(scope.tasks) ? scope.tasks : [],
  };
};

const getAreaDisplayName = (area: Record<string, any>, index: number) =>
  area.name || area.areaType?.name || `Area ${index + 1}`;

const getTaskDisplayName = (task: Record<string, any>, index: number) =>
  task.customName || task.taskTemplate?.name || task.name || `Task ${index + 1}`;

const getFrequencyOrder = (value: string | null | undefined) => {
  const order: Record<string, number> = {
    daily: 1,
    '1x_week': 2,
    weekly: 2,
    '2x_week': 3,
    '3x_week': 4,
    '4x_week': 5,
    '5x_week': 6,
    '7x_week': 7,
    biweekly: 8,
    bi_weekly: 8,
    monthly: 9,
    quarterly: 10,
    annually: 11,
  };
  return order[(value || '').toLowerCase()] ?? 99;
};

const groupTasksByFrequency = (tasks: Array<Record<string, any>>) => {
  const grouped = new Map<string, { tasks: Array<Record<string, any>>; order: number }>();
  for (const task of tasks) {
    const label = formatFrequency(task.cleaningFrequency);
    const current = grouped.get(label) || {
      tasks: [],
      order: getFrequencyOrder(task.cleaningFrequency),
    };
    current.tasks.push(task);
    grouped.set(label, current);
  }
  return [...grouped.entries()]
    .sort((a, b) => {
      if (a[1].order !== b[1].order) return a[1].order - b[1].order;
      return a[0].localeCompare(b[0]);
    })
    .map(([label, value]) => [label, value.tasks] as const);
};

const FrequencyTaskStepper = ({
  sectionKey,
  groupedTasks,
  accentColor,
  primaryColor,
}: {
  sectionKey: string;
  groupedTasks: Array<readonly [string, Array<Record<string, any>>]>;
  accentColor: string;
  primaryColor: string;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [sectionKey, groupedTasks.length]);

  if (groupedTasks.length === 0) {
    return <div className="mt-4 text-sm text-gray-500">No tasks listed.</div>;
  }

  const safeIndex = Math.min(activeIndex, Math.max(groupedTasks.length - 1, 0));
  const [activeFrequency, activeTasks] = groupedTasks[safeIndex];

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap gap-2">
        {groupedTasks.map(([frequency], index) => (
          <button
            key={`${sectionKey}-${frequency}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              index === safeIndex
                ? 'text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
            }`}
            style={index === safeIndex ? { backgroundColor: primaryColor } : undefined}
          >
            {frequency}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          {activeFrequency}
        </div>
        <div className="text-xs text-gray-500">
          {safeIndex + 1} of {groupedTasks.length}
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {activeTasks.map((task, taskIndex) => (
          <li
            key={`${sectionKey}-${activeFrequency}-${task.id || task.tempId || taskIndex}`}
            className="flex items-start gap-2 text-sm text-gray-700"
          >
            <span
              className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            {getTaskDisplayName(task, taskIndex)}
          </li>
        ))}
      </ul>
      {groupedTasks.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
            disabled={safeIndex === 0}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setActiveIndex((current) => Math.min(groupedTasks.length - 1, current + 1))}
            disabled={safeIndex >= groupedTasks.length - 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default function PublicContractAmendmentView(): React.JSX.Element {
  const { token } = useParams();
  const [amendment, setAmendment] = useState<PublicContractAmendment | null>(null);
  const [branding, setBranding] = useState<GlobalBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedByName, setSignedByName] = useState('');
  const [signedByEmail, setSignedByEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [actionComplete, setActionComplete] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) return;
      try {
        setLoading(true);
        const response = await getPublicContractAmendment(token);
        if (!ignore) {
          setAmendment(response.data);
          setBranding({
            ...response.branding,
            companyTimezone: response.branding.companyTimezone || 'UTC',
          });
        }
      } catch (err: any) {
        if (!ignore) {
          setError(
            err?.response?.status === 404
              ? 'This amendment was not found or the link has expired.'
              : err?.response?.data?.message || 'Failed to load amendment'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [token]);

  const canSign = useMemo(
    () => amendment && ['sent', 'viewed'].includes(amendment.status),
    [amendment]
  );

  const handleSign = async () => {
    if (!token || !signedByName.trim() || !signedByEmail.trim()) return;
    try {
      setSubmitting(true);
      const updated = await signPublicContractAmendment(token, signedByName.trim(), signedByEmail.trim());
      setAmendment(updated);
      setSignModalOpen(false);
      setActionComplete(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to sign amendment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !amendment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Amendment Not Available</h1>
          <p className="text-gray-500">{error || 'Amendment not found'}</p>
        </div>
      </div>
    );
  }

  const primaryColor = branding?.themePrimaryColor || '#1a1a2e';
  const accentColor = branding?.themeAccentColor || '#d4af37';
  const backgroundColor = branding?.themeBackgroundColor || '#f8fafc';
  const textColor = branding?.themeTextColor || '#111827';
  const workingScope = getLatestWorkingScope(amendment);
  const scopeAreaKeySet = new Set(
    workingScope.areas
      .map((area) => area.id || area.tempId)
      .filter((value): value is string => Boolean(value))
  );
  const facilityWideTasks = workingScope.tasks.filter((task) => !task.areaId || !scopeAreaKeySet.has(task.areaId));

  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      <header className="text-white" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              {branding?.logoDataUrl && (
                <img src={branding.logoDataUrl} alt={branding.companyName} className="mb-2 max-h-10 w-auto" />
              )}
              <h1 className="text-xl font-bold" style={{ color: accentColor }}>
                {branding?.companyName || amendment.contract.account.name}
              </h1>
              <p className="text-gray-300 text-sm mt-1">
                Contract Amendment #{amendment.amendmentNumber}
              </p>
            </div>
          </div>
        </div>
      </header>

      {actionComplete && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">Amendment Signed</p>
              <p className="text-sm text-green-600">Thank you for signing this amendment.</p>
            </div>
          </div>
        </div>
      )}

      {!actionComplete && amendment.status === 'signed' && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">This amendment has been signed</p>
              {amendment.signedByName && (
                <p className="text-sm text-green-600">
                  Signed by {amendment.signedByName} on {formatDate(amendment.signedDate)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold" style={{ color: textColor }}>{amendment.title}</h2>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {amendment.contract.account.name}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {amendment.contract.contractNumber}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Effective {formatDate(amendment.effectiveDate)}
            </span>
          </div>
        </div>

        {amendment.contract.facility && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Location</h3>
            <div className="font-medium text-gray-900">{amendment.contract.facility.name}</div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {formatAddress(amendment.contract.facility.address)}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Financial Terms</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Current Monthly Value</div>
                <div className="text-xl font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                  <DollarSign className="h-5 w-5" />
                  {formatCurrency(amendment.oldMonthlyValue)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Updated Monthly Value</div>
                <div className="text-xl font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                  <DollarSign className="h-5 w-5" />
                  {formatCurrency(amendment.newMonthlyValue)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Monthly Change</div>
                <div
                  className="text-xl font-bold"
                  style={{ color: Number(amendment.monthlyDelta || 0) >= 0 ? primaryColor : '#b91c1c' }}
                >
                  {formatCurrency(amendment.monthlyDelta)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Changes</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Current Service</div>
                <div className="mt-3 text-sm text-gray-500">Frequency</div>
                <div className="font-medium text-gray-900">{formatFrequency(amendment.oldServiceFrequency)}</div>
                <div className="mt-3 text-sm text-gray-500">Days</div>
                <div className="font-medium text-gray-900">{formatSchedule(amendment.oldServiceSchedule)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Updated Service</div>
                <div className="mt-3 text-sm text-gray-500">Frequency</div>
                <div className="font-medium text-gray-900">{formatFrequency(amendment.newServiceFrequency)}</div>
                <div className="mt-3 text-sm text-gray-500">Days</div>
                <div className="font-medium text-gray-900">{formatSchedule(amendment.newServiceSchedule)}</div>
              </div>
            </div>
            {amendment.summary && (
              <div className="mt-4">
                <div className="text-sm text-gray-500">Summary</div>
                <div className="mt-1 text-gray-700 whitespace-pre-wrap">{amendment.summary}</div>
              </div>
            )}
            {amendment.reason && (
              <div className="mt-4">
                <div className="text-sm text-gray-500">Reason for Change</div>
                <div className="mt-1 text-gray-700 whitespace-pre-wrap">{amendment.reason}</div>
              </div>
            )}
          </div>
        </div>

        {(workingScope.areas.length > 0 || facilityWideTasks.length > 0) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Updated Areas & Tasks</h3>
            <div className="space-y-4">
              {workingScope.areas.map((area, areaIndex) => {
                const areaId = area.id || area.tempId;
                const areaTasks = workingScope.tasks.filter((task) => task.areaId && task.areaId === areaId);
                const groupedTasks = groupTasksByFrequency(areaTasks);
                return (
                  <div key={areaId || `area-${areaIndex}`} className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{getAreaDisplayName(area, areaIndex)}</div>
                        <div className="text-sm text-gray-500">
                          {area.areaType?.name || area.type || 'Area'}
                          {area.squareFeet ? ` • ${area.squareFeet} sqft` : ''}
                        </div>
                      </div>
                    </div>
                    {groupedTasks.length > 0 ? (
                      <FrequencyTaskStepper
                        sectionKey={String(areaId || areaIndex)}
                        groupedTasks={groupedTasks}
                        accentColor={accentColor}
                        primaryColor={primaryColor}
                      />
                    ) : (
                      <div className="mt-4 text-sm text-gray-500">No area-specific tasks listed.</div>
                    )}
                  </div>
                );
              })}

              {facilityWideTasks.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="font-medium text-gray-900">Facility-Wide Tasks</div>
                  <div className="text-sm text-gray-500">Tasks that apply across the full facility</div>
                  <FrequencyTaskStepper
                    sectionKey="facility-wide"
                    groupedTasks={groupTasksByFrequency(facilityWideTasks)}
                    accentColor={accentColor}
                    primaryColor={primaryColor}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {canSign && !actionComplete && (
          <div className="flex justify-center py-8 border-t border-gray-200">
            <button
              onClick={() => setSignModalOpen(true)}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
              Sign Amendment
            </button>
          </div>
        )}
      </main>

      {signModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Sign Amendment</h3>
            <p className="text-sm text-gray-600 mb-4">
              By signing, you agree to the updated terms outlined in this amendment.
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

      <footer className="bg-gray-100 border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="font-medium text-gray-700">{branding?.companyName || 'Hygieia'}</p>
              {branding?.companyAddress && (
                <p className="text-sm text-gray-400 mt-0.5">{branding.companyAddress}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
              {branding?.companyPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {branding.companyPhone}
                </span>
              )}
              {branding?.companyEmail && (
                <a href={`mailto:${branding.companyEmail}`} className="flex items-center gap-1 hover:text-gray-600 transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  {branding.companyEmail}
                </a>
              )}
              {branding?.companyWebsite && (
                <a
                  href={branding.companyWebsite.startsWith('http') ? branding.companyWebsite : `https://${branding.companyWebsite}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-gray-600 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {branding.companyWebsite.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
