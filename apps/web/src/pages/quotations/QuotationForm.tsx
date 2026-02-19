import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import {
  getQuotation,
  createQuotation,
  updateQuotation,
} from '../../lib/quotations';
import { listAccounts } from '../../lib/accounts';
import { listFacilities } from '../../lib/facilities';
import type {
  QuotationService,
  CreateQuotationInput,
  UpdateQuotationInput,
} from '../../types/quotation';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const createEmptyService = (sortOrder: number): QuotationService => ({
  serviceName: '',
  description: '',
  price: 0,
  includedTasks: [],
  sortOrder,
});

const QuotationForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  // Form state
  const [accountId, setAccountId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [services, setServices] = useState<QuotationService[]>([createEmptyService(0)]);

  // Load accounts
  useEffect(() => {
    (async () => {
      try {
        const res = await listAccounts({ limit: 200 });
        setAccounts(res.data || []);
      } catch {
        toast.error('Failed to load accounts');
      }
    })();
  }, []);

  // Load facilities when account changes
  useEffect(() => {
    if (!accountId) {
      setFacilities([]);
      return;
    }
    (async () => {
      try {
        const res = await listFacilities({ accountId, limit: 100 });
        setFacilities(res.data || []);
      } catch {
        setFacilities([]);
      }
    })();
  }, [accountId]);

  // Load existing quotation
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const q = await getQuotation(id);
        setAccountId(q.account.id);
        setFacilityId(q.facility?.id || '');
        setTitle(q.title);
        setDescription(q.description || '');
        setValidUntil(q.validUntil ? q.validUntil.slice(0, 10) : '');
        setTaxRate(Number(q.taxRate) * 100);
        setNotes(q.notes || '');
        setTermsAndConditions(q.termsAndConditions || '');
        setServices(
          q.services.map((s, i) => ({
            id: s.id,
            serviceName: s.serviceName,
            description: s.description || '',
            price: Number(s.price),
            includedTasks: Array.isArray(s.includedTasks) ? (s.includedTasks as string[]) : [],
            sortOrder: s.sortOrder ?? i,
          }))
        );
      } catch {
        toast.error('Failed to load quotation');
        navigate('/quotations');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  // Service helpers
  const addService = () => {
    setServices((prev) => [...prev, createEmptyService(prev.length)]);
  };

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: keyof QuotationService, value: any) => {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  // Calculated totals
  const subtotal = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSave = async () => {
    if (!accountId) {
      toast.error('Please select an account');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const validServices = services.filter((s) => s.serviceName.trim());
    if (validServices.length === 0) {
      toast.error('Please add at least one service');
      return;
    }

    setSaving(true);
    try {
      const serviceData = validServices.map((s, i) => ({
        serviceName: s.serviceName,
        description: s.description || null,
        price: Number(s.price) || 0,
        includedTasks: s.includedTasks || [],
        sortOrder: i,
      }));

      if (isEditing && id) {
        const data: UpdateQuotationInput = {
          accountId,
          facilityId: facilityId || null,
          title,
          description: description || null,
          validUntil: validUntil || null,
          taxRate: taxRate / 100,
          notes: notes || null,
          termsAndConditions: termsAndConditions || null,
          services: serviceData,
        };
        await updateQuotation(id, data);
        toast.success('Quotation updated');
        navigate(`/quotations/${id}`);
      } else {
        const data: CreateQuotationInput = {
          accountId,
          facilityId: facilityId || null,
          title,
          description: description || null,
          validUntil: validUntil || null,
          taxRate: taxRate / 100,
          notes: notes || null,
          termsAndConditions: termsAndConditions || null,
          services: serviceData,
        };
        const result = await createQuotation(data);
        toast.success('Quotation created');
        navigate(`/quotations/${result.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton rounded-lg" />
        <Card><div className="p-6"><div className="h-96 skeleton rounded-lg" /></div></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(isEditing ? `/quotations/${id}` : '/quotations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <DollarSign className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {isEditing ? 'Edit Quotation' : 'New Quotation'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
            Quotation Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Account *"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setFacilityId('');
              }}
              options={[
                { value: '', label: 'Select account...' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
            <Select
              label="Facility"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              options={[
                { value: '', label: 'None' },
                ...facilities.map((f) => ({ value: f.id, label: f.name })),
              ]}
            />
            <Input
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deep Carpet Cleaning"
            />
            <Input
              label="Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
            <Input
              label="Tax Rate (%)"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the quotation"
            rows={3}
          />
        </div>
      </Card>

      {/* Services */}
      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              Services
            </h2>
            <Button variant="secondary" size="sm" onClick={addService}>
              <Plus className="mr-1 h-3 w-3" />
              Add Service
            </Button>
          </div>

          <div className="space-y-4">
            {services.map((service, index) => (
              <div
                key={index}
                className="rounded-lg border border-surface-200 dark:border-surface-700 p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Service {index + 1}
                  </span>
                  {services.length > 1 && (
                    <button
                      onClick={() => removeService(index)}
                      className="p-1 text-surface-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Service Name *"
                    value={service.serviceName}
                    onChange={(e) => updateService(index, 'serviceName', e.target.value)}
                    placeholder="e.g., Deep Carpet Cleaning"
                  />
                  <Input
                    label="Price ($)"
                    type="number"
                    min={0}
                    step={0.01}
                    value={service.price}
                    onChange={(e) => updateService(index, 'price', Number(e.target.value))}
                  />
                  <Input
                    label="Description"
                    value={service.description || ''}
                    onChange={(e) => updateService(index, 'description', e.target.value)}
                    placeholder="Optional details"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Subtotal</span>
                  <span className="text-surface-900 dark:text-surface-100 font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Tax ({taxRate}%)</span>
                    <span className="text-surface-900 dark:text-surface-100">
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-surface-200 dark:border-surface-700 pt-2">
                  <span className="text-surface-900 dark:text-surface-100">Total</span>
                  <span className="text-primary-600 dark:text-primary-400">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes & Terms */}
      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
            Notes & Terms
          </h2>
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes"
            rows={3}
          />
          <Textarea
            label="Terms & Conditions"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            placeholder="Terms and conditions shown to the client"
            rows={5}
          />
        </div>
      </Card>
    </div>
  );
};

export default QuotationForm;
