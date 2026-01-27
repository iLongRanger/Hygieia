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
  Users,
  Building,
  Package,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Textarea } from '../../components/ui/Textarea';
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
import {
  listFixtureTypes,
  createFixtureType,
  updateFixtureType,
  deleteFixtureType,
} from '../../lib/facilities';
import type { FixtureType } from '../../types/facility';

// Default multiplier keys
const DEFAULT_FLOOR_TYPES = ['vct', 'carpet', 'hardwood', 'tile', 'concrete', 'epoxy'];
const DEFAULT_FREQUENCIES = ['1x_week', '2x_week', '3x_week', '4x_week', '5x_week', 'daily', 'monthly'];
const DEFAULT_CONDITIONS = ['standard', 'medium', 'hard'];
const DEFAULT_TRAFFIC_LEVELS = ['low', 'medium', 'high'];
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
  const [fixtureTypes, setFixtureTypes] = useState<FixtureType[]>([]);
  const [fixtureLoading, setFixtureLoading] = useState(false);
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [fixtureForm, setFixtureForm] = useState({
    id: '',
    name: '',
    description: '',
    isActive: true,
  });
  const [fixtureSaving, setFixtureSaving] = useState(false);
  const [fixtureDeleteId, setFixtureDeleteId] = useState<string | null>(null);
  const [includeInactiveFixtures, setIncludeInactiveFixtures] = useState(false);

  const [formData, setFormData] = useState<UpdatePricingSettingsInput>({});
  const [createFormData, setCreateFormData] = useState<CreatePricingSettingsInput>({
    name: '',
    baseRatePerSqFt: 0.10,
    minimumMonthlyCharge: 250,
    hourlyRate: 35,
    // Labor Cost Settings (defaults)
    laborCostPerHour: 18,
    laborBurdenPercentage: 0.25,
    sqftPerLaborHour: 2500,
    // Overhead Cost Settings (defaults)
    insurancePercentage: 0.08,
    adminOverheadPercentage: 0.12,
    travelCostPerVisit: 15,
    equipmentPercentage: 0.05,
    // Supply Cost Settings (defaults)
    supplyCostPercentage: 0.04,
    // Profit Settings (defaults)
    targetProfitMargin: 0.25,
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

  const fetchFixtureTypes = useCallback(async () => {
    try {
      setFixtureLoading(true);
      const response = await listFixtureTypes({
        limit: 100,
        isActive: includeInactiveFixtures ? undefined : true,
      });
      setFixtureTypes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch fixture types:', error);
      toast.error('Failed to load fixture types');
      setFixtureTypes([]);
    } finally {
      setFixtureLoading(false);
    }
  }, [includeInactiveFixtures]);

  const loadSettings = async (id: string) => {
    try {
      const data = await getPricingSettings(id);
      setSelectedSettings(data);
      setFormData({
        name: data.name,
        baseRatePerSqFt: Number(data.baseRatePerSqFt),
        minimumMonthlyCharge: Number(data.minimumMonthlyCharge),
        hourlyRate: Number(data.hourlyRate || 35),
        // Labor Cost Settings
        laborCostPerHour: Number(data.laborCostPerHour || 18),
        laborBurdenPercentage: Number(data.laborBurdenPercentage || 0.25),
        sqftPerLaborHour: Number(data.sqftPerLaborHour || 2500),
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
        // Multipliers
        floorTypeMultipliers: data.floorTypeMultipliers,
        frequencyMultipliers: data.frequencyMultipliers,
        conditionMultipliers: data.conditionMultipliers,
        trafficMultipliers: data.trafficMultipliers,
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

  useEffect(() => {
    fetchFixtureTypes();
  }, [fetchFixtureTypes]);

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
      setCreateFormData({
        name: '',
        baseRatePerSqFt: 0.10,
        minimumMonthlyCharge: 250,
        hourlyRate: 35,
        laborCostPerHour: 18,
        laborBurdenPercentage: 0.25,
        sqftPerLaborHour: 2500,
        insurancePercentage: 0.08,
        adminOverheadPercentage: 0.12,
        travelCostPerVisit: 15,
        equipmentPercentage: 0.05,
        supplyCostPercentage: 0.04,
        targetProfitMargin: 0.25,
      });
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

  const openCreateFixtureModal = () => {
    setFixtureForm({
      id: '',
      name: '',
      description: '',
      isActive: true,
    });
    setShowFixtureModal(true);
  };

  const openEditFixtureModal = (fixture: FixtureType) => {
    setFixtureForm({
      id: fixture.id,
      name: fixture.name,
      description: fixture.description || '',
      isActive: fixture.isActive,
    });
    setShowFixtureModal(true);
  };

  const handleSaveFixture = async () => {
    if (!fixtureForm.name.trim()) {
      toast.error('Please enter a fixture type name');
      return;
    }

    try {
      setFixtureSaving(true);
      if (fixtureForm.id) {
        await updateFixtureType(fixtureForm.id, {
          name: fixtureForm.name.trim(),
          description: fixtureForm.description || null,
          isActive: fixtureForm.isActive,
        });
        toast.success('Fixture type updated');
      } else {
        await createFixtureType({
          name: fixtureForm.name.trim(),
          description: fixtureForm.description || null,
          isActive: fixtureForm.isActive,
        });
        toast.success('Fixture type created');
      }
      setShowFixtureModal(false);
      await fetchFixtureTypes();
    } catch (error) {
      console.error('Failed to save fixture type:', error);
      toast.error('Failed to save fixture type');
    } finally {
      setFixtureSaving(false);
    }
  };

  const handleDeleteFixture = async () => {
    if (!fixtureDeleteId) return;
    try {
      await deleteFixtureType(fixtureDeleteId);
      toast.success('Fixture type deleted');
      setFixtureDeleteId(null);
      await fetchFixtureTypes();
    } catch (error) {
      console.error('Failed to delete fixture type:', error);
      toast.error('Failed to delete fixture type');
    }
  };

  const fixtureColumns = [
    {
      header: 'Fixture Type',
      cell: (item: FixtureType) => (
        <div>
          <div className="font-medium text-white">{item.name}</div>
          {item.description ? (
            <div className="text-sm text-gray-400">{item.description}</div>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (item: FixtureType) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: FixtureType) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditFixtureModal(item);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await updateFixtureType(item.id, { isActive: !item.isActive });
                toast.success(item.isActive ? 'Fixture type deactivated' : 'Fixture type activated');
                fetchFixtureTypes();
              } catch (error) {
                console.error('Failed to toggle fixture type:', error);
                toast.error('Failed to update fixture type');
              }
            }}
            title={item.isActive ? 'Deactivate' : 'Activate'}
          >
            {item.isActive ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setFixtureDeleteId(item.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const updateMultiplier = (
    category: 'floorTypeMultipliers' | 'frequencyMultipliers' | 'conditionMultipliers' | 'trafficMultipliers' | 'buildingTypeMultipliers' | 'taskComplexityAddOns',
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

  const formatPercent = (value: string | number) => {
    return `${(Number(value) * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: string | number, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    <div>
                      <span className="text-sm text-gray-400">Hourly Rate</span>
                      <p className="text-xl font-semibold text-white">
                        {formatCurrency(selectedSettings.hourlyRate || 35)}
                      </p>
                    </div>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                      hint="Average hourly wage"
                    />
                    <Input
                      label="Labor Burden (%)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.laborBurdenPercentage ?? 0.25}
                      onChange={(e) =>
                        setFormData({ ...formData, laborBurdenPercentage: Number(e.target.value) })
                      }
                      hint="Payroll taxes, benefits (e.g., 0.25 = 25%)"
                    />
                    <Input
                      label="Sq Ft per Labor Hour"
                      type="number"
                      step="100"
                      min={100}
                      value={formData.sqftPerLaborHour ?? 2500}
                      onChange={(e) =>
                        setFormData({ ...formData, sqftPerLaborHour: Number(e.target.value) })
                      }
                      hint="Productivity rate"
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
                    <div className="rounded-lg bg-navy-darker/50 p-3">
                      <span className="text-sm text-gray-400">Sq Ft per Labor Hour</span>
                      <p className="text-xl font-semibold text-white">
                        {formatNumber(selectedSettings.sqftPerLaborHour || 2500)}
                      </p>
                    </div>
                  </>
                )}
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {isEditing ? (
                  <>
                    <Input
                      label="Insurance (%)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.insurancePercentage ?? 0.08}
                      onChange={(e) =>
                        setFormData({ ...formData, insurancePercentage: Number(e.target.value) })
                      }
                      hint="Liability + workers comp"
                    />
                    <Input
                      label="Admin Overhead (%)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.adminOverheadPercentage ?? 0.12}
                      onChange={(e) =>
                        setFormData({ ...formData, adminOverheadPercentage: Number(e.target.value) })
                      }
                      hint="Administrative costs"
                    />
                    <Input
                      label="Equipment (%)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.equipmentPercentage ?? 0.05}
                      onChange={(e) =>
                        setFormData({ ...formData, equipmentPercentage: Number(e.target.value) })
                      }
                      hint="Equipment depreciation"
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
                      hint="Flat per-visit cost"
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

            {/* Fixture Types */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Fixture Types</h3>
                  <p className="text-sm text-gray-400">
                    Manage fixture types used in area fixtures and task minutes.
                  </p>
                </div>
                <Button onClick={openCreateFixtureModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Fixture Type
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={includeInactiveFixtures}
                  onChange={(e) => setIncludeInactiveFixtures(e.target.checked)}
                  className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                />
                <span>Include inactive</span>
              </div>
              <div className="mt-4">
                <Table
                  data={fixtureTypes}
                  columns={fixtureColumns}
                  isLoading={fixtureLoading}
                />
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
                      label="Supply Cost (%)"
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={formData.supplyCostPercentage ?? 0.04}
                      onChange={(e) =>
                        setFormData({ ...formData, supplyCostPercentage: Number(e.target.value) })
                      }
                      hint="As % of labor+overhead (e.g., 0.04 = 4%)"
                    />
                    <Input
                      label="Supply Cost per Sq Ft ($) - Optional"
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
                      hint="Alternative flat rate (overrides percentage if set)"
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
                Target profit margin applied using: Final Price = Total Cost ÷ (1 - Margin)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {isEditing ? (
                  <Input
                    label="Target Profit Margin (%)"
                    type="number"
                    step="0.01"
                    min={0}
                    max={0.99}
                    value={formData.targetProfitMargin ?? 0.25}
                    onChange={(e) =>
                      setFormData({ ...formData, targetProfitMargin: Number(e.target.value) })
                    }
                    hint="e.g., 0.25 = 25% profit margin"
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

            {/* Traffic Multipliers */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Traffic Multipliers</h3>
              <p className="mb-4 text-sm text-gray-400">
                Adjust pricing based on traffic level. Higher traffic = higher price.
              </p>
              <div className="grid grid-cols-3 gap-4">
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

      {/* Fixture Type Modal */}
      <Modal
        isOpen={showFixtureModal}
        onClose={() => setShowFixtureModal(false)}
        title={fixtureForm.id ? 'Edit Fixture Type' : 'Create Fixture Type'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Toilet"
            value={fixtureForm.name}
            onChange={(e) => setFixtureForm({ ...fixtureForm, name: e.target.value })}
          />
          <Textarea
            label="Description"
            placeholder="Optional notes about this fixture type"
            value={fixtureForm.description}
            onChange={(e) => setFixtureForm({ ...fixtureForm, description: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={fixtureForm.isActive}
              onChange={(e) => setFixtureForm({ ...fixtureForm, isActive: e.target.checked })}
              className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
            />
            Active
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowFixtureModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFixture} isLoading={fixtureSaving}>
              Save Fixture Type
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

      <ConfirmDialog
        isOpen={Boolean(fixtureDeleteId)}
        onClose={() => setFixtureDeleteId(null)}
        onConfirm={handleDeleteFixture}
        title="Delete Fixture Type"
        message="Are you sure you want to delete this fixture type? This cannot be undone."
        variant="danger"
      />
    </div>
  );
};

export default PricingSettingsPage;
