import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  createOneTimeServiceCatalogItem,
  deleteOneTimeServiceCatalogItem,
  listOneTimeServiceCatalog,
  updateOneTimeServiceCatalogItem,
} from '../../lib/oneTimeServiceCatalog';
import type { OneTimeServiceCatalogItem } from '../../types/oneTimeServiceCatalog';

const EMPTY_ITEM = {
  name: '',
  code: '',
  description: '',
  serviceType: 'custom' as const,
  unitType: 'fixed' as const,
  baseRate: 0,
  defaultQuantity: 1,
  minimumCharge: 0,
  maxDiscountPercent: 10,
};

const OneTimeServiceCatalogPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<OneTimeServiceCatalogItem[]>([]);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const result = await listOneTimeServiceCatalog({ includeInactive: true });
      setItems(result);
    } catch {
      toast.error('Failed to load one-time service standards');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createItem = async () => {
    if (!newItem.name.trim() || !newItem.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setSaving(true);
    try {
      await createOneTimeServiceCatalogItem({
        ...newItem,
        description: newItem.description || null,
        minimumCharge: Number(newItem.minimumCharge) > 0 ? Number(newItem.minimumCharge) : null,
        addOns: [],
      });
      toast.success('One-time service standard created');
      setNewItem(EMPTY_ITEM);
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create one-time service standard');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: OneTimeServiceCatalogItem) => {
    try {
      await updateOneTimeServiceCatalogItem(item.id, { isActive: !item.isActive });
      await load();
    } catch {
      toast.error('Failed to update item');
    }
  };

  const removeItem = async (item: OneTimeServiceCatalogItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      await deleteOneTimeServiceCatalogItem(item.id);
      toast.success('Deleted');
      await load();
    } catch {
      toast.error('Failed to delete item');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/quotations/new')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">One-Time Service Standards</h1>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">New Standard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Name" value={newItem.name} onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))} />
            <Input label="Code" value={newItem.code} onChange={(e) => setNewItem((prev) => ({ ...prev, code: e.target.value }))} />
            <Select
              label="Service Type"
              value={newItem.serviceType}
              onChange={(value) => setNewItem((prev) => ({ ...prev, serviceType: value as typeof prev.serviceType }))}
              options={[
                { value: 'window_cleaning', label: 'Window Cleaning' },
                { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            <Select
              label="Unit"
              value={newItem.unitType}
              onChange={(value) => setNewItem((prev) => ({ ...prev, unitType: value as typeof prev.unitType }))}
              options={[
                { value: 'per_window', label: 'Per Window' },
                { value: 'per_sqft', label: 'Per Sqft' },
                { value: 'fixed', label: 'Fixed' },
              ]}
            />
            <Input
              label="Base Rate"
              type="number"
              min={0}
              step={0.01}
              value={newItem.baseRate}
              onChange={(e) => setNewItem((prev) => ({ ...prev, baseRate: Number(e.target.value) }))}
            />
            <Input
              label="Max Discount %"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={newItem.maxDiscountPercent}
              onChange={(e) => setNewItem((prev) => ({ ...prev, maxDiscountPercent: Number(e.target.value) }))}
            />
          </div>
          <Button onClick={createItem} disabled={saving}>
            <Plus className="mr-1.5 h-4 w-4" />
            {saving ? 'Saving...' : 'Create Standard'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Existing Standards</h2>
          {items.length === 0 && <p className="text-sm text-surface-500">No standards yet.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2">
              <div>
                <p className="font-medium text-surface-900 dark:text-surface-100">{item.name}</p>
                <p className="text-xs text-surface-500">
                  {item.code} | {item.unitType} | ${Number(item.baseRate).toFixed(2)} | Max discount {Number(item.maxDiscountPercent).toFixed(2)}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => toggleActive(item)}>
                  <Save className="mr-1 h-3.5 w-3.5" />
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeItem(item)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default OneTimeServiceCatalogPage;
