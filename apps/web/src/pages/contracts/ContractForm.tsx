import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import {
  getContract,
  createContract,
  updateContract,
} from '../../lib/contracts';
import { listAccounts } from '../../lib/accounts';
import { listFacilities } from '../../lib/facilities';
import type {
  CreateContractInput,
  UpdateContractInput,
  ServiceFrequency,
  BillingCycle,
} from '../../types/contract';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';

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

const ContractForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);

  // Form data
  const [formData, setFormData] = useState<CreateContractInput>({
    title: '',
    accountId: '',
    facilityId: null,
    proposalId: null,
    startDate: new Date().toISOString().split('T')[0],
    endDate: null,
    serviceFrequency: 'monthly',
    serviceSchedule: null,
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

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (isEditMode) {
      fetchContract(id);
    } else {
      setLoading(false);
    }
  }, [id, isEditMode]);

  // Filter facilities when account changes
  useEffect(() => {
    if (formData.accountId) {
      const filtered = facilities.filter((f) => f.accountId === formData.accountId);
      setFilteredFacilities(filtered);

      // Clear facility selection if it's not in the filtered list
      if (formData.facilityId && !filtered.find((f) => f.id === formData.facilityId)) {
        setFormData((prev) => ({ ...prev, facilityId: null }));
      }
    } else {
      setFilteredFacilities([]);
      setFormData((prev) => ({ ...prev, facilityId: null }));
    }
  }, [formData.accountId, facilities]);

  const fetchReferenceData = async () => {
    try {
      const [accountsData, facilitiesData] = await Promise.all([
        listAccounts({ limit: 1000 }),
        listFacilities({ limit: 1000 }),
      ]);
      setAccounts(accountsData.data);
      setFacilities(facilitiesData.data);
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
      toast.error('Failed to load form data');
    }
  };

  const fetchContract = async (contractId: string) => {
    try {
      setLoading(true);
      const contract = await getContract(contractId);

      // Check if contract can be edited
      if (contract.status !== 'draft') {
        toast.error('Only draft contracts can be edited');
        navigate(`/contracts/${contractId}`);
        return;
      }

      setFormData({
        title: contract.title,
        accountId: contract.account.id,
        facilityId: contract.facility?.id || null,
        proposalId: contract.proposal?.id || null,
        startDate: contract.startDate,
        endDate: contract.endDate || null,
        serviceFrequency: contract.serviceFrequency || 'monthly',
        serviceSchedule: contract.serviceSchedule || null,
        autoRenew: contract.autoRenew,
        renewalNoticeDays: contract.renewalNoticeDays || 30,
        monthlyValue: Number(contract.monthlyValue),
        totalValue: contract.totalValue ? Number(contract.totalValue) : null,
        billingCycle: contract.billingCycle,
        paymentTerms: contract.paymentTerms,
        termsAndConditions: contract.termsAndConditions || null,
        specialInstructions: contract.specialInstructions || null,
      });
    } catch (error) {
      console.error('Failed to fetch contract:', error);
      toast.error('Failed to load contract');
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateContractInput, value: any) => {
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

    if (!formData.title.trim()) {
      newErrors.title = 'Contract title is required';
    }

    if (!formData.accountId) {
      newErrors.accountId = 'Account is required';
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
        const updateData: UpdateContractInput = { ...formData };
        await updateContract(id, updateData);
        toast.success('Contract updated successfully');
      } else {
        await createContract(formData);
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
            {isEditMode ? 'Update contract details' : 'Create a new service contract'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Basic Information</h2>
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

            <Select
              label="Account *"
              value={formData.accountId}
              onChange={(value) => handleChange('accountId', value)}
              options={accounts.map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              placeholder="Select an account"
            />
            {errors.accountId && (
              <p className="text-red-400 text-sm mt-1">{errors.accountId}</p>
            )}

            <Select
              label="Facility (Optional)"
              value={formData.facilityId || ''}
              onChange={(value) => handleChange('facilityId', value || null)}
              options={filteredFacilities.map((facility) => ({
                value: facility.id,
                label: facility.name,
              }))}
              placeholder="No specific facility"
              disabled={!formData.accountId}
            />
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
              value={formData.serviceFrequency || ''}
              onChange={(value) =>
                handleChange('serviceFrequency', (value || null) as ServiceFrequency | null)
              }
              options={SERVICE_FREQUENCIES}
              placeholder="Not specified"
            />

            <Input
              label="Renewal Notice (Days)"
              type="number"
              value={formData.renewalNoticeDays || ''}
              onChange={(e) =>
                handleChange('renewalNoticeDays', e.target.value ? parseInt(e.target.value) : null)
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
      </form>
    </div>
  );
};

export default ContractForm;
