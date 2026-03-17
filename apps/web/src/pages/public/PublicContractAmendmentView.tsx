import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, FileSignature, Calendar, DollarSign, Building2, MapPin } from 'lucide-react';
import {
  getPublicContractAmendment,
  signPublicContractAmendment,
} from '../../lib/publicContractAmendments';
import type { PublicContractAmendment } from '../../types/publicContractAmendment';

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
  return [address.street, address.city, address.state, address.postalCode].filter(Boolean).join(', ');
};

const formatSchedule = (schedule: { days?: string[] } | null | undefined) =>
  (schedule?.days || []).map((day) => day.slice(0, 3)).join(', ') || 'Not configured';

export default function PublicContractAmendmentView(): React.JSX.Element {
  const { token } = useParams();
  const [amendment, setAmendment] = useState<PublicContractAmendment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedByName, setSignedByName] = useState('');
  const [signedByEmail, setSignedByEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) return;
      try {
        setLoading(true);
        const response = await getPublicContractAmendment(token);
        if (!ignore) {
          setAmendment(response.data);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.response?.data?.message || 'Failed to load amendment');
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
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to sign amendment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-8 text-white">Loading amendment...</div>;
  }

  if (error || !amendment) {
    return <div className="min-h-screen bg-slate-950 p-8 text-rose-300">{error || 'Amendment not found'}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Contract Amendment</div>
              <h1 className="mt-2 text-3xl font-semibold">{amendment.title}</h1>
              <div className="mt-2 text-sm text-gray-300">
                Amendment #{amendment.amendmentNumber} for {amendment.contract.contractNumber}
              </div>
            </div>
            {amendment.status === 'signed' && (
              <div className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm text-emerald-200">
                Signed
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Building2 className="h-4 w-4" /> {amendment.contract.account.name}
            </div>
            {amendment.contract.facility && (
              <>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-300">
                  <MapPin className="h-4 w-4" /> {amendment.contract.facility.name}
                </div>
                <div className="mt-1 text-sm text-gray-400">
                  {formatAddress(amendment.contract.facility.address)}
                </div>
              </>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Calendar className="h-4 w-4" /> Effective {formatDate(amendment.effectiveDate)}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-300">
              <DollarSign className="h-4 w-4" /> {formatCurrency(amendment.oldMonthlyValue)} to{' '}
              {formatCurrency(amendment.newMonthlyValue)}
            </div>
            <div className="mt-1 text-sm text-gray-400">
              Delta: {formatCurrency(amendment.monthlyDelta)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-medium text-gray-200">Service Changes</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Current Schedule</div>
              <div className="mt-2 text-sm text-gray-300">{formatSchedule(amendment.oldServiceSchedule)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Updated Schedule</div>
              <div className="mt-2 text-sm text-gray-300">{formatSchedule(amendment.newServiceSchedule)}</div>
            </div>
          </div>
          {amendment.summary && <div className="mt-4 text-sm text-gray-300">{amendment.summary}</div>}
          {amendment.reason && <div className="mt-2 text-sm text-gray-400">{amendment.reason}</div>}
        </div>

        {amendment.status === 'signed' ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-emerald-100">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              Signed by {amendment.signedByName} on {formatDate(amendment.signedDate)}
            </div>
          </div>
        ) : canSign ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <FileSignature className="h-4 w-4" /> Sign Amendment
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                placeholder="Your full name"
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                placeholder="Your email"
                value={signedByEmail}
                onChange={(e) => setSignedByEmail(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleSign}
              disabled={submitting || !signedByName.trim() || !signedByEmail.trim()}
              className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            >
              {submitting ? 'Signing...' : 'Sign Amendment'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
