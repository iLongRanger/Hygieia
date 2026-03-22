import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Home,
  Plus,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Textarea } from '../../components/ui/Textarea';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import { listAccounts } from '../../lib/accounts';
import {
  acceptResidentialQuote,
  archiveResidentialQuote,
  convertResidentialQuote,
  createResidentialQuote,
  declineResidentialQuote,
  listResidentialPricingPlans,
  listResidentialQuotes,
  previewResidentialQuote,
  restoreResidentialQuote,
  sendResidentialQuote,
  updateResidentialQuote,
} from '../../lib/residential';
import type { Account } from '../../types/crm';
import type {
  ResidentialFrequency,
  ResidentialHomeType,
  ResidentialPricingPlan,
  ResidentialQuote,
  ResidentialQuoteFormInput,
  ResidentialQuotePreview,
  ResidentialServiceType,
} from '../../types/residential';

const STEP_TITLES = ['Home', 'Cleaning Type', 'Condition & Access', 'Add-Ons', 'Review'] as const;

const SERVICE_OPTIONS = [
  { value: 'recurring_standard', label: 'Recurring Standard' },
  { value: 'one_time_standard', label: 'One-Time Standard' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'move_in_out', label: 'Move In / Out' },
  { value: 'turnover', label: 'Vacation Rental Turnover' },
  { value: 'post_construction', label: 'Post Construction' },
] as const;

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'every_4_weeks', label: 'Every 4 Weeks' },
  { value: 'one_time', label: 'One Time' },
] as const;

const HOME_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'single_family', label: 'Single Family' },
] as const;

const CONDITION_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'standard', label: 'Standard' },
  { value: 'heavy', label: 'Heavy / Reset Needed' },
] as const;

const OCCUPANCY_OPTIONS = [
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'move_in', label: 'Move In' },
  { value: 'move_out', label: 'Move Out' },
] as const;

const DEFAULT_FORM: ResidentialQuoteFormInput = {
  accountId: '',
  title: '',
  serviceType: 'recurring_standard',
  frequency: 'weekly',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  homeAddress: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
  },
  homeProfile: {
    homeType: 'single_family',
    squareFeet: 1800,
    bedrooms: 3,
    fullBathrooms: 2,
    halfBathrooms: 0,
    levels: 1,
    occupiedStatus: 'occupied',
    condition: 'standard',
    hasPets: false,
    lastProfessionalCleaning: '',
    parkingAccess: '',
    entryNotes: '',
    specialInstructions: '',
    isFirstVisit: false,
  },
  pricingPlanId: '',
  addOns: [],
  preferredStartDate: '',
  notes: '',
};

function normalizeResidentialHomeProfile(
  profile:
    | {
        homeType?: ResidentialHomeType | null;
        squareFeet?: number | null;
        bedrooms?: number | null;
        fullBathrooms?: number | null;
        halfBathrooms?: number | null;
        levels?: number | null;
        occupiedStatus?: ResidentialQuoteFormInput['homeProfile']['occupiedStatus'] | null;
        condition?: ResidentialQuoteFormInput['homeProfile']['condition'] | null;
        hasPets?: boolean | null;
        lastProfessionalCleaning?: string | null;
        parkingAccess?: string | null;
        entryNotes?: string | null;
        specialInstructions?: string | null;
        isFirstVisit?: boolean | null;
      }
    | null
    | undefined
) {
  return {
    ...DEFAULT_FORM.homeProfile,
    ...profile,
    homeType: profile?.homeType ?? DEFAULT_FORM.homeProfile.homeType,
    squareFeet: profile?.squareFeet ?? DEFAULT_FORM.homeProfile.squareFeet,
    bedrooms: profile?.bedrooms ?? DEFAULT_FORM.homeProfile.bedrooms,
    fullBathrooms: profile?.fullBathrooms ?? DEFAULT_FORM.homeProfile.fullBathrooms,
    halfBathrooms: profile?.halfBathrooms ?? DEFAULT_FORM.homeProfile.halfBathrooms,
    levels: profile?.levels ?? DEFAULT_FORM.homeProfile.levels,
    occupiedStatus: profile?.occupiedStatus ?? DEFAULT_FORM.homeProfile.occupiedStatus,
    condition: profile?.condition ?? DEFAULT_FORM.homeProfile.condition,
    hasPets: profile?.hasPets ?? DEFAULT_FORM.homeProfile.hasPets,
    isFirstVisit: profile?.isFirstVisit ?? DEFAULT_FORM.homeProfile.isFirstVisit,
    lastProfessionalCleaning: profile?.lastProfessionalCleaning ?? DEFAULT_FORM.homeProfile.lastProfessionalCleaning,
    parkingAccess: profile?.parkingAccess ?? DEFAULT_FORM.homeProfile.parkingAccess,
    entryNotes: profile?.entryNotes ?? DEFAULT_FORM.homeProfile.entryNotes,
    specialInstructions: profile?.specialInstructions ?? DEFAULT_FORM.homeProfile.specialInstructions,
  };
}

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function statusVariant(status: ResidentialQuote['status']) {
  switch (status) {
    case 'accepted':
    case 'converted':
      return 'success';
    case 'sent':
    case 'viewed':
      return 'info';
    case 'declined':
    case 'expired':
      return 'error';
    default:
      return 'warning';
  }
}

function defaultTitle(serviceType: ResidentialServiceType, customerName: string, homeType: ResidentialHomeType) {
  const serviceLabel =
    SERVICE_OPTIONS.find((option) => option.value === serviceType)?.label ?? 'Residential Cleaning';
  if (customerName.trim()) {
    return `${serviceLabel} for ${customerName}`;
  }
  const homeLabel = HOME_TYPE_OPTIONS.find((option) => option.value === homeType)?.label ?? 'Home';
  return `${serviceLabel} ${homeLabel} Quote`;
}

const ResidentialQuotesPage = () => {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWrite = hasPermission(PERMISSIONS.QUOTATIONS_WRITE);
  const canAdmin = hasPermission(PERMISSIONS.QUOTATIONS_ADMIN);
  const [quotes, setQuotes] = useState<ResidentialQuote[]>([]);
  const [plans, setPlans] = useState<ResidentialPricingPlan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<ResidentialQuote | null>(null);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ResidentialQuoteFormInput>(DEFAULT_FORM);
  const [preview, setPreview] = useState<ResidentialQuotePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === formData.pricingPlanId) ?? plans.find((plan) => plan.isDefault) ?? null,
    [plans, formData.pricingPlanId]
  );
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === formData.accountId) ?? null,
    [accounts, formData.accountId]
  );

  const availableAddOns = selectedPlan ? Object.entries(selectedPlan.settings.addOnPrices) : [];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [quotesResponse, plansResponse, accountsResponse] = await Promise.all([
        listResidentialQuotes({
          limit: 100,
          search: search || undefined,
          status: (statusFilter || undefined) as ResidentialQuote['status'] | undefined,
          includeArchived: true,
        }),
        listResidentialPricingPlans({ limit: 100, includeArchived: false, isActive: true }),
        listAccounts({ limit: 100, type: 'residential', includeArchived: false }),
      ]);
      setQuotes(quotesResponse.data);
      setPlans(plansResponse.data);
      setAccounts(accountsResponse.data);
    } catch (error) {
      console.error('Failed to load residential data', error);
      toast.error('Failed to load residential quotes');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!formData.pricingPlanId && plans.length > 0) {
      const defaultPlan = plans.find((plan) => plan.isDefault) ?? plans[0];
      setFormData((current) => ({ ...current, pricingPlanId: defaultPlan.id }));
    }
  }, [plans, formData.pricingPlanId]);

  useEffect(() => {
    if (!selectedAccount) return;

    setFormData((current) => ({
      ...current,
      customerName: selectedAccount.name,
      customerEmail: selectedAccount.billingEmail ?? '',
      customerPhone: selectedAccount.billingPhone ?? '',
      homeAddress: selectedAccount.serviceAddress ?? selectedAccount.billingAddress ?? current.homeAddress,
      homeProfile: selectedAccount.residentialProfile
        ? normalizeResidentialHomeProfile(selectedAccount.residentialProfile)
        : current.homeProfile,
    }));
  }, [selectedAccount]);

  useEffect(() => {
    const hasCoreFields =
      formData.pricingPlanId &&
      formData.serviceType &&
      formData.frequency &&
      formData.homeProfile.squareFeet > 0;

    if (!hasCoreFields) {
      setPreview(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const nextPreview = await previewResidentialQuote({
          serviceType: formData.serviceType,
          frequency: formData.frequency,
          homeAddress: formData.homeAddress,
          homeProfile: formData.homeProfile,
          pricingPlanId: formData.pricingPlanId,
          addOns: formData.addOns,
        });
        setPreview(nextPreview);
      } catch (error) {
        console.error('Failed to preview residential quote', error);
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [formData]);

  const openCreateModal = () => {
    setEditingQuote(null);
    const defaultPlan = plans.find((plan) => plan.isDefault) ?? plans[0];
    const defaultAccount = accounts[0];
    setFormData({
      ...DEFAULT_FORM,
      accountId: defaultAccount?.id ?? '',
      customerName: defaultAccount?.name ?? '',
      customerEmail: defaultAccount?.billingEmail ?? '',
      customerPhone: defaultAccount?.billingPhone ?? '',
      homeAddress: defaultAccount?.serviceAddress ?? defaultAccount?.billingAddress ?? DEFAULT_FORM.homeAddress,
      homeProfile: defaultAccount?.residentialProfile
        ? normalizeResidentialHomeProfile(defaultAccount.residentialProfile)
        : DEFAULT_FORM.homeProfile,
      pricingPlanId: defaultPlan?.id ?? '',
    });
    setPreview(null);
    setStep(0);
    setIsModalOpen(true);
  };

  const openEditModal = (quote: ResidentialQuote) => {
    setEditingQuote(quote);
    setFormData({
      title: quote.title,
      accountId: quote.accountId ?? quote.account?.id ?? '',
      serviceType: quote.serviceType,
      frequency: quote.frequency,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail ?? '',
      customerPhone: quote.customerPhone ?? '',
      homeAddress: quote.homeAddress ?? DEFAULT_FORM.homeAddress,
      homeProfile: quote.homeProfile ?? DEFAULT_FORM.homeProfile,
      pricingPlanId: quote.pricingPlan?.id ?? plans.find((plan) => plan.isDefault)?.id ?? '',
      addOns:
        quote.addOns?.map((addOn) => ({
          code: addOn.code,
          quantity: addOn.quantity,
          label: addOn.label,
        })) ?? [],
      preferredStartDate: quote.preferredStartDate ?? '',
      notes: quote.notes ?? '',
    });
    setPreview(null);
    setStep(0);
    setIsModalOpen(true);
  };

  const toggleAddOn = (code: string) => {
    setFormData((current) => {
      const existing = current.addOns?.find((addOn) => addOn.code === code);
      if (existing) {
        return {
          ...current,
          addOns: current.addOns?.filter((addOn) => addOn.code !== code) ?? [],
        };
      }
      return {
        ...current,
        addOns: [...(current.addOns ?? []), { code, quantity: 1 }],
      };
    });
  };

  const updateAddOnQuantity = (code: string, quantity: number) => {
    setFormData((current) => ({
      ...current,
      addOns:
        current.addOns?.map((addOn) =>
          addOn.code === code ? { ...addOn, quantity: Math.max(1, quantity) } : addOn
        ) ?? [],
    }));
  };

  const saveQuote = async () => {
    try {
      const payload: ResidentialQuoteFormInput = {
        ...formData,
        title:
          formData.title.trim() ||
          defaultTitle(formData.serviceType, formData.customerName, formData.homeProfile.homeType),
      };

      if (editingQuote) {
        await updateResidentialQuote(editingQuote.id, payload);
        toast.success('Residential quote updated');
      } else {
        await createResidentialQuote(payload);
        toast.success('Residential quote created');
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to save residential quote', error);
      toast.error('Failed to save residential quote');
    }
  };

  const handleSend = async (quote: ResidentialQuote) => {
    try {
      const result = await sendResidentialQuote(quote.id, quote.customerEmail ?? undefined);
      if (result.publicUrl) {
        toast.success(result.emailTo ? 'Residential quote sent to client' : 'Residential quote link created');
      } else {
        toast.success('Residential quote marked as sent');
      }
      await fetchData();
    } catch (error) {
      console.error('Failed to send residential quote', error);
      toast.error('Failed to mark quote as sent');
    }
  };

  const handleAccept = async (quote: ResidentialQuote) => {
    try {
      await acceptResidentialQuote(quote.id);
      toast.success('Residential quote accepted');
      await fetchData();
    } catch (error) {
      console.error('Failed to accept residential quote', error);
      toast.error('Failed to accept quote');
    }
  };

  const handleDecline = async (quote: ResidentialQuote) => {
    const reason = window.prompt('Reason for decline (optional):') ?? undefined;
    try {
      await declineResidentialQuote(quote.id, reason);
      toast.success('Residential quote declined');
      await fetchData();
    } catch (error) {
      console.error('Failed to decline residential quote', error);
      toast.error('Failed to decline quote');
    }
  };

  const handleConvert = async (quote: ResidentialQuote) => {
    try {
      const contract = await convertResidentialQuote(quote.id, {
        startDate: quote.preferredStartDate ?? undefined,
      });
      toast.success(`Converted to contract ${contract.contractNumber}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to convert residential quote', error);
      toast.error('Failed to convert quote to contract');
    }
  };

  const handleArchiveToggle = async (quote: ResidentialQuote) => {
    try {
      if (quote.archivedAt) {
        await restoreResidentialQuote(quote.id);
        toast.success('Residential quote restored');
      } else {
        await archiveResidentialQuote(quote.id);
        toast.success('Residential quote archived');
      }
      await fetchData();
    } catch (error) {
      console.error('Failed to update residential quote archive state', error);
      toast.error('Failed to update quote archive state');
    }
  };

  const selectedAddOnCodes = new Set(formData.addOns?.map((addOn) => addOn.code));

  const columns = [
    {
      header: 'Quote',
      cell: (quote: ResidentialQuote) => (
        <button
          type="button"
          onClick={() => openEditModal(quote)}
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {quote.quoteNumber}
        </button>
      ),
    },
    {
      header: 'Customer',
      cell: (quote: ResidentialQuote) => (
        <div>
          <div className="font-medium text-surface-900 dark:text-surface-100">{quote.customerName}</div>
          <div className="text-xs text-surface-500">{quote.customerEmail || quote.customerPhone || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Service',
      cell: (quote: ResidentialQuote) => (
        <div className="text-sm text-surface-700 dark:text-surface-300">
          <div>{SERVICE_OPTIONS.find((option) => option.value === quote.serviceType)?.label}</div>
          <div className="text-xs text-surface-500">
            {FREQUENCY_OPTIONS.find((option) => option.value === quote.frequency)?.label}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (quote: ResidentialQuote) => (
        <Badge variant={statusVariant(quote.status)}>{quote.status.replace(/_/g, ' ')}</Badge>
      ),
    },
    {
      header: 'Total',
      cell: (quote: ResidentialQuote) => (
        <div className="font-medium text-surface-900 dark:text-surface-100">
          {formatCurrency(quote.totalAmount)}
        </div>
      ),
    },
    {
      header: 'Confidence',
      cell: (quote: ResidentialQuote) => (
        <Badge
          variant={
            quote.confidenceLevel === 'low'
              ? 'error'
              : quote.confidenceLevel === 'medium'
                ? 'warning'
                : 'success'
          }
        >
          {quote.confidenceLevel}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (quote: ResidentialQuote) => (
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <Button variant="outline" size="sm" onClick={() => openEditModal(quote)}>
              Edit
            </Button>
          )}
          {canWrite && ['draft', 'quoted', 'viewed'].includes(quote.status) && (
            <Button variant="outline" size="sm" onClick={() => handleSend(quote)}>
              Send
            </Button>
          )}
          {canWrite && ['draft', 'quoted', 'sent', 'viewed'].includes(quote.status) && (
            <Button variant="outline" size="sm" onClick={() => handleAccept(quote)}>
              Accept
            </Button>
          )}
          {canWrite && !['declined', 'converted'].includes(quote.status) && (
            <Button variant="outline" size="sm" onClick={() => handleDecline(quote)}>
              Decline
            </Button>
          )}
          {canWrite && quote.status === 'accepted' && (
            <Button size="sm" onClick={() => handleConvert(quote)}>
              Convert
            </Button>
          )}
          {canAdmin && (
            <Button variant="outline" size="sm" onClick={() => handleArchiveToggle(quote)}>
              {quote.archivedAt ? 'Restore' : 'Archive'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Residential Quotes
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Build flat-rate residential quotes with guided pricing, confidence signals, and contract conversion.
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreateModal} disabled={accounts.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            New Residential Quote
          </Button>
        )}
      </div>

      {accounts.length === 0 && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-warning-50 p-2 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <Badge variant="warning" size="sm">Account Required</Badge>
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Create a residential account first. Residential quotes are CRM-linked and must belong to an existing residential account.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr,220px]">
        <Input
          label="Search Quotes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by customer, quote number, or title"
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'quoted', label: 'Quoted' },
            { value: 'sent', label: 'Sent' },
            { value: 'viewed', label: 'Viewed' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'declined', label: 'Declined' },
            { value: 'converted', label: 'Converted' },
          ]}
          placeholder="All statuses"
        />
      </div>

      <Table data={quotes} columns={columns} isLoading={loading} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuote ? 'Edit Residential Quote' : 'New Residential Quote'}
        size="3xl"
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {STEP_TITLES.map((title, index) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    step === index
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
                  }`}
                >
                  {index + 1}. {title}
                </button>
              ))}
            </div>

            {step === 0 && (
              <Card className="space-y-4 p-4">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-surface-100">Account and Home Profile</h3>
                  <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    Start with an existing residential account, then capture the home details. Hygieia now keeps residential quoting inside the CRM instead of creating standalone customer records.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Residential Account"
                    value={formData.accountId}
                    options={accounts.map((account) => ({ value: account.id, label: account.name }))}
                    onChange={(value) =>
                      setFormData((current) => ({ ...current, accountId: value }))
                    }
                    placeholder="Select a residential account"
                  />
                  <Input
                    label="Quote Title"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, title: event.target.value }))
                    }
                    hint="Leave blank and Hygieia will generate a title from the service and customer"
                  />
                  <Input
                    label="Billing Email"
                    value={formData.customerEmail ?? ''}
                    readOnly
                    hint="Comes from the selected residential account"
                  />
                  <Input
                    label="Billing Phone"
                    value={formData.customerPhone ?? ''}
                    readOnly
                    hint="Comes from the selected residential account"
                  />
                  <Select
                    label="Home Type"
                    value={formData.homeProfile.homeType}
                    options={[...HOME_TYPE_OPTIONS]}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: { ...current.homeProfile, homeType: value as ResidentialHomeType },
                      }))
                    }
                  />
                  <Select
                    label="Pricing Plan"
                    value={formData.pricingPlanId ?? ''}
                    options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
                    onChange={(value) =>
                      setFormData((current) => ({ ...current, pricingPlanId: value }))
                    }
                  />
                  <Input
                    type="number"
                    label="Square Feet"
                    value={formData.homeProfile.squareFeet}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          squareFeet: Number(event.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    type="date"
                    label="Preferred Start Date"
                    value={formData.preferredStartDate ?? ''}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        preferredStartDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </Card>
            )}

            {step === 1 && (
              <Card className="space-y-4 p-4">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-surface-100">Cleaning Type</h3>
                  <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    Service type and frequency drive the biggest price movement after the home profile.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Service Type"
                    value={formData.serviceType}
                    options={[...SERVICE_OPTIONS]}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        serviceType: value as ResidentialServiceType,
                      }))
                    }
                  />
                  <Select
                    label="Frequency"
                    value={formData.frequency}
                    options={[...FREQUENCY_OPTIONS]}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        frequency: value as ResidentialFrequency,
                      }))
                    }
                  />
                  <Input
                    type="number"
                    label="Bedrooms"
                    value={formData.homeProfile.bedrooms}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          bedrooms: Number(event.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    label="Full Bathrooms"
                    value={formData.homeProfile.fullBathrooms}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          fullBathrooms: Number(event.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    label="Half Bathrooms"
                    value={formData.homeProfile.halfBathrooms}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          halfBathrooms: Number(event.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    label="Levels"
                    value={formData.homeProfile.levels}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          levels: Number(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card className="space-y-4 p-4">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-surface-100">Condition and Access</h3>
                  <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    This tells Hygieia whether the home is a fast maintenance clean or a slower reset job.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Condition"
                    value={formData.homeProfile.condition}
                    options={[...CONDITION_OPTIONS]}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          condition: value as ResidentialQuoteFormInput['homeProfile']['condition'],
                        },
                      }))
                    }
                  />
                  <Select
                    label="Occupancy"
                    value={formData.homeProfile.occupiedStatus}
                    options={[...OCCUPANCY_OPTIONS]}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          occupiedStatus: value as ResidentialQuoteFormInput['homeProfile']['occupiedStatus'],
                        },
                      }))
                    }
                  />
                  <Input
                    label="Last Professional Cleaning"
                    value={formData.homeProfile.lastProfessionalCleaning ?? ''}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          lastProfessionalCleaning: event.target.value,
                        },
                      }))
                    }
                  />
                  <Input
                    label="Parking / Access"
                    value={formData.homeProfile.parkingAccess ?? ''}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        homeProfile: {
                          ...current.homeProfile,
                          parkingAccess: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-lg border border-surface-200 px-3 py-2 text-sm dark:border-surface-700">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.homeProfile.hasPets)}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          homeProfile: {
                            ...current.homeProfile,
                            hasPets: event.target.checked,
                          },
                        }))
                      }
                    />
                    Pets in home
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-surface-200 px-3 py-2 text-sm dark:border-surface-700">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.homeProfile.isFirstVisit)}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          homeProfile: {
                            ...current.homeProfile,
                            isFirstVisit: event.target.checked,
                          },
                        }))
                      }
                    />
                    First visit / first clean
                  </label>
                </div>
                <Textarea
                  label="Entry Notes"
                  value={formData.homeProfile.entryNotes ?? ''}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      homeProfile: {
                        ...current.homeProfile,
                        entryNotes: event.target.value,
                      },
                    }))
                  }
                />
                <Textarea
                  label="Special Instructions"
                  value={formData.homeProfile.specialInstructions ?? ''}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      homeProfile: {
                        ...current.homeProfile,
                        specialInstructions: event.target.value,
                      },
                    }))
                  }
                />
              </Card>
            )}

            {step === 3 && (
              <Card className="space-y-4 p-4">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-surface-100">Add-Ons</h3>
                  <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    Add-ons directly increase the quote and estimated time. Hygieia shows the exact impact in the review rail.
                  </p>
                </div>
                <div className="grid gap-3">
                  {availableAddOns.map(([code, definition]) => {
                    const selected = selectedAddOnCodes.has(code);
                    const selectedItem = formData.addOns?.find((addOn) => addOn.code === code);
                    return (
                      <div
                        key={code}
                        className={`rounded-xl border p-4 ${
                          selected
                            ? 'border-primary-300 bg-primary-50/60 dark:border-primary-700 dark:bg-primary-950/20'
                            : 'border-surface-200 dark:border-surface-700'
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-medium capitalize text-surface-900 dark:text-surface-100">
                              {code.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm text-surface-500 dark:text-surface-400">
                              {definition.description || 'Residential add-on'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="info">
                              {formatCurrency(definition.unitPrice)}
                              {definition.pricingType === 'per_unit' && ` / ${definition.unitLabel || 'unit'}`}
                            </Badge>
                            <Button
                              variant={selected ? 'outline' : 'primary'}
                              size="sm"
                              onClick={() => toggleAddOn(code)}
                            >
                              {selected ? 'Remove' : 'Add'}
                            </Button>
                          </div>
                        </div>
                        {selected && (
                          <div className="mt-3 max-w-[220px]">
                            <Input
                              type="number"
                              min={1}
                              label="Quantity"
                              value={selectedItem?.quantity ?? 1}
                              onChange={(event) => updateAddOnQuantity(code, Number(event.target.value))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {step === 4 && (
              <Card className="space-y-4 p-4">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-surface-100">Review and Notes</h3>
                  <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    Finalize client notes and confirm what drives the quote before saving or sending.
                  </p>
                </div>
                <Textarea
                  label="Internal Notes"
                  value={formData.notes ?? ''}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, notes: event.target.value }))
                  }
                />
                {preview?.breakdown.manualReviewReasons?.length ? (
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-warning-50 p-2 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <Badge variant="warning" size="sm">Manual Review</Badge>
                        <div className="text-sm font-medium text-surface-900 dark:text-surface-100">
                          This quote needs review before it should be sent to the client.
                        </div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-surface-600 dark:text-surface-300">
                          {preview.breakdown.manualReviewReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-success-50 p-2 text-success-700 dark:bg-success-900/30 dark:text-success-300">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="space-y-2">
                        <Badge variant="success" size="sm">Auto-Quote Ready</Badge>
                        <p className="text-sm text-surface-700 dark:text-surface-300">
                          Hygieia considers this a confident auto-quote based on the current home profile, service type, and add-ons.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </Card>
            )}

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {step < STEP_TITLES.length - 1 ? (
                <Button onClick={() => setStep((current) => Math.min(STEP_TITLES.length - 1, current + 1))}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={saveQuote} disabled={!formData.accountId || !formData.customerName.trim() || !preview}>
                  Save Residential Quote
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="sticky top-0 space-y-4 p-4">
              <div>
                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Hygieia Preview</span>
                </div>
                <h3 className="mt-2 text-xl font-semibold text-surface-900 dark:text-surface-100">
                  {previewLoading ? 'Updating quote...' : preview ? formatCurrency(preview.breakdown.finalTotal) : '$0'}
                </h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  {selectedPlan ? `${selectedPlan.name} drives this estimate` : 'Select a pricing plan to preview'}
                </p>
              </div>

              {preview ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Base Subtotal</div>
                      <div className="mt-1 font-semibold text-surface-900 dark:text-surface-100">
                        {formatCurrency(preview.breakdown.serviceSubtotal)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Estimated Hours</div>
                      <div className="mt-1 font-semibold text-surface-900 dark:text-surface-100">
                        {preview.breakdown.estimatedHours.toFixed(1)} hrs
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Recurring Discount</div>
                      <div className="mt-1 font-semibold text-surface-900 dark:text-surface-100">
                        {formatCurrency(preview.breakdown.recurringDiscount)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Add-Ons</div>
                      <div className="mt-1 font-semibold text-surface-900 dark:text-surface-100">
                        {formatCurrency(preview.breakdown.addOnTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-surface-500">Confidence</span>
                      <Badge
                        variant={
                          preview.breakdown.confidenceLevel === 'low'
                            ? 'error'
                            : preview.breakdown.confidenceLevel === 'medium'
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {preview.breakdown.confidenceLevel}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-surface-500">Minimum Floor</span>
                      <span className="font-medium text-surface-900 dark:text-surface-100">
                        {preview.breakdown.minimumApplied ? 'Applied' : 'Not needed'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
                    <div className="flex items-center gap-2 font-medium text-surface-900 dark:text-surface-100">
                      <Home className="h-4 w-4 text-primary-500" />
                      Why the price changed
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-surface-600 dark:text-surface-300">
                      {preview.breakdown.guidance.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  {!!preview.breakdown.addOns.length && (
                    <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
                      <div className="font-medium text-surface-900 dark:text-surface-100">
                        Selected add-ons
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        {preview.breakdown.addOns.map((addOn) => (
                          <div key={addOn.code} className="flex items-center justify-between gap-4">
                            <span className="capitalize text-surface-600 dark:text-surface-300">
                              {addOn.label} {addOn.pricingType === 'per_unit' ? `x${addOn.quantity}` : ''}
                            </span>
                            <span className="font-medium text-surface-900 dark:text-surface-100">
                              {formatCurrency(addOn.lineTotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-surface-300 p-5 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
                  Start filling out the builder and Hygieia will explain the estimate here.
                </div>
              )}
            </Card>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResidentialQuotesPage;
