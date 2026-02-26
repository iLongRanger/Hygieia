import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { createInvoice } from '../../lib/invoices';
import { listAccounts } from '../../lib/accounts';
import { listContracts } from '../../lib/contracts';
import { listFacilities } from '../../lib/facilities';
import type { Account } from '../../types/crm';
import type { InvoiceItemType } from '../../types/invoice';

type DraftItem = {
  description: string;
  quantity: string;
  unitPrice: string;
  itemType: InvoiceItemType;
};

const ITEM_TYPE_OPTIONS = [
  { value: 'service', label: 'Service' },
  { value: 'additional', label: 'Additional' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'credit', label: 'Credit' },
];

const InvoiceForm = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingContractItems, setLoadingContractItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    accountId: '',
    issueDate: today,
    dueDate: today,
    taxRate: '0',
    notes: '',
    paymentInstructions: '',
  });
  const [items, setItems] = useState<DraftItem[]>([
    { description: '', quantity: '1', unitPrice: '0', itemType: 'service' },
  ]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await listAccounts({ page: 1, limit: 200 });
        setAccounts(res.data);
      } catch {
        toast.error('Failed to load accounts');
      } finally {
        setLoadingAccounts(false);
      }
    };

    void loadAccounts();
  }, []);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  );

  useEffect(() => {
    const loadAccountContractItems = async () => {
      if (!form.accountId) {
        setItems([{ description: '', quantity: '1', unitPrice: '0', itemType: 'service' }]);
        return;
      }

      setLoadingContractItems(true);
      try {
        const [facilitiesRes, contractsRes] = await Promise.all([
          listFacilities({
            accountId: form.accountId,
            status: 'active',
            includeArchived: false,
            limit: 100,
            page: 1,
          }),
          listContracts({
            accountId: form.accountId,
            status: 'active',
            includeArchived: false,
            limit: 100,
            page: 1,
            sortBy: 'startDate',
            sortOrder: 'desc',
          }),
        ]);

        const activeFacilityIds = new Set(facilitiesRes.data.map((facility) => facility.id));
        const contractItems = contractsRes.data
          .filter((contract) => contract.facility?.id && activeFacilityIds.has(contract.facility.id))
          .map((contract) => ({
            description: `${contract.facility?.name ?? 'Facility'} - ${contract.title}`,
            quantity: '1',
            unitPrice: String(contract.monthlyValue ?? 0),
            itemType: 'service' as InvoiceItemType,
          }));

        if (contractItems.length === 0) {
          setItems([{ description: '', quantity: '1', unitPrice: '0', itemType: 'service' }]);
          toast('No active facility contracts found for this account');
          return;
        }

        setItems(contractItems);
      } catch {
        toast.error('Failed to load contract line items');
      } finally {
        setLoadingContractItems(false);
      }
    };

    void loadAccountContractItems();
  }, [form.accountId]);

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: '1', unitPrice: '0', itemType: 'service' },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.accountId) {
      toast.error('Account is required');
      return;
    }

    const parsedItems = items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      itemType: item.itemType,
    }));

    if (parsedItems.some((item) => !item.description)) {
      toast.error('Item description is required');
      return;
    }

    if (parsedItems.some((item) => Number.isNaN(item.quantity) || item.quantity <= 0)) {
      toast.error('Item quantity must be greater than 0');
      return;
    }

    if (parsedItems.some((item) => Number.isNaN(item.unitPrice))) {
      toast.error('Item unit price is invalid');
      return;
    }

    const taxRatePercent = Number(form.taxRate);
    if (Number.isNaN(taxRatePercent) || taxRatePercent < 0 || taxRatePercent > 100) {
      toast.error('Tax rate must be between 0 and 100');
      return;
    }

    try {
      setSubmitting(true);
      const invoice = await createInvoice({
        accountId: form.accountId,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        taxRate: taxRatePercent / 100,
        notes: form.notes || null,
        paymentInstructions: form.paymentInstructions || null,
        items: parsedItems,
      });
      toast.success('Invoice created');
      navigate(`/invoices/${invoice.id}`);
    } catch {
      toast.error('Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">New Invoice</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Create a manual invoice
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="Account"
            options={accountOptions}
            value={form.accountId}
            onChange={(value) => setForm((prev) => ({ ...prev, accountId: value }))}
            placeholder={loadingAccounts ? 'Loading accounts...' : 'Select account'}
            disabled={loadingAccounts}
            required
          />
          <Input
            label="Issue Date"
            type="date"
            value={form.issueDate}
            onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
            required
          />
          <Input
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Tax Rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.taxRate}
            onChange={(e) => setForm((prev) => ({ ...prev, taxRate: e.target.value }))}
          />
          <Input
            label="Payment Instructions"
            value={form.paymentInstructions}
            onChange={(e) => setForm((prev) => ({ ...prev, paymentInstructions: e.target.value }))}
            placeholder="e.g. ACH transfer within 30 days"
          />
        </div>

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Line Items</h2>
          <Button size="sm" variant="secondary" onClick={addItem} disabled={loadingContractItems}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Item
          </Button>
        </div>
        {loadingContractItems && (
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Loading active facility contracts...
          </p>
        )}

        {items.map((item, index) => (
          <div key={`invoice-item-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-surface-200 p-3 md:grid-cols-12 dark:border-surface-700">
            <div className="md:col-span-5">
              <Input
                label="Description"
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label="Type"
                options={ITEM_TYPE_OPTIONS}
                value={item.itemType}
                onChange={(value) => updateItem(index, { itemType: value as InvoiceItemType })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Qty"
                type="number"
                min="0.01"
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Unit Price"
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/invoices')}>Cancel</Button>
        <Button onClick={handleSubmit} isLoading={submitting}>Create Invoice</Button>
      </div>
    </div>
  );
};

export default InvoiceForm;
