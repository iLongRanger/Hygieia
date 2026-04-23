import { useCallback, useEffect, useState } from 'react';
import { Archive, Calculator, Plus, RotateCcw, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Drawer } from '../../components/ui/Drawer';
import { Select } from '../../components/ui/Select';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import {
  archiveResidentialPricingPlan,
  createResidentialPricingPlan,
  listResidentialPricingPlans,
  restoreResidentialPricingPlan,
  setDefaultResidentialPricingPlan,
  updateResidentialPricingPlan,
} from '../../lib/residential';
import type {
  ResidentialPricingPlan,
  ResidentialPricingPlanSettings,
} from '../../types/residential';

const HOME_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'single_family', label: 'Single Family' },
] as const;

const SERVICE_TYPE_OPTIONS = [
  { value: 'recurring_standard', label: 'Recurring Standard' },
  { value: 'one_time_standard', label: 'One-Time Standard' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'move_in_out', label: 'Move In / Out' },
  { value: 'turnover', label: 'Turnover' },
  { value: 'post_construction', label: 'Post Construction' },
] as const;

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'every_4_weeks', label: 'Every 4 Weeks' },
  { value: 'one_time', label: 'One Time' },
] as const;

const DEFAULT_SETTINGS: ResidentialPricingPlanSettings = {
  strategyKey: 'residential_flat_v1',
  homeTypeBasePrices: {
    apartment: 140,
    condo: 160,
    townhouse: 175,
    single_family: 190,
  },
  sqftBrackets: [
    { upTo: 1000, adjustment: 0 },
    { upTo: 1500, adjustment: 30 },
    { upTo: 2000, adjustment: 60 },
    { upTo: 3000, adjustment: 120 },
    { upTo: null, adjustment: 220 },
  ],
  bedroomAdjustments: { '0': 0, '1': 0, '2': 20, '3': 35, '4': 50, '5': 70, '6': 90 },
  bathroomAdjustments: { fullBath: 28, halfBath: 16 },
  levelAdjustments: { '1': 0, '2': 20, '3': 40, '4': 60 },
  conditionMultipliers: { light: 0.92, standard: 1, heavy: 1.28 },
  serviceTypeMultipliers: {
    recurring_standard: 1,
    one_time_standard: 1.12,
    deep_clean: 1.38,
    move_in_out: 1.48,
    turnover: 1.16,
    post_construction: 1.75,
  },
  frequencyDiscounts: {
    weekly: 0.12,
    biweekly: 0.08,
    every_4_weeks: 0.03,
    one_time: 0,
  },
  firstCleanSurcharge: {
    enabled: true,
    type: 'percent',
    value: 0.15,
    appliesTo: ['recurring_standard', 'deep_clean'],
  },
  addOnPrices: {
    inside_fridge: { pricingType: 'flat', unitPrice: 25, estimatedMinutes: 20, description: 'Inside fridge' },
    inside_oven: { pricingType: 'flat', unitPrice: 30, estimatedMinutes: 25, description: 'Inside oven' },
    inside_cabinets: { pricingType: 'flat', unitPrice: 45, estimatedMinutes: 40, description: 'Inside cabinets' },
    interior_windows: { pricingType: 'per_unit', unitPrice: 6, estimatedMinutes: 6, unitLabel: 'window', description: 'Interior windows' },
    blinds: { pricingType: 'per_unit', unitPrice: 8, estimatedMinutes: 8, unitLabel: 'room', description: 'Blinds' },
    baseboards: { pricingType: 'flat', unitPrice: 35, estimatedMinutes: 25, description: 'Baseboards' },
    laundry: { pricingType: 'flat', unitPrice: 20, estimatedMinutes: 25, description: 'Laundry' },
    dishes: { pricingType: 'flat', unitPrice: 18, estimatedMinutes: 15, description: 'Dishes' },
    linen_change: { pricingType: 'per_unit', unitPrice: 12, estimatedMinutes: 10, unitLabel: 'bed', description: 'Linen change' },
    pet_hair_heavy: { pricingType: 'flat', unitPrice: 20, estimatedMinutes: 20, description: 'Heavy pet hair' },
    balcony_patio: { pricingType: 'flat', unitPrice: 25, estimatedMinutes: 20, description: 'Balcony / patio' },
    garage: { pricingType: 'flat', unitPrice: 35, estimatedMinutes: 30, description: 'Garage' },
  },
  minimumPrice: 160,
  estimatedHours: {
    baseHoursByHomeType: { apartment: 1.6, condo: 1.9, townhouse: 2.2, single_family: 2.5 },
    minutesPerBedroom: 12,
    minutesPerFullBath: 18,
    minutesPerHalfBath: 10,
    minutesPer1000SqFt: 42,
    conditionMultipliers: { light: 0.9, standard: 1, heavy: 1.35 },
    serviceTypeMultipliers: {
      recurring_standard: 1,
      one_time_standard: 1.1,
      deep_clean: 1.45,
      move_in_out: 1.55,
      turnover: 1.12,
      post_construction: 1.8,
    },
    addOnMinutes: {
      inside_fridge: 20,
      inside_oven: 25,
      inside_cabinets: 40,
      interior_windows: 6,
      blinds: 8,
      baseboards: 25,
      laundry: 25,
      dishes: 15,
      linen_change: 10,
      pet_hair_heavy: 20,
      balcony_patio: 20,
      garage: 30,
    },
  },
  manualReviewRules: {
    maxAutoSqft: 3500,
    heavyConditionRequiresReview: true,
    postConstructionRequiresReview: true,
    maxAddOnsBeforeReview: 5,
  },
};

const ADD_ON_CODES = Object.keys(DEFAULT_SETTINGS.addOnPrices);

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function cloneDefaultSettings(): ResidentialPricingPlanSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

const ResidentialPricingPlansPage = () => {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWrite = hasPermission(PERMISSIONS.PRICING_WRITE);
  const [plans, setPlans] = useState<ResidentialPricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ResidentialPricingPlan | null>(null);
  const [name, setName] = useState('');
  const [settings, setSettings] = useState<ResidentialPricingPlanSettings>(cloneDefaultSettings());

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listResidentialPricingPlans({ includeArchived: true, limit: 100 });
      setPlans(response.data);
    } catch (error) {
      console.error('Failed to load residential pricing plans', error);
      toast.error('Failed to load residential pricing plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setSettings(cloneDefaultSettings());
    setIsModalOpen(true);
  };

  const openEditModal = (plan: ResidentialPricingPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setSettings(JSON.parse(JSON.stringify(plan.settings)));
    setIsModalOpen(true);
  };

  const updateAddOn = (code: string, field: 'unitPrice' | 'estimatedMinutes', value: number) => {
    setSettings((current) => ({
      ...current,
      addOnPrices: {
        ...current.addOnPrices,
        [code]: {
          ...current.addOnPrices[code],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        name,
        strategyKey: settings.strategyKey,
        settings,
      };

      if (editingPlan) {
        await updateResidentialPricingPlan(editingPlan.id, payload);
        toast.success('Residential pricing plan updated');
      } else {
        await createResidentialPricingPlan(payload);
        toast.success('Residential pricing plan created');
      }

      setIsModalOpen(false);
      await loadPlans();
    } catch (error) {
      console.error('Failed to save residential pricing plan', error);
      toast.error('Failed to save residential pricing plan');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultResidentialPricingPlan(id);
      toast.success('Default residential plan updated');
      await loadPlans();
    } catch (error) {
      console.error('Failed to set default residential plan', error);
      toast.error('Failed to set default residential plan');
    }
  };

  const handleArchiveToggle = async (plan: ResidentialPricingPlan) => {
    try {
      if (plan.archivedAt) {
        await restoreResidentialPricingPlan(plan.id);
        toast.success('Residential pricing plan restored');
      } else {
        await archiveResidentialPricingPlan(plan.id);
        toast.success('Residential pricing plan archived');
      }
      await loadPlans();
    } catch (error) {
      console.error('Failed to update residential pricing plan', error);
      toast.error('Failed to update residential pricing plan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Residential Pricing Plans
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Tune flat-rate residential assumptions, add-on pricing, and manual-review thresholds.
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreateModal} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Residential Plan
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {loading ? (
          <Card className="p-6 text-sm text-surface-500 dark:text-surface-400">
            Loading residential pricing plans...
          </Card>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                      {plan.name}
                    </h2>
                    {plan.isDefault && <Badge variant="success">Default</Badge>}
                    {plan.archivedAt && <Badge variant="warning">Archived</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    {plan.strategyKey === 'residential_flat_v1'
                      ? 'Flat-rate residential quoting'
                      : 'Project / manual review pricing'}
                  </p>
                </div>
                <Calculator className="h-5 w-5 text-primary-500" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Minimum Price</div>
                  <div className="mt-1 font-semibold text-surface-900 dark:text-surface-100">
                    {formatCurrency(plan.settings.minimumPrice)}
                  </div>
                </div>
                <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Auto-Quote Max</div>
                  <div className="mt-1 font-semibold text-surface-900 dark:text-surface-100">
                    {plan.settings.manualReviewRules.maxAutoSqft.toLocaleString()} sqft
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-surface-600 dark:text-surface-300">
                <p>Weekly discount: {(plan.settings.frequencyDiscounts.weekly * 100).toFixed(0)}%</p>
                <p>Deep clean multiplier: {plan.settings.serviceTypeMultipliers.deep_clean.toFixed(2)}x</p>
                <p>Heavy condition multiplier: {plan.settings.conditionMultipliers.heavy.toFixed(2)}x</p>
              </div>

              {canWrite && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(plan)}>
                    Edit
                  </Button>
                  {!plan.isDefault && !plan.archivedAt && (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(plan.id)}>
                      <Star className="mr-1 h-4 w-4" />
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchiveToggle(plan)}
                  >
                    {plan.archivedAt ? (
                      <>
                        <RotateCcw className="mr-1 h-4 w-4" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="mr-1 h-4 w-4" />
                        Archive
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Residential Pricing Plan' : 'New Residential Pricing Plan'}
        size="3xl"
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Plan Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Standard Residential"
            />
            <Select
              label="Strategy"
              value={settings.strategyKey}
              options={[
                { value: 'residential_flat_v1', label: 'Residential Flat Rate' },
                { value: 'residential_project_v1', label: 'Residential Project / Review' },
              ]}
              onChange={(value) =>
                setSettings((current) => ({ ...current, strategyKey: value as ResidentialPricingPlan['strategyKey'] }))
              }
            />
          </div>

          <Card className="space-y-4 p-4">
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-surface-100">Base Pricing</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                These fields anchor the first price Hygieia builds before condition, service type, and add-ons.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {HOME_TYPE_OPTIONS.map((option) => (
                <Input
                  key={option.value}
                  type="number"
                  label={`${option.label} Base`}
                  value={settings.homeTypeBasePrices[option.value]}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      homeTypeBasePrices: {
                        ...current.homeTypeBasePrices,
                        [option.value]: Number(event.target.value),
                      },
                    }))
                  }
                />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input
                type="number"
                label="Minimum Price"
                value={settings.minimumPrice}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, minimumPrice: Number(event.target.value) }))
                }
              />
              <Input
                type="number"
                label="Full Bath Add"
                value={settings.bathroomAdjustments.fullBath}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    bathroomAdjustments: {
                      ...current.bathroomAdjustments,
                      fullBath: Number(event.target.value),
                    },
                  }))
                }
              />
              <Input
                type="number"
                label="Half Bath Add"
                value={settings.bathroomAdjustments.halfBath}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    bathroomAdjustments: {
                      ...current.bathroomAdjustments,
                      halfBath: Number(event.target.value),
                    },
                  }))
                }
              />
              <Input
                type="number"
                label="Auto-Quote Max Sqft"
                value={settings.manualReviewRules.maxAutoSqft}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    manualReviewRules: {
                      ...current.manualReviewRules,
                      maxAutoSqft: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-surface-100">Multipliers and Discounts</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                These explain how Hygieia adjusts the base price for deeper work, more frequent service, and heavier conditions.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {SERVICE_TYPE_OPTIONS.map((option) => (
                <Input
                  key={option.value}
                  type="number"
                  step="0.01"
                  label={`${option.label} Multiplier`}
                  value={settings.serviceTypeMultipliers[option.value]}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      serviceTypeMultipliers: {
                        ...current.serviceTypeMultipliers,
                        [option.value]: Number(event.target.value),
                      },
                    }))
                  }
                />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {FREQUENCY_OPTIONS.map((option) => (
                <Input
                  key={option.value}
                  type="number"
                  step="0.01"
                  label={`${option.label} Discount`}
                  hint="Stored as a decimal percentage"
                  value={settings.frequencyDiscounts[option.value]}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      frequencyDiscounts: {
                        ...current.frequencyDiscounts,
                        [option.value]: Number(event.target.value),
                      },
                    }))
                  }
                />
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-surface-100">Add-On Catalog</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Residential quotes pull these rates directly when the estimator selects optional extras.
              </p>
            </div>
            <div className="grid gap-3">
              {ADD_ON_CODES.map((code) => (
                <div
                  key={code}
                  className="grid gap-3 rounded-lg border border-surface-200 p-3 md:grid-cols-[1.3fr,0.7fr,0.7fr] dark:border-surface-700"
                >
                  <div>
                    <p className="font-medium capitalize text-surface-900 dark:text-surface-100">
                      {code.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {settings.addOnPrices[code].description || 'Residential add-on'}
                    </p>
                  </div>
                  <Input
                    type="number"
                    label="Unit Price"
                    value={settings.addOnPrices[code].unitPrice}
                    onChange={(event) => updateAddOn(code, 'unitPrice', Number(event.target.value))}
                  />
                  <Input
                    type="number"
                    label="Minutes"
                    value={settings.addOnPrices[code].estimatedMinutes}
                    onChange={(event) =>
                      updateAddOn(code, 'estimatedMinutes', Number(event.target.value))
                    }
                  />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save Residential Plan
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default ResidentialPricingPlansPage;
