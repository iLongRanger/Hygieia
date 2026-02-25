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
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
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

const formatHours = (hours: number | null | undefined): string => {
  if (hours == null || Number.isNaN(Number(hours))) return '-';
  return `${Math.round(Number(hours))} hrs`;
};

const formatAddress = (
  address: NonNullable<PublicProposal['facility']>['address']
): string => {
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

type TaskGroup = { key: string; label: string; tasks: string[] };
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
  const visibleProposalItems = (proposal.proposalItems || []).filter(
    (item) => Number(item.totalPrice || 0) > 0
  );

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
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Prepared {formatDate(proposal.sentAt || proposal.createdAt)}
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

        {/* Facility Info */}
        {proposal.facility && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Facility</h3>
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-gray-900">{proposal.facility.name}</div>
                {proposal.facility.address && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {formatAddress(proposal.facility.address)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {proposal.pricingSnapshot?.operationalEstimate && (
          <div className="mb-8 bg-blue-50 rounded-lg border border-blue-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Estimated Time On Site</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">Duration Per Visit</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatHours(proposal.pricingSnapshot.operationalEstimate.durationRangePerVisit?.minHours)}
                  {' - '}
                  {formatHours(proposal.pricingSnapshot.operationalEstimate.durationRangePerVisit?.maxHours)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">Crew Size</p>
                <p className="text-base font-semibold text-gray-900">
                  {proposal.pricingSnapshot.operationalEstimate.recommendedCrewSize || 1} cleaners
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">Labor Hours / Visit</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatHours(proposal.pricingSnapshot.operationalEstimate.hoursPerVisit)}
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-800 mt-3">
              On-site duration is an estimate and may vary based on condition and access on service day.
            </p>
          </div>
        )}

        {/* Services & Areas Breakdown */}
        {proposal.proposalServices.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Services & Areas</h3>

            {/* Services detail cards */}
            <div className="space-y-4 mb-4">
              {proposal.proposalServices.map((service, idx) => {
                const includedTasks = Array.isArray(service.includedTasks) ? service.includedTasks : [];
                const lines = service.description?.split('\n') || [];
                const areaInfo = lines[0] || '';
                const taskGroups = buildTaskGroups(service.description, includedTasks);

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-gray-200 p-5"
                  >
                    {/* Service header */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-base">{service.serviceName}</h4>
                        {areaInfo && (
                          <p className="text-sm text-gray-500 mt-0.5">{areaInfo}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-lg font-semibold" style={{ color: primaryColor }}>
                          {formatCurrency(Number(service.monthlyPrice) || 0)}
                          <span className="text-sm font-normal text-gray-500">/mo</span>
                        </div>
                        {service.estimatedHours != null && Number(service.estimatedHours) > 0 && service.hourlyRate != null && Number(service.hourlyRate) > 0 && (
                          <div className="text-sm text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatHours(Number(service.estimatedHours) || 0)} @ {formatCurrency(Number(service.hourlyRate) || 0)}/hr
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Frequency badge */}
                    <div className="mb-3">
                      <span
                        className="inline-block text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}
                      >
                        {frequencyLabels[service.frequency] || service.frequency}
                      </span>
                    </div>

                    {/* Tasks grouped by frequency */}
                    {taskGroups.length > 0 && (
                      <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                        {taskGroups.map((group, gIdx) => (
                          <div key={gIdx}>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                              {group.label}
                            </p>
                            <ul className="space-y-1 ml-1">
                              {group.tasks.map((task, tIdx) => (
                                <li key={tIdx} className="flex items-start gap-2 text-sm text-gray-600">
                                  <span
                                    className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: accentColor }}
                                  />
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

            {/* Services summary table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead style={{ backgroundColor: `${primaryColor}08` }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                    {proposal.proposalServices.some((s) => s.estimatedHours != null && Number(s.estimatedHours) > 0) && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monthly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proposal.proposalServices.map((service, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{service.serviceName}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {frequencyLabels[service.frequency] || service.frequency}
                      </td>
                      {proposal.proposalServices.some((s) => s.estimatedHours != null && Number(s.estimatedHours) > 0) && (
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {service.estimatedHours != null && Number(service.estimatedHours) > 0
                            ? formatHours(Number(service.estimatedHours) || 0)
                            : '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(Number(service.monthlyPrice) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200" style={{ backgroundColor: `${primaryColor}05` }}>
                    <td className="px-4 py-3 font-semibold text-gray-900">Total</td>
                    <td className="px-4 py-3" />
                    {proposal.proposalServices.some((s) => s.estimatedHours != null && Number(s.estimatedHours) > 0) && (
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        {formatHours(proposal.proposalServices.reduce((sum, s) => sum + (Number(s.estimatedHours) || 0), 0))}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-bold" style={{ color: primaryColor }}>
                      {formatCurrency(proposal.proposalServices.reduce((sum, s) => sum + (Number(s.monthlyPrice) || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Line Items */}
        {visibleProposalItems.length > 0 && (
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
                  {visibleProposalItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(Number(item.unitPrice) || 0)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(Number(item.totalPrice) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" style={{ color: accentColor }} />
              Financial Summary
            </span>
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Monthly Subtotal</span>
                <span className="text-gray-900 font-medium">{formatCurrency(Number(proposal.subtotal) || 0)}</span>
              </div>
              {(Number(proposal.taxRate) || 0) > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Tax ({((Number(proposal.taxRate) || 0) * 100).toFixed(1)}%)</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(Number(proposal.taxAmount) || 0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-gray-200">
                <span className="text-xl font-bold text-gray-900">Monthly Total</span>
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  {formatCurrency(Number(proposal.totalAmount) || 0)}
                </span>
              </div>
              {(Number(proposal.totalAmount) || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>Annual Estimate</span>
                  <span>{formatCurrency((Number(proposal.totalAmount) || 0) * 12)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
              This proposal is valid until <strong>{formatDate(proposal.validUntil)}</strong>.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
              All prices shown are monthly recurring charges unless otherwise noted.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
              Acceptance of this proposal constitutes agreement to the services and pricing described herein.
            </li>
          </ul>
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
                <a href={branding.companyWebsite.startsWith('http') ? branding.companyWebsite : `https://${branding.companyWebsite}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gray-600 transition-colors">
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
};

export default PublicProposalView;
