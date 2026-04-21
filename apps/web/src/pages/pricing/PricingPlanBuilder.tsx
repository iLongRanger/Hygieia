import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ClipboardList,
  TrendingDown,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { cn } from '../../lib/utils';
import type {
  CreatePricingSettingsInput,
  UpdatePricingSettingsInput,
} from '../../lib/pricing';

export type PricingPlanFormData = CreatePricingSettingsInput | UpdatePricingSettingsInput;

export const DEFAULT_FLOOR_TYPES = ['vct', 'carpet', 'hardwood', 'tile', 'concrete', 'epoxy'];
export const DEFAULT_FREQUENCIES = ['1x_week', '2x_week', '3x_week', '4x_week', '5x_week', '7x_week', 'daily', 'monthly'];
export const DEFAULT_CONDITIONS = ['standard', 'medium', 'hard'];
export const DEFAULT_TRAFFIC_LEVELS = ['low', 'medium', 'high'];
export const DEFAULT_BUILDING_TYPES = ['office', 'medical', 'industrial', 'retail', 'educational', 'warehouse', 'mixed', 'other'];
export const DEFAULT_TASK_COMPLEXITIES = ['standard', 'sanitization', 'floor_care', 'window_cleaning'];

export const FLOOR_TYPE_LABELS: Record<string, string> = {
  vct: 'VCT (Vinyl Composition Tile)',
  carpet: 'Carpet',
  hardwood: 'Hardwood',
  tile: 'Ceramic / Porcelain Tile',
  concrete: 'Concrete',
  epoxy: 'Epoxy',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  '1x_week': '1x per Week',
  '2x_week': '2x per Week',
  '3x_week': '3x per Week',
  '4x_week': '4x per Week',
  '5x_week': '5x per Week',
  '7x_week': '7x per Week',
  daily: 'Daily (7x)',
  monthly: 'Monthly',
};

export const CONDITION_LABELS: Record<string, string> = {
  standard: 'Standard',
  medium: 'Medium Difficulty',
  hard: 'Heavy / Demanding',
};

export const TRAFFIC_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const BUILDING_TYPE_LABELS: Record<string, string> = {
  office: 'Office',
  medical: 'Medical / Healthcare',
  industrial: 'Industrial',
  retail: 'Retail',
  educational: 'Education',
  warehouse: 'Warehouse',
  mixed: 'Mixed Use',
  other: 'Other',
};

export const TASK_COMPLEXITY_LABELS: Record<string, string> = {
  standard: 'Standard Cleaning',
  sanitization: 'Sanitization',
  floor_care: 'Floor Care',
  window_cleaning: 'Window Cleaning',
};

export const PRICING_TYPE_OPTIONS = [
  { value: 'square_foot', label: 'Fast Estimate (Per Sq Ft)' },
  { value: 'hourly', label: 'Detailed Estimate (Hourly / Task Time)' },
];

const STEP_CONFIG = [
  {
    id: 'method',
    title: 'Choose Method',
    description: 'Set the pricing approach and the commercial rule that anchors the quote.',
  },
  {
    id: 'labor',
    title: 'Estimate Labor',
    description: 'Tell Hygieia how fast your team works and what base labor should cost.',
  },
  {
    id: 'costs',
    title: 'Add Operating Costs',
    description: 'Layer in the real service costs that sit on top of labor.',
  },
  {
    id: 'margin',
    title: 'Set Margin Rules',
    description: 'Define how this turns from service cost into the client-facing monthly price.',
  },
  {
    id: 'adjustments',
    title: 'Tune Adjustments',
    description: 'Calibrate multipliers for floor type, traffic, condition, and service mix.',
  },
] as const;

const IMPACT_STYLES = {
  labor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
  cost: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  price: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  payout: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-900',
} as const;

const MONTHLY_VISITS_BY_FREQUENCY: Record<string, number> = {
  '1x_week': 4.33,
  '2x_week': 8.66,
  '3x_week': 13,
  '4x_week': 17.33,
  '5x_week': 21.67,
  '7x_week': 30.33,
  daily: 30.33,
  monthly: 1,
};

const DEFAULT_SQFT_PER_LABOR_HOUR: Record<string, number> = {
  office: 2500, medical: 1500, industrial: 2200, retail: 2400,
  educational: 2000, warehouse: 3500, mixed: 2200, other: 2500,
};

const PLAN_PRESETS = [
  {
    id: 'standard_commercial',
    name: 'Standard Commercial',
    badge: 'Balanced',
    description: 'Good default for recurring office and mixed commercial spaces.',
    pricingType: 'square_foot',
    values: {
      baseRatePerSqFt: 0.1,
      minimumMonthlyCharge: 250,
      hourlyRate: 35,
      laborCostPerHour: 18,
      laborBurdenPercentage: 0.25,
      insurancePercentage: 0.08,
      adminOverheadPercentage: 0.12,
      travelCostPerVisit: 15,
      equipmentPercentage: 0.05,
      supplyCostPercentage: 0.04,
      targetProfitMargin: 0.25,
      subcontractorPercentage: 0.6,
    },
  },
  {
    id: 'medical',
    name: 'Medical',
    badge: 'Higher control',
    description: 'Use when sanitization, denser fixtures, and tighter labor assumptions matter.',
    pricingType: 'hourly',
    values: {
      baseRatePerSqFt: 0.13,
      minimumMonthlyCharge: 450,
      hourlyRate: 48,
      laborCostPerHour: 22,
      laborBurdenPercentage: 0.28,
      insurancePercentage: 0.1,
      adminOverheadPercentage: 0.14,
      travelCostPerVisit: 18,
      equipmentPercentage: 0.06,
      supplyCostPercentage: 0.06,
      targetProfitMargin: 0.3,
      subcontractorPercentage: 0.55,
    },
  },
  {
    id: 'retail_high_traffic',
    name: 'Retail High Traffic',
    badge: 'Traffic heavy',
    description: 'For visible public spaces where traffic and appearance standards drive effort.',
    pricingType: 'square_foot',
    values: {
      baseRatePerSqFt: 0.12,
      minimumMonthlyCharge: 325,
      hourlyRate: 38,
      laborCostPerHour: 19,
      laborBurdenPercentage: 0.25,
      insurancePercentage: 0.08,
      adminOverheadPercentage: 0.13,
      travelCostPerVisit: 15,
      equipmentPercentage: 0.05,
      supplyCostPercentage: 0.05,
      targetProfitMargin: 0.27,
      subcontractorPercentage: 0.58,
    },
  },
  {
    id: 'subcontractor_heavy',
    name: 'Subcontractor Heavy',
    badge: 'Payout focused',
    description: 'For markets where you win work operationally through subcontractor teams.',
    pricingType: 'square_foot',
    values: {
      baseRatePerSqFt: 0.11,
      minimumMonthlyCharge: 300,
      hourlyRate: 36,
      laborCostPerHour: 18,
      laborBurdenPercentage: 0.22,
      insurancePercentage: 0.08,
      adminOverheadPercentage: 0.11,
      travelCostPerVisit: 14,
      equipmentPercentage: 0.04,
      supplyCostPercentage: 0.04,
      targetProfitMargin: 0.24,
      subcontractorPercentage: 0.68,
    },
  },
] as const;

type ImpactTone = keyof typeof IMPACT_STYLES;

interface PreviewScenario {
  squareFeet: number;
  buildingType: string;
  frequency: string;
  floorType: string;
  condition: string;
  traffic: string;
}

interface PricingPlanBuilderProps {
  formData: PricingPlanFormData;
  onChange: (value: PricingPlanFormData) => void;
  step: number;
  onStepChange: (step: number) => void;
  mode: 'create' | 'edit';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createMapWithDefaults<T extends string>(keys: T[], defaultValue: number, source?: Record<string, number>) {
  return keys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = source?.[key] ?? defaultValue;
    return acc;
  }, {});
}

function applyPreset(formData: PricingPlanFormData, presetId: string): PricingPlanFormData {
  const preset = PLAN_PRESETS.find((item) => item.id === presetId);
  if (!preset) return formData;

  return {
    ...formData,
    pricingType: preset.pricingType,
    ...preset.values,
  };
}

function getNormalizedForm(formData: PricingPlanFormData) {
  return {
    name: formData.name ?? '',
    pricingType: formData.pricingType ?? 'square_foot',
    baseRatePerSqFt: toNumber(formData.baseRatePerSqFt, 0.1),
    minimumMonthlyCharge: toNumber(formData.minimumMonthlyCharge, 250),
    hourlyRate: toNumber(formData.hourlyRate, 35),
    laborCostPerHour: toNumber(formData.laborCostPerHour, 18),
    laborBurdenPercentage: toNumber(formData.laborBurdenPercentage, 0.25),
    insurancePercentage: toNumber(formData.insurancePercentage, 0.08),
    adminOverheadPercentage: toNumber(formData.adminOverheadPercentage, 0.12),
    travelCostPerVisit: toNumber(formData.travelCostPerVisit, 15),
    equipmentPercentage: toNumber(formData.equipmentPercentage, 0.05),
    supplyCostPercentage: toNumber(formData.supplyCostPercentage, 0.04),
    supplyCostPerSqFt: formData.supplyCostPerSqFt == null ? undefined : toNumber(formData.supplyCostPerSqFt, 0),
    targetProfitMargin: toNumber(formData.targetProfitMargin, 0.25),
    subcontractorPercentage: toNumber(formData.subcontractorPercentage, 0.6),
    sqftPerLaborHour: {
      ...DEFAULT_SQFT_PER_LABOR_HOUR,
      ...(formData.sqftPerLaborHour ?? {}),
    },
    floorTypeMultipliers: createMapWithDefaults(DEFAULT_FLOOR_TYPES, 1, formData.floorTypeMultipliers),
    frequencyMultipliers: createMapWithDefaults(DEFAULT_FREQUENCIES, 1, formData.frequencyMultipliers),
    conditionMultipliers: createMapWithDefaults(DEFAULT_CONDITIONS, 1, formData.conditionMultipliers),
    trafficMultipliers: createMapWithDefaults(DEFAULT_TRAFFIC_LEVELS, 1, formData.trafficMultipliers),
    taskComplexityAddOns: createMapWithDefaults(DEFAULT_TASK_COMPLEXITIES, 0, formData.taskComplexityAddOns),
  };
}

function buildPreview(formData: PricingPlanFormData, scenario: PreviewScenario) {
  const plan = getNormalizedForm(formData);
  const monthlyVisits = MONTHLY_VISITS_BY_FREQUENCY[scenario.frequency] ?? 21.67;
  const floorMultiplier = plan.floorTypeMultipliers[scenario.floorType] ?? 1;
  const conditionMultiplier = plan.conditionMultipliers[scenario.condition] ?? 1;
  const trafficMultiplier = plan.trafficMultipliers[scenario.traffic] ?? 1;
  const frequencyMultiplier = plan.frequencyMultipliers[scenario.frequency] ?? 1;
  const productivity = plan.sqftPerLaborHour[scenario.buildingType] ?? DEFAULT_SQFT_PER_LABOR_HOUR.other;

  const laborHoursPerVisit = (scenario.squareFeet / productivity) * floorMultiplier * conditionMultiplier * trafficMultiplier;
  const monthlyLaborHours = laborHoursPerVisit * monthlyVisits;
  const laborBasePerVisit = laborHoursPerVisit * plan.laborCostPerHour;
  const laborBurdenPerVisit = laborBasePerVisit * plan.laborBurdenPercentage;
  const laborTotalPerVisit = laborBasePerVisit + laborBurdenPerVisit;
  const insurancePerVisit = laborTotalPerVisit * plan.insurancePercentage;
  const adminPerVisit = laborTotalPerVisit * plan.adminOverheadPercentage;
  const equipmentPerVisit = laborTotalPerVisit * plan.equipmentPercentage;
  const supplyPerVisit = plan.supplyCostPerSqFt != null
    ? scenario.squareFeet * plan.supplyCostPerSqFt
    : laborTotalPerVisit * plan.supplyCostPercentage;
  const travelPerVisit = plan.travelCostPerVisit;

  const totalCostPerVisit = laborTotalPerVisit + insurancePerVisit + adminPerVisit + equipmentPerVisit + supplyPerVisit + travelPerVisit;
  const monthlyCostBeforeProfit = totalCostPerVisit * monthlyVisits;
  const marginDrivenPrice = monthlyCostBeforeProfit / Math.max(1 - plan.targetProfitMargin, 0.01);
  const sqftDrivenPrice = scenario.squareFeet * plan.baseRatePerSqFt * floorMultiplier * conditionMultiplier * trafficMultiplier * frequencyMultiplier;
  const hourlyDrivenPrice = monthlyLaborHours * plan.hourlyRate;
  const strategyDrivenSubtotal = plan.pricingType === 'hourly'
    ? Math.max(hourlyDrivenPrice, marginDrivenPrice)
    : Math.max(sqftDrivenPrice, marginDrivenPrice);
  const monthlyTotal = Math.max(strategyDrivenSubtotal, plan.minimumMonthlyCharge);
  const profitAmount = monthlyTotal - monthlyCostBeforeProfit;
  const subcontractorPayout = monthlyTotal * plan.subcontractorPercentage;
  const companyRevenue = monthlyTotal - subcontractorPayout;

  const driver =
    monthlyTotal === plan.minimumMonthlyCharge
      ? 'minimum'
      : strategyDrivenSubtotal === marginDrivenPrice
        ? 'margin'
        : plan.pricingType === 'hourly'
          ? 'hourly'
          : 'sqft';

  const warnings: string[] = [];
  if (driver === 'minimum') warnings.push('Minimum monthly charge is currently driving the final sample price.');
  if (plan.targetProfitMargin < 0.2) warnings.push('Target profit margin is below 20%, which can leave little room for operating drift.');
  if (travelPerVisit > totalCostPerVisit * 0.2) warnings.push('Travel is a large part of the sample cost per visit.');
  if (plan.pricingType === 'square_foot' && scenario.buildingType === 'medical') {
    warnings.push('Medical space often benefits from the detailed estimate method if fixture and task density is high.');
  }

  const driverLabel = {
    minimum: 'Minimum charge is setting the sample total',
    margin: 'Cost plus margin is setting the sample total',
    hourly: 'Hourly client rate is setting the sample total',
    sqft: 'Base per-sqft rate is setting the sample total',
  }[driver];

  return {
    monthlyVisits,
    laborHoursPerVisit,
    monthlyLaborHours,
    totalCostPerVisit,
    monthlyCostBeforeProfit,
    monthlyTotal,
    profitAmount,
    subcontractorPayout,
    companyRevenue,
    floorMultiplier,
    conditionMultiplier,
    trafficMultiplier,
    frequencyMultiplier,
    driverLabel,
    warnings,
  };
}

function updateNumberField(
  formData: PricingPlanFormData,
  onChange: (value: PricingPlanFormData) => void,
  key: keyof PricingPlanFormData,
  value: string
) {
  onChange({
    ...formData,
    [key]: value === '' ? undefined : Number(value),
  });
}

function updateStringField(
  formData: PricingPlanFormData,
  onChange: (value: PricingPlanFormData) => void,
  key: keyof PricingPlanFormData,
  value: string
) {
  onChange({
    ...formData,
    [key]: value,
  });
}

function updateMultiplierField(
  formData: PricingPlanFormData,
  onChange: (value: PricingPlanFormData) => void,
  key: 'floorTypeMultipliers' | 'frequencyMultipliers' | 'conditionMultipliers' | 'trafficMultipliers' | 'sqftPerLaborHour' | 'taskComplexityAddOns',
  nestedKey: string,
  value: string
) {
  onChange({
    ...formData,
    [key]: {
      ...(formData[key] ?? {}),
      [nestedKey]: Number(value),
    },
  });
}

function FieldShell({
  title,
  description,
  impact,
  children,
}: {
  title: string;
  description: string;
  impact: { label: string; tone: ImpactTone };
  children: React.ReactNode;
}) {
  return (
    <Card className="border-surface-200/80 bg-surface-50/90 dark:border-surface-700 dark:bg-surface-900/60">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h4>
          <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">{description}</p>
        </div>
        <Badge className={cn('shrink-0 border', IMPACT_STYLES[impact.tone])}>
          {impact.label}
        </Badge>
      </div>
      {children}
    </Card>
  );
}

function StepButton({
  active,
  completed,
  index,
  title,
  description,
  onClick,
}: {
  active: boolean;
  completed: boolean;
  index: number;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all',
        active
          ? 'border-primary-400 bg-primary-50 shadow-soft dark:border-primary-500 dark:bg-primary-950/30'
          : 'border-surface-200 bg-surface-50 hover:border-surface-300 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600 dark:hover:bg-surface-800/80'
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
          completed
            ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            : active
              ? 'border-primary-300 bg-primary-100 text-primary-700 dark:border-primary-800 dark:bg-primary-950/60 dark:text-primary-300'
              : 'border-surface-200 bg-surface-100 text-surface-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400'
        )}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-surface-900 dark:text-surface-100">{title}</div>
        <div className="mt-1 text-sm text-surface-600 dark:text-surface-400">{description}</div>
      </div>
    </button>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'default' | 'positive' | 'warning';
}) {
  const toneClass = {
    default: 'border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900/80',
    positive: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
  }[tone];

  return (
    <div className={cn('rounded-2xl border p-4', toneClass)}>
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-surface-500 dark:text-surface-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-surface-900 dark:text-surface-100">{value}</div>
      {note ? <div className="mt-2 text-sm text-surface-600 dark:text-surface-400">{note}</div> : null}
    </div>
  );
}

function MultiplierGrid({
  keys,
  labels,
  source,
  formData,
  onChange,
  valueStep,
  valueMin,
  valueMax,
}: {
  keys: string[];
  labels: Record<string, string>;
  source: 'floorTypeMultipliers' | 'frequencyMultipliers' | 'conditionMultipliers' | 'trafficMultipliers' | 'sqftPerLaborHour' | 'taskComplexityAddOns';
  formData: PricingPlanFormData;
  onChange: (value: PricingPlanFormData) => void;
  valueStep: string;
  valueMin: number;
  valueMax?: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {keys.map((key) => (
        <Input
          key={key}
          label={labels[key] ?? key}
          type="number"
          step={valueStep}
          min={valueMin}
          max={valueMax}
          value={formData[source]?.[key] ?? ''}
          onChange={(event) => updateMultiplierField(formData, onChange, source, key, event.target.value)}
        />
      ))}
    </div>
  );
}

export function PricingPlanBuilder({
  formData,
  onChange,
  step,
  onStepChange,
  mode,
}: PricingPlanBuilderProps) {
  const normalized = getNormalizedForm(formData);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('standard_commercial');
  const [scenario, setScenario] = useState<PreviewScenario>({
    squareFeet: 18000,
    buildingType: 'office',
    frequency: '5x_week',
    floorType: 'carpet',
    condition: 'standard',
    traffic: 'medium',
  });

  const preview = useMemo(() => buildPreview(formData, scenario), [formData, scenario]);
  const canGoBack = step > 0;
  const canGoForward = step < STEP_CONFIG.length - 1;
  const pricingMethodSummary = normalized.pricingType === 'hourly'
    ? 'Detailed estimate uses labor hours and operational scope to build the price.'
    : 'Fast estimate uses square footage and multipliers to build a quick recurring quote.';
  const recommendation = normalized.pricingType === 'hourly'
    ? 'Recommended when the team needs a more operationally defensible price for dense or irregular scopes.'
    : 'Recommended when speed matters and the facility behaves like a standard recurring janitorial account.';

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
      <div className="space-y-3">
        {STEP_CONFIG.map((item, index) => (
          <StepButton
            key={item.id}
            index={index}
            title={item.title}
            description={item.description}
            active={index === step}
            completed={index < step}
            onClick={() => onStepChange(index)}
          />
        ))}
      </div>

      <div className="space-y-6">
        <Card className="border-none bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.18),_transparent_40%),linear-gradient(135deg,_rgba(8,47,73,0.96),_rgba(15,23,42,0.96))] text-white shadow-soft-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-cyan-200/80">
                <Calculator className="h-4 w-4" />
                Hygieia Pricing Walkthrough
              </div>
              <h3 className="mt-3 text-2xl font-semibold">{STEP_CONFIG[step].title}</h3>
              <p className="mt-2 text-sm text-surface-600 dark:text-surface-300/85">{STEP_CONFIG[step].description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800/20 text-surface-700 dark:text-white">
                  {mode === 'create' ? 'Building a new plan' : 'Refining this plan'}
                </Badge>
                <Badge className="border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                  {pricingMethodSummary}
                </Badge>
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50/95">
                {recommendation}
              </div>
            </div>
            <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 px-4 py-3 text-sm text-surface-600 dark:text-surface-200 backdrop-blur-sm">
              <div className="font-semibold">How Hygieia helps</div>
              <div className="mt-2 max-w-xs text-surface-600 dark:text-surface-300/80">
                Each field below explains whether it changes labor, service cost, the client price, or only the payout split.
              </div>
            </div>
          </div>
        </Card>

        {step === 0 ? (
          <div className="space-y-6">
            <FieldShell
              title="Start from a preset"
              description="Use a preset to give the team a sensible starting point, then fine-tune the plan in the remaining steps."
              impact={{ label: 'Accelerates setup', tone: 'labor' }}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {PLAN_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      onChange(applyPreset(formData, preset.id));
                    }}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-all',
                      selectedPresetId === preset.id
                        ? 'border-primary-400 bg-primary-50 shadow-soft dark:border-primary-500 dark:bg-primary-950/30'
                        : 'border-surface-200 bg-surface-50 hover:border-surface-300 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900/60 dark:hover:border-surface-600'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-surface-900 dark:text-surface-100">{preset.name}</div>
                      <Badge variant="default">{preset.badge}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-surface-600 dark:text-surface-400">{preset.description}</div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-surface-500 dark:text-surface-500">
                      {preset.pricingType === 'hourly' ? 'Detailed Estimate' : 'Fast Estimate'}
                    </div>
                  </button>
                ))}
              </div>
            </FieldShell>

            <FieldShell
              title="Commercial setup"
              description="Name the plan and choose the pricing approach Hygieia should use when this plan is applied."
              impact={{ label: 'Affects final client price', tone: 'price' }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Plan Name"
                  value={normalized.name}
                  onChange={(event) => updateStringField(formData, onChange, 'name', event.target.value)}
                  hint="Use a name your team can recognize quickly, like Standard Commercial or Medical Premium."
                />
                <Select
                  label="Pricing Method"
                  options={PRICING_TYPE_OPTIONS}
                  value={normalized.pricingType}
                  onChange={(value) => updateStringField(formData, onChange, 'pricingType', value)}
                  hint="Fast Estimate is better for speed. Detailed Estimate is better when task density matters."
                />
                {normalized.pricingType !== 'hourly' ? (
                  <Input
                    label="Base Rate per Sq Ft ($)"
                    type="number"
                    step="0.01"
                    min={0}
                    value={normalized.baseRatePerSqFt}
                    onChange={(event) => updateNumberField(formData, onChange, 'baseRatePerSqFt', event.target.value)}
                    hint="Higher base rate raises the sample quote before minimums and payout splits."
                  />
                ) : (
                  <Input
                    label="Hourly Rate ($)"
                    type="number"
                    step="0.01"
                    min={0}
                    value={normalized.hourlyRate}
                    onChange={(event) => updateNumberField(formData, onChange, 'hourlyRate', event.target.value)}
                    hint="This is the client-facing rate Hygieia compares against cost-plus-margin pricing."
                  />
                )}
                <Input
                  label="Minimum Monthly Charge ($)"
                  type="number"
                  step="1"
                  min={0}
                  value={normalized.minimumMonthlyCharge}
                  onChange={(event) => updateNumberField(formData, onChange, 'minimumMonthlyCharge', event.target.value)}
                  hint="This protects you from underpricing small or low-frequency sites."
                />
              </div>
            </FieldShell>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                  <TrendingDown className="h-4 w-4" />
                  <h4 className="font-semibold">Fast Estimate</h4>
                </div>
                <p className="mt-3 text-sm text-surface-700 dark:text-surface-300">
                  Best for standard recurring janitorial quotes where square footage and service pattern are reliable.
                </p>
              </Card>
              <Card className="border-fuchsia-200 bg-fuchsia-50/70 dark:border-fuchsia-900 dark:bg-fuchsia-950/20">
                <div className="flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-300">
                  <ClipboardList className="h-4 w-4" />
                  <h4 className="font-semibold">Detailed Estimate</h4>
                </div>
                <p className="mt-3 text-sm text-surface-700 dark:text-surface-300">
                  Better when labor hours, fixtures, and task-heavy spaces matter more than raw square footage.
                </p>
              </Card>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <FieldShell
              title="Labor assumptions"
              description="This is where Hygieia estimates how much work the team needs to deliver each visit."
              impact={{ label: 'Affects labor', tone: 'labor' }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Labor Cost per Hour ($)"
                  type="number"
                  step="0.01"
                  min={0}
                  value={normalized.laborCostPerHour}
                  onChange={(event) => updateNumberField(formData, onChange, 'laborCostPerHour', event.target.value)}
                  hint="Higher labor cost raises service cost before profit is added."
                />
                <Input
                  label="Labor Burden (decimal)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={normalized.laborBurdenPercentage}
                  onChange={(event) => updateNumberField(formData, onChange, 'laborBurdenPercentage', event.target.value)}
                  hint="Burden captures payroll taxes and related labor overhead on top of wages."
                />
              </div>
            </FieldShell>

            <FieldShell
              title="Productivity by building type"
              description="Square footage per labor hour controls how much time Hygieia estimates for each kind of facility."
              impact={{ label: 'Affects labor', tone: 'labor' }}
            >
              <MultiplierGrid
                keys={DEFAULT_BUILDING_TYPES}
                labels={BUILDING_TYPE_LABELS}
                source="sqftPerLaborHour"
                formData={formData}
                onChange={onChange}
                valueStep="100"
                valueMin={100}
              />
            </FieldShell>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <FieldShell
              title="Operating cost stack"
              description="These costs sit on top of labor and move the sample quote before margin is applied."
              impact={{ label: 'Affects service cost', tone: 'cost' }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Insurance (decimal)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={normalized.insurancePercentage}
                  onChange={(event) => updateNumberField(formData, onChange, 'insurancePercentage', event.target.value)}
                  hint="Adds insurance cost on top of labor."
                />
                <Input
                  label="Admin Overhead (decimal)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={normalized.adminOverheadPercentage}
                  onChange={(event) => updateNumberField(formData, onChange, 'adminOverheadPercentage', event.target.value)}
                  hint="Covers management, coordination, and internal overhead."
                />
                <Input
                  label="Equipment (decimal)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={normalized.equipmentPercentage}
                  onChange={(event) => updateNumberField(formData, onChange, 'equipmentPercentage', event.target.value)}
                  hint="Adds equipment cost on top of labor."
                />
                <Input
                  label="Travel Cost per Visit ($)"
                  type="number"
                  step="1"
                  min={0}
                  value={normalized.travelCostPerVisit}
                  onChange={(event) => updateNumberField(formData, onChange, 'travelCostPerVisit', event.target.value)}
                  hint="Travel applies every visit, so it grows quickly at higher frequencies."
                />
                <Input
                  label="Supply Cost (decimal)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={normalized.supplyCostPercentage}
                  onChange={(event) => updateNumberField(formData, onChange, 'supplyCostPercentage', event.target.value)}
                  hint="Use this when supplies should scale with labor and service intensity."
                />
                <Input
                  label="Supply Cost per Sq Ft ($)"
                  type="number"
                  step="0.001"
                  min={0}
                  value={normalized.supplyCostPerSqFt ?? ''}
                  onChange={(event) => updateNumberField(formData, onChange, 'supplyCostPerSqFt', event.target.value)}
                  hint="Optional override if you prefer a flat supply cost per square foot."
                />
              </div>
            </FieldShell>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <FieldShell
              title="Margin and payout rules"
              description="These settings control how Hygieia turns your service cost into the final client price and the retained revenue."
              impact={{ label: 'Affects final client price', tone: 'price' }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Target Profit Margin (decimal)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={0.99}
                  value={normalized.targetProfitMargin}
                  onChange={(event) => updateNumberField(formData, onChange, 'targetProfitMargin', event.target.value)}
                  hint="Raises the client price after Hygieia calculates underlying service cost."
                />
                <Input
                  label="Subcontractor Percentage (%)"
                  type="number"
                  step="1"
                  min={0}
                  max={100}
                  value={Math.round(normalized.subcontractorPercentage * 100)}
                  onChange={(event) => onChange({
                    ...formData,
                    subcontractorPercentage: Number(event.target.value) / 100,
                  })}
                  hint="This changes payout split after pricing. It does not directly increase the client price."
                />
              </div>
            </FieldShell>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">How margin works</div>
                <p className="mt-2 text-sm text-surface-700 dark:text-surface-300">
                  Hygieia applies margin after service cost is built. Higher target margin raises the client quote while protecting the business when costs drift.
                </p>
              </Card>
              <Card className="border-fuchsia-200 bg-fuchsia-50/70 dark:border-fuchsia-900 dark:bg-fuchsia-950/20">
                <div className="text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">How payout works</div>
                <p className="mt-2 text-sm text-surface-700 dark:text-surface-300">
                  Subcontractor percentage controls how final revenue is split after pricing. It affects retained revenue, not the client-facing quote formula.
                </p>
              </Card>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <FieldShell
              title="Floor and service pattern multipliers"
              description="Use these to push pricing up or down when a floor type or service cadence needs more or less effort."
              impact={{ label: 'Affects final client price', tone: 'price' }}
            >
              <div className="space-y-6">
                <div>
                  <h5 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-surface-500 dark:text-surface-400">Floor Types</h5>
                  <MultiplierGrid
                    keys={DEFAULT_FLOOR_TYPES}
                    labels={FLOOR_TYPE_LABELS}
                    source="floorTypeMultipliers"
                    formData={formData}
                    onChange={onChange}
                    valueStep="0.01"
                    valueMin={0}
                  />
                </div>
                <div>
                  <h5 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-surface-500 dark:text-surface-400">Service Frequency</h5>
                  <MultiplierGrid
                    keys={DEFAULT_FREQUENCIES}
                    labels={FREQUENCY_LABELS}
                    source="frequencyMultipliers"
                    formData={formData}
                    onChange={onChange}
                    valueStep="0.01"
                    valueMin={0}
                  />
                </div>
              </div>
            </FieldShell>

            <FieldShell
              title="Condition, traffic, and task complexity"
              description="These controls let Hygieia reflect real operating difficulty instead of pretending every facility is equally easy to clean."
              impact={{ label: 'Affects labor and price', tone: 'cost' }}
            >
              <div className="space-y-6">
                <div>
                  <h5 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-surface-500 dark:text-surface-400">Condition</h5>
                  <MultiplierGrid
                    keys={DEFAULT_CONDITIONS}
                    labels={CONDITION_LABELS}
                    source="conditionMultipliers"
                    formData={formData}
                    onChange={onChange}
                    valueStep="0.01"
                    valueMin={0}
                  />
                </div>
                <div>
                  <h5 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-surface-500 dark:text-surface-400">Traffic</h5>
                  <MultiplierGrid
                    keys={DEFAULT_TRAFFIC_LEVELS}
                    labels={TRAFFIC_LABELS}
                    source="trafficMultipliers"
                    formData={formData}
                    onChange={onChange}
                    valueStep="0.01"
                    valueMin={0}
                  />
                </div>
                <div>
                  <h5 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-surface-500 dark:text-surface-400">Task Complexity</h5>
                  <MultiplierGrid
                    keys={DEFAULT_TASK_COMPLEXITIES}
                    labels={TASK_COMPLEXITY_LABELS}
                    source="taskComplexityAddOns"
                    formData={formData}
                    onChange={onChange}
                    valueStep="0.01"
                    valueMin={0}
                  />
                </div>
              </div>
            </FieldShell>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 dark:border-surface-700 dark:bg-surface-800">
          <Button variant="secondary" onClick={() => onStepChange(Math.max(0, step - 1))} disabled={!canGoBack}>
            Back
          </Button>
          <div className="text-sm text-surface-500 dark:text-surface-400">
            Step {step + 1} of {STEP_CONFIG.length}
          </div>
          <Button variant={canGoForward ? 'primary' : 'secondary'} onClick={() => onStepChange(Math.min(STEP_CONFIG.length - 1, step + 1))} disabled={!canGoForward}>
            {canGoForward ? (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              'Review complete'
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card className="border-none bg-surface-950 text-white shadow-soft-xl dark:bg-surface-950">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Live Pricing Impact</div>
              <h4 className="mt-2 text-lg font-semibold">Sample walkthrough</h4>
            </div>
            <Badge className="border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
              Explains effect, not final quote
            </Badge>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Input
              label="Sample Sq Ft"
              type="number"
              min={500}
              step="500"
              value={scenario.squareFeet}
              onChange={(event) => setScenario((current) => ({
                ...current,
                squareFeet: Number(event.target.value) || 0,
              }))}
            />
            <Select
              label="Building Type"
              options={DEFAULT_BUILDING_TYPES.map((value) => ({ value, label: BUILDING_TYPE_LABELS[value] ?? value }))}
              value={scenario.buildingType}
              onChange={(value) => setScenario((current) => ({ ...current, buildingType: value }))}
            />
            <Select
              label="Frequency"
              options={DEFAULT_FREQUENCIES.map((value) => ({ value, label: FREQUENCY_LABELS[value] ?? value }))}
              value={scenario.frequency}
              onChange={(value) => setScenario((current) => ({ ...current, frequency: value }))}
            />
            <Select
              label="Floor Type"
              options={DEFAULT_FLOOR_TYPES.map((value) => ({ value, label: FLOOR_TYPE_LABELS[value] ?? value }))}
              value={scenario.floorType}
              onChange={(value) => setScenario((current) => ({ ...current, floorType: value }))}
            />
            <Select
              label="Condition"
              options={DEFAULT_CONDITIONS.map((value) => ({ value, label: CONDITION_LABELS[value] ?? value }))}
              value={scenario.condition}
              onChange={(value) => setScenario((current) => ({ ...current, condition: value }))}
            />
            <Select
              label="Traffic"
              options={DEFAULT_TRAFFIC_LEVELS.map((value) => ({ value, label: TRAFFIC_LABELS[value] ?? value }))}
              value={scenario.traffic}
              onChange={(value) => setScenario((current) => ({ ...current, traffic: value }))}
            />
          </div>

          <div className="mt-5 grid gap-3">
            <MetricCard
              label="Final Monthly Price"
              value={formatCurrency(preview.monthlyTotal)}
              note={preview.driverLabel}
              tone="positive"
            />
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Labor Hours / Month"
                value={preview.monthlyLaborHours.toFixed(1)}
                note={`${preview.monthlyVisits.toFixed(1)} visits / month`}
              />
              <MetricCard
                label="Cost Per Visit"
                value={formatCurrency(preview.totalCostPerVisit)}
                note={`${preview.laborHoursPerVisit.toFixed(2)} labor hrs / visit`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Profit Amount"
                value={formatCurrency(preview.profitAmount)}
                note={`Target margin ${formatPercent(normalized.targetProfitMargin)}`}
              />
              <MetricCard
                label="Subcontractor Payout"
                value={formatCurrency(preview.subcontractorPayout)}
                note={`${formatPercent(normalized.subcontractorPercentage)} of final price`}
                tone="warning"
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-4">
            <div className="text-sm font-semibold text-surface-900 dark:text-white">How Hygieia explains this sample</div>
            <div className="mt-3 grid gap-2 text-sm text-surface-600 dark:text-surface-300/85">
              <div>1. Estimate labor from square footage, productivity, and difficulty multipliers.</div>
              <div>2. Add operating costs like insurance, admin, equipment, travel, and supplies.</div>
              <div>3. Apply margin rules and then split retained revenue from subcontractor payout.</div>
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-4">
            <div className="text-sm font-semibold text-surface-900 dark:text-white">What changed this price</div>
            <div className="grid gap-2 text-sm text-surface-600 dark:text-surface-300/85">
              <div className="flex justify-between gap-3">
                <span>Floor multiplier</span>
                <span>{preview.floorMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Condition multiplier</span>
                <span>{preview.conditionMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Traffic multiplier</span>
                <span>{preview.trafficMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Frequency multiplier</span>
                <span>{preview.frequencyMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Monthly cost before profit</span>
                <span>{formatCurrency(preview.monthlyCostBeforeProfit)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Company retains</span>
                <span>{formatCurrency(preview.companyRevenue)}</span>
              </div>
            </div>
          </div>

          {preview.warnings.length > 0 ? (
            <div className="mt-5 space-y-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <div className="text-sm font-semibold text-amber-100">Guidance before you trust this number</div>
              {preview.warnings.map((warning) => (
                <div key={warning} className="text-sm text-amber-100/85">
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export function createDefaultPricingPlanDraft(): CreatePricingSettingsInput {
  return {
    name: '',
    pricingType: 'square_foot',
    baseRatePerSqFt: 0.1,
    minimumMonthlyCharge: 250,
    hourlyRate: 35,
    laborCostPerHour: 18,
    laborBurdenPercentage: 0.25,
    sqftPerLaborHour: { ...DEFAULT_SQFT_PER_LABOR_HOUR },
    insurancePercentage: 0.08,
    adminOverheadPercentage: 0.12,
    travelCostPerVisit: 15,
    equipmentPercentage: 0.05,
    supplyCostPercentage: 0.04,
    targetProfitMargin: 0.25,
    subcontractorPercentage: 0.6,
    floorTypeMultipliers: createMapWithDefaults(DEFAULT_FLOOR_TYPES, 1),
    frequencyMultipliers: createMapWithDefaults(DEFAULT_FREQUENCIES, 1),
    conditionMultipliers: {
      standard: 1,
      medium: 1.15,
      hard: 1.3,
    },
    trafficMultipliers: {
      low: 1,
      medium: 1.1,
      high: 1.2,
    },
    taskComplexityAddOns: {
      standard: 0,
      sanitization: 0.2,
      floor_care: 0.25,
      window_cleaning: 0.15,
    },
  };
}
