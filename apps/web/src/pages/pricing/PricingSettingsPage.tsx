import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  DollarSign,
  Edit2,
  Save,
  X,
  Plus,
  Check,
  Trash2,
  Archive,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  listPricingSettings,
  getPricingSettings,
  createPricingSettings,
  updatePricingSettings,
  setActivePricingSettings,
  archivePricingSettings,
  restorePricingSettings,
  type PricingSettings,
  type CreatePricingSettingsInput,
  type UpdatePricingSettingsInput,
} from '../../lib/pricing';

// Default multiplier keys
const DEFAULT_FLOOR_TYPES = ['vct', 'carpet', 'hardwood', 'tile', 'concrete', 'epoxy'];
const DEFAULT_FREQUENCIES = ['1x_week', '2x_week', '3x_week', '4x_week', '5x_week', 'daily', 'monthly'];
const DEFAULT_CONDITIONS = ['standard', 'medium', 'hard'];
const DEFAULT_BUILDING_TYPES = ['office', 'medical', 'industrial', 'retail', 'education', 'warehouse'];
const DEFAULT_TASK_COMPLEXITIES = ['standard', 'sanitization', 'floor_care', 'window_cleaning'];

const FLOOR_TYPE_LABELS: Record<string, string> = {
  vct: 'VCT (Vinyl Composition Tile)',
  carpet: 'Carpet',
  hardwood: 'Hardwood',
  tile: 'Ceramic/Porcelain Tile',
  concrete: 'Concrete',
  epoxy: 'Epoxy',
};

const FREQUENCY_LABELS: Record<string, string> = {
  '1x_week': '1x per Week',
  '2x_week': '2x per Week',
  '3x_week': '3x per Week',
  '4x_week': '4x per Week',
  '5x_week': '5x per Week',
  daily: 'Daily (7x)',
  monthly: 'Monthly',
};

const CONDITION_LABELS: Record<string, string> = {
  standard: 'Standard',
  medium: 'Medium Difficulty',
  hard: 'Hard/Heavy Traffic',
};

const BUILDING_TYPE_LABELS: Record<string, string> = {
  office: 'Office',
  medical: 'Medical/Healthcare',
  industrial: 'Industrial',
  retail: 'Retail',
  education: 'Education',
  warehouse: 'Warehouse',
};

const TASK_COMPLEXITY_LABELS: Record<string, string> = {
  standard: 'Standard Cleaning',
  sanitization: 'Sanitization',
  floor_care: 'Floor Care',
  window_cleaning: 'Window Cleaning',
};

const PricingSettingsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settingsList, setSettingsList] = useState<PricingSettings[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<PricingSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  const [formData, setFormData] = useState<UpdatePricingSettingsInput>({});
  const [createFormData, setCreateFormData] = useState<CreatePricingSettingsInput>({
    name: '',
    baseRatePerSqFt: 0.10,
    minimumMonthlyCharge: 250,
  });

  const fetchSettingsList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listPricingSettings({ limit: 100, includeArchived });
      setSettingsList(response?.data || []);

      // Auto-select the active one if nothing selected
      if (!selectedSettings && response?.data?.length > 0) {
        const active = response.data.find((s) => s.isActive);
        if (active) {
          await loadSettings(active.id);
        } else {
          await loadSettings(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pricing settings:', error);
      toast.error('Failed to load pricing settings');
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  const loadSettings = async (id: string) => {
    try {
      const data = await getPricingSettings(id);
      setSelectedSettings(data);
      setFormData({
        name: data.name,
        baseRatePerSqFt: Number(data.baseRatePerSqFt),
        minimumMonthlyCharge: Number(data.minimumMonthlyCharge),
        floorTypeMultipliers: data.floorTypeMultipliers,
        frequencyMultipliers: data.frequencyMultipliers,
        conditionMultipliers: data.conditionMultipliers,
        buildingTypeMultipliers: data.buildingTypeMultipliers,
        taskComplexityAddOns: data.taskComplexityAddOns,
        isActive: data.isActive,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings details');
    }
  };

  useEffect(() => {
    fetchSettingsList();
  }, [fetchSettingsList]);

  const handleSave = async () => {
    if (!selectedSettings) return;
    try {
      setSaving(true);
      await updatePricingSettings(selectedSettings.id, formData);
      toast.success('Pricing settings updated successfully');
      setIsEditing(false);
      await loadSettings(selectedSettings.id);
    } catch (error) {
      console.error('Failed to update pricing settings:', error);
      toast.error('Failed to update pricing settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createFormData.name) {
      toast.error('Please enter a name');
      return;
    }
    try {
      setCreating(true);
      const created = await createPricingSettings(createFormData);
      toast.success('Pricing settings created successfully');
      setShowCreateModal(false);
      setCreateFormData({ name: '', baseRatePerSqFt: 0.10, minimumMonthlyCharge: 250 });
      await fetchSettingsList();
      await loadSettings(created.id);
    } catch (error) {
      console.error('Failed to create pricing settings:', error);
      toast.error('Failed to create pricing settings');
    } finally {
      setCreating(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await setActivePricingSettings(id);
      toast.success('Pricing settings activated');
      await fetchSettingsList();
      await loadSettings(id);
    } catch (error) {
      console.error('Failed to activate settings:', error);
      toast.error('Failed to activate pricing settings');
    }
  };

  const handleArchive = async () => {
    if (!selectedSettings) return;
    try {
      await archivePricingSettings(selectedSettings.id);
      toast.success('Pricing settings archived');
      setShowArchiveConfirm(false);
      setSelectedSettings(null);
      await fetchSettingsList();
    } catch (error) {
      console.error('Failed to archive settings:', error);
      toast.error('Failed to archive pricing settings');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restorePricingSettings(id);
      toast.success('Pricing settings restored');
      await fetchSettingsList();
    } catch (error) {
      console.error('Failed to restore settings:', error);
      toast.error('Failed to restore pricing settings');
    }
  };

  const updateMultiplier = (
    category: 'floorTypeMultipliers' | 'frequencyMultipliers' | 'conditionMultipliers' | 'buildingTypeMultipliers' | 'taskComplexityAddOns',
    key: string,
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value,
      },
    }));
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Number(value));
  };

  const settingsColumns = [
    {
      header: 'Settings Name',
      cell: (item: PricingSettings) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
            <Settings className="h-5 w-5 text-primary-500" />
          </div>
          <div>
            <div className="font-medium text-white">{item.name}</div>
            <div className="text-sm text-gray-400">
              Base: {formatCurrency(item.baseRatePerSqFt)}/sqft
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Min Monthly',
      cell: (item: PricingSettings) => (
        <span className="text-gray-300">{formatCurrency(item.minimumMonthlyCharge)}</span>
      ),
    },
    {
      header: 'Status',
      cell: (item: PricingSettings) => (
        <div className="flex gap-2">
          {item.isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="default">Inactive</Badge>
          )}
          {item.archivedAt && <Badge variant="error">Archived</Badge>}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (item: PricingSettings) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadSettings(item.id)}
          >
            View
          </Button>
          {!item.isActive && !item.archivedAt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSetActive(item.id)}
              title="Set as active"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          {item.archivedAt ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRestore(item.id)}
              title="Restore"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (loading && !selectedSettings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/pricing')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Pricing Settings</h1>
          <p className="text-gray-400">Configure pricing multipliers and base rates</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Settings List */}
        <Card noPadding className="overflow-hidden xl:col-span-1">
          <div className="border-b border-white/10 bg-navy-dark/30 p-4">
            <h3 className="font-semibold text-white">Settings Profiles</h3>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
              />
              Include Archived
            </label>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {settingsList.map((settings) => (
              <div
                key={settings.id}
                className={`cursor-pointer border-b border-white/5 p-4 transition-colors hover:bg-white/5 ${
                  selectedSettings?.id === settings.id ? 'bg-primary-500/10' : ''
                }`}
                onClick={() => loadSettings(settings.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{settings.name}</div>
                    <div className="text-sm text-gray-400">
                      {formatCurrency(settings.baseRatePerSqFt)}/sqft
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {settings.isActive && <Badge variant="success">Active</Badge>}
                    {settings.archivedAt && <Badge variant="error">Archived</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Settings Detail */}
        {selectedSettings ? (
          <div className="space-y-6 xl:col-span-2">
            {/* Header */}
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500/10">
                    <Settings className="h-7 w-7 text-primary-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedSettings.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedSettings.isActive ? (
                        <Badge variant="success">Active Profile</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                      {selectedSettings.archivedAt && <Badge variant="error">Archived</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="secondary" onClick={() => setIsEditing(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} isLoading={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      {!selectedSettings.archivedAt && (
                        <>
                          <Button variant="secondary" onClick={() => setIsEditing(true)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          {!selectedSettings.isActive && (
                            <Button
                              variant="secondary"
                              onClick={() => handleSetActive(selectedSettings.id)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Set Active
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            onClick={() => setShowArchiveConfirm(true)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Base Rates */}
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <DollarSign className="h-5 w-5 text-emerald" />
                Base Rates
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {isEditing ? (
                  <>
                    <Input
                      label="Base Rate per Sq Ft ($)"
                      type="number"
                      step="0.01"
                      min={0}
                      value={formData.baseRatePerSqFt || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, baseRatePerSqFt: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Minimum Monthly Charge ($)"
                      type="number"
                      step="1"
                      min={0}
                      value={formData.minimumMonthlyCharge || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, minimumMonthlyCharge: Number(e.target.value) })
                      }
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm text-gray-400">Base Rate per Sq Ft</span>
                      <p className="text-xl font-semibold text-white">
                        {formatCurrency(selectedSettings.baseRatePerSqFt)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Minimum Monthly Charge</span>
                      <p className="text-xl font-semibold text-white">
                        {formatCurrency(selectedSettings.minimumMonthlyCharge)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Floor Type Multipliers */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Floor Type Multipliers</h3>
              <p className="mb-4 text-sm text-gray-400">
                Adjust pricing based on floor type. Value of 1.0 = base rate.
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {DEFAULT_FLOOR_TYPES.map((key) => (
                  <div key={key}>
                    {isEditing ? (
                      <Input
                        label={FLOOR_TYPE_LABELS[key] || key}
                        type="number"
                        step="0.01"
                        min={0}
                        value={formData.floorTypeMultipliers?.[key] ?? 1.0}
                        onChange={(e) =>
                          updateMultiplier('floorTypeMultipliers', key, Number(e.target.value))
                        }
                      />
                    ) : (
                      <div className="rounded-lg bg-navy-darker/50 p-3">
                        <span className="text-sm text-gray-400">{FLOOR_TYPE_LABELS[key] || key}</span>
                        <p className="text-lg font-semibold text-white">
                          {(selectedSettings.floorTypeMultipliers?.[key] ?? 1.0).toFixed(2)}x
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Frequency Multipliers */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Frequency Multipliers</h3>
              <p className="mb-4 text-sm text-gray-400">
                Adjust pricing based on service frequency. Higher frequency = lower per-visit cost.
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {DEFAULT_FREQUENCIES.map((key) => (
                  <div key={key}>
                    {isEditing ? (
                      <Input
                        label={FREQUENCY_LABELS[key] || key}
                        type="number"
                        step="0.01"
                        min={0}
                        value={formData.frequencyMultipliers?.[key] ?? 1.0}
                        onChange={(e) =>
                          updateMultiplier('frequencyMultipliers', key, Number(e.target.value))
                        }
                      />
                    ) : (
                      <div className="rounded-lg bg-navy-darker/50 p-3">
                        <span className="text-sm text-gray-400">{FREQUENCY_LABELS[key] || key}</span>
                        <p className="text-lg font-semibold text-white">
                          {(selectedSettings.frequencyMultipliers?.[key] ?? 1.0).toFixed(2)}x
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Condition Multipliers */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Condition Multipliers</h3>
              <p className="mb-4 text-sm text-gray-400">
                Adjust pricing based on area condition/difficulty. Harder conditions = higher price.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {DEFAULT_CONDITIONS.map((key) => (
                  <div key={key}>
                    {isEditing ? (
                      <Input
                        label={CONDITION_LABELS[key] || key}
                        type="number"
                        step="0.01"
                        min={0}
                        value={formData.conditionMultipliers?.[key] ?? 1.0}
                        onChange={(e) =>
                          updateMultiplier('conditionMultipliers', key, Number(e.target.value))
                        }
                      />
                    ) : (
                      <div className="rounded-lg bg-navy-darker/50 p-3">
                        <span className="text-sm text-gray-400">{CONDITION_LABELS[key] || key}</span>
                        <p className="text-lg font-semibold text-white">
                          {(selectedSettings.conditionMultipliers?.[key] ?? 1.0).toFixed(2)}x
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Building Type Multipliers */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Building Type Multipliers</h3>
              <p className="mb-4 text-sm text-gray-400">
                Adjust pricing based on building type. Medical/specialized facilities = higher price.
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {DEFAULT_BUILDING_TYPES.map((key) => (
                  <div key={key}>
                    {isEditing ? (
                      <Input
                        label={BUILDING_TYPE_LABELS[key] || key}
                        type="number"
                        step="0.01"
                        min={0}
                        value={formData.buildingTypeMultipliers?.[key] ?? 1.0}
                        onChange={(e) =>
                          updateMultiplier('buildingTypeMultipliers', key, Number(e.target.value))
                        }
                      />
                    ) : (
                      <div className="rounded-lg bg-navy-darker/50 p-3">
                        <span className="text-sm text-gray-400">{BUILDING_TYPE_LABELS[key] || key}</span>
                        <p className="text-lg font-semibold text-white">
                          {(selectedSettings.buildingTypeMultipliers?.[key] ?? 1.0).toFixed(2)}x
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Task Complexity Add-Ons */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Task Complexity Add-Ons</h3>
              <p className="mb-4 text-sm text-gray-400">
                Additional percentage for specialized tasks. Value of 0.15 = 15% add-on to base price.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {DEFAULT_TASK_COMPLEXITIES.map((key) => (
                  <div key={key}>
                    {isEditing ? (
                      <Input
                        label={TASK_COMPLEXITY_LABELS[key] || key}
                        type="number"
                        step="0.01"
                        min={0}
                        value={formData.taskComplexityAddOns?.[key] ?? 0}
                        onChange={(e) =>
                          updateMultiplier('taskComplexityAddOns', key, Number(e.target.value))
                        }
                      />
                    ) : (
                      <div className="rounded-lg bg-navy-darker/50 p-3">
                        <span className="text-sm text-gray-400">{TASK_COMPLEXITY_LABELS[key] || key}</span>
                        <p className="text-lg font-semibold text-white">
                          +{((selectedSettings.taskComplexityAddOns?.[key] ?? 0) * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="xl:col-span-2">
            <Card>
              <div className="py-12 text-center">
                <Settings className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-white">No Settings Selected</h3>
                <p className="mt-2 text-gray-400">
                  Select a pricing settings profile from the list or create a new one.
                </p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Settings
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Pricing Settings"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Settings Name"
            placeholder="e.g., Standard 2024 Rates"
            value={createFormData.name}
            onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
          />
          <Input
            label="Base Rate per Sq Ft ($)"
            type="number"
            step="0.01"
            min={0}
            value={createFormData.baseRatePerSqFt || ''}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, baseRatePerSqFt: Number(e.target.value) })
            }
          />
          <Input
            label="Minimum Monthly Charge ($)"
            type="number"
            step="1"
            min={0}
            value={createFormData.minimumMonthlyCharge || ''}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, minimumMonthlyCharge: Number(e.target.value) })
            }
          />
          <p className="text-sm text-gray-400">
            Default multipliers will be applied. You can customize them after creation.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={creating} disabled={!createFormData.name}>
              Create Settings
            </Button>
          </div>
        </div>
      </Modal>

      {/* Archive Confirm */}
      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Pricing Settings"
        message={`Are you sure you want to archive "${selectedSettings?.name}"? You can restore it later if needed.`}
        variant="warning"
      />
    </div>
  );
};

export default PricingSettingsPage;
