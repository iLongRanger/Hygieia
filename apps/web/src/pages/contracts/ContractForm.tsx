import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  getContract,
  updateContract,
  createContractFromProposal,
} from '../../lib/contracts';
import {
  getProposalsAvailableForContract,
  getProposal,
  type ProposalForContract,
} from '../../lib/proposals';
import type {
  UpdateContractInput,
  ServiceFrequency,
  BillingCycle,
} from '../../types/contract';

const SERVICE_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom', label: 'Custom' },
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

interface ContractFormData {
  title: string;
  proposalId: string;
  startDate: string;
  endDate: string | null;
  serviceFrequency: ServiceFrequency;
  autoRenew: boolean;
  renewalNoticeDays: number;
  monthlyValue: number;
  totalValue: number | null;
  billingCycle: BillingCycle;
  paymentTerms: string;
  termsAndConditions: string | null;
  specialInstructions: string | null;
}

const ContractForm = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';
  const preselectedProposalId = searchParams.get('proposalId');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Available proposals for contract creation
  const [availableProposals, setAvailableProposals] = useState<ProposalForContract[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProposalForContract | null>(null);

  // Form data
  const [formData, setFormData] = useState<ContractFormData>({
    title: '',
    proposalId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: null,
    serviceFrequency: 'monthly',
    autoRenew: false,
    renewalNoticeDays: 30,
    monthlyValue: 0,
    totalValue: null,
    billingCycle: 'monthly',
    paymentTerms: 'Net 30',
    termsAndConditions: null,
    specialInstructions: null,
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available proposals
  const fetchAvailableProposals = useCallback(async () => {
    try {
      const proposals = await getProposalsAvailableForContract();
      setAvailableProposals(proposals);
      return proposals;
    } catch (error) {
      console.error('Failed to fetch available proposals:', error);
      toast.error('Failed to load available proposals');
      return [];
    }
  }, []);

  // Initialize form
  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      try {
        if (isEditMode) {
          // Edit mode - fetch existing contract
          const contract = await getContract(id);

          if (!['draft', 'pending_signature'].includes(contract.status)) {
            toast.error('Only draft or pending signature contracts can be edited');
            navigate(`/contracts/${id}`);
            return;
          }

          setFormData({
            title: contract.title,
            proposalId: contract.proposal?.id || '',
            startDate: contract.startDate,
            endDate: contract.endDate || null,
            serviceFrequency: (contract.serviceFrequency || 'monthly') as ServiceFrequency,
            autoRenew: contract.autoRenew,
            renewalNoticeDays: contract.renewalNoticeDays || 30,
            monthlyValue: Number(contract.monthlyValue),
            totalValue: contract.totalValue ? Number(contract.totalValue) : null,
            billingCycle: contract.billingCycle as BillingCycle,
            paymentTerms: contract.paymentTerms,
            termsAndConditions: contract.termsAndConditions || null,
            specialInstructions: contract.specialInstructions || null,
          });

          // Set selected proposal info for display
          if (contract.proposal) {
            setSelectedProposal({
              id: contract.proposal.id,
              proposalNumber: contract.proposal.proposalNumber,
              title: contract.proposal.title,
              totalAmount: String(contract.monthlyValue),
              acceptedAt: '',
              account: contract.account,
              facility: contract.facility,
            });
          }
        } else {
          // New contract mode - fetch available proposals
          const proposals = await fetchAvailableProposals();

          // Check if we have a preselected proposal
          if (preselectedProposalId) {
            const preselected = proposals.find(p => p.id === preselectedProposalId);
            if (preselected) {
              handleProposalSelect(preselected.id, proposals);
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize form:', error);
        toast.error('Failed to load form data');
        navigate('/contracts');
      } finally {
        setLoading(false);
      }
    };

    initializeForm();
  }, [id, isEditMode, preselectedProposalId, navigate, fetchAvailableProposals]);

  // Handle proposal selection - auto-populate fields from proposal
  const handleProposalSelect = async (proposalId: string, proposals?: ProposalForContract[]) => {
    const proposalList = proposals || availableProposals;
    const proposal = proposalList.find(p => p.id === proposalId);

    if (!proposal) {
      setSelectedProposal(null);
      setFormData(prev => ({
        ...prev,
        proposalId: '',
        title: '',
        monthlyValue: 0,
      }));
      return;
    }

    setSelectedProposal(proposal);

    // Fetch full proposal details for terms and conditions
    try {
      const fullProposal = await getProposal(proposalId);

      setFormData(prev => ({
        ...prev,
        proposalId,
        title: proposal.title,
        monthlyValue: Number(proposal.totalAmount),
        termsAndConditions: fullProposal.termsAndConditions || null,
        specialInstructions: fullProposal.notes || null,
      }));
    } catch (error) {
      // If we can't get full details, use what we have
      setFormData(prev => ({
        ...prev,
        proposalId,
        title: proposal.title,
        monthlyValue: Number(proposal.totalAmount),
      }));
    }

    // Clear proposal error
    if (errors.proposalId) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.proposalId;
        return newErrors;
      });
    }
  };

  const handleChange = (field: keyof ContractFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isEditMode && !formData.proposalId) {
      newErrors.proposalId = 'Please select an accepted proposal';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Contract title is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.endDate <= formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.monthlyValue <= 0) {
      newErrors.monthlyValue = 'Monthly value must be positive';
    }

    if (formData.totalValue !== null && formData.totalValue < 0) {
      newErrors.totalValue = 'Total value cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }

    try {
      setSaving(true);

      if (isEditMode) {
        // Update existing contract
        const updateData: UpdateContractInput = {
          title: formData.title,
          startDate: formData.startDate,
          endDate: formData.endDate,
          serviceFrequency: formData.serviceFrequency,
          autoRenew: formData.autoRenew,
          renewalNoticeDays: formData.renewalNoticeDays,
          monthlyValue: formData.monthlyValue,
          totalValue: formData.totalValue,
          billingCycle: formData.billingCycle,
          paymentTerms: formData.paymentTerms,
          termsAndConditions: formData.termsAndConditions,
          specialInstructions: formData.specialInstructions,
        };
        await updateContract(id, updateData);
        toast.success('Contract updated successfully');
      } else {
        // Create new contract from proposal
        await createContractFromProposal(formData.proposalId, {
          title: formData.title,
          startDate: formData.startDate,
          endDate: formData.endDate,
          serviceFrequency: formData.serviceFrequency,
          autoRenew: formData.autoRenew,
          renewalNoticeDays: formData.renewalNoticeDays,
          totalValue: formData.totalValue,
          billingCycle: formData.billingCycle,
          paymentTerms: formData.paymentTerms,
          termsAndConditions: formData.termsAndConditions,
          specialInstructions: formData.specialInstructions,
        });
        toast.success('Contract created successfully');
      }

      navigate('/contracts');
    } catch (error: any) {
      console.error('Failed to save contract:', error);
      toast.error(error.response?.data?.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(value));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/contracts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {isEditMode ? 'Edit Contract' : 'New Contract'}
          </h1>
          <p className="text-gray-400">
            {isEditMode
              ? 'Update contract details'
              : 'Create a contract from an accepted proposal'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Proposal Selection (New contracts only) */}
        {!isEditMode && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Select Proposal</h2>
            </div>

            {availableProposals.length === 0 ? (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-amber-200 font-medium">No proposals available</p>
                    <p className="text-amber-200/70 text-sm mt-1">
                      There are no accepted proposals without contracts. Create and accept a proposal first.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate('/proposals/new')}
                    >
                      Create Proposal
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Select
                  label="Accepted Proposal *"
                  value={formData.proposalId}
                  onChange={(value) => handleProposalSelect(value)}
                  options={availableProposals.map((proposal) => ({
                    value: proposal.id,
                    label: `${proposal.proposalNumber} - ${proposal.account.name} - ${proposal.title} (${formatCurrency(proposal.totalAmount)}/mo)`,
                  }))}
                  placeholder="Select an accepted proposal..."
                />
                {errors.proposalId && (
                  <p className="text-red-400 text-sm mt-1">{errors.proposalId}</p>
                )}
              </>
            )}

            {/* Selected Proposal Summary */}
            {selectedProposal && (
              <div className="mt-4 rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-green-200 font-medium">Proposal Selected</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Account:</span>
                        <span className="ml-2 text-white">{selectedProposal.account.name}</span>
                      </div>
                      {selectedProposal.facility && (
                        <div>
                          <span className="text-gray-400">Facility:</span>
                          <span className="ml-2 text-white">{selectedProposal.facility.name}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Monthly Value:</span>
                        <span className="ml-2 text-white font-medium">
                          {formatCurrency(selectedProposal.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Contract Details (show when editing or when proposal is selected) */}
        {(isEditMode || selectedProposal) && (
          <>
            {/* Basic Information */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">Contract Details</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    label="Contract Title *"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Office Cleaning Services Agreement"
                    error={errors.title}
                  />
                </div>

                {/* Show linked account/facility (readonly) */}
                {selectedProposal && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Account
                      </label>
                      <div className="px-3 py-2 rounded-lg bg-navy-darker border border-white/10 text-gray-300">
                        {selectedProposal.account.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Facility
                      </label>
                      <div className="px-3 py-2 rounded-lg bg-navy-darker border border-white/10 text-gray-300">
                        {selectedProposal.facility?.name || 'No specific facility'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Service Terms */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Service Terms</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Start Date *"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  error={errors.startDate}
                />

                <Input
                  label="End Date (Optional)"
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value || null)}
                  error={errors.endDate}
                />

                <Select
                  label="Service Frequency"
                  value={formData.serviceFrequency}
                  onChange={(value) =>
                    handleChange('serviceFrequency', value as ServiceFrequency)
                  }
                  options={SERVICE_FREQUENCIES}
                />

                <Input
                  label="Renewal Notice (Days)"
                  type="number"
                  value={formData.renewalNoticeDays}
                  onChange={(e) =>
                    handleChange('renewalNoticeDays', parseInt(e.target.value) || 30)
                  }
                  min={0}
                />

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.autoRenew}
                      onChange={(e) => handleChange('autoRenew', e.target.checked)}
                      className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                    />
                    Auto-renew contract
                  </label>
                </div>
              </div>
            </Card>

            {/* Financial Terms */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Financial Terms</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Monthly Value *"
                  type="number"
                  value={formData.monthlyValue}
                  onChange={(e) => handleChange('monthlyValue', parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  error={errors.monthlyValue}
                />

                <Input
                  label="Total Contract Value (Optional)"
                  type="number"
                  value={formData.totalValue || ''}
                  onChange={(e) =>
                    handleChange('totalValue', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  min={0}
                  step={0.01}
                  placeholder="Leave empty for ongoing"
                  error={errors.totalValue}
                />

                <Select
                  label="Billing Cycle"
                  value={formData.billingCycle}
                  onChange={(value) => handleChange('billingCycle', value as BillingCycle)}
                  options={BILLING_CYCLES}
                />

                <Input
                  label="Payment Terms"
                  value={formData.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', e.target.value)}
                  placeholder="e.g., Net 30"
                />
              </div>
            </Card>

            {/* Initial Clean Notice */}
            {!isEditMode && (
              <Card>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-blue-200 font-medium">Initial Clean Included</p>
                      <p className="text-blue-200/70 text-sm mt-1">
                        This contract includes a comprehensive initial deep clean on the first service visit.
                        This is standard for all new contracts and ensures the facility starts at optimal cleanliness.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Additional Details */}
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Additional Details</h2>
              <div className="space-y-4">
                <Textarea
                  label="Terms & Conditions"
                  value={formData.termsAndConditions || ''}
                  onChange={(e) => handleChange('termsAndConditions', e.target.value || null)}
                  rows={6}
                  placeholder="Enter contract terms and conditions..."
                />

                <Textarea
                  label="Special Instructions"
                  value={formData.specialInstructions || ''}
                  onChange={(e) => handleChange('specialInstructions', e.target.value || null)}
                  rows={4}
                  placeholder="Enter any special instructions or notes..."
                />
              </div>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/contracts')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} isLoading={saving}>
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? 'Update Contract' : 'Create Contract'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default ContractForm;

