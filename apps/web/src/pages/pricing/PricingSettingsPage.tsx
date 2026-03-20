import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Edit2,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import {
  archivePricingSettings,
  createPricingSettings,
  getPricingSettings,
  listPricingSettings,
  restorePricingSettings,
  setDefaultPricingSettings,
  updatePricingSettings,
  type CreatePricingSettingsInput,
  type PricingSettings,
  type UpdatePricingSettingsInput,
} from '../../lib/pricing';
import {
  BUILDING_TYPE_LABELS,
  createDefaultPricingPlanDraft,
  PricingPlanBuilder,
  type PricingPlanFormData,
} from './PricingPlanBuilder';

const PricingSettingsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settingsList, setSettingsList] = useState<PricingSettings[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<PricingSettings | null>(null);
  const [formData, setFormData] = useState<UpdatePricingSettingsInput>({});
  const [createFormData, setCreateFormData] = useState<CreatePricingSettingsInput>(createDefaultPricingPlanDraft());
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editStep, setEditStep] = useState(0);
  const [createStep, setCreateStep] = useState(0);

  const fetchSettingsList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listPricingSettings({ limit: 100, includeArchived });
      const items = response?.data ?? [];
      setSettingsList(items);

      if (!selectedSettings && items.length > 0) {
        const defaultPlan = items.find((item) => item.isDefault) ?? items[0];
        await loadSettings(defaultPlan.id);
      }
    } catch (error) {
      console.error('Failed to fetch pricing plans:', error);
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  }, [includeArchived, selectedSettings]);

  const loadSettings = useCallback(async (id: string) => {
    try {
      const data = await getPricingSettings(id);
      setSelectedSettings(data);
      setFormData({
        name: data.name,
        pricingType: data.pricingType,
        baseRatePerSqFt: Number(data.baseRatePerSqFt),
        minimumMonthlyCharge: Number(data.minimumMonthlyCharge),
        hourlyRate: Number(data.hourlyRate || 35),
        laborCostPerHour: Number(data.laborCostPerHour || 18),
        laborBurdenPercentage: Number(data.laborBurdenPercentage || 0.25),
        sqftPerLaborHour: data.sqftPerLaborHour,
        insurancePercentage: Number(data.insurancePercentage || 0.08),
        adminOverheadPercentage: Number(data.adminOverheadPercentage || 0.12),
        travelCostPerVisit: Number(data.travelCostPerVisit || 15),
        equipmentPercentage: Number(data.equipmentPercentage || 0.05),
        supplyCostPercentage: Number(data.supplyCostPercentage || 0.04),
        supplyCostPerSqFt: data.supplyCostPerSqFt ? Number(data.supplyCostPerSqFt) : undefined,
        targetProfitMargin: Number(data.targetProfitMargin || 0.25),
        subcontractorPercentage: Number(data.subcontractorPercentage || 0.6),
        floorTypeMultipliers: data.floorTypeMultipliers,
        frequencyMultipliers: data.frequencyMultipliers,
        conditionMultipliers: data.conditionMultipliers,
        trafficMultipliers: data.trafficMultipliers,
        taskComplexityAddOns: data.taskComplexityAddOns,
        isActive: data.isActive,
        isDefault: data.isDefault,
      });
      setEditStep(0);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to load pricing plan:', error);
      toast.error('Failed to load pricing plan details');
    }
  }, []);

  useEffect(() => {
    fetchSettingsList();
  }, [fetchSettingsList]);

  const handleSave = async () => {
    if (!selectedSettings) return;
    try {
      setSaving(true);
      await updatePricingSettings(selectedSettings.id, formData);
      toast.success('Pricing plan updated');
      await loadSettings(selectedSettings.id);
    } catch (error) {
      console.error('Failed to save pricing plan:', error);
      toast.error('Failed to update pricing plan');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createFormData.name?.trim()) {
      toast.error('Please enter a plan name');
      return;
    }

    try {
      setCreating(true);
      const created = await createPricingSettings(createFormData);
      toast.success('Pricing plan created');
      setShowCreateModal(false);
      setCreateFormData(createDefaultPricingPlanDraft());
      setCreateStep(0);
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
      toast.success('Default pricing plan updated');
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
      console.error('Failed to archive pricing plan:', error);
      toast.error('Failed to archive pricing plan');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restorePricingSettings(id);
      toast.success('Pricing plan restored');
      await fetchSettingsList();
    } catch (error) {
      console.error('Failed to restore pricing plan:', error);
      toast.error('Failed to restore pricing plan');
    }
  };

  const selectedSummary = useMemo(() => {
    if (!selectedSettings) return null;

    return [
      {
        label: 'Pricing Method',
        value: selectedSettings.pricingType === 'hourly' ? 'Detailed Estimate' : 'Fast Estimate',
        detail: selectedSettings.pricingType === 'hourly'
          ? `${formatCurrency(selectedSettings.hourlyRate)}/hour client rate`
          : `${formatCurrency(selectedSettings.baseRatePerSqFt)}/sqft base rate`,
      },
      {
        label: 'Labor Model',
        value: `${formatCurrency(selectedSettings.laborCostPerHour)}/hour`,
        detail: `${formatPercent(selectedSettings.laborBurdenPercentage)} burden`,
      },
      {
        label: 'Cost Stack',
        value: `${formatPercent(selectedSettings.insurancePercentage)} insurance`,
        detail: `${formatPercent(selectedSettings.adminOverheadPercentage)} admin • ${formatCurrency(selectedSettings.travelCostPerVisit)} travel`,
      },
      {
        label: 'Margin and Split',
        value: `${formatPercent(selectedSettings.targetProfitMargin)} target margin`,
        detail: `${formatPercent(selectedSettings.subcontractorPercentage)} subcontractor split`,
      },
    ];
  }, [selectedSettings]);

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
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Pricing Plans</h1>
          <p className="text-surface-600 dark:text-surface-400">
            Build pricing plans the same way Hygieia would walk an estimator through the quote.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      <Card className="border-none bg-[linear-gradient(135deg,_rgba(8,47,73,0.98),_rgba(15,23,42,0.98))] text-white shadow-soft-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-cyan-200/80">
              <Sparkles className="h-4 w-4" />
              Guided Pricing Builder
            </div>
            <h2 className="mt-3 text-3xl font-semibold">Turn pricing assumptions into an explainable quote</h2>
            <p className="mt-3 text-sm text-slate-200/85">
              Hygieia now walks the user through pricing step by step: method, labor, operating cost, margin, and final adjustments. The live sample impact panel explains what each change does to the final number.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat label="Method" value="Fast or detailed" />
            <HeroStat label="Live Impact" value="Price updates instantly" />
            <HeroStat label="Guidance" value="Explains every lever" />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card noPadding className="overflow-hidden">
          <div className="border-b border-surface-200 px-5 py-4 dark:border-surface-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">Plan Profiles</h3>
                <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">Choose a pricing plan to review or refine.</p>
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800"
              />
              Include archived plans
            </label>
          </div>
          <div className="max-h-[720px] overflow-y-auto">
            {settingsList.map((settings) => {
              const isSelected = selectedSettings?.id === settings.id;
              const rateSummary = settings.pricingType === 'hourly'
                ? `${formatCurrency(settings.hourlyRate)}/hour`
                : `${formatCurrency(settings.baseRatePerSqFt)}/sqft`;

              return (
                <button
                  key={settings.id}
                  type="button"
                  className={`w-full border-b border-surface-200 px-5 py-4 text-left transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/60 ${
                    isSelected ? 'bg-primary-50 dark:bg-primary-950/20' : ''
                  }`}
                  onClick={() => loadSettings(settings.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-surface-900 dark:text-surface-100">{settings.name}</div>
                      <div className="mt-1 text-sm text-surface-600 dark:text-surface-400">{rateSummary}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {settings.isDefault ? <Badge variant="info">Default</Badge> : null}
                      {settings.archivedAt ? <Badge variant="error">Archived</Badge> : <Badge variant="success">Active</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {selectedSettings ? (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300">
                    <Settings className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-surface-900 dark:text-surface-100">{selectedSettings.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedSettings.isDefault ? <Badge variant="info">Default</Badge> : null}
                      <Badge variant={selectedSettings.archivedAt ? 'error' : 'success'}>
                        {selectedSettings.archivedAt ? 'Archived' : 'Active'}
                      </Badge>
                      <Badge variant="default">
                        {selectedSettings.pricingType === 'hourly' ? 'Detailed Estimate' : 'Fast Estimate'}
                      </Badge>
                    </div>
                    <p className="mt-3 max-w-3xl text-sm text-surface-600 dark:text-surface-400">
                      This plan is now organized the same way your team thinks about pricing: choose a method, estimate labor, add operating costs, protect margin, then fine-tune adjustments.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="secondary" onClick={() => { setIsEditing(false); setEditStep(0); }}>
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} isLoading={saving}>
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => { setIsEditing(true); setEditStep(0); }}>
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      {!selectedSettings.isDefault && !selectedSettings.archivedAt ? (
                        <Button variant="secondary" onClick={() => handleSetDefault(selectedSettings.id)}>
                          <Check className="h-4 w-4" />
                          Set Default
                        </Button>
                      ) : null}
                      {selectedSettings.archivedAt ? (
                        <Button variant="secondary" onClick={() => handleRestore(selectedSettings.id)}>
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </Button>
                      ) : (
                        <Button variant="danger" onClick={() => setShowArchiveConfirm(true)}>
                          Archive
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>

            {isEditing ? (
              <PricingPlanBuilder
                formData={formData as PricingPlanFormData}
                onChange={(value) => setFormData(value as UpdatePricingSettingsInput)}
                step={editStep}
                onStepChange={setEditStep}
                mode="edit"
              />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {selectedSummary?.map((item) => (
                    <SummaryCard
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      detail={item.detail}
                    />
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <Card>
                    <div className="mb-5">
                      <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">How this plan thinks about pricing</h3>
                      <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                        The goal is not only to store rates. It is to document how Hygieia builds the final monthly quote and which levers are responsible for changes.
                      </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <ExplainCard
                        title="Method"
                        detail={selectedSettings.pricingType === 'hourly' ? 'Detailed estimate' : 'Fast estimate'}
                        body={selectedSettings.pricingType === 'hourly'
                          ? `Uses a client hourly rate of ${formatCurrency(selectedSettings.hourlyRate)} and compares it against cost-plus-margin.`
                          : `Starts from a base rate of ${formatCurrency(selectedSettings.baseRatePerSqFt)} per square foot before commercial adjustments.`}
                      />
                      <ExplainCard
                        title="Labor"
                        detail={`${formatCurrency(selectedSettings.laborCostPerHour)}/hour`}
                        body={`Burden is ${formatPercent(selectedSettings.laborBurdenPercentage)}. Example office productivity is ${selectedSettings.sqftPerLaborHour.office} sqft/hour.`}
                      />
                      <ExplainCard
                        title="Operating Cost"
                        detail={`${formatCurrency(selectedSettings.travelCostPerVisit)} travel / visit`}
                        body={`Insurance ${formatPercent(selectedSettings.insurancePercentage)}, admin ${formatPercent(selectedSettings.adminOverheadPercentage)}, equipment ${formatPercent(selectedSettings.equipmentPercentage)}.`}
                      />
                      <ExplainCard
                        title="Margin and Payout"
                        detail={`${formatPercent(selectedSettings.targetProfitMargin)} target margin`}
                        body={`${formatPercent(selectedSettings.subcontractorPercentage)} of final revenue is earmarked for subcontractor payout.`}
                      />
                    </div>
                  </Card>

                  <Card className="border-none bg-surface-950 text-white dark:bg-surface-950">
                    <div className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Quick Reference</div>
                    <h3 className="mt-3 text-lg font-semibold">Default productivity profile</h3>
                    <div className="mt-4 space-y-3">
                      {Object.entries(selectedSettings.sqftPerLaborHour)
                        .slice(0, 5)
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <span className="text-sm text-slate-200">{BUILDING_TYPE_LABELS[key] ?? key}</span>
                            <span className="text-sm font-semibold text-white">{value.toLocaleString()} sqft/hr</span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100/90">
                      If your team needs help building a quote, switch to Edit. The guided builder explains how every field affects labor, cost, price, or payout.
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        ) : (
          <Card>
            <div className="py-12 text-center">
              <Settings className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500" />
              <h3 className="mt-4 text-lg font-medium text-surface-900 dark:text-surface-100">No plan selected</h3>
              <p className="mt-2 text-surface-600 dark:text-surface-400">
                Select a pricing plan from the left or create a new one to start the walkthrough.
              </p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4" />
                Create New Plan
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Pricing Plan"
        size="3xl"
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900 dark:bg-primary-950/20 dark:text-primary-200">
            Start with the pricing approach, then let Hygieia walk you through labor, costs, margin, and final adjustments before you create the plan.
          </div>
          <PricingPlanBuilder
            formData={createFormData as PricingPlanFormData}
            onChange={(value) => setCreateFormData(value as CreatePricingSettingsInput)}
            step={createStep}
            onStepChange={setCreateStep}
            mode="create"
          />
          <div className="flex justify-end gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={creating} disabled={!createFormData.name?.trim()}>
              Create Plan
            </Button>
          </div>
        </div>
      </Modal>

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

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-[0.18em] text-surface-500 dark:text-surface-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-surface-900 dark:text-surface-100">{value}</div>
      <div className="mt-2 text-sm text-surface-600 dark:text-surface-400">{detail}</div>
    </Card>
  );
}

function ExplainCard({
  title,
  detail,
  body,
}: {
  title: string;
  detail: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/50">
      <div className="text-xs uppercase tracking-[0.18em] text-surface-500 dark:text-surface-400">{title}</div>
      <div className="mt-2 text-base font-semibold text-surface-900 dark:text-surface-100">{detail}</div>
      <div className="mt-2 text-sm text-surface-600 dark:text-surface-400">{body}</div>
    </div>
  );
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatPercent(value: string | number) {
  return `${(Number(value) * 100).toFixed(0)}%`;
}

export default PricingSettingsPage;
