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
  Archive,
  RotateCcw,
  Users,
  Building,
  Package,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
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
  setDefaultPricingSettings,
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
const DEFAULT_TRAFFIC_LEVELS = ['low', 'medium', 'high'];
const DEFAULT_BUILDING_TYPES = ['office', 'medical', 'industrial', 'retail', 'educational', 'warehouse', 'residential', 'mixed', 'other'];
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

const TRAFFIC_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
const BUILDING_TYPE_LABELS: Record<string, string> = {
  office: 'Office',
  medical: 'Medical/Healthcare',
  industrial: 'Industrial',
  retail: 'Retail',
  educational: 'Education',
  warehouse: 'Warehouse',
  residential: 'Residential',
  mixed: 'Mixed Use',
  other: 'Other',
};

const TASK_COMPLEXITY_LABELS: Record<string, string> = {
  standard: 'Standard Cleaning',
  sanitization: 'Sanitization',
  floor_care: 'Floor Care',
  window_cleaning: 'Window Cleaning',
};

const PRICING_TYPE_OPTIONS = [
  { value: 'square_foot', label: 'Per Sq Ft' },
  { value: 'hourly', label: 'Hourly' },
];

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
    pricingType: 'square_foot',
    baseRatePerSqFt: 0.10,
    minimumMonthlyCharge: 250,
    hourlyRate: 35,
    // Labor Cost Settings (defaults)
    laborCostPerHour: 18,
    laborBurdenPercentage: 0.25,
    sqftPerLaborHour: {
      office: 2500, medical: 1500, industrial: 2200, retail: 2400,
      educational: 2000, warehouse: 3500, residential: 2200, mixed: 2200, other: 2500,
    },
    // Overhead Cost Settings (defaults)
    insurancePercentage: 0.08,
    adminOverheadPercentage: 0.12,
    travelCostPerVisit: 15,
    equipmentPercentage: 0.05,
    // Supply Cost Settings (defaults)
    supplyCostPercentage: 0.04,
    // Profit Settings (defaults)
    targetProfitMargin: 0.25,
    // Subcontractor Settings (defaults)
    subcontractorPercentage: 0.60,
  });

  const fetchSettingsList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listPricingSettings({ limit: 100, includeArchived });
      setSettingsList(response?.data || []);

      // Auto-select the active one if nothing selected
      if (!selectedSettings && response?.data?.length > 0) {
        const defaultPlan = response.data.find((s) => s.isDefault);
        if (defaultPlan) {
          await loadSettings(defaultPlan.id);
        } else {
          await loadSettings(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pricing plans:', error);
      toast.error('Failed to load pricing plans');
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
        pricingType: data.pricingType,
        baseRatePerSqFt: Number(data.baseRatePerSqFt),
        minimumMonthlyCharge: Number(data.minimumMonthlyCharge),
        hourlyRate: Number(data.hourlyRate || 35),
        // Labor Cost Settings
        laborCostPerHour: Number(data.laborCostPerHour || 18),
        laborBurdenPercentage: Number(data.laborBurdenPercentage || 0.25),
        sqftPerLaborHour: data.sqftPerLaborHour || {
          office: 2500, medical: 1500, industrial: 2200, retail: 2400,
          educational: 2000, warehouse: 3500, residential: 2200, mixed: 2200, other: 2500,
        },
        // Overhead Cost Settings
        insurancePercentage: Number(data.insurancePercentage || 0.08),
        adminOverheadPercentage: Number(data.adminOverheadPercentage || 0.12),
        travelCostPerVisit: Number(data.travelCostPerVisit || 15),
        equipmentPercentage: Number(data.equipmentPercentage || 0.05),
        // Supply Cost Settings
        supplyCostPercentage: Number(data.supplyCostPercentage || 0.04),
        supplyCostPerSqFt: data.supplyCostPerSqFt ? Number(data.supplyCostPerSqFt) : undefined,
        // Profit Settings
        targetProfitMargin: Number(data.targetProfitMargin || 0.25),
        // Subcontractor Settings
        subcontractorPercentage: Number(data.subcontractorPercentage || 0.60),
        // Multipliers
        floorTypeMultipliers: data.floorTypeMultipliers,
        frequencyMultipliers: data.frequencyMultipliers,
        conditionMultipliers: data.conditionMultipliers,
        trafficMultipliers: data.trafficMultipliers,
        taskComplexityAddOns: data.taskComplexityAddOns,
        isActive: data.isActive,
        isDefault: data.isDefault,
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
      toast.success('Pricing plan updated successfully');
      setIsEditing(false);
      await loadSettings(selectedSettings.id);
    } catch (error) {
      console.error('Failed to update pricing plan:', error);
      toast.error('Failed to update pricing plan');
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
      toast.success('Pricing plan created successfully');
      setShowCreateModal(false);
      setCreateFormData({
        name: '',
        pricingType: 'square_foot',
        baseRatePerSqFt: 0.10,
        minimumMonthlyCharge: 250,
        hourlyRate: 35,
        laborCostPerHour: 18,
        laborBurdenPercentage: 0.25,
        sqftPerLaborHour: {
          office: 2500, medical: 1500, industrial: 2200, retail: 2400,
          educational: 2000, warehouse: 3500, residential: 2200, mixed: 2200, other: 2500,
        },
        insurancePercentage: 0.08,
        adminOverheadPercentage: 0.12,
        travelCostPerVisit: 15,
        equipmentPercentage: 0.05,
        supplyCostPercentage: 0.04,
        targetProfitMargin: 0.25,
        subcontractorPercentage: 0.60,
      });
      await fetchSettingsList();
      await loadSettings(created.id);
    } catch (error) {
      console.error('Failed to create pricing plan:', error);
      toast.error('Failed to create pricing plan');
    } finally {
      setCreating(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPricingSettings(id);
      toast.success('Pricing plan set as default');
      await fetchSettingsList();
      await loadSettings(id);
    } catch (error) {
      console.error('Failed to set default pricing plan:', error);
      toast.error('Failed to set default pricing plan');
    }
  };

  const handleArchive = async () => {
    if (!selectedSettings) return;
    try {
      await archivePricingSettings(selectedSettings.id);
      toast.success('Pricing plan archived');
      setShowArchiveConfirm(false);
      setSelectedSettings(null);
      await fetchSettingsList();
    } catch (error) {
      console.error('Failed to archive settings:', error);
      toast.error('Failed to archive pricing plan');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restorePricingSettings(id);
      toast.success('Pricing plan restored');
      await fetchSettingsList();
    } catch (error) {
      console.error('Failed to restore settings:', error);
      toast.error('Failed to restore pricing plan');
    }
  };


  const updateMultiplier = (
    category: 'floorTypeMultipliers' | 'frequencyMultipliers' | 'conditionMultipliers' | 'trafficMultipliers' | 'sqftPerLaborHour' | 'taskComplexityAddOns',
    key: string,
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...((prev as any)[category] || {}),
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

  const formatPercent = (value: string | number) => {
    return `${(Number(value) * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: string | number, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(value));
  };

  const formatPricingType = (value: string) => (
    value === 'hourly' ? 'Hourly' : 'Per Sq Ft'
  );

  const getPlanRateSummary = (plan: PricingSettings) => (
    plan.pricingType === 'hourly'
      ? `${formatCurrency(plan.hourlyRate)}/hr`
      : `${formatCurrency(plan.baseRatePerSqFt)}/sqft`
  );

  const activePricingType = (isEditing ? formData.pricingType : selectedSettings?.pricingType)
    ?? selectedSettings?.pricingType
    ?? formData.pricingType
    ?? 'square_foot';
  const isHourlyPlan = activePricingType === 'hourly';
  const isCreateHourlyPlan = createFormData.pricingType === 'hourly';

  const settingsColumns = [
    {
      header: 'Plan',
      cell: (item: PricingSettings) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
            <Settings className="h-5 w-5 text-primary-500" />
          </div>
          <div>
            <div className="font-medium text-white">{item.name}</div>
            <div className="text-sm text-gray-400">
              {formatPricingType(item.pricingType)} - {getPlanRateSummary(item)}
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
          {item.isDefault && <Badge variant="info">Default</Badge>}
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
          {!item.isDefault && !item.archivedAt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSetDefault(item.id)}
              title="Set as default"
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
          <h1 className="text-2xl font-bold text-white">Pricing Plans</h1>
          <p className="text-gray-400">Configure pricing plans and base rates</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Settings List */}
        <Card noPadding className="overflow-hidden xl:col-span-1">
          <div className="border-b border-white/10 bg-navy-dark/30 p-4">
            <h3 className="font-semibold text-white">Plan Profiles</h3>
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
                      {getPlanRateSummary(settings)}
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
                      {selectedSettings.isDefault && <Badge variant="info">Default</Badge>}
                      {selectedSettings.isActive ? (
                        <Badge variant="success">Active</Badge>
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
                          {!selectedSettings.isDefault && (
                            <Button
                              variant="secondary"
                              onClick={() => handleSetDefault(selectedSettings.id)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Set Default
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                {isEditing ? (
                  <>
                    <Select
                      label="Pricing Type"
                      placeholder="Select pricing type"
                      options={PRICING_TYPE_OPTIONS}
                      value={activePricingType}
                      onChange={(value) => setFormData({ ...formData, pricingType: value })}
                    />
                    {!isHourlyPlan && (
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
                    )}
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
                    {isHourlyPlan && (
                      <Input
                        label="Hourly Rate ($)"
                        type="number"
                        step="0.01"
                        min={0}
                        value={formData.hourlyRate ?? 35}
                        onChange={(e) =>
                          setFormData({ ...formData, hourlyRate: Number(e.target.value) })
                        }
                      />
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm text-gray-400">Pricing Type</span>
                      <p className="text-xl font-semibold text-white">
                        {formatPricingType(selectedSettings.pricingType)}
                      </p>
                    </div>
                    {!isHourlyPlan && (
                      <div>
                        <span className="text-sm text-gray-400">Base Rate per Sq Ft</span>
                        <p className="text-xl font-semibold text-white">
                          {formatCurrency(selectedSettings.baseRatePerSqFt)}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-400">Minimum Monthly Charge</span>
                      <p className="text-xl font-semibold text-white">
                        {formatCurrency(selectedSettings.minimumMonthlyCharge)}
                      </p>
                    </div>
                    {isHourlyPlan && (
                      <div>
                        <span className="text-sm text-gray-400">Hourly Rate</span>
                        <p className="text-xl font-semibold text-white">
                          {formatCurrency(selectedSettings.hourlyRate || 35)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Labor Cost Settings */}
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Users className="h-5 w-5 text-blue-400" />
                Labor Cost Settings
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Configure labor rates, burden (taxes/benefits), and productivity rates.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {isEditing ? (
                  <>
                    <Input
                      label="Labor Cost per Hour ($)"
                      type="number"
                      step="0.50"
                      min={0}
                      value={formData.laborCostPerHour ?? 18}
                      onChange={(e) =>
                        setFormData({ ...formData, laborCostPerHour: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Labor Burden (decimal)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.laborBurdenPercentage ?? 0.25}
                      onChange={(e) =>
                        setFormData({ ...formData, laborBurdenPercentage: Number(e.target.value) })
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Labor Cost per Hour</span>
                      <p className="text-xl font-semibold text-white">
                        {formatCurrency(selectedSettings.laborCostPerHour || 18)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Labor Burden</span>
                      <p className="text-xl font-semibold text-white">
                        {formatPercent(selectedSettings.laborBurdenPercentage || 0.25)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Per-Building-Type Productivity Rates */}
              <h4 className="mt-6 mb-3 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Sq Ft per Labor Hour (by Building Type)
              </h4>
              <p className="mb-4 text-sm text-gray-400">
                Productivity rate: how many square feet a cleaner can clean per hour for each building type. Lower values = more time needed = higher cost.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_BUILDING_TYPES.map((key) => (
                  <div key={key}>
                    {isEditing ? (
                      <Input
                        label={BUILDING_TYPE_LABELS[key] || key}
                        type="number"
                        step="100"
                        min={100}
                        max={10000}
                        value={formData.sqftPerLaborHour?.[key] ?? 2500}
                        onChange={(e) =>
                          updateMultiplier('sqftPerLaborHour', key, Number(e.target.value))
                        }
                      />
                    ) : (
                      <div className="rounded-lg bg-navy-darker/50 p-3">
                        <span className="text-sm text-gray-400">{BUILDING_TYPE_LABELS[key] || key}</span>
                        <p className="text-lg font-semibold text-white">
                          {formatNumber(selectedSettings.sqftPerLaborHour?.[key] ?? 2500)} sqft/hr
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Overhead Cost Settings */}
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Building className="h-5 w-5 text-purple-400" />
                Overhead Cost Settings
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Configure overhead costs as percentages of labor cost, plus flat travel costs.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isEditing ? (
                  <>
                    <Input
                      label="Insurance (decimal)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.insurancePercentage ?? 0.08}
                      onChange={(e) =>
                        setFormData({ ...formData, insurancePercentage: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Admin Overhead (decimal)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.adminOverheadPercentage ?? 0.12}
                      onChange={(e) =>
                        setFormData({ ...formData, adminOverheadPercentage: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Equipment (decimal)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.equipmentPercentage ?? 0.05}
                      onChange={(e) =>
                        setFormData({ ...formData, equipmentPercentage: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Travel Cost per Visit ($)"
                      type="number"
                      step="1"
                      min={0}
                      value={formData.travelCostPerVisit ?? 15}
                      onChange={(e) =>
                        setFormData({ ...formData, travelCostPerVisit: Number(e.target.value) })
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Insurance</span>
                      <p className="text-xl font-semibold text-white">
                        {formatPercent(selectedSettings.insurancePercentage || 0.08)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Admin Overhead</span>
                      <p className="text-xl font-semibold text-white">
                        {formatPercent(selectedSettings.adminOverheadPercentage || 0.12)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Equipment</span>
                      <p className="text-xl font-semibold text-white">
                        {formatPercent(selectedSettings.equipmentPercentage || 0.05)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Travel per Visit</span>
                      <p className="text-xl font-semibold text-white">
                        {formatCurrency(selectedSettings.travelCostPerVisit || 15)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Supply Cost Settings */}
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Package className="h-5 w-5 text-orange-400" />
                Supply Cost Settings
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Configure supply costs as a percentage of labor+overhead, or as a flat per-sqft rate.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {isEditing ? (
                  <>
                    <Input
                      label="Supply Cost (decimal)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.supplyCostPercentage ?? 0.04}
                      onChange={(e) =>
                        setFormData({ ...formData, supplyCostPercentage: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Supply Cost per Sq Ft ($)"
                      type="number"
                      step="0.001"
                      min={0}
                      value={formData.supplyCostPerSqFt ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplyCostPerSqFt: e.target.value ? Number(e.target.value) : undefined
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Supply Cost Percentage</span>
                      <p className="text-xl font-semibold text-white">
                        {formatPercent(selectedSettings.supplyCostPercentage || 0.04)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Supply Cost per Sq Ft</span>
                      <p className="text-xl font-semibold text-white">
                        {selectedSettings.supplyCostPerSqFt
                          ? formatCurrency(selectedSettings.supplyCostPerSqFt)
                          : 'Not set (using %)'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Profit Settings */}
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <TrendingUp className="h-5 w-5 text-emerald" />
                Profit Settings
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Target profit margin applied using: Final Price = Total Cost / (1 - Margin)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {isEditing ? (
                  <Input
                    label="Target Profit Margin (decimal)"
                    type="number"
                    step="0.01"
                    min={0}
                    max={0.99}
                    value={formData.targetProfitMargin ?? 0.25}
                    onChange={(e) =>
                      setFormData({ ...formData, targetProfitMargin: Number(e.target.value) })
                    }
                  />
                ) : (
                  <div className="rounded-lg bg-navy-darker/50 p-3">
                    <span className="text-sm text-gray-400">Target Profit Margin</span>
                    <p className="text-xl font-semibold text-white">
                      {formatPercent(selectedSettings.targetProfitMargin || 0.25)}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Subcontractor Settings */}
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <UserCheck className="h-5 w-5 text-cyan-400" />
                Subcontractor Settings
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Percentage of the final monthly total paid to the subcontractor. For example, 60% means the sub gets 60% and the company keeps 40%.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {isEditing ? (
                  <Input
                    label="Subcontractor Percentage (%)"
                    type="number"
                    step="1"
                    min={0}
                    max={100}
                    value={Math.round((formData.subcontractorPercentage ?? 0.60) * 100)}
                    onChange={(e) =>
                      setFormData({ ...formData, subcontractorPercentage: Number(e.target.value) / 100 })
                    }
                  />
                ) : (
                  <div className="rounded-lg bg-navy-darker/50 p-3">
                    <span className="text-sm text-gray-400">Subcontractor Percentage</span>
                    <p className="text-xl font-semibold text-white">
                      {formatPercent(selectedSettings.subcontractorPercentage || '0.60')}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Floor Type Multipliers */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Floor Type Multipliers</h3>
              <p className="mb-4 text-sm text-gray-400">
                Adjust pricing based on floor type. Value of 1.0 = base rate.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

            {/* Traffic Multipliers */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Traffic Multipliers</h3>
              <p className="mb-4 text-sm text-gray-400">
                Adjust pricing based on traffic level. Higher traffic = higher price.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEFAULT_TRAFFIC_LEVELS.map((key) => (
                  <div key={key}>
                    {isEditing ? (
                      <Input
                        label={TRAFFIC_LABELS[key] || key}
                        type="number"
                        step="0.01"
                        min={0}
                        value={formData.trafficMultipliers?.[key] ?? 1.0}
                        onChange={(e) =>
                          updateMultiplier('trafficMultipliers', key, Number(e.target.value))
                        }
                      />
                    ) : (
                      <div className="rounded-lg bg-navy-darker/50 p-3">
                        <span className="text-sm text-gray-400">{TRAFFIC_LABELS[key] || key}</span>
                        <p className="text-lg font-semibold text-white">
                          {(selectedSettings.trafficMultipliers?.[key] ?? 1.0).toFixed(2)}x
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <h3 className="mt-4 text-lg font-medium text-white">No Plan Selected</h3>
                <p className="mt-2 text-gray-400">
                  Select a pricing plan from the list or create a new one.
                </p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Plan
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
        title="Create Pricing Plan"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Plan Name"
            placeholder="e.g., Standard 2024 Rates"
            value={createFormData.name}
            onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
          />
          <Select
            label="Pricing Type"
            placeholder="Select pricing type"
            options={PRICING_TYPE_OPTIONS}
            value={createFormData.pricingType || 'square_foot'}
            onChange={(value) => setCreateFormData({ ...createFormData, pricingType: value })}
          />
          {!isCreateHourlyPlan && (
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
          )}
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
          {isCreateHourlyPlan && (
            <Input
              label="Hourly Rate ($)"
              type="number"
              step="0.01"
              min={0}
              value={createFormData.hourlyRate ?? 35}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, hourlyRate: Number(e.target.value) })
              }
            />
          )}
          <p className="text-sm text-gray-400">
            Default multipliers will be applied. You can customize them after creation.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={creating} disabled={!createFormData.name}>
              Create Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Archive Confirm */}
      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Pricing Plan"
        message={`Are you sure you want to archive "${selectedSettings?.name}"? You can restore it later if needed.`}
        variant="warning"
      />

    </div>
  );
};

export default PricingSettingsPage;

