import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Building2,
  MapPin,
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
  Contract,
  CreateContractInput,
  UpdateContractInput,
  ServiceFrequency,
  BillingCycle,
} from '../../types/contract';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';

const SERVICE_FREQUENCIES: { value: ServiceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom', label: 'Custom' },
];

const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
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

  const handleChange = (
    field: keyof CreateContractInput,
    value: any
  ) => {
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
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-gray-400">Loading contract...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/contracts')}
            className="mb-4 text-gray-400 hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contracts
          </Button>

          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            {isEditMode ? 'Edit Contract' : 'New Contract'}
          </h1>
          <p className="text-gray-400">
            {isEditMode
              ? 'Update contract details'
              : 'Create a new service contract'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-400" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contract Title *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Office Cleaning Services Agreement"
                  className={`bg-gray-700 border-gray-600 text-gray-100 ${
                    errors.title ? 'border-red-500' : ''
                  }`}
                />
                {errors.title && (
                  <p className="text-red-400 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account *
                </label>
                <Select
                  value={formData.accountId}
                  onChange={(value) => handleChange('accountId', value)}
                  options={accounts.map((account) => ({
                    value: account.id,
                    label: account.name,
                  }))}
                  placeholder="Select an account"
                  className={`bg-gray-700 border-gray-600 text-gray-100 ${
                    errors.accountId ? 'border-red-500' : ''
                  }`}
                />
                {errors.accountId && (
                  <p className="text-red-400 text-sm mt-1">{errors.accountId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Facility (Optional)
                </label>
                <Select
                  value={formData.facilityId || ''}
                  onChange={(value) =>
                    handleChange('facilityId', value || null)
                  }
                  options={filteredFacilities.map((facility) => ({
                    value: facility.id,
                    label: facility.name,
                  }))}
                  placeholder="No specific facility"
                  disabled={!formData.accountId}
                  className="bg-gray-700 border-gray-600 text-gray-100 disabled:opacity-50"
                />
              </div>
            </div>
          </Card>

          {/* Service Terms */}
          <Card className="bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-400" />
              Service Terms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className={`bg-gray-700 border-gray-600 text-gray-100 ${
                    errors.startDate ? 'border-red-500' : ''
                  }`}
                />
                {errors.startDate && (
                  <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date (Optional)
                </label>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value || null)}
                  className={`bg-gray-700 border-gray-600 text-gray-100 ${
                    errors.endDate ? 'border-red-500' : ''
                  }`}
                />
                {errors.endDate && (
                  <p className="text-red-400 text-sm mt-1">{errors.endDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Service Frequency
                </label>
                <Select
                  value={formData.serviceFrequency || ''}
                  onChange={(value) =>
                    handleChange('serviceFrequency', value || null)
                  }
                  options={SERVICE_FREQUENCIES}
                  placeholder="Not specified"
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Renewal Notice (Days)
                </label>
                <Input
                  type="number"
                  value={formData.renewalNoticeDays || ''}
                  onChange={(e) =>
                    handleChange('renewalNoticeDays', e.target.value ? parseInt(e.target.value) : null)
                  }
                  min="0"
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.autoRenew}
                    onChange={(e) => handleChange('autoRenew', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-indigo-600"
                  />
                  <span>Auto-renew contract</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Financial Terms */}
          <Card className="bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-400" />
              Financial Terms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Value *
                </label>
                <Input
                  type="number"
                  value={formData.monthlyValue}
                  onChange={(e) =>
                    handleChange('monthlyValue', parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={`bg-gray-700 border-gray-600 text-gray-100 ${
                    errors.monthlyValue ? 'border-red-500' : ''
                  }`}
                />
                {errors.monthlyValue && (
                  <p className="text-red-400 text-sm mt-1">{errors.monthlyValue}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Contract Value (Optional)
                </label>
                <Input
                  type="number"
                  value={formData.totalValue || ''}
                  onChange={(e) =>
                    handleChange('totalValue', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  min="0"
                  step="0.01"
                  placeholder="Leave empty for ongoing"
                  className={`bg-gray-700 border-gray-600 text-gray-100 ${
                    errors.totalValue ? 'border-red-500' : ''
                  }`}
                />
                {errors.totalValue && (
                  <p className="text-red-400 text-sm mt-1">{errors.totalValue}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Billing Cycle
                </label>
                <Select
                  value={formData.billingCycle}
                  onChange={(value) => handleChange('billingCycle', value)}
                  options={BILLING_CYCLES}
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Terms
                </label>
                <Input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', e.target.value)}
                  placeholder="e.g., Net 30"
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
              </div>
            </div>
          </Card>

          {/* Additional Details */}
          <Card className="bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Additional Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Terms & Conditions
                </label>
                <Textarea
                  value={formData.termsAndConditions || ''}
                  onChange={(e) =>
                    handleChange('termsAndConditions', e.target.value || null)
                  }
                  rows={6}
                  placeholder="Enter contract terms and conditions..."
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Special Instructions
                </label>
                <Textarea
                  value={formData.specialInstructions || ''}
                  onChange={(e) =>
                    handleChange('specialInstructions', e.target.value || null)
                  }
                  rows={4}
                  placeholder="Enter any special instructions or notes..."
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
              </div>
            </div>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/contracts')}
              disabled={saving}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : isEditMode ? 'Update Contract' : 'Create Contract'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractForm;
