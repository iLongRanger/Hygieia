import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, DollarSign, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { getQuotation, createQuotation, updateQuotation } from '../../lib/quotations';
import { listAccounts } from '../../lib/accounts';
import { listFacilities } from '../../lib/facilities';
import { listOneTimeServiceCatalog } from '../../lib/oneTimeServiceCatalog';
import type {
  QuotationService,
  CreateQuotationInput,
  UpdateQuotationInput,
} from '../../types/quotation';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { OneTimeServiceCatalogItem } from '../../types/oneTimeServiceCatalog';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const roundToCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toTimeInputValue = (value?: string | null) => {
  if (!value) return '';
  const hhmmMatch = value.match(/^(\d{2}:\d{2})/);
  if (hhmmMatch) return hhmmMatch[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
  const [catalogItems, setCatalogItems] = useState<OneTimeServiceCatalogItem[]>([]);

  const [accountId, setAccountId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [services, setServices] = useState<QuotationService[]>([createEmptyService(0)]);

  useEffect(() => {
    (async () => {
      try {
        const [accountsRes, catalogRes] = await Promise.all([
          listAccounts({ limit: 200 }),
          listOneTimeServiceCatalog({ includeInactive: false }),
        ]);
        setAccounts(accountsRes.data || []);
        setCatalogItems(catalogRes || []);
      } catch {
        toast.error('Failed to load quotation dependencies');
      }
    })();
  }, []);

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
        setScheduledDate(q.scheduledDate ? q.scheduledDate.slice(0, 10) : '');
        setScheduledStartTime(toTimeInputValue(q.scheduledStartTime));
        setScheduledEndTime(toTimeInputValue(q.scheduledEndTime));
        setTaxRate(Number(q.taxRate) * 100);
        setNotes(q.notes || '');
        setTermsAndConditions(q.termsAndConditions || '');
        setServices(
          q.services.map((s, i) => ({
            id: s.id,
            catalogItemId: s.catalogItemId ?? null,
            serviceName: s.serviceName,
            description: s.description || '',
            price: Number(s.price),
            includedTasks: Array.isArray(s.includedTasks) ? (s.includedTasks as string[]) : [],
            pricingMeta: s.pricingMeta ?? {},
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

  const addService = () => setServices((prev) => [...prev, createEmptyService(prev.length)]);

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateService = (index: number, patch: Partial<QuotationService>) => {
    setServices((prev) => prev.map((service, i) => (i === index ? { ...service, ...patch } : service)));
  };

  const getCatalogItem = (catalogItemId?: string | null) =>
    catalogItems.find((item) => item.id === catalogItemId) || null;

  const recalculateCatalogService = (
    service: QuotationService,
    catalogItem: OneTimeServiceCatalogItem,
    override?: Partial<NonNullable<QuotationService['pricingMeta']>>
  ): QuotationService => {
    const currentMeta = { ...(service.pricingMeta || {}), ...(override || {}) };
    const quantity = Number(currentMeta.quantity ?? catalogItem.defaultQuantity ?? 1);
    const unitPrice = Number(currentMeta.unitPrice ?? catalogItem.baseRate);

    const currentAddOns = Array.isArray(currentMeta.addOns) ? currentMeta.addOns : [];
    const addOnTotal = currentAddOns.reduce(
      (sum, addOn) => sum + Number(addOn.total || Number(addOn.unitPrice) * Number(addOn.quantity || 0)),
      0
    );

    const baseAmount = roundToCurrency(quantity * unitPrice);
    const minimumCharge = Number(catalogItem.minimumCharge || 0);
    const standardAmount = roundToCurrency(Math.max(baseAmount + addOnTotal, minimumCharge));

    const discountPercent = Number(currentMeta.discountPercent || 0);
    const discountAmount = roundToCurrency((standardAmount * discountPercent) / 100);
    const finalAmount = roundToCurrency(Math.max(standardAmount - discountAmount, 0));

    return {
      ...service,
      catalogItemId: catalogItem.id,
      serviceName: catalogItem.name,
      price: finalAmount,
      pricingMeta: {
        unitType: catalogItem.unitType,
        quantity,
        unitPrice,
        standardAmount,
        finalAmount,
        discountPercent,
        discountAmount,
        overrideReason: currentMeta.overrideReason || '',
        addOns: currentAddOns,
      },
    };
  };

  const applyCatalogToService = (index: number, catalogItemId: string) => {
    if (!catalogItemId) {
      updateService(index, {
        catalogItemId: null,
        pricingMeta: {},
      });
      return;
    }

    const catalogItem = getCatalogItem(catalogItemId);
    if (!catalogItem) return;

    const baseAddOns = catalogItem.addOns
      .filter((addOn) => addOn.isActive)
      .map((addOn) => ({
        code: addOn.code,
        name: addOn.name,
        quantity: Number(addOn.defaultQuantity || 1),
        unitPrice: Number(addOn.price),
        total: roundToCurrency(Number(addOn.price) * Number(addOn.defaultQuantity || 1)),
      }));

    setServices((prev) =>
      prev.map((service, i) => {
        if (i !== index) return service;
        return recalculateCatalogService(service, catalogItem, {
          quantity: Number(catalogItem.defaultQuantity || 1),
          unitPrice: Number(catalogItem.baseRate),
          discountPercent: 0,
          addOns: baseAddOns,
          overrideReason: '',
        });
      })
    );
  };

  const setCatalogQuantity = (index: number, quantity: number) => {
    setServices((prev) =>
      prev.map((service, i) => {
        if (i !== index) return service;
        const catalogItem = getCatalogItem(service.catalogItemId);
        if (!catalogItem) return service;
        return recalculateCatalogService(service, catalogItem, { quantity: Math.max(quantity, 0) });
      })
    );
  };

  const setCatalogDiscount = (index: number, discountPercent: number) => {
    setServices((prev) =>
      prev.map((service, i) => {
        if (i !== index) return service;
        const catalogItem = getCatalogItem(service.catalogItemId);
        if (!catalogItem) return service;
        return recalculateCatalogService(service, catalogItem, {
          discountPercent: Math.max(0, Math.min(100, discountPercent)),
        });
      })
    );
  };

  const toggleAddOn = (index: number, addOnCode: string, enabled: boolean) => {
    setServices((prev) =>
      prev.map((service, i) => {
        if (i !== index) return service;
        const catalogItem = getCatalogItem(service.catalogItemId);
        if (!catalogItem) return service;

        const currentAddOns = Array.isArray(service.pricingMeta?.addOns) ? service.pricingMeta!.addOns! : [];
        const target = catalogItem.addOns.find((addOn) => addOn.code === addOnCode);
        if (!target) return service;

        const nextAddOns = enabled
          ? [
              ...currentAddOns.filter((addOn) => addOn.code !== addOnCode),
              {
                code: target.code,
                name: target.name,
                quantity: Number(target.defaultQuantity || 1),
                unitPrice: Number(target.price),
                total: roundToCurrency(Number(target.price) * Number(target.defaultQuantity || 1)),
              },
            ]
          : currentAddOns.filter((addOn) => addOn.code !== addOnCode);

        return recalculateCatalogService(service, catalogItem, { addOns: nextAddOns });
      })
    );
  };

  const setOverrideReason = (index: number, reason: string) => {
    updateService(index, {
      pricingMeta: {
        ...(services[index].pricingMeta || {}),
        overrideReason: reason,
      },
    });
  };

  const subtotal = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const approvalNeeded = services.some((service) => {
    const standard = Number(service.pricingMeta?.standardAmount || 0);
    const price = Number(service.price || 0);
    return standard > 0 && standard > 0 && ((standard - price) / standard) * 100 > 10;
  });

  const handleSave = async () => {
    if (!accountId) {
      toast.error('Please select an account');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!facilityId || !scheduledDate || !scheduledStartTime || !scheduledEndTime) {
      toast.error('Facility and full schedule are required for one-time quotations');
      return;
    }

    const validServices = services.filter((service) => service.serviceName.trim());
    if (validServices.length === 0) {
      toast.error('Please add at least one service');
      return;
    }

    const missingReason = validServices.some((service) => {
      const standardAmount = Number(service.pricingMeta?.standardAmount || 0);
      if (standardAmount <= 0) return false;
      const discountPercent = ((standardAmount - Number(service.price || 0)) / standardAmount) * 100;
      return discountPercent > 0 && !service.pricingMeta?.overrideReason?.trim();
    });

    if (missingReason) {
      toast.error('Override reason is required for discounted standardized services');
      return;
    }

    setSaving(true);
    try {
      const serviceData = validServices.map((service, index) => ({
        catalogItemId: service.catalogItemId || null,
        serviceName: service.serviceName,
        description: service.description || null,
        price: roundToCurrency(Number(service.price) || 0),
        includedTasks: service.includedTasks || [],
        pricingMeta: service.pricingMeta || {},
        sortOrder: index,
      }));

      const scheduledStartDateTime =
        scheduledDate && scheduledStartTime
          ? new Date(`${scheduledDate}T${scheduledStartTime}:00.000Z`).toISOString()
          : null;
      const scheduledEndDateTime =
        scheduledDate && scheduledEndTime
          ? new Date(`${scheduledDate}T${scheduledEndTime}:00.000Z`).toISOString()
          : null;

      if (isEditing && id) {
        const data: UpdateQuotationInput = {
          accountId,
          facilityId: facilityId || null,
          title,
          description: description || null,
          validUntil: validUntil || null,
          scheduledDate: scheduledDate || null,
          scheduledStartTime: scheduledStartDateTime,
          scheduledEndTime: scheduledEndDateTime,
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
          scheduledDate: scheduledDate || null,
          scheduledStartTime: scheduledStartDateTime,
          scheduledEndTime: scheduledEndDateTime,
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
        <Card>
          <div className="p-6">
            <div className="h-96 skeleton rounded-lg" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/quotations/catalog')}>
            <Settings2 className="mr-1.5 h-4 w-4" />
            Manage Standards
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Quotation Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Account *"
              value={accountId}
              onChange={(value) => {
                setAccountId(value);
                setFacilityId('');
              }}
              options={[{ value: '', label: 'Select account...' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
            />
            <Select
              label="Facility *"
              value={facilityId}
              onChange={(value) => setFacilityId(value)}
              options={[{ value: '', label: 'Select facility...' }, ...facilities.map((f) => ({ value: f.id, label: f.name }))]}
            />
            <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Window and Carpet Cleaning" />
            <Input label="Valid Until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            <Input label="Tax Rate (%)" type="number" min={0} max={100} step={0.01} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            <Input label="Scheduled Date *" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            <Input label="Start Time *" type="time" value={scheduledStartTime} onChange={(e) => setScheduledStartTime(e.target.value)} />
            <Input label="End Time *" type="time" value={scheduledEndTime} onChange={(e) => setScheduledEndTime(e.target.value)} />
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

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Services</h2>
            <Button variant="secondary" size="sm" onClick={addService}>
              <Plus className="mr-1 h-3 w-3" />
              Add Service
            </Button>
          </div>

          {services.map((service, index) => {
            const catalogItem = getCatalogItem(service.catalogItemId);
            const discountPercent = Number(service.pricingMeta?.discountPercent || 0);
            const selectedAddOns = Array.isArray(service.pricingMeta?.addOns) ? service.pricingMeta!.addOns! : [];

            return (
              <div key={index} className="rounded-lg border border-surface-200 dark:border-surface-700 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Service {index + 1}</span>
                  {services.length > 1 && (
                    <button onClick={() => removeService(index)} className="p-1 text-surface-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Select
                  label="Standard Service"
                  value={service.catalogItemId || ''}
                  onChange={(value) => applyCatalogToService(index, value)}
                  options={[
                    { value: '', label: 'Manual service entry' },
                    ...catalogItems.map((item) => ({ value: item.id, label: `${item.name} (${item.unitType})` })),
                  ]}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Service Name *"
                    value={service.serviceName}
                    onChange={(e) => updateService(index, { serviceName: e.target.value })}
                    disabled={Boolean(catalogItem)}
                    placeholder="e.g., Deep Carpet Cleaning"
                  />
                  <Input
                    label="Price ($)"
                    type="number"
                    min={0}
                    step={0.01}
                    value={service.price}
                    onChange={(e) => updateService(index, { price: Number(e.target.value) })}
                    disabled={Boolean(catalogItem)}
                  />
                  <Input
                    label="Description"
                    value={service.description || ''}
                    onChange={(e) => updateService(index, { description: e.target.value })}
                    placeholder="Optional details"
                  />
                </div>

                {catalogItem && (
                  <div className="rounded-lg bg-surface-50 dark:bg-surface-800/60 p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label={catalogItem.unitType === 'per_window' ? 'Window Count' : catalogItem.unitType === 'per_sqft' ? 'Square Feet' : 'Quantity'}
                        type="number"
                        min={0}
                        step={catalogItem.unitType === 'per_sqft' ? 0.01 : 1}
                        value={Number(service.pricingMeta?.quantity || catalogItem.defaultQuantity || 1)}
                        onChange={(e) => setCatalogQuantity(index, Number(e.target.value))}
                      />
                      <Input label="Base Rate" type="number" value={Number(service.pricingMeta?.unitPrice || catalogItem.baseRate)} disabled />
                      <Input
                        label="Discount (%)"
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={discountPercent}
                        onChange={(e) => setCatalogDiscount(index, Number(e.target.value))}
                      />
                    </div>

                    {catalogItem.addOns.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-surface-700 dark:text-surface-200">Add-ons</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {catalogItem.addOns.map((addOn) => {
                            const checked = selectedAddOns.some((selected) => selected.code === addOn.code);
                            return (
                              <label key={addOn.code} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => toggleAddOn(index, addOn.code, event.target.checked)}
                                />
                                <span>
                                  {addOn.name} ({formatCurrency(Number(addOn.price))})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {discountPercent > 0 && (
                      <Input
                        label="Override Reason *"
                        value={service.pricingMeta?.overrideReason || ''}
                        onChange={(e) => setOverrideReason(index, e.target.value)}
                        placeholder="Explain discount approval reason"
                      />
                    )}

                    <div className="text-xs text-surface-500 dark:text-surface-400">
                      Standard: {formatCurrency(Number(service.pricingMeta?.standardAmount || 0))} | Final:{' '}
                      {formatCurrency(Number(service.price || 0))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="border-t border-surface-200 dark:border-surface-700 pt-4 space-y-3">
            {approvalNeeded && (
              <div className="rounded-lg border border-warning-300 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-600/50 dark:bg-warning-900/20 dark:text-warning-200">
                Discounts over 10% require owner/admin pricing approval before this quotation can be sent.
              </div>
            )}
            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Subtotal</span>
                  <span className="text-surface-900 dark:text-surface-100 font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Tax ({taxRate}%)</span>
                    <span className="text-surface-900 dark:text-surface-100 font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-surface-200 dark:border-surface-700 pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes"
            rows={3}
          />
          <Textarea
            label="Terms and Conditions"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            placeholder="Terms and conditions"
            rows={4}
          />
        </div>
      </Card>
    </div>
  );
};

export default QuotationForm;
