import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  Building2,
  FileText,
  DollarSign,
  Calendar,
  GripVertical,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import {
  getProposal,
  createProposal,
  updateProposal,
} from '../../lib/proposals';
import { listAccounts } from '../../lib/accounts';
import { listFacilities } from '../../lib/facilities';
import {
  getFacilityPricingReadiness,
  getFacilityProposalTemplate,
  listPricingStrategies,
  type FacilityPricingReadiness,
  type FacilityProposalTemplate,
  type PricingStrategyMetadata,
} from '../../lib/pricing';
import type {
  Proposal,
  CreateProposalInput,
  UpdateProposalInput,
  ProposalItem,
  ProposalService,
  ProposalItemType,
  ServiceType,
  ServiceFrequency,
} from '../../types/proposal';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';
import { AreaTaskTimeBreakdown } from '../../components/proposals/AreaTaskTimeBreakdown';

// Constants for dropdown options
const ITEM_TYPES: { value: ProposalItemType; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'one_time', label: 'One Time' },
];

const SERVICE_FREQUENCIES: { value: ServiceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const isPerHourStrategy = (key: string) => {
  return key === 'per_hour_v1' || key.startsWith('rule:hourly:');
};

// Empty item template
const createEmptyItem = (sortOrder: number): ProposalItem => ({
  itemType: 'labor',
  description: '',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  sortOrder,
});

// Empty service template
const createEmptyService = (sortOrder: number): ProposalService => ({
  serviceName: '',
  serviceType: 'monthly',
  frequency: 'monthly',
  estimatedHours: null,
  hourlyRate: null,
  monthlyPrice: 0,
  description: null,
  includedTasks: [],
  sortOrder,
});

const ProposalForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  // Form data
  const [formData, setFormData] = useState<CreateProposalInput>({
    accountId: '',
    title: '',
    description: null,
    facilityId: null,
    validUntil: null,
    taxRate: 0,
    notes: null,
    termsAndConditions: null,
    proposalItems: [],
    proposalServices: [],
  });

  // Calculated totals
  const [totals, setTotals] = useState({
    itemsTotal: 0,
    servicesTotal: 0,
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
  });

  // Facility pricing states
  const [pricingReadiness, setPricingReadiness] = useState<FacilityPricingReadiness | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('5x_week');

  // Pricing strategy states
  const [pricingStrategies, setPricingStrategies] = useState<PricingStrategyMetadata[]>([]);
  const [selectedPricingStrategy, setSelectedPricingStrategy] = useState<string>('sqft_settings_v1');
  const [workerCount, setWorkerCount] = useState<number>(1);

  // Frequency options for auto-population
  const PRICING_FREQUENCIES = [
    { value: '1x_week', label: '1x per Week' },
    { value: '2x_week', label: '2x per Week' },
    { value: '3x_week', label: '3x per Week' },
    { value: '4x_week', label: '4x per Week' },
    { value: '5x_week', label: '5x per Week' },
    { value: 'daily', label: 'Daily (7x)' },
    { value: 'monthly', label: 'Monthly' },
  ];

  // Calculate totals whenever items, services, or tax rate change
  useEffect(() => {
    const itemsTotal = (formData.proposalItems || []).reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0
    );
    const servicesTotal = (formData.proposalServices || []).reduce(
      (sum, service) => sum + Number(service.monthlyPrice || 0),
      0
    );
    const subtotal = itemsTotal + servicesTotal;
    const taxRate = formData.taxRate || 0;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    setTotals({
      itemsTotal: Number(itemsTotal.toFixed(2)),
      servicesTotal: Number(servicesTotal.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    });
  }, [formData.proposalItems, formData.proposalServices, formData.taxRate]);

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [accountsRes, facilitiesRes, strategiesRes] = await Promise.all([
        listAccounts({ limit: 100 }),
        listFacilities({ limit: 100 }),
        listPricingStrategies(),
      ]);
      setAccounts(accountsRes?.data || []);
      setFacilities(facilitiesRes?.data || []);
      setPricingStrategies(strategiesRes || []);
      // Set default strategy if available
      const defaultStrategy = strategiesRes?.find(s => s.isDefault);
      if (defaultStrategy) {
        setSelectedPricingStrategy(defaultStrategy.key);
        setFormData((prev) => ({
          ...prev,
          pricingStrategyKey: defaultStrategy.key,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
      toast.error('Failed to load reference data');
    }
  }, []);

  // Fetch proposal for edit mode
  const fetchProposal = useCallback(async (proposalId: string) => {
    try {
      const proposal = await getProposal(proposalId);
      setFormData({
        accountId: proposal.account.id,
        title: proposal.title,
        description: proposal.description || null,
        facilityId: proposal.facility?.id || null,
        validUntil: proposal.validUntil
          ? proposal.validUntil.split('T')[0]
          : null,
        taxRate: proposal.taxRate,
        notes: proposal.notes || null,
        termsAndConditions: proposal.termsAndConditions || null,
        proposalItems: proposal.proposalItems || [],
        proposalServices: proposal.proposalServices || [],
        pricingStrategyKey: proposal.pricingStrategyKey || null,
      });
      // Set pricing strategy from proposal
      if (proposal.pricingStrategyKey) {
        setSelectedPricingStrategy(proposal.pricingStrategyKey);
      }
    } catch (error) {
      console.error('Failed to fetch proposal:', error);
      toast.error('Failed to load proposal');
      navigate('/proposals');
    }
  }, [navigate]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchReferenceData();
      if (isEditMode) {
        await fetchProposal(id);
      }
      setLoading(false);
    };
    loadData();
  }, [fetchReferenceData, fetchProposal, isEditMode, id]);

  // Filter facilities by selected account
  const filteredFacilities = formData.accountId
    ? facilities.filter((f) => f.account?.id === formData.accountId)
    : facilities;

  // Check pricing readiness when facility changes
  useEffect(() => {
    const checkPricingReadiness = async () => {
      if (formData.facilityId) {
        try {
          const readiness = await getFacilityPricingReadiness(formData.facilityId);
          setPricingReadiness(readiness);
        } catch (error) {
          console.error('Failed to check pricing readiness:', error);
          setPricingReadiness(null);
        }
      } else {
        setPricingReadiness(null);
      }
    };
    checkPricingReadiness();
  }, [formData.facilityId]);

  // Auto-populate services from facility pricing
  const handleAutoPopulateFromFacility = async () => {
    if (!formData.facilityId) {
      toast.error('Please select a facility first');
      return;
    }

    try {
      setLoadingPricing(true);
      const template = await getFacilityProposalTemplate(
        formData.facilityId,
        selectedFrequency,
        selectedPricingStrategy,
        isPerHourStrategy(selectedPricingStrategy) ? workerCount : undefined
      );

      // Convert suggested services to proposal services
      const newServices: ProposalService[] = template.suggestedServices.map((svc, index) => ({
        serviceName: svc.serviceName,
        serviceType: svc.serviceType as ServiceType,
        frequency: svc.frequency as ServiceFrequency,
        estimatedHours: null,
        hourlyRate: null,
        monthlyPrice: svc.monthlyPrice,
        description: svc.description,
        includedTasks: svc.includedTasks || [],
        sortOrder: index,
      }));

      // Convert suggested items to proposal items
      const newItems: ProposalItem[] = template.suggestedItems.map((item: any, index: number) => ({
        itemType: (item.itemType as ProposalItemType) || 'other',
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        sortOrder: index,
      }));

      // Update form with auto-populated data
      setFormData((prev) => ({
        ...prev,
        proposalServices: newServices,
        proposalItems: newItems.length > 0 ? newItems : prev.proposalItems,
        // Auto-set title if empty
        title: prev.title || `Cleaning Services - ${template.facility.name}`,
      }));

      toast.success(`Auto-populated ${newServices.length} service(s) from facility pricing`);
    } catch (error: any) {
      console.error('Failed to auto-populate from facility:', error);
      toast.error(error.response?.data?.message || 'Failed to calculate pricing from facility');
    } finally {
      setLoadingPricing(false);
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof CreateProposalInput, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Clear facility when account changes
      if (field === 'accountId') {
        updated.facilityId = null;
      }
      return updated;
    });
  };

  // --- Proposal Items Management ---
  const addItem = () => {
    const newItem = createEmptyItem((formData.proposalItems || []).length);
    setFormData((prev) => ({
      ...prev,
      proposalItems: [...(prev.proposalItems || []), newItem],
    }));
  };

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
    setFormData((prev) => {
      const items = [...(prev.proposalItems || [])];
      const item = { ...items[index], [field]: value };

      // Auto-calculate total price when quantity or unit price changes
      if (field === 'quantity' || field === 'unitPrice') {
        item.totalPrice = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      }

      items[index] = item;
      return { ...prev, proposalItems: items };
    });
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      proposalItems: (prev.proposalItems || []).filter((_, i) => i !== index),
    }));
  };

  // --- Proposal Services Management ---
  const addService = () => {
    const newService = createEmptyService((formData.proposalServices || []).length);
    setFormData((prev) => ({
      ...prev,
      proposalServices: [...(prev.proposalServices || []), newService],
    }));
  };

  const updateService = (index: number, field: keyof ProposalService, value: any) => {
    setFormData((prev) => {
      const services = [...(prev.proposalServices || [])];
      services[index] = { ...services[index], [field]: value };
      return { ...prev, proposalServices: services };
    });
  };

  const removeService = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      proposalServices: (prev.proposalServices || []).filter((_, i) => i !== index),
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.accountId) {
      toast.error('Please select an account');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Please enter a proposal title');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const updateData: UpdateProposalInput = {
          ...formData,
          validUntil: formData.validUntil || null,
        };
        await updateProposal(id, updateData);
        toast.success('Proposal updated successfully');
      } else {
        await createProposal(formData);
        toast.success('Proposal created successfully');
      }
      navigate('/proposals');
    } catch (error: any) {
      console.error('Failed to save proposal:', error);
      toast.error(
        error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} proposal`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/proposals')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isEditMode ? 'Edit Proposal' : 'New Proposal'}
            </h1>
            <p className="text-gray-400 mt-1">
              {isEditMode
                ? 'Update the proposal details below'
                : 'Fill in the details to create a new proposal'}
            </p>
          </div>
        </div>
        <Button type="submit" isLoading={saving}>
          <Save className="w-5 h-5 mr-2" />
          {isEditMode ? 'Update Proposal' : 'Create Proposal'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Proposal Title *"
                  placeholder="Enter proposal title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                />
              </div>
              <Select
                label="Account *"
                placeholder="Select an account"
                value={formData.accountId}
                onChange={(value) => handleChange('accountId', value)}
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              />
              <Select
                label="Facility"
                placeholder="Select a facility (optional)"
                value={formData.facilityId || ''}
                onChange={(value) => handleChange('facilityId', value || null)}
                options={[
                  { value: '', label: 'None' },
                  ...filteredFacilities.map((f) => ({
                    value: f.id,
                    label: f.name,
                  })),
                ]}
              />
              <div className="flex flex-col gap-1">
                <Select
                  label="Pricing Strategy"
                  placeholder="Select pricing strategy"
                  value={selectedPricingStrategy}
                  onChange={(value) => {
                    setSelectedPricingStrategy(value);
                    handleChange('pricingStrategyKey', value);
                  }}
                  options={pricingStrategies.map((s) => ({
                    value: s.key,
                    label: `${s.name}${s.isDefault ? ' (Default)' : ''}`,
                  }))}
                />
                {pricingStrategies.find(s => s.key === selectedPricingStrategy)?.description && (
                  <p className="text-xs text-gray-400 mt-1">
                    {pricingStrategies.find(s => s.key === selectedPricingStrategy)?.description}
                  </p>
                )}
              </div>
              {isPerHourStrategy(selectedPricingStrategy) && (
                <Input
                  label="Worker Count"
                  type="number"
                  min="1"
                  step="1"
                  value={workerCount}
                  onChange={(e) => setWorkerCount(Math.max(1, Number(e.target.value) || 1))}
                />
              )}
              <Input
                label="Valid Until"
                type="date"
                value={formData.validUntil || ''}
                onChange={(e) => handleChange('validUntil', e.target.value || null)}
              />

              {/* Auto-populate from facility */}
              {formData.facilityId && (
                <div className="md:col-span-2 mt-2">
                  <div className="bg-navy-dark/50 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-gold" />
                        <span className="font-medium text-white">Auto-Populate from Facility</span>
                      </div>
                      {pricingReadiness && (
                        <div className="flex items-center gap-2">
                          {pricingReadiness.isReady ? (
                            <span className="flex items-center gap-1 text-sm text-emerald">
                              <CheckCircle2 className="w-4 h-4" />
                              Ready ({pricingReadiness.areaCount} areas, {pricingReadiness.totalSquareFeet.toLocaleString()} sq ft)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-amber-400">
                              <AlertCircle className="w-4 h-4" />
                              {pricingReadiness.reason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {pricingReadiness?.isReady ? (
                      <div className="flex items-center gap-3">
                        <Select
                          placeholder="Service Frequency"
                          value={selectedFrequency}
                          onChange={(value) => setSelectedFrequency(value)}
                          options={PRICING_FREQUENCIES}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAutoPopulateFromFacility}
                          isLoading={loadingPricing}
                          className="whitespace-nowrap"
                        >
                          <Calculator className="w-4 h-4 mr-2" />
                          Calculate & Populate
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        Complete the facility's area setup to enable automatic pricing calculation.
                        Areas need square footage and floor type information.
                      </p>
                    )}
                  </div>

                  {/* Per-hour strategy: Show task time breakdown */}
                  {isPerHourStrategy(selectedPricingStrategy) && pricingReadiness?.isReady && (
                    <div className="mt-4">
                      <AreaTaskTimeBreakdown
                        facilityId={formData.facilityId!}
                        workerCount={workerCount}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="md:col-span-2">
                <Textarea
                  label="Description"
                  placeholder="Enter proposal description"
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value || null)}
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Line Items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gold" />
                Line Items
              </h2>
              <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {(formData.proposalItems || []).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No line items added yet.</p>
                <p className="text-sm mt-1">Click "Add Item" to add line items to this proposal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-medium text-gray-400 uppercase px-2">
                  <div className="col-span-2">Type</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items */}
                {(formData.proposalItems || []).map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-navy-dark/30 p-3 rounded-xl border border-white/5"
                  >
                    <div className="md:col-span-2">
                      <Select
                        placeholder="Type"
                        value={item.itemType}
                        onChange={(value) => updateItem(index, 'itemType', value)}
                        options={ITEM_TYPES}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        placeholder="Unit Price"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-end">
                      <span className="text-white font-medium">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Items Subtotal */}
                <div className="flex justify-end pt-2 border-t border-white/10">
                  <div className="text-right">
                    <span className="text-gray-400 text-sm mr-4">Items Subtotal:</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(totals.itemsTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Services */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold" />
                Services
              </h2>
              <Button type="button" variant="secondary" size="sm" onClick={addService}>
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </Button>
            </div>

            {(formData.proposalServices || []).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No services added yet.</p>
                <p className="text-sm mt-1">Click "Add Service" to add recurring services to this proposal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(formData.proposalServices || []).map((service, index) => (
                  <div
                    key={index}
                    className="bg-navy-dark/30 p-4 rounded-xl border border-white/5 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          label="Service Name"
                          placeholder="e.g., Daily Cleaning"
                          value={service.serviceName}
                          onChange={(e) => updateService(index, 'serviceName', e.target.value)}
                        />
                        <Select
                          label="Service Type"
                          value={service.serviceType}
                          onChange={(value) => updateService(index, 'serviceType', value)}
                          options={SERVICE_TYPES}
                        />
                        <Select
                          label="Frequency"
                          value={service.frequency}
                          onChange={(value) => updateService(index, 'frequency', value)}
                          options={SERVICE_FREQUENCIES}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeService(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <Input
                        label="Est. Hours"
                        type="number"
                        placeholder="Hours"
                        min="0"
                        step="0.5"
                        value={service.estimatedHours || ''}
                        onChange={(e) =>
                          updateService(index, 'estimatedHours', e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                      <Input
                        label="Hourly Rate"
                        type="number"
                        placeholder="$/hr"
                        min="0"
                        step="0.01"
                        value={service.hourlyRate || ''}
                        onChange={(e) =>
                          updateService(index, 'hourlyRate', e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                      <Input
                        label="Monthly Price *"
                        type="number"
                        placeholder="Monthly price"
                        min="0"
                        step="0.01"
                        value={service.monthlyPrice}
                        onChange={(e) =>
                          updateService(index, 'monthlyPrice', parseFloat(e.target.value) || 0)
                        }
                      />
                      <div className="flex items-end">
                        <div className="text-right w-full pb-2">
                          <span className="text-gray-400 text-xs block">Monthly</span>
                          <span className="text-white font-semibold text-lg">
                            {formatCurrency(service.monthlyPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Textarea
                      label="Service Description"
                      placeholder="Describe the service..."
                      value={service.description || ''}
                      onChange={(e) => updateService(index, 'description', e.target.value || null)}
                      rows={2}
                    />
                  </div>
                ))}

                {/* Services Subtotal */}
                <div className="flex justify-end pt-2 border-t border-white/10">
                  <div className="text-right">
                    <span className="text-gray-400 text-sm mr-4">Services Subtotal:</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(totals.servicesTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Terms & Notes */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Terms & Notes</h2>
            <div className="space-y-4">
              <Textarea
                label="Terms & Conditions"
                placeholder="Enter terms and conditions..."
                value={formData.termsAndConditions || ''}
                onChange={(e) => handleChange('termsAndConditions', e.target.value || null)}
                rows={4}
              />
              <Textarea
                label="Internal Notes"
                placeholder="Internal notes (not visible to client)..."
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value || null)}
                rows={3}
              />
            </div>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card className="sticky top-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gold" />
              Financial Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Items Total:</span>
                <span className="text-white">{formatCurrency(totals.itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Services Total:</span>
                <span className="text-white">{formatCurrency(totals.servicesTotal)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>

              {/* Tax Rate Input */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-400 text-sm">Tax Rate:</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={((formData.taxRate || 0) * 100).toFixed(1)}
                    onChange={(e) => {
                      const percent = parseFloat(e.target.value) || 0;
                      handleChange('taxRate', percent / 100);
                    }}
                    className="w-20 text-right"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax Amount:</span>
                <span className="text-white">{formatCurrency(totals.taxAmount)}</span>
              </div>

              <div className="flex justify-between text-xl font-bold border-t border-white/10 pt-3 mt-3">
                <span className="text-white">Total:</span>
                <span className="text-emerald">{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>

            {/* Quick Info */}
            <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Line Items:</span>
                <span className="text-white">{(formData.proposalItems || []).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Services:</span>
                <span className="text-white">{(formData.proposalServices || []).length}</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                isLoading={saving}
              >
                <Save className="w-5 h-5 mr-2" />
                {isEditMode ? 'Update Proposal' : 'Create Proposal'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/proposals')}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
};

export default ProposalForm;
