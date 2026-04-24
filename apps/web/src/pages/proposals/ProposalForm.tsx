import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Save,
  Plus,
  Trash2,
  Calculator,
  Building2,
  FileText,
  DollarSign,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleAlert,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  getProposal,
  createProposal,
  updateProposal,
  listProposals,
} from '../../lib/proposals';
import { listAccounts } from '../../lib/accounts';
import { listFacilities, listAreas, getFacility } from '../../lib/facilities';
import { listFacilityTasks } from '../../lib/tasks';
import {
  getFacilityPricingReadiness,
  getFacilityProposalTemplate,
  listPricingSettings,
  type PricingSettings,
  type FacilityPricingReadiness,
  type PricingBreakdown,
  type PricingSettingsSnapshot,
} from '../../lib/pricing';
import { extractApiErrorMessage } from '../../lib/api';
import type {
  CreateProposalInput,
  UpdateProposalInput,
  ProposalItem,
  ProposalService,
  ProposalItemType,
  ProposalStatus,
  ServiceType,
  ServiceFrequency,
  ProposalScheduleFrequency,
  ProposalServiceSchedule,
  ServiceScheduleDay,
} from '../../types/proposal';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { Area, FacilityTask } from '../../types/facility';
import { AreaTaskTimeBreakdown } from '../../components/proposals/AreaTaskTimeBreakdown';
import { PricingBreakdownPanel } from '../../components/proposals/PricingBreakdownPanel';
import ClientServiceScheduleCard from '../../components/proposals/ClientServiceScheduleCard';
import { listTemplates } from '../../lib/proposalTemplates';
import type { ProposalTemplate } from '../../types/proposalTemplate';
import { SUBCONTRACTOR_TIER_OPTIONS } from '../../lib/subcontractorTiers';
import {
  listResidentialPricingPlans,
  previewResidentialQuote,
  getResidentialProperty,
} from '../../lib/residential';
import { listOneTimeServiceCatalog } from '../../lib/oneTimeServiceCatalog';
import type {
  ResidentialPricingPlan,
  ResidentialQuotePreview,
  ResidentialServiceType,
  ResidentialFrequency,
  ResidentialQuoteAddOnInput,
  ResidentialAddress,
  ResidentialHomeProfile,
} from '../../types/residential';
import type { OneTimeServiceCatalogItem } from '../../types/oneTimeServiceCatalog';

interface SuggestedProposalItem {
  itemType?: ProposalItemType;
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

interface ResidentialPreviewContext {
  accountId: string;
  facilityId: string;
  propertyId: string;
  propertyName: string;
  homeAddress: ResidentialAddress | null;
  homeProfile: ResidentialHomeProfile | null;
  defaultAddOns: ResidentialQuoteAddOnInput[];
}

type ProposalCategory = 'commercial' | 'residential' | 'specialized';

const ACTIVE_PROPOSAL_STATUSES: ProposalStatus[] = ['draft', 'sent', 'viewed', 'accepted'];

// Constants for dropdown options
const ITEM_TYPES: { value: ProposalItemType; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'one_time', label: 'One Time' },
];

const SERVICE_FREQUENCIES: { value: ServiceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const SCHEDULE_FREQUENCIES: { value: ProposalScheduleFrequency; label: string }[] = [
  { value: '1x_week', label: '1x per Week' },
  { value: '2x_week', label: '2x per Week' },
  { value: '3x_week', label: '3x per Week' },
  { value: '4x_week', label: '4x per Week' },
  { value: '5x_week', label: '5x per Week' },
  { value: '7x_week', label: '7x per Week (Daily)' },
  { value: 'daily', label: 'Daily (Weekdays)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const SCHEDULE_DAY_OPTIONS: { value: ServiceScheduleDay; label: string }[] = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const DAY_ORDER = SCHEDULE_DAY_OPTIONS.map((day) => day.value);
const BUSINESS_DAY_ORDER = DAY_ORDER.filter((day) =>
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day)
) as ServiceScheduleDay[];

interface ServiceDescriptionGroup {
  label: string;
  tasks: string[];
}

const serviceDescriptionLabel = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('annual') || normalized.includes('yearly')) return 'Annual';
  if (normalized.includes('quarterly')) return 'Quarterly';
  if (normalized.includes('monthly')) return 'Monthly';
  if (normalized.includes('biweekly')) return 'Bi-Weekly';
  if (normalized.includes('weekly')) return 'Weekly';
  if (normalized.includes('daily')) return 'Daily';
  return value.trim();
};

const parseServiceDescription = (
  description: string | null | undefined
): { areaSummary: string; groups: ServiceDescriptionGroup[] } => {
  const lines = (description || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { areaSummary: '', groups: [] };
  }

  const grouped = new Map<string, Set<string>>();
  const addTask = (label: string, task: string) => {
    const cleanTask = task.trim();
    if (!cleanTask) return;
    const cleanLabel = serviceDescriptionLabel(label);
    if (!grouped.has(cleanLabel)) grouped.set(cleanLabel, new Set<string>());
    grouped.get(cleanLabel)!.add(cleanTask);
  };

  for (const line of lines.slice(1)) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (match) {
      for (const task of match[2].split(',')) {
        addTask(match[1], task);
      }
      continue;
    }
    addTask('Scope', line);
  }

  return {
    areaSummary: lines[0] || '',
    groups: Array.from(grouped.entries()).map(([label, tasks]) => ({
      label,
      tasks: Array.from(tasks),
    })),
  };
};

const expectedDaysForFrequency = (frequency: ProposalScheduleFrequency): number => {
  switch (frequency) {
    case '1x_week':
    case 'weekly':
    case 'biweekly':
    case 'monthly':
    case 'quarterly':
      return 1;
    case '2x_week':
      return 2;
    case '3x_week':
      return 3;
    case '4x_week':
      return 4;
    case '5x_week':
    case 'daily':
      return 5;
    case '7x_week':
      return 7;
  }
};

const defaultDaysForFrequency = (frequency: ProposalScheduleFrequency): ServiceScheduleDay[] => {
  switch (frequency) {
    case '1x_week':
    case 'weekly':
    case 'biweekly':
    case 'monthly':
    case 'quarterly':
      return ['monday'];
    case '2x_week':
      return ['monday', 'thursday'];
    case '3x_week':
      return ['monday', 'wednesday', 'friday'];
    case '4x_week':
      return ['monday', 'tuesday', 'thursday', 'friday'];
    case '7x_week':
      return [...DAY_ORDER];
    case '5x_week':
    case 'daily':
    default:
      return [...BUSINESS_DAY_ORDER];
  }
};

const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAY_ALIAS_MAP: Record<string, ServiceScheduleDay> = {
  monday: 'monday',
  mon: 'monday',
  tuesday: 'tuesday',
  tue: 'tuesday',
  tues: 'tuesday',
  wednesday: 'wednesday',
  wed: 'wednesday',
  thursday: 'thursday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  friday: 'friday',
  fri: 'friday',
  saturday: 'saturday',
  sat: 'saturday',
  sunday: 'sunday',
  sun: 'sunday',
};

const mapScheduleFrequencyToPricingFrequency = (
  frequency: ProposalScheduleFrequency
): string => (frequency === '7x_week' ? 'daily' : frequency);

const parseServiceScheduleDay = (value: unknown): ServiceScheduleDay | null => {
  if (typeof value !== 'string') return null;
  return DAY_ALIAS_MAP[value.trim().toLowerCase()] || null;
};

const parseScheduleDaysInput = (value: unknown): ServiceScheduleDay[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<ServiceScheduleDay>();
  for (const raw of value) {
    const parsed = parseServiceScheduleDay(raw);
    if (parsed) unique.add(parsed);
  }
  return Array.from(unique);
};

const parseTimeValue = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return TIME_24H_REGEX.test(trimmed) ? trimmed : fallback;
};

const extractFacilityAddressSchedule = (
  facility: Facility | undefined
): {
  frequency?: ProposalScheduleFrequency;
  days?: ServiceScheduleDay[];
  allowedWindowStart?: string;
  allowedWindowEnd?: string;
} | null => {
  const address = facility?.address as Record<string, unknown> | undefined;
  if (!address) return null;

  const scheduleObj =
    (address.serviceSchedule as Record<string, unknown> | undefined) ||
    (address.schedule as Record<string, unknown> | undefined) ||
    (address.clientServiceSchedule as Record<string, unknown> | undefined) ||
    null;

  const frequencyRaw =
    (scheduleObj?.frequency as string | undefined) ||
    (address.serviceFrequency as string | undefined) ||
    (address.cleaningFrequency as string | undefined);

  const normalizedFrequency = (() => {
    if (!frequencyRaw) return undefined;
    const key = frequencyRaw.trim().toLowerCase();
    if (key === 'daily') return '7x_week' as ProposalScheduleFrequency;
    if (SCHEDULE_FREQUENCIES.some((option) => option.value === key)) {
      return key as ProposalScheduleFrequency;
    }
    return undefined;
  })();

  const days = parseScheduleDaysInput(
    scheduleObj?.days ||
      scheduleObj?.daysOfWeek ||
      address.serviceDays ||
      address.daysOfWeek
  );

  const allowedWindowStart = parseTimeValue(
    scheduleObj?.allowedWindowStart ||
      scheduleObj?.windowStart ||
      scheduleObj?.startTime ||
      address.allowedWindowStart ||
      address.serviceWindowStart ||
      address.startTime,
    '18:00'
  );

  const allowedWindowEnd = parseTimeValue(
    scheduleObj?.allowedWindowEnd ||
      scheduleObj?.windowEnd ||
      scheduleObj?.endTime ||
      address.allowedWindowEnd ||
      address.serviceWindowEnd ||
      address.endTime,
    '06:00'
  );

  if (!normalizedFrequency && days.length === 0 && !scheduleObj) return null;

  return {
    ...(normalizedFrequency ? { frequency: normalizedFrequency } : {}),
    ...(days.length > 0 ? { days } : {}),
    allowedWindowStart,
    allowedWindowEnd,
  };
};

const normalizeScheduleDays = (
  days: ServiceScheduleDay[],
  frequency: ProposalScheduleFrequency
): ServiceScheduleDay[] => {
  const unique = Array.from(new Set(days)).filter((day): day is ServiceScheduleDay => DAY_ORDER.includes(day));
  const sorted = [...unique].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const expected = expectedDaysForFrequency(frequency);

  if (sorted.length === expected) return sorted;
  if (sorted.length < expected) {
    const fallback = defaultDaysForFrequency(frequency).filter((day) => !sorted.includes(day));
    return [...sorted, ...fallback].slice(0, expected);
  }
  return sorted.slice(0, expected);
};

const SUBCONTRACTOR_TIERS = [
  { value: '', label: 'Plan Default', description: 'Uses the percentage configured in the pricing plan' },
  ...SUBCONTRACTOR_TIER_OPTIONS,
];

const RESIDENTIAL_SERVICE_OPTIONS: { value: ResidentialServiceType; label: string }[] = [
  { value: 'recurring_standard', label: 'Recurring Standard' },
  { value: 'one_time_standard', label: 'One-Time Standard' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'move_in_out', label: 'Move In / Out' },
  { value: 'turnover', label: 'Vacation Rental Turnover' },
  { value: 'post_construction', label: 'Post Construction' },
];

const RESIDENTIAL_FREQUENCY_OPTIONS: { value: ResidentialFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'every_4_weeks', label: 'Every 4 Weeks' },
  { value: 'one_time', label: 'One Time' },
];

const normalizeOptionalString = (value: string | null | undefined) => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeTaskList = (tasks: string[] | null | undefined) =>
  (tasks || [])
    .map((task) => task.trim())
    .filter((task, index, all) => task.length > 0 && all.findIndex((entry) => entry.toLowerCase() === task.toLowerCase()) === index);

const mapResidentialFrequencyToProposalSchedule = (
  frequency: ResidentialFrequency
): ProposalScheduleFrequency => {
  switch (frequency) {
    case 'weekly':
      return 'weekly';
    case 'biweekly':
      return 'biweekly';
    case 'every_4_weeks':
      return 'monthly';
    case 'one_time':
    default:
      return 'monthly';
  }
};

const mapResidentialFrequencyToProposalServiceFrequency = (
  frequency: ResidentialFrequency
): ServiceFrequency => {
  switch (frequency) {
    case 'weekly':
      return 'weekly';
    case 'biweekly':
      return 'biweekly';
    case 'every_4_weeks':
      return 'monthly';
    case 'one_time':
    default:
      return 'monthly';
  }
};

const mapResidentialServiceTypeToProposalServiceType = (
  serviceType: ResidentialServiceType
): ServiceType => {
  switch (serviceType) {
    case 'recurring_standard':
      return 'weekly';
    case 'one_time_standard':
    case 'deep_clean':
    case 'move_in_out':
    case 'turnover':
    case 'post_construction':
    default:
      return 'one_time';
  }
};

const defaultResidentialProposalTitle = (
  serviceType: ResidentialServiceType,
  locationName: string | null | undefined
) => {
  const serviceLabel =
    RESIDENTIAL_SERVICE_OPTIONS.find((option) => option.value === serviceType)?.label || 'Residential Cleaning';
  return locationName ? `${serviceLabel} - ${locationName}` : serviceLabel;
};

const defaultCommercialProposalTitle = (
  locationName: string | null | undefined
) => (locationName ? `Cleaning Services - ${locationName}` : 'Cleaning Services Proposal');

const getResidentialFrequencyLabel = (frequency: ResidentialFrequency) =>
  RESIDENTIAL_FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.label || frequency;

interface ResidentialScopeGroup {
  label: string;
  tasks: string[];
}

const buildResidentialScopeGroups = (
  areas: Area[],
  tasks: FacilityTask[]
): ResidentialScopeGroup[] => {
  const grouped = new Map<string, string[]>();

  areas
    .filter((area) => !area.archivedAt)
    .forEach((area) => {
      const label = area.name || area.areaType.name;
      if (!grouped.has(label)) grouped.set(label, []);
    });

  tasks
    .filter((task) => !task.archivedAt)
    .forEach((task) => {
      const label = task.area?.name || task.area?.areaType.name || 'General';
      const taskName = task.customName || task.taskTemplate?.name || 'Task';
      if (!grouped.has(label)) grouped.set(label, []);
      const existing = grouped.get(label)!;
      if (!existing.some((entry) => entry.toLowerCase() === taskName.toLowerCase())) {
        existing.push(taskName);
      }
    });

  return Array.from(grouped.entries())
    .map(([label, groupedTasks]) => ({ label, tasks: groupedTasks }))
    .filter((group) => group.tasks.length > 0);
};

const buildResidentialProposalServices = ({
  preview,
  propertyName,
  serviceType,
  frequency,
  scopeGroups,
}: {
  preview: ResidentialQuotePreview;
  propertyName: string;
  serviceType: ResidentialServiceType;
  frequency: ResidentialFrequency;
  scopeGroups: ResidentialScopeGroup[];
}): ProposalService[] => {
  const mappedServiceType = mapResidentialServiceTypeToProposalServiceType(serviceType);
  const mappedFrequency = mapResidentialFrequencyToProposalServiceFrequency(frequency);
  const serviceLabel =
    RESIDENTIAL_SERVICE_OPTIONS.find((option) => option.value === serviceType)?.label
    || 'Residential Cleaning';
  const includedTasks = scopeGroups.flatMap((group) =>
    group.tasks.map((task) => `${group.label}: ${task}`)
  );
  const areaSummary = scopeGroups.length > 0
    ? `${scopeGroups.length} area${scopeGroups.length === 1 ? '' : 's'} scoped`
    : propertyName;

  return [{
    serviceName: serviceLabel,
    serviceType: mappedServiceType,
    frequency: mappedFrequency,
    estimatedHours: preview.breakdown.estimatedHours,
    hourlyRate: null,
    monthlyPrice: preview.breakdown.finalTotal,
    description: [
      areaSummary,
      ...scopeGroups.map((group) => `${group.label}: ${group.tasks.join(', ')}`),
      preview.breakdown.guidance.length > 0
        ? `Guidance: ${preview.breakdown.guidance.join(' | ')}`
        : null,
    ].filter(Boolean).join('\n'),
    includedTasks,
    sortOrder: 0,
  }];
};

const buildResidentialProposalItems = (
  preview: ResidentialQuotePreview
): ProposalItem[] => {
  const items: ProposalItem[] = [];

  if (preview.breakdown.firstCleanSurcharge > 0) {
    items.push({
      itemType: 'labor',
      description: 'First Clean Surcharge',
      quantity: 1,
      unitPrice: preview.breakdown.firstCleanSurcharge,
      totalPrice: preview.breakdown.firstCleanSurcharge,
      sortOrder: items.length,
    });
  }

  preview.breakdown.addOns.forEach((addOn) => {
    items.push({
      itemType: 'other',
      description: addOn.label,
      quantity: addOn.quantity,
      unitPrice: addOn.unitPrice,
      totalPrice: addOn.lineTotal,
      sortOrder: items.length,
    });
  });

  return items;
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const applyResidentialAutoPopulate = ({
  current,
  preview,
  propertyName,
  serviceType,
  frequency,
  scopeGroups,
}: {
  current: CreateProposalInput;
  preview: ResidentialQuotePreview;
  propertyName: string;
  serviceType: ResidentialServiceType;
  frequency: ResidentialFrequency;
  scopeGroups: ResidentialScopeGroup[];
}): CreateProposalInput => {
  const scheduleFrequency = mapResidentialFrequencyToProposalSchedule(frequency);
  const currentSchedule = current.serviceSchedule || createDefaultSchedule(scheduleFrequency);

  return {
    ...current,
    proposalServices: buildResidentialProposalServices({
      preview,
      propertyName,
      serviceType,
      frequency,
      scopeGroups,
    }),
    proposalItems: buildResidentialProposalItems(preview),
    pricingPlanId: null,
    serviceFrequency: scheduleFrequency,
    serviceSchedule: {
      ...currentSchedule,
      days: normalizeScheduleDays(currentSchedule.days || [], scheduleFrequency),
      allowedWindowStart: currentSchedule.allowedWindowStart || '18:00',
      allowedWindowEnd: currentSchedule.allowedWindowEnd || '06:00',
      windowAnchor: 'start_day',
      timezoneSource: 'facility',
    },
  };
};

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const toTimeInputValue = (value?: string | null) => {
  if (!value) return '';
  const hhmmMatch = value.match(/^(\d{2}:\d{2})/);
  if (hhmmMatch) return hhmmMatch[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
};

const toUtcDateTime = (date?: string | null, time?: string | null) =>
  date && time ? new Date(`${date}T${time}:00.000Z`).toISOString() : null;

const removeZeroValueProposalItems = (
  items: CreateProposalInput['proposalItems'] | undefined
) => (items || []).filter((item) => Number(item.totalPrice || 0) > 0);

// Empty item template
const createEmptyItem = (sortOrder: number): ProposalItem => ({
  itemType: 'labor',
  description: '',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  sortOrder,
});

const createSpecializedCatalogItem = (
  catalogItem: OneTimeServiceCatalogItem,
  sortOrder: number
): ProposalItem => {
  const quantity = Number(catalogItem.defaultQuantity || 1);
  const unitPrice = Number(catalogItem.baseRate || 0);
  const calculatedTotal = quantity * unitPrice;
  const minimumCharge = Number(catalogItem.minimumCharge || 0);

  return {
    itemType: 'other',
    description: catalogItem.description
      ? `${catalogItem.name} - ${catalogItem.description}`
      : catalogItem.name,
    quantity,
    unitPrice,
    totalPrice: Math.max(calculatedTotal, minimumCharge),
    sortOrder,
  };
};

// Empty service template
const createEmptyService = (sortOrder: number): ProposalService => ({
  serviceName: '',
  serviceType: 'monthly',
  frequency: 'monthly',
  estimatedHours: null,
  hourlyRate: null,
  monthlyPrice: 0,
  description: null,
  includedTasks: [],
  sortOrder,
});

const createDefaultSchedule = (
  frequency: ProposalScheduleFrequency = '5x_week'
): ProposalServiceSchedule => ({
  days: defaultDaysForFrequency(frequency),
  allowedWindowStart: '18:00',
  allowedWindowEnd: '06:00',
  windowAnchor: 'start_day',
  timezoneSource: 'facility',
});

const getProposalCategory = (
  proposalType: string | null | undefined,
  accountType: string | null | undefined
): ProposalCategory => {
  if (proposalType === 'one_time' || proposalType === 'specialized') {
    return 'specialized';
  }
  return accountType === 'residential' ? 'residential' : 'commercial';
};

const ProposalForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = id && id !== 'new';
  const initialProposalType = new URLSearchParams(location.search).get('type') === 'specialized'
    ? 'specialized'
    : 'recurring';
  const initialProposalCategory: ProposalCategory = initialProposalType === 'specialized'
    ? 'specialized'
    : 'commercial';
  const lastAutoGeneratedTitleRef = useRef<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<ProposalStatus | null>(null);

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [, setTermsTemplates] = useState<ProposalTemplate[]>([]);
  const [residentialPricingPlans, setResidentialPricingPlans] = useState<ResidentialPricingPlan[]>([]);
  const [specializedCatalogItems, setSpecializedCatalogItems] = useState<OneTimeServiceCatalogItem[]>([]);

  // Form data
  const [proposalCategory, setProposalCategory] = useState<ProposalCategory>(initialProposalCategory);
  const [formData, setFormData] = useState<CreateProposalInput>({
    accountId: '',
    proposalType: initialProposalType,
    title: '',
    description: null,
    facilityId: '',
    validUntil: null,
    scheduledDate: null,
    scheduledStartTime: null,
    scheduledEndTime: null,
    taxRate: 0,
    notes: null,
    serviceFrequency: '5x_week',
    serviceSchedule: createDefaultSchedule('5x_week'),
    proposalItems: [],
    proposalServices: [],
    pricingPlanId: null,
  });

  // Calculated totals
  const [totals, setTotals] = useState({
    itemsTotal: 0,
    servicesTotal: 0,
    recurringServicesTotal: 0,
    oneTimeServicesTotal: 0,
    oneTimeChargesTotal: 0,
    monthlyTotal: 0,
    dailyTotal: 0,
    annualTotal: 0,
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
  });

  // Service expand/collapse state
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set());
  const [facilityAreas, setFacilityAreas] = useState<Area[]>([]);
  const [facilityTasks, setFacilityTasks] = useState<FacilityTask[]>([]);
  const [activeProposalFacilityIds, setActiveProposalFacilityIds] = useState<Set<string>>(new Set());
  const [loadingFacilityReview, setLoadingFacilityReview] = useState(false);
  const [areasReviewed, setAreasReviewed] = useState(false);
  const [tasksReviewed, setTasksReviewed] = useState(false);

  const toggleServiceExpand = (index: number) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Facility pricing states
  const [pricingReadiness, setPricingReadiness] = useState<FacilityPricingReadiness | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);
  const [residentialPreview, setResidentialPreview] = useState<ResidentialQuotePreview | null>(null);
  const [loadingResidentialPreview, setLoadingResidentialPreview] = useState(false);
  const [residentialBreakdownVisible, setResidentialBreakdownVisible] = useState(false);
  const [resolvedResidentialContext, setResolvedResidentialContext] = useState<ResidentialPreviewContext | null>(null);
  const [scheduleTouchedByUser, setScheduleTouchedByUser] = useState(false);

  // Pricing plan states
  const [pricingPlans, setPricingPlans] = useState<PricingSettings[]>([]);
  const [selectedPricingPlanId, setSelectedPricingPlanId] = useState<string>('');
  const [selectedResidentialPricingPlanId, setSelectedResidentialPricingPlanId] = useState<string>('');
  const [residentialServiceType, setResidentialServiceType] = useState<ResidentialServiceType | ''>('');
  const [residentialFrequency, setResidentialFrequency] = useState<ResidentialFrequency>('weekly');
  const [residentialAddOns, setResidentialAddOns] = useState<ResidentialQuoteAddOnInput[]>([]);
  const [selectedSpecializedCatalogItemId, setSelectedSpecializedCatalogItemId] = useState('');
  const [workerCount, setWorkerCount] = useState<number>(1);
  const [selectedSubcontractorTier, setSelectedSubcontractorTier] = useState<string>('');

  const selectedPricingPlan = pricingPlans.find((plan) => plan.id === selectedPricingPlanId);
  const isHourlyPlan = selectedPricingPlan?.pricingType === 'hourly';
  const isRejectedRevision = isEditMode && originalStatus === 'rejected';
  const isSpecializedProposal = formData.proposalType === 'one_time' || formData.proposalType === 'specialized';
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === formData.accountId),
    [accounts, formData.accountId]
  );
  const isResidentialAccount = selectedAccount?.type === 'residential';
  const availableAccounts = useMemo(
    () => accounts.filter((account) => {
      if (proposalCategory === 'commercial') {
        return account.type !== 'residential';
      }
      if (proposalCategory === 'residential') {
        return account.type === 'residential';
      }
      return true;
    }),
    [accounts, proposalCategory]
  );
  const selectedFacility = useMemo(
    () => facilities.find((facility) => facility.id === formData.facilityId),
    [facilities, formData.facilityId]
  );
  const selectedResidentialProperty = useMemo(() => {
    if (!selectedAccount || selectedAccount.type !== 'residential') {
      return null;
    }

    const linkedProperty = selectedAccount.residentialProperties?.find(
      (property) => property.facility?.id === formData.facilityId
    );

    return (
      linkedProperty
      || selectedAccount.residentialProperties?.find((property) => property.isPrimary)
      || selectedAccount.residentialProperties?.[0]
      || null
    );
  }, [selectedAccount, formData.facilityId]);
  const residentialPreviewContext = useMemo((): ResidentialPreviewContext | null => {
    if (!isResidentialAccount || isSpecializedProposal) {
      return null;
    }

    if (
      resolvedResidentialContext
      && resolvedResidentialContext.accountId === formData.accountId
      && resolvedResidentialContext.facilityId === formData.facilityId
    ) {
      return resolvedResidentialContext;
    }

    const propertyId = selectedResidentialProperty?.id || selectedFacility?.residentialPropertyId || null;
    if (!propertyId) {
      return null;
    }

    return {
      accountId: formData.accountId,
      facilityId: formData.facilityId,
      propertyId,
      propertyName: selectedResidentialProperty?.name || selectedFacility?.name || selectedAccount?.name || 'Residential Service Location',
      homeAddress: (selectedResidentialProperty?.serviceAddress || selectedAccount?.serviceAddress || selectedFacility?.address || null) as ResidentialAddress | null,
      homeProfile: (selectedResidentialProperty?.homeProfile || selectedAccount?.residentialProfile || null) as ResidentialHomeProfile | null,
      defaultAddOns: selectedResidentialProperty?.defaultAddOns || [],
    };
  }, [
    formData.accountId,
    formData.facilityId,
    isResidentialAccount,
    resolvedResidentialContext,
    selectedAccount,
    selectedFacility,
    selectedResidentialProperty,
  ]);
  const selectedResidentialPricingPlan = useMemo(
    () =>
      residentialPricingPlans.find((plan) => plan.id === selectedResidentialPricingPlanId)
      || residentialPricingPlans.find((plan) => plan.isDefault)
      || residentialPricingPlans[0]
      || null,
    [residentialPricingPlans, selectedResidentialPricingPlanId]
  );
  const availableResidentialAddOns = useMemo(
    () => Object.entries(selectedResidentialPricingPlan?.settings.addOnPrices || {}),
    [selectedResidentialPricingPlan]
  );
  const residentialScheduleFrequency = useMemo(
    () => mapResidentialFrequencyToProposalSchedule(residentialFrequency),
    [residentialFrequency]
  );
  const residentialScheduleOptions = useMemo(
    () => [{ value: residentialScheduleFrequency, label: getResidentialFrequencyLabel(residentialFrequency) }],
    [residentialFrequency, residentialScheduleFrequency]
  );
  const residentialScopeGroups = useMemo(
    () => buildResidentialScopeGroups(facilityAreas, facilityTasks),
    [facilityAreas, facilityTasks]
  );
  const hasResidentialServiceType = residentialServiceType.length > 0;
  const definedResidentialServiceType = hasResidentialServiceType
    ? (residentialServiceType as ResidentialServiceType)
    : null;
  const suggestedProposalTitle = useMemo(() => {
    if (!formData.facilityId) {
      return '';
    }

    if (isResidentialAccount) {
      if (!definedResidentialServiceType) {
        return '';
      }
      return defaultResidentialProposalTitle(
        definedResidentialServiceType,
        residentialPreviewContext?.propertyName || selectedFacility?.name
      );
    }

    return defaultCommercialProposalTitle(selectedFacility?.name);
  }, [
    formData.facilityId,
    hasResidentialServiceType,
    isResidentialAccount,
    residentialServiceType,
    residentialPreviewContext?.propertyName,
    selectedFacility?.name,
  ]);

  // Calculate totals whenever items, services, or tax rate change
  useEffect(() => {
    const itemsTotal = (formData.proposalItems || []).reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0
    );

    const oneTimeServicesTotal = (formData.proposalServices || [])
      .filter((service) => service.serviceType === 'one_time')
      .reduce((sum, service) => sum + Number(service.monthlyPrice || 0), 0);

    const recurringServices = (formData.proposalServices || []).filter(
      (service) => service.serviceType !== 'one_time'
    );

    const recurringServicesTotal = recurringServices.reduce(
      (sum, service) => sum + Number(service.monthlyPrice || 0),
      0
    );

    const servicesTotal = recurringServicesTotal + oneTimeServicesTotal;

    const frequencyDailyDivisors: Record<ServiceFrequency, number> = {
      daily: 30,
      weekly: 28,
      biweekly: 28,
      monthly: 30,
      quarterly: 90,
      annually: 365,
    };

    const dailyTotal = recurringServices.reduce((sum, service) => {
      const divisor = frequencyDailyDivisors[service.frequency] || 30;
      return sum + Number(service.monthlyPrice || 0) / divisor;
    }, 0);

    const monthlyTotal = recurringServicesTotal;
    const annualTotal = recurringServicesTotal * 12;
    const oneTimeChargesTotal = itemsTotal + oneTimeServicesTotal;

    const subtotal = itemsTotal + servicesTotal;
    const taxRate = formData.taxRate || 0;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    setTotals({
      itemsTotal: Number(itemsTotal.toFixed(2)),
      servicesTotal: Number(servicesTotal.toFixed(2)),
      recurringServicesTotal: Number(recurringServicesTotal.toFixed(2)),
      oneTimeServicesTotal: Number(oneTimeServicesTotal.toFixed(2)),
      oneTimeChargesTotal: Number(oneTimeChargesTotal.toFixed(2)),
      monthlyTotal: Number(monthlyTotal.toFixed(2)),
      dailyTotal: Number(dailyTotal.toFixed(2)),
      annualTotal: Number(annualTotal.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    });
  }, [formData.proposalItems, formData.proposalServices, formData.taxRate]);

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [
        accountsRes,
        facilitiesRes,
        plansRes,
        residentialPlansRes,
        templatesRes,
        proposalsRes,
        specializedCatalogRes,
      ] = await Promise.all([
        listAccounts({ limit: 100, readyForProposal: true }),
        listFacilities({ limit: 100, includeResidentialLinked: true }),
        listPricingSettings({ limit: 100, includeArchived: false, isActive: true }),
        listResidentialPricingPlans({ limit: 100, includeArchived: false, isActive: true }),
        listTemplates(),
        listProposals({ limit: 100, includeArchived: false }),
        listOneTimeServiceCatalog({ includeInactive: false }),
      ]);
      const readyAccounts = accountsRes?.data || [];
      const readyAccountIds = new Set(readyAccounts.map((account) => account.id));
      const facilitiesForReadyAccounts = (facilitiesRes?.data || []).filter((facility) =>
        readyAccountIds.has(facility.account.id)
      );
      setAccounts(readyAccounts);
      setFacilities(facilitiesForReadyAccounts);
      setActiveProposalFacilityIds(
        new Set(
          (proposalsRes?.data || [])
            .filter((proposal) => ACTIVE_PROPOSAL_STATUSES.includes(proposal.status))
            .filter((proposal) => (proposal.proposalType || 'recurring') === 'recurring')
            .map((proposal) => proposal.facility?.id)
            .filter((value): value is string => Boolean(value))
        )
      );
      setTermsTemplates(templatesRes || []);
      setSpecializedCatalogItems(specializedCatalogRes || []);
      const residentialPlans = residentialPlansRes?.data || [];
      setResidentialPricingPlans(residentialPlans);
      const plans = plansRes?.data || [];
      setPricingPlans(plans);
      // Set default plan if available
      const defaultPlan = plans.find((plan) => plan.isDefault) || plans[0];
      if (defaultPlan) {
        setSelectedPricingPlanId(defaultPlan.id);
        setFormData((prev) => ({
          ...prev,
          pricingPlanId: defaultPlan.id,
        }));
      }
      const defaultResidentialPlan = residentialPlans.find((plan) => plan.isDefault) || residentialPlans[0];
      if (defaultResidentialPlan) {
        setSelectedResidentialPricingPlanId(defaultResidentialPlan.id);
      }
      // Set default template terms for new proposals
      if (!isEditMode) {
        const defaultTemplate = (templatesRes || []).find((t: ProposalTemplate) => t.isDefault);
        if (defaultTemplate) {
          // Default template found (terms now managed in contracts)
        }
      }
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
      toast.error('Failed to load reference data');
    }
  }, []);

  // Fetch proposal for edit mode
  const fetchProposal = useCallback(async (proposalId: string) => {
    try {
      const proposal = await getProposal(proposalId);
      setOriginalStatus(proposal.status);
      setProposalCategory(getProposalCategory(proposal.proposalType, proposal.account.type));
      const scheduleFrequency = proposal.serviceFrequency || '5x_week';
      const incomingSchedule = proposal.serviceSchedule || createDefaultSchedule(scheduleFrequency);
      const normalizedDays = normalizeScheduleDays(incomingSchedule.days || [], scheduleFrequency);
      setFormData({
        accountId: proposal.account.id,
        proposalType: proposal.proposalType || 'recurring',
        title: proposal.title,
        description: proposal.description || null,
        facilityId: proposal.facility?.id || '',
        validUntil: proposal.validUntil
          ? proposal.validUntil.split('T')[0]
          : null,
        scheduledDate: proposal.scheduledDate ? proposal.scheduledDate.split('T')[0] : null,
        scheduledStartTime: toTimeInputValue(proposal.scheduledStartTime),
        scheduledEndTime: toTimeInputValue(proposal.scheduledEndTime),
        taxRate: proposal.taxRate,
        notes: proposal.notes || null,
        serviceFrequency: scheduleFrequency,
        serviceSchedule: {
          days: normalizedDays,
          allowedWindowStart: incomingSchedule.allowedWindowStart || '18:00',
          allowedWindowEnd: incomingSchedule.allowedWindowEnd || '06:00',
          windowAnchor: 'start_day',
          timezoneSource: 'facility',
        },
        proposalItems: proposal.proposalItems || [],
        proposalServices: proposal.proposalServices || [],
        pricingPlanId: proposal.pricingPlanId || null,
      });
      setScheduleTouchedByUser(true);
      // Set pricing plan from proposal
      if (proposal.pricingPlanId) {
        setSelectedPricingPlanId(proposal.pricingPlanId);
      }
      const snapshot = proposal.pricingSnapshot as Record<string, unknown> | null;
      if (proposal.account.type === 'residential' && snapshot?.engine === 'residential_quote_preview_v1') {
        if (typeof snapshot.residentialPricingPlanId === 'string') {
          setSelectedResidentialPricingPlanId(snapshot.residentialPricingPlanId);
        }
        if (typeof snapshot.residentialServiceType === 'string') {
          setResidentialServiceType(snapshot.residentialServiceType as ResidentialServiceType);
        }
        if (typeof snapshot.residentialFrequency === 'string') {
          setResidentialFrequency(snapshot.residentialFrequency as ResidentialFrequency);
        }
        if (Array.isArray(snapshot.residentialAddOns)) {
          setResidentialAddOns(snapshot.residentialAddOns as ResidentialQuoteAddOnInput[]);
        }
        if (snapshot.preview && typeof snapshot.preview === 'object') {
          setResidentialPreview(snapshot.preview as ResidentialQuotePreview);
        }
      }
    } catch (error) {
      console.error('Failed to fetch proposal:', error);
      toast.error('Failed to load proposal');
      navigate('/proposals');
    }
  }, [navigate]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchReferenceData();
      if (isEditMode) {
        await fetchProposal(id);
      }
      setLoading(false);
    };
    loadData();
  }, [fetchReferenceData, fetchProposal, isEditMode, id]);

  // Filter facilities by selected account
  const filteredFacilities = formData.accountId
    ? facilities.filter((f) => f.account?.id === formData.accountId)
    : [];
  const residentialLinkedFacilityIds = useMemo(
    () =>
      new Set(
        (selectedAccount?.residentialProperties || [])
          .map((property) => property.facility?.id)
          .filter((value): value is string => Boolean(value))
      ),
    [selectedAccount]
  );
  const availableProposalFacilities = useMemo(() => {
    const accountScopedFacilities = isResidentialAccount && !isSpecializedProposal
      ? filteredFacilities.filter(
          (facility) =>
            (Boolean(facility.residentialPropertyId) || residentialLinkedFacilityIds.has(facility.id))
            && facility.submittedForProposal
        )
      : filteredFacilities;

    return accountScopedFacilities.filter((facility) => {
      if (facility.id === formData.facilityId) {
        return true;
      }
      return !activeProposalFacilityIds.has(facility.id);
    });
  }, [
    activeProposalFacilityIds,
    filteredFacilities,
    formData.facilityId,
    isResidentialAccount,
    isSpecializedProposal,
    residentialLinkedFacilityIds,
  ]);

  const handleProposalCategoryChange = (value: string) => {
    const nextCategory = value as ProposalCategory;
    setProposalCategory(nextCategory);
    handleChange('proposalType', nextCategory === 'specialized' ? 'specialized' : 'recurring');
    handleChange('accountId', '');
    handleChange('facilityId', '');
    lastAutoGeneratedTitleRef.current = null;

    if (nextCategory === 'specialized') {
      handleChange('pricingPlanId', null);
      setPricingBreakdown(null);
      setResidentialPreview(null);
      setResidentialBreakdownVisible(false);
    } else {
      setSelectedSpecializedCatalogItemId('');
    }
  };

  useEffect(() => {
    if (!isResidentialAccount) {
      setResidentialPreview(null);
      setResidentialAddOns([]);
      setResidentialBreakdownVisible(false);
      return;
    }

    if (!selectedResidentialPricingPlanId && residentialPricingPlans.length > 0) {
      const defaultPlan = residentialPricingPlans.find((plan) => plan.isDefault) || residentialPricingPlans[0];
      if (defaultPlan) {
        setSelectedResidentialPricingPlanId(defaultPlan.id);
      }
    }
  }, [isResidentialAccount, isSpecializedProposal, residentialPricingPlans, selectedResidentialPricingPlanId]);

  useEffect(() => {
    if (!isResidentialAccount || isSpecializedProposal) {
      return;
    }
    setResidentialAddOns(residentialPreviewContext?.defaultAddOns || []);
  }, [isResidentialAccount, isSpecializedProposal, residentialPreviewContext?.propertyId]);

  useEffect(() => {
    if (!isResidentialAccount || isSpecializedProposal) {
      return;
    }

    setFormData((prev) => {
      const currentSchedule = prev.serviceSchedule || createDefaultSchedule(residentialScheduleFrequency);
      return {
        ...prev,
        serviceFrequency: residentialScheduleFrequency,
        serviceSchedule: {
          ...currentSchedule,
          days: normalizeScheduleDays(currentSchedule.days || [], residentialScheduleFrequency),
          allowedWindowStart: currentSchedule.allowedWindowStart || '18:00',
          allowedWindowEnd: currentSchedule.allowedWindowEnd || '06:00',
          windowAnchor: 'start_day',
          timezoneSource: 'facility',
        },
      };
    });
  }, [isResidentialAccount, isSpecializedProposal, residentialScheduleFrequency]);

  useEffect(() => {
    if (!isResidentialAccount || isSpecializedProposal || !residentialPreviewContext || !hasResidentialServiceType) {
      setResidentialPreview(null);
      setResidentialBreakdownVisible(false);
      return;
    }

    if (!selectedResidentialPricingPlanId) {
      setResidentialPreview(null);
      setResidentialBreakdownVisible(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      if (!definedResidentialServiceType) return;
      try {
        setLoadingResidentialPreview(true);
        const preview = await previewResidentialQuote({
          propertyId: residentialPreviewContext.propertyId,
          serviceType: definedResidentialServiceType,
          frequency: residentialFrequency,
          homeAddress: residentialPreviewContext.homeAddress,
          homeProfile: {
            homeType: residentialPreviewContext.homeProfile?.homeType || 'single_family',
            squareFeet: residentialPreviewContext.homeProfile?.squareFeet || 0,
            bedrooms: residentialPreviewContext.homeProfile?.bedrooms || 0,
            fullBathrooms: residentialPreviewContext.homeProfile?.fullBathrooms || 0,
            halfBathrooms: residentialPreviewContext.homeProfile?.halfBathrooms || 0,
            levels: residentialPreviewContext.homeProfile?.levels || 1,
            occupiedStatus: residentialPreviewContext.homeProfile?.occupiedStatus || 'occupied',
            condition: residentialPreviewContext.homeProfile?.condition || 'standard',
            hasPets: residentialPreviewContext.homeProfile?.hasPets || false,
            lastProfessionalCleaning: residentialPreviewContext.homeProfile?.lastProfessionalCleaning || '',
            parkingAccess: residentialPreviewContext.homeProfile?.parkingAccess || '',
            entryNotes: residentialPreviewContext.homeProfile?.entryNotes || '',
            specialInstructions: residentialPreviewContext.homeProfile?.specialInstructions || '',
            isFirstVisit: residentialPreviewContext.homeProfile?.isFirstVisit || false,
          },
          pricingPlanId: selectedResidentialPricingPlanId,
          addOns: residentialAddOns,
        });
        setResidentialPreview(preview);
      } catch (error) {
        console.error('Failed to preview residential proposal pricing:', error);
        setResidentialPreview(null);
        setResidentialBreakdownVisible(false);
      } finally {
        setLoadingResidentialPreview(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    hasResidentialServiceType,
    isResidentialAccount,
    isSpecializedProposal,
    residentialAddOns,
    residentialFrequency,
    residentialServiceType,
    residentialPreviewContext,
    selectedResidentialPricingPlanId,
  ]);

  useEffect(() => {
    if (isSpecializedProposal || !isResidentialAccount || !residentialPreviewContext || !residentialPreview || !definedResidentialServiceType) {
      return;
    }

    const derivedServices = buildResidentialProposalServices({
      preview: residentialPreview,
      propertyName: residentialPreviewContext.propertyName,
      serviceType: definedResidentialServiceType,
      frequency: residentialFrequency,
      scopeGroups: residentialScopeGroups,
    });
    const derivedItems = buildResidentialProposalItems(residentialPreview);

    setFormData((prev) => {
      const hasChanges =
        JSON.stringify(prev.proposalServices || []) !== JSON.stringify(derivedServices)
        || JSON.stringify(prev.proposalItems || []) !== JSON.stringify(derivedItems)
        || prev.pricingPlanId !== null;

      if (!hasChanges) {
        return prev;
      }

      return {
        ...prev,
        proposalServices: derivedServices,
        proposalItems: derivedItems,
        pricingPlanId: null,
      };
    });
  }, [
    facilityTasks,
    hasResidentialServiceType,
    isResidentialAccount,
    isSpecializedProposal,
    residentialScopeGroups,
    residentialFrequency,
    residentialPreview,
    residentialPreviewContext,
    residentialServiceType,
  ]);

  useEffect(() => {
    if (isEditMode || !suggestedProposalTitle) {
      return;
    }

    setFormData((prev) => {
      const currentTitle = prev.title.trim();
      const lastAutoGeneratedTitle = lastAutoGeneratedTitleRef.current;
      const shouldReplaceTitle =
        currentTitle.length === 0
        || (lastAutoGeneratedTitle !== null && currentTitle === lastAutoGeneratedTitle);

      if (!shouldReplaceTitle) {
        return prev;
      }

      lastAutoGeneratedTitleRef.current = suggestedProposalTitle;
      return {
        ...prev,
        title: suggestedProposalTitle,
      };
    });
  }, [isEditMode, suggestedProposalTitle]);

  useEffect(() => {
    const facilityId = formData.facilityId;

    setAreasReviewed(false);
    setTasksReviewed(false);

    if (!facilityId || isSpecializedProposal) {
      setFacilityAreas([]);
      setFacilityTasks([]);
      setLoadingFacilityReview(false);
      return;
    }

    const loadFacilityReviewData = async () => {
      try {
        setLoadingFacilityReview(true);
        const [areasResponse, tasksResponse] = await Promise.all([
          listAreas({ facilityId, limit: 100, includeArchived: false }),
          listFacilityTasks({ facilityId, limit: 100, includeArchived: false }),
        ]);
        const areasData = areasResponse?.data || [];
        const tasksData = tasksResponse?.data || [];
        setFacilityAreas(areasData);
        setFacilityTasks(tasksData);
        syncClientScheduleFromFacility(tasksData);
      } catch (error) {
        console.error('Failed to load facility review data:', error);
        setFacilityAreas([]);
        setFacilityTasks([]);
      } finally {
        setLoadingFacilityReview(false);
      }
    };

    loadFacilityReviewData();
  }, [formData.facilityId, isEditMode, isSpecializedProposal, scheduleTouchedByUser, selectedFacility]);

  const facilityReview = useMemo(() => {
    const activeAreas = facilityAreas.filter((area) => !area.archivedAt);
    const activeTasks = facilityTasks.filter((task) => !task.archivedAt);

    const tasksByArea = new Map<string, number>();
    activeTasks.forEach((task) => {
      const areaId = task.area?.id;
      if (!areaId) return;
      tasksByArea.set(areaId, (tasksByArea.get(areaId) || 0) + 1);
    });

    const areasWithoutTasks = activeAreas.filter((area) => (tasksByArea.get(area.id) || 0) === 0);
    const areasMissingSquareFeet = activeAreas.filter((area) => Number(area.squareFeet || 0) <= 0);
    const unassignedTasks = activeTasks.filter((task) => !task.area);

    return {
      activeAreas,
      activeTasks,
      areasWithoutTasks,
      areasMissingSquareFeet,
      unassignedTasks,
      hasBlockingIssues:
        activeAreas.length === 0 ||
        activeTasks.length === 0 ||
        areasWithoutTasks.length > 0 ||
        areasMissingSquareFeet.length > 0,
    };
  }, [facilityAreas, facilityTasks]);

  const requiresFacilityReview = Boolean(formData.facilityId) && !isSpecializedProposal;
  const isFacilityReviewComplete =
    !requiresFacilityReview ||
    (!loadingFacilityReview &&
      !facilityReview.hasBlockingIssues &&
      areasReviewed &&
      tasksReviewed);
  const hasRequiredTaxRate = Number(formData.taxRate || 0) > 0;
  const canSubmitProposal = !saving && isFacilityReviewComplete && hasRequiredTaxRate;

  // Check pricing readiness when facility changes
  useEffect(() => {
    const checkPricingReadiness = async () => {
      if (formData.facilityId) {
        try {
          const readiness = await getFacilityPricingReadiness(formData.facilityId);
          setPricingReadiness(readiness);
        } catch (error) {
          console.error('Failed to check pricing readiness:', error);
          setPricingReadiness(null);
        }
      } else {
        setPricingReadiness(null);
      }
    };
    checkPricingReadiness();
  }, [formData.facilityId]);

  // Clear breakdown when inputs change (ensures breakdown reflects latest calculation)
  useEffect(() => {
    setPricingBreakdown(null);
  }, [formData.facilityId, formData.serviceFrequency, selectedPricingPlanId, workerCount, selectedSubcontractorTier]);

  const syncClientScheduleFromFacility = useCallback(
    (_tasks: FacilityTask[]) => {
      if (isEditMode || scheduleTouchedByUser || !formData.facilityId) return;

      const addressDefaults = extractFacilityAddressSchedule(selectedFacility);
      setFormData((prev) => {
        const currentFrequency = (prev.serviceFrequency || '5x_week') as ProposalScheduleFrequency;
        const nextFrequency =
          addressDefaults?.frequency ||
          currentFrequency;

        const currentSchedule = prev.serviceSchedule || createDefaultSchedule(nextFrequency);
        const seedDays = addressDefaults?.days || currentSchedule.days || [];

        return {
          ...prev,
          serviceFrequency: nextFrequency,
          serviceSchedule: {
            days: normalizeScheduleDays(seedDays, nextFrequency),
            allowedWindowStart:
              addressDefaults?.allowedWindowStart ||
              currentSchedule.allowedWindowStart ||
              '18:00',
            allowedWindowEnd:
              addressDefaults?.allowedWindowEnd ||
              currentSchedule.allowedWindowEnd ||
              '06:00',
            windowAnchor: 'start_day',
            timezoneSource: 'facility',
          },
        };
      });
    },
    [formData.facilityId, isEditMode, scheduleTouchedByUser, selectedFacility]
  );

  const toggleResidentialAddOn = (code: string) => {
    setResidentialAddOns((current) => {
      const existing = current.find((addOn) => addOn.code === code);
      if (existing) {
        return current.filter((addOn) => addOn.code !== code);
      }
      return [...current, { code, quantity: 1 }];
    });
  };

  const updateResidentialAddOnQuantity = (code: string, quantity: number) => {
    setResidentialAddOns((current) =>
      current.map((addOn) =>
        addOn.code === code ? { ...addOn, quantity: Math.max(1, quantity) } : addOn
      )
    );
  };

  const resolveResidentialPreviewContext = useCallback(async (): Promise<ResidentialPreviewContext | null> => {
    if (!isResidentialAccount || !formData.accountId || !formData.facilityId) {
      return null;
    }

    if (residentialPreviewContext) {
      return residentialPreviewContext;
    }

    try {
      const liveFacility = await getFacility(formData.facilityId);
      const propertyId = liveFacility.residentialPropertyId
        || selectedAccount?.residentialProperties?.find((property) => property.facility?.id === formData.facilityId)?.id
        || (selectedAccount?.residentialProperties?.length === 1 ? selectedAccount.residentialProperties[0].id : null);

      if (!propertyId) {
        return null;
      }

      const liveProperty = await getResidentialProperty(propertyId);
      const resolvedContext: ResidentialPreviewContext = {
        accountId: formData.accountId,
        facilityId: formData.facilityId,
        propertyId: liveProperty.id,
        propertyName: liveProperty.name || liveFacility.name || selectedAccount?.name || 'Residential Service Location',
        homeAddress: liveProperty.serviceAddress || selectedAccount?.serviceAddress || liveFacility.address || null,
        homeProfile: liveProperty.homeProfile || selectedAccount?.residentialProfile || null,
        defaultAddOns: liveProperty.defaultAddOns || [],
      };

      setResolvedResidentialContext(resolvedContext);
      return resolvedContext;
    } catch (error) {
      console.error('Failed to resolve residential service location context:', error);
      return null;
    }
  }, [
    formData.accountId,
    formData.facilityId,
    isResidentialAccount,
    residentialPreviewContext,
    selectedAccount,
  ]);

  // Auto-populate services from service location pricing
  const handleAutoPopulateFromFacility = async () => {
    if (!formData.facilityId) {
      toast.error('Please select a service location first');
      return;
    }
    if (isResidentialAccount) {
      const context = await resolveResidentialPreviewContext();
      if (!context) {
        toast.error('Selected service location is not linked to a residential property');
        return;
      }
      if (!selectedResidentialPricingPlanId) {
        toast.error('Please select a residential pricing plan first');
        return;
      }
      if (!definedResidentialServiceType) {
        toast.error('Please select a residential service type first');
        return;
      }

      try {
        setLoadingResidentialPreview(true);
        const preview = await previewResidentialQuote({
          propertyId: context.propertyId,
          serviceType: definedResidentialServiceType,
          frequency: residentialFrequency,
          homeAddress: context.homeAddress,
          homeProfile: {
            homeType: context.homeProfile?.homeType || 'single_family',
            squareFeet: context.homeProfile?.squareFeet || 0,
            bedrooms: context.homeProfile?.bedrooms || 0,
            fullBathrooms: context.homeProfile?.fullBathrooms || 0,
            halfBathrooms: context.homeProfile?.halfBathrooms || 0,
            levels: context.homeProfile?.levels || 1,
            occupiedStatus: context.homeProfile?.occupiedStatus || 'occupied',
            condition: context.homeProfile?.condition || 'standard',
            hasPets: context.homeProfile?.hasPets || false,
            lastProfessionalCleaning: context.homeProfile?.lastProfessionalCleaning || '',
            parkingAccess: context.homeProfile?.parkingAccess || '',
            entryNotes: context.homeProfile?.entryNotes || '',
            specialInstructions: context.homeProfile?.specialInstructions || '',
            isFirstVisit: context.homeProfile?.isFirstVisit || false,
          },
          pricingPlanId: selectedResidentialPricingPlanId,
          addOns: residentialAddOns,
        });

        setResidentialPreview(preview);
        setFormData((prev) =>
          applyResidentialAutoPopulate({
            current: prev,
            preview,
            propertyName: context.propertyName,
            serviceType: definedResidentialServiceType,
            frequency: residentialFrequency,
            scopeGroups: residentialScopeGroups,
          })
        );
        setResidentialBreakdownVisible(true);
        toast.success('Auto-populated proposal from residential pricing');
      } catch (error) {
        console.error('Failed to auto-populate from residential pricing:', error);
        setResidentialPreview(null);
        setResidentialBreakdownVisible(false);
        toast.error(extractApiErrorMessage(error, 'Failed to calculate pricing from residential scope'));
      } finally {
        setLoadingResidentialPreview(false);
      }
      return;
    }
    if (!selectedPricingPlanId) {
      toast.error('Please select a pricing plan first');
      return;
    }

    try {
      setLoadingPricing(true);
      const template = await getFacilityProposalTemplate(
        formData.facilityId,
        mapScheduleFrequencyToPricingFrequency(
          (formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency
        ),
        selectedPricingPlanId || undefined,
        isHourlyPlan ? workerCount : undefined,
        selectedSubcontractorTier || undefined
      );

      // Convert suggested services to proposal services
      const newServices: ProposalService[] = template.suggestedServices.map((svc, index) => ({
        serviceName: svc.serviceName,
        serviceType: svc.serviceType as ServiceType,
        frequency: svc.frequency as ServiceFrequency,
        estimatedHours: null,
        hourlyRate: null,
        monthlyPrice: svc.monthlyPrice,
        description: svc.description,
        includedTasks: svc.includedTasks || [],
        sortOrder: index,
      }));

      // Convert suggested items to proposal items
      const newItems: ProposalItem[] = template.suggestedItems.map((raw, index) => {
        const item = raw as SuggestedProposalItem;
        return {
          itemType: (item.itemType as ProposalItemType) || 'other',
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          sortOrder: index,
        };
      });

      // Update form with auto-populated data
      const scheduleFrequency = (formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency;
      setFormData((prev) => {
        const currentSchedule = prev.serviceSchedule || createDefaultSchedule(scheduleFrequency);
        return {
          ...prev,
          proposalServices: newServices,
          proposalItems: newItems.length > 0 ? newItems : prev.proposalItems,
          serviceFrequency: scheduleFrequency,
          serviceSchedule: {
            days: normalizeScheduleDays(currentSchedule.days || [], scheduleFrequency),
            allowedWindowStart: currentSchedule.allowedWindowStart || '18:00',
            allowedWindowEnd: currentSchedule.allowedWindowEnd || '06:00',
            windowAnchor: 'start_day',
            timezoneSource: 'facility',
          },
          // Auto-set title if empty
          title: prev.title || `Cleaning Services - ${template.facility.name}`,
        };
      });
      setScheduleTouchedByUser(true);

      // Store the full pricing breakdown for internal view
      setPricingBreakdown(template.pricing);
      toast.success(`Auto-populated ${newServices.length} service(s) from adjusted service location scope`);
    } catch (error) {
      console.error('Failed to auto-populate from service location:', error);
      setPricingBreakdown(null);
      toast.error(extractApiErrorMessage(error, 'Failed to calculate pricing from service location'));
    } finally {
      setLoadingPricing(false);
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof CreateProposalInput, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'title') {
        const nextTitle = typeof value === 'string' ? value : '';
        if (nextTitle.trim() !== lastAutoGeneratedTitleRef.current) {
          lastAutoGeneratedTitleRef.current = null;
        }
      }
      // Clear facility when account changes
      if (field === 'accountId') {
        updated.facilityId = '';
        setPricingBreakdown(null);
        setResolvedResidentialContext(null);
        setScheduleTouchedByUser(false);
      }
      // Clear breakdown when facility changes
      if (field === 'facilityId') {
        setPricingBreakdown(null);
        setResolvedResidentialContext(null);
        setScheduleTouchedByUser(false);
      }
      return updated;
    });
  };

  const updateServiceSchedule = (patch: Partial<ProposalServiceSchedule>) => {
    setScheduleTouchedByUser(true);
    setFormData((prev) => {
      const frequency = (prev.serviceFrequency || '5x_week') as ProposalScheduleFrequency;
      const currentSchedule = prev.serviceSchedule || createDefaultSchedule(frequency);
      const merged: ProposalServiceSchedule = {
        ...currentSchedule,
        ...patch,
      };
      return { ...prev, serviceSchedule: merged };
    });
  };

  const handleScheduleFrequencyChange = (value: string) => {
    setScheduleTouchedByUser(true);
    const frequency = value as ProposalScheduleFrequency;
    setFormData((prev) => {
      const currentSchedule = prev.serviceSchedule || createDefaultSchedule(frequency);
      return {
        ...prev,
        serviceFrequency: frequency,
        serviceSchedule: {
          ...currentSchedule,
          days: normalizeScheduleDays(currentSchedule.days || [], frequency),
          allowedWindowStart: currentSchedule.allowedWindowStart || '18:00',
          allowedWindowEnd: currentSchedule.allowedWindowEnd || '06:00',
          windowAnchor: 'start_day',
          timezoneSource: 'facility',
        },
      };
    });
  };

  const toggleScheduleDay = (day: ServiceScheduleDay) => {
    setScheduleTouchedByUser(true);
    const frequency = (formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency;
    const expectedDays = expectedDaysForFrequency(frequency);
    const currentDays = formData.serviceSchedule?.days || defaultDaysForFrequency(frequency);
    const hasDay = currentDays.includes(day);

    let nextDays = hasDay
      ? currentDays.filter((value) => value !== day)
      : [...currentDays, day];

    nextDays = normalizeScheduleDays(nextDays, frequency);

    if (!hasDay && currentDays.length >= expectedDays) {
      const withoutOldest = currentDays.slice(1);
      nextDays = normalizeScheduleDays([...withoutOldest, day], frequency);
    }

    updateServiceSchedule({ days: nextDays });
  };

  // --- Proposal Items Management ---
  const addItem = () => {
    const newItem = createEmptyItem((formData.proposalItems || []).length);
    setFormData((prev) => ({
      ...prev,
      proposalItems: [...(prev.proposalItems || []), newItem],
    }));
  };

  const handleSpecializedCatalogItemChange = (catalogItemId: string) => {
    setSelectedSpecializedCatalogItemId(catalogItemId);
    const catalogItem = specializedCatalogItems.find((item) => item.id === catalogItemId);
    if (!catalogItem) {
      return;
    }

    setFormData((prev) => {
      const currentTitle = prev.title.trim();
      const shouldReplaceTitle =
        currentTitle.length === 0 ||
        (lastAutoGeneratedTitleRef.current !== null && currentTitle === lastAutoGeneratedTitleRef.current);
      if (shouldReplaceTitle) {
        lastAutoGeneratedTitleRef.current = catalogItem.name;
      }

      return {
        ...prev,
        title: shouldReplaceTitle ? catalogItem.name : prev.title,
        description: prev.description || catalogItem.description || null,
        proposalItems: [createSpecializedCatalogItem(catalogItem, 0)],
      };
    });
  };

  const updateItem = (index: number, field: keyof ProposalItem, value: unknown) => {
    setFormData((prev) => {
      const items = [...(prev.proposalItems || [])];
      const item = { ...items[index], [field]: value };

      // Auto-calculate total price when quantity or unit price changes
      if (field === 'quantity' || field === 'unitPrice') {
        item.totalPrice = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      }

      items[index] = item;
      return { ...prev, proposalItems: items };
    });
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      proposalItems: (prev.proposalItems || []).filter((_, i) => i !== index),
    }));
  };

  // --- Proposal Services Management ---
  const addService = () => {
    const newIndex = (formData.proposalServices || []).length;
    const newService: ProposalService = {
      ...createEmptyService(newIndex),
      ...(isSpecializedProposal
        ? { serviceType: 'one_time' as ServiceType, frequency: 'monthly' as ServiceFrequency }
        : {}),
    };
    setFormData((prev) => ({
      ...prev,
      proposalServices: [...(prev.proposalServices || []), newService],
    }));
    // Auto-expand the newly added service
    setExpandedServices((prev) => new Set(prev).add(newIndex));
  };

  const updateService = (index: number, field: keyof ProposalService, value: unknown) => {
    setFormData((prev) => {
      const services = [...(prev.proposalServices || [])];
      services[index] = { ...services[index], [field]: value };
      return { ...prev, proposalServices: services };
    });
  };

  const removeService = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      proposalServices: (prev.proposalServices || []).filter((_, i) => i !== index),
    }));
    // Adjust expanded indices after removal
    setExpandedServices((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.accountId) {
      toast.error('Please select an account');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Please enter a proposal title');
      return;
    }
    if (!isSpecializedProposal && (isResidentialAccount ? !selectedResidentialPricingPlanId : !formData.pricingPlanId)) {
      toast.error(`Please select a ${isResidentialAccount ? 'residential pricing plan' : 'pricing plan'}`);
      return;
    }
    if (!isSpecializedProposal && isResidentialAccount && !hasResidentialServiceType) {
      toast.error('Please select a residential service type');
      return;
    }
    if (Number(formData.taxRate || 0) <= 0) {
      toast.error('Please set a tax rate greater than 0%');
      return;
    }
    const scheduleFrequency = (formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency;
    const serviceSchedule = formData.serviceSchedule || createDefaultSchedule(scheduleFrequency);
    const expectedDays = expectedDaysForFrequency(scheduleFrequency);

    if (isSpecializedProposal && (!formData.scheduledDate || !formData.scheduledStartTime || !formData.scheduledEndTime)) {
      toast.error('Scheduled date, start time, and end time are required for specialized proposal types');
      return;
    }

    if (isSpecializedProposal && !isEditMode && !selectedSpecializedCatalogItemId) {
      toast.error('Please select the specialized job requested by the client');
      return;
    }

    if (isSpecializedProposal && formData.scheduledStartTime && formData.scheduledEndTime && formData.scheduledEndTime <= formData.scheduledStartTime) {
      toast.error('Scheduled end time must be after scheduled start time');
      return;
    }

    if (!isSpecializedProposal && (!serviceSchedule.allowedWindowStart || !serviceSchedule.allowedWindowEnd)) {
      toast.error('Set the allowed service start and end time');
      return;
    }

    if (!isSpecializedProposal && serviceSchedule.allowedWindowStart === serviceSchedule.allowedWindowEnd) {
      toast.error('Allowed window start and end times cannot be the same');
      return;
    }

    if (!isSpecializedProposal && (serviceSchedule.days || []).length !== expectedDays) {
      toast.error(`${scheduleFrequency} requires exactly ${expectedDays} service day(s)`);
      return;
    }

    if (!formData.facilityId) {
      toast.error('Select a service location before creating the proposal');
      return;
    }
    if (!isSpecializedProposal && isResidentialAccount && (!residentialPreviewContext || !selectedResidentialPricingPlanId || !hasResidentialServiceType || !residentialPreview)) {
      toast.error('Wait for the residential pricing preview before creating the proposal');
      return;
    }

    if (isSpecializedProposal && (formData.proposalItems || []).length === 0 && (formData.proposalServices || []).length === 0) {
      toast.error('Add at least one service or line item');
      return;
    }

    if (requiresFacilityReview && loadingFacilityReview) {
      toast.error('Please wait for service location review checks to finish');
      return;
    }
    if (requiresFacilityReview && !isFacilityReviewComplete) {
      if (facilityReview.hasBlockingIssues) {
        toast.error('Resolve service location review issues before creating the proposal');
        return;
      }
      toast.error('Please confirm area and task accuracy before creating the proposal');
      return;
    }

    setSaving(true);
    try {
      const derivedResidentialItems = !isSpecializedProposal && isResidentialAccount && residentialPreview
        ? buildResidentialProposalItems(residentialPreview)
        : [];
      const derivedResidentialServices = !isSpecializedProposal && isResidentialAccount && residentialPreview && residentialPreviewContext && definedResidentialServiceType
        ? buildResidentialProposalServices({
            preview: residentialPreview,
            propertyName: residentialPreviewContext.propertyName,
            serviceType: definedResidentialServiceType,
            frequency: residentialFrequency,
            scopeGroups: isResidentialAccount ? residentialScopeGroups : [],
          })
        : [];
      const effectiveProposalItems = !isSpecializedProposal && isResidentialAccount
        ? derivedResidentialItems
        : (formData.proposalItems || []);
      const effectiveProposalServices = !isSpecializedProposal && isResidentialAccount
        ? derivedResidentialServices
        : (formData.proposalServices || []);
      const nonZeroItems = removeZeroValueProposalItems(effectiveProposalItems);
      const residentialPricingSnapshot = !isSpecializedProposal && isResidentialAccount
        ? {
            engine: 'residential_quote_preview_v1',
            residentialPricingPlanId: selectedResidentialPricingPlan?.id ?? selectedResidentialPricingPlanId ?? null,
            residentialPricingPlanName: selectedResidentialPricingPlan?.name ?? null,
            residentialServiceType,
            residentialFrequency,
            residentialAddOns,
            propertyId: residentialPreviewContext?.propertyId ?? null,
            preview: residentialPreview,
          }
        : undefined;
      const effectivePricingSnapshot = (!isSpecializedProposal && isResidentialAccount
        ? residentialPricingSnapshot
        : (isSpecializedProposal ? undefined : pricingBreakdown?.settingsSnapshot ?? undefined)) as PricingSettingsSnapshot | null | undefined;
      const effectivePricingPlanId = isSpecializedProposal || isResidentialAccount
        ? null
        : (formData.pricingPlanId ?? null);
      const scheduledStartDateTime = toUtcDateTime(formData.scheduledDate, formData.scheduledStartTime);
      const scheduledEndDateTime = toUtcDateTime(formData.scheduledDate, formData.scheduledEndTime);
      if (isEditMode) {
        const updateData: UpdateProposalInput = {
          ...formData,
          pricingPlanId: effectivePricingPlanId,
          notes: formData.notes,
          proposalItems: nonZeroItems,
          proposalServices: effectiveProposalServices,
          serviceFrequency: scheduleFrequency,
          serviceSchedule,
          scheduledStartTime: scheduledStartDateTime,
          scheduledEndTime: scheduledEndDateTime,
          validUntil: formData.validUntil || null,
          pricingSnapshot: effectivePricingSnapshot,
        };
        await updateProposal(id, updateData);
        toast.success(isRejectedRevision ? 'Proposal revised successfully' : 'Proposal updated successfully');
      } else {
        await createProposal({
          ...formData,
          pricingPlanId: effectivePricingPlanId,
          notes: formData.notes,
          proposalItems: nonZeroItems,
          proposalServices: effectiveProposalServices,
          serviceFrequency: scheduleFrequency,
          serviceSchedule,
          scheduledStartTime: scheduledStartDateTime,
          scheduledEndTime: scheduledEndDateTime,
          pricingSnapshot: effectivePricingSnapshot,
        });
        toast.success('Proposal created successfully');
      }
      navigate('/proposals');
    } catch (error) {
      console.error('Failed to save proposal:', error);
      toast.error(extractApiErrorMessage(error, `Failed to ${isEditMode ? 'update' : 'create'} proposal`));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500 dark:text-surface-400">Loading...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-white sm:text-3xl">
              {isEditMode ? (isRejectedRevision ? 'Revise Proposal' : 'Edit Proposal') : 'New Proposal'}
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              {isEditMode
                ? (isRejectedRevision
                  ? 'Revise the rejected proposal and reopen it as a draft'
                  : 'Update the proposal details below')
                : 'Fill in the details to create a new proposal'}
            </p>
          </div>
        </div>
        <Button type="submit" isLoading={saving} disabled={!canSubmitProposal}>
          <Save className="w-5 h-5 mr-2" />
          {isEditMode ? (isRejectedRevision ? 'Revise Proposal' : 'Update Proposal') : 'Create Proposal'}
        </Button>
      </div>

      {isRejectedRevision && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
            <div>
              <p className="font-medium text-amber-100">Revision mode</p>
              <p className="mt-1 text-sm text-amber-100/80">
                Saving this rejected proposal creates a new historical version and reopens the proposal as a draft.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Proposal Title *"
                  placeholder="Enter proposal title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                />
              </div>
              <Select
                label="Proposal Type *"
                value={proposalCategory}
                onChange={handleProposalCategoryChange}
                disabled={Boolean(isEditMode)}
                options={[
                  { value: 'commercial', label: 'Commercial' },
                  { value: 'residential', label: 'Residential' },
                  { value: 'specialized', label: 'Specialized' },
                ]}
              />
              <Select
                label="Account *"
                placeholder="Select an account"
                value={formData.accountId}
                onChange={(value) => handleChange('accountId', value)}
                options={availableAccounts.map((a) => ({ value: a.id, label: a.name }))}
                disabled={Boolean(isEditMode)}
              />
              <Select
                label="Service Location *"
                placeholder="Select a service location"
                value={formData.facilityId || ''}
                onChange={(value) => handleChange('facilityId', value)}
                options={availableProposalFacilities.map((f) => ({
                  value: f.id,
                  label: f.name,
                }))}
                disabled={Boolean(isEditMode)}
              />
              {isEditMode ? (
                <p className="md:col-span-2 -mt-2 text-xs text-surface-500 dark:text-surface-400">
                  Proposal type, account, and service location are locked when editing so this proposal stays attached to the original record.
                </p>
              ) : null}
              {formData.accountId && availableProposalFacilities.length === 0 ? (
                <p className="md:col-span-2 -mt-2 text-sm text-amber-600 dark:text-amber-400">
                  {isResidentialAccount
                    ? (filteredFacilities.length > 0
                        ? 'No residential-linked service locations are available without an active proposal and proposal submission.'
                        : 'No residential-linked service locations are available for this account yet.')
                    : (filteredFacilities.length > 0
                        ? 'No service locations are available without an active proposal.'
                        : 'No service locations are available for this account yet.')}
                </p>
              ) : null}
              {isSpecializedProposal ? (
                <>
                  <div className="md:col-span-2">
                    <Select
                      label="Specialized Job Requested *"
                      placeholder="Select a specialized job"
                      value={selectedSpecializedCatalogItemId}
                      onChange={handleSpecializedCatalogItemChange}
                      options={specializedCatalogItems.map((item) => ({
                        value: item.id,
                        label: `${item.name} (${formatCurrency(Number(item.baseRate || 0))})`,
                      }))}
                      disabled={Boolean(isEditMode)}
                    />
                    {specializedCatalogItems.length === 0 ? (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        No active specialized jobs are available. Add them in Specialized Job Management first.
                      </p>
                    ) : null}
                  </div>
                  <Input
                    label="Scheduled Date *"
                    type="date"
                    value={formData.scheduledDate || ''}
                    onChange={(e) => handleChange('scheduledDate', e.target.value || null)}
                  />
                  <Input
                    label="Start Time *"
                    type="time"
                    value={formData.scheduledStartTime || ''}
                    onChange={(e) => handleChange('scheduledStartTime', e.target.value || null)}
                  />
                  <Input
                    label="End Time *"
                    type="time"
                    value={formData.scheduledEndTime || ''}
                    onChange={(e) => handleChange('scheduledEndTime', e.target.value || null)}
                  />
                </>
              ) : isResidentialAccount ? (
                <>
                  <div className="flex flex-col gap-1">
                    <Select
                      label="Residential Pricing Plan"
                      placeholder="Select residential pricing plan"
                      value={selectedResidentialPricingPlanId}
                      onChange={(value) => setSelectedResidentialPricingPlanId(value)}
                      options={residentialPricingPlans.map((plan) => ({
                        value: plan.id,
                        label: `${plan.name}${plan.isDefault ? ' (Default)' : ''}`,
                      }))}
                    />
                    {selectedResidentialPricingPlan ? (
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                        Engine: {selectedResidentialPricingPlan.strategyKey}
                      </p>
                    ) : null}
                  </div>
                  <Select
                    label="Residential Service Type"
                    placeholder="Select service type"
                    value={residentialServiceType}
                    onChange={(value) => setResidentialServiceType(value as ResidentialServiceType)}
                    options={RESIDENTIAL_SERVICE_OPTIONS}
                  />
                  <Select
                    label="Residential Frequency"
                    placeholder="Select frequency"
                    value={residentialFrequency}
                    onChange={(value) => setResidentialFrequency(value as ResidentialFrequency)}
                    options={RESIDENTIAL_FREQUENCY_OPTIONS}
                  />
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <Select
                      label="Pricing Plan"
                      placeholder="Select pricing plan"
                      value={selectedPricingPlanId}
                      onChange={(value) => {
                        setSelectedPricingPlanId(value);
                        handleChange('pricingPlanId', value || null);
                      }}
                      options={pricingPlans.map((plan) => ({
                        value: plan.id,
                        label: `${plan.name}${plan.isDefault ? ' (Default)' : ''}`,
                      }))}
                    />
                    {selectedPricingPlan && (
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                        Type: {selectedPricingPlan.pricingType === 'hourly' ? 'Hourly' : 'Per Sq Ft'}
                      </p>
                    )}
                  </div>
                  {isHourlyPlan && (
                    <Input
                      label="Worker Count"
                      type="number"
                      min="1"
                      step="1"
                      value={workerCount}
                      onChange={(e) => setWorkerCount(Math.max(1, Number(e.target.value) || 1))}
                    />
                  )}
                </>
              )}
              <Input
                label="Valid Until"
                type="date"
                value={formData.validUntil || ''}
                onChange={(e) => handleChange('validUntil', e.target.value || null)}
              />

              {(!isResidentialAccount || isSpecializedProposal) && (
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={Number(formData.taxRate || 0) * 100}
                  onChange={(e) => handleChange('taxRate', (Number(e.target.value) || 0) / 100)}
                />
              )}

              {!isResidentialAccount && !isSpecializedProposal && (
                <div className="md:col-span-2">
                  <ClientServiceScheduleCard
                    frequencyValue={formData.serviceFrequency || '5x_week'}
                    frequencyOptions={SCHEDULE_FREQUENCIES}
                    allowedWindowStart={formData.serviceSchedule?.allowedWindowStart || '18:00'}
                    allowedWindowEnd={formData.serviceSchedule?.allowedWindowEnd || '06:00'}
                    dayOptions={SCHEDULE_DAY_OPTIONS}
                    selectedDays={
                      formData.serviceSchedule?.days ||
                      defaultDaysForFrequency(
                        (formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency
                      )
                    }
                    requiredDays={expectedDaysForFrequency(
                      (formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency
                    )}
                    onFrequencyChange={handleScheduleFrequencyChange}
                    onAllowedWindowStartChange={(value) =>
                      updateServiceSchedule({ allowedWindowStart: value || '00:00' })
                    }
                    onAllowedWindowEndChange={(value) =>
                      updateServiceSchedule({ allowedWindowEnd: value || '23:59' })
                    }
                    onToggleDay={(day) => toggleScheduleDay(day as ServiceScheduleDay)}
                  />
                </div>
              )}

              {isResidentialAccount && !isSpecializedProposal && formData.facilityId && (
                <div className="md:col-span-2">
                  <ClientServiceScheduleCard
                    frequencyValue={residentialScheduleFrequency}
                    frequencyOptions={residentialScheduleOptions}
                    allowedWindowStart={formData.serviceSchedule?.allowedWindowStart || '18:00'}
                    allowedWindowEnd={formData.serviceSchedule?.allowedWindowEnd || '06:00'}
                    dayOptions={SCHEDULE_DAY_OPTIONS}
                    selectedDays={
                      formData.serviceSchedule?.days ||
                      defaultDaysForFrequency(residentialScheduleFrequency)
                    }
                    requiredDays={expectedDaysForFrequency(residentialScheduleFrequency)}
                    onFrequencyChange={() => {}}
                    onAllowedWindowStartChange={(value) =>
                      updateServiceSchedule({ allowedWindowStart: value || '00:00' })
                    }
                    onAllowedWindowEndChange={(value) =>
                      updateServiceSchedule({ allowedWindowEnd: value || '23:59' })
                    }
                    onToggleDay={(day) => toggleScheduleDay(day as ServiceScheduleDay)}
                  />
                </div>
              )}

              {isResidentialAccount && !isSpecializedProposal && formData.facilityId && (
                <div className="md:col-span-2 mt-2">
                  <div className="bg-surface-100 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-gold" />
                        <span className="font-medium text-surface-900 dark:text-white">Auto-Populate from Residential Pricing</span>
                      </div>
                    </div>

                    {!hasResidentialServiceType ? (
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        Select a residential service type to populate the proposal.
                      </p>
                    ) : !selectedResidentialPricingPlanId ? (
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        Select a residential pricing plan to calculate and populate the proposal.
                      </p>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAutoPopulateFromFacility}
                          isLoading={loadingResidentialPreview}
                          disabled={!hasResidentialServiceType || !selectedResidentialPricingPlanId}
                          className="whitespace-nowrap"
                        >
                          <Calculator className="w-4 h-4 mr-2" />
                          Calculate & Populate
                        </Button>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          Uses the residential pricing engine and residential scope to populate services and line items.
                        </p>
                      </div>
                    )}
                  </div>

                  {residentialBreakdownVisible && residentialPreview && (
                    <div className="mt-4 bg-surface-800 rounded-xl border border-amber-500/20 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-400" />
                          <span className="font-semibold text-amber-300 text-sm">Internal Pricing Breakdown</span>
                        </div>
                        <span className="text-xs text-amber-400/70 uppercase tracking-wider">Not visible to client</span>
                      </div>
                      <div className="divide-y divide-surface-700">
                        <div className="px-4 py-3 space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-surface-500 dark:text-surface-400">Service Location:</span>
                            <span className="text-surface-900 dark:text-white font-medium">
                              {residentialPreviewContext?.propertyName || selectedFacility?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-500 dark:text-surface-400">Service Type:</span>
                            <span className="text-surface-900 dark:text-white">
                              {RESIDENTIAL_SERVICE_OPTIONS.find((option) => option.value === residentialServiceType)?.label}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-500 dark:text-surface-400">Frequency:</span>
                            <span className="text-surface-900 dark:text-white">{getResidentialFrequencyLabel(residentialFrequency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-500 dark:text-surface-400">Pricing Source:</span>
                            <span className="text-surface-600 dark:text-surface-400 text-xs">{selectedResidentialPricingPlan?.name}</span>
                          </div>
                        </div>

                        <div className="px-4 py-3">
                          <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                            Calculation
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Base Home Price:</span>
                              <span className="font-mono">{formatCurrency(residentialPreview.breakdown.baseHomePrice)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Square Footage Adjustment:</span>
                              <span className="font-mono">{formatCurrency(residentialPreview.breakdown.sqftAdjustment)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Bedroom Adjustment:</span>
                              <span className="font-mono">{formatCurrency(residentialPreview.breakdown.bedroomAdjustment)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Bathroom Adjustment:</span>
                              <span className="font-mono">{formatCurrency(residentialPreview.breakdown.bathroomAdjustment)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Condition Multiplier:</span>
                              <span className="font-mono">{formatPercent(residentialPreview.breakdown.conditionMultiplier - 1)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Service Multiplier:</span>
                              <span className="font-mono">{formatPercent(residentialPreview.breakdown.serviceMultiplier - 1)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Recurring Discount:</span>
                              <span className="font-mono">-{formatCurrency(residentialPreview.breakdown.recurringDiscount)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>First Clean Surcharge:</span>
                              <span className="font-mono">{formatCurrency(residentialPreview.breakdown.firstCleanSurcharge)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Add-Ons:</span>
                              <span className="font-mono">{formatCurrency(residentialPreview.breakdown.addOnTotal)}</span>
                            </div>
                            <div className="flex justify-between text-surface-900 dark:text-white font-medium pt-1 border-t border-surface-700">
                              <span>Final Total:</span>
                              <span className="font-mono">{formatCurrency(residentialPreview.breakdown.finalTotal)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="px-4 py-3">
                          <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                            Ops
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Estimated Hours:</span>
                              <span className="font-mono">{residentialPreview.breakdown.estimatedHours.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between text-surface-600 dark:text-surface-400">
                              <span>Review Status:</span>
                              <span className="font-mono">
                                {residentialPreview.breakdown.manualReviewRequired ? 'Manual review required' : 'Ready to quote'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Auto-populate from service location */}
              {!isResidentialAccount && formData.facilityId && (
                <div className="md:col-span-2 mt-2">
                  <div className="bg-surface-100 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-gold" />
                        <span className="font-medium text-surface-900 dark:text-white">Auto-Populate from Service Location</span>
                      </div>
                      {pricingReadiness && (
                        <div className="flex items-center gap-2">
                          {pricingReadiness.isReady ? (
                            <span className="flex items-center gap-1 text-sm text-emerald">
                              <CheckCircle2 className="w-4 h-4" />
                              Ready ({pricingReadiness.areaCount} areas, {pricingReadiness.totalSquareFeet.toLocaleString()} sq ft)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-amber-400">
                              <AlertCircle className="w-4 h-4" />
                              {pricingReadiness.reason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {pricingReadiness?.isReady ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex flex-col">
                          <Select
                            placeholder="Subcontractor Tier"
                            value={selectedSubcontractorTier}
                            onChange={(value) => setSelectedSubcontractorTier(value)}
                            options={SUBCONTRACTOR_TIERS}
                          />
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {SUBCONTRACTOR_TIERS.find((t) => t.value === selectedSubcontractorTier)?.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAutoPopulateFromFacility}
                          isLoading={loadingPricing}
                          className="whitespace-nowrap"
                        >
                          <Calculator className="w-4 h-4 mr-2" />
                          Calculate & Populate
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        Complete the service location's area setup to enable automatic pricing calculation.
                        Areas need square footage and floor type information.
                      </p>
                    )}
                  </div>

                  {/* Hourly plan: Show task time breakdown */}
                  {isHourlyPlan && pricingReadiness?.isReady && (
                    <div className="mt-4">
                      <AreaTaskTimeBreakdown
                        facilityId={formData.facilityId!}
                        workerCount={workerCount}
                      />
                    </div>
                  )}

                  {/* Internal pricing breakdown (shown after calculation) */}
                  {pricingBreakdown && (
                    <div className="mt-4">
                      <PricingBreakdownPanel pricing={pricingBreakdown} />
                    </div>
                  )}
                </div>
              )}

              {requiresFacilityReview && (
                <div className="md:col-span-2">
                  <div className="bg-surface-100 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-gold" />
                        <span className="font-medium text-surface-900 dark:text-white">Service Location Review Before Proposal</span>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/service-locations/${formData.facilityId}`, { state: { backLabel: isEditMode ? 'Edit Proposal' : 'New Proposal', backPath: isEditMode ? `/proposals/${id}/edit` : '/proposals/new' } })}
                      >
                        Review Service Location Details
                      </Button>
                    </div>

                    {loadingFacilityReview ? (
                      <p className="text-sm text-surface-500 dark:text-surface-400">Checking areas and tasks...</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between rounded-lg bg-surface-100 dark:bg-surface-800/10 px-3 py-2">
                            <span className="text-surface-600 dark:text-surface-400">Areas</span>
                            <span className="text-surface-900 dark:text-white font-medium">{facilityReview.activeAreas.length}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-surface-100 dark:bg-surface-800/10 px-3 py-2">
                            <span className="text-surface-600 dark:text-surface-400">Tasks</span>
                            <span className="text-surface-900 dark:text-white font-medium">{facilityReview.activeTasks.length}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={facilityReview.areasWithoutTasks.length > 0 ? 'error' : 'success'} size="sm">
                            Areas Missing Tasks: {facilityReview.areasWithoutTasks.length}
                          </Badge>
                          <Badge variant={facilityReview.areasMissingSquareFeet.length > 0 ? 'error' : 'success'} size="sm">
                            Areas Missing Sq Ft: {facilityReview.areasMissingSquareFeet.length}
                          </Badge>
                          <Badge variant={facilityReview.unassignedTasks.length > 0 ? 'warning' : 'success'} size="sm">
                            Unassigned Tasks: {facilityReview.unassignedTasks.length}
                          </Badge>
                        </div>

                        {facilityReview.hasBlockingIssues && (
                          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                            <div className="flex items-center gap-2 mb-1">
                              <CircleAlert className="w-4 h-4" />
                              <span className="font-medium">Fix required before proposal submission</span>
                            </div>
                            <p>
                              Each active area must have square footage and at least one task, and the service location must
                              include both areas and tasks.
                            </p>
                          </div>
                        )}

                        {!facilityReview.hasBlockingIssues && (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={areasReviewed ? 'primary' : 'secondary'}
                                onClick={() => setAreasReviewed((prev) => !prev)}
                              >
                                {areasReviewed ? <CircleCheck className="w-4 h-4 mr-1" /> : null}
                                Confirm Areas Accuracy
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={tasksReviewed ? 'primary' : 'secondary'}
                                onClick={() => setTasksReviewed((prev) => !prev)}
                              >
                                {tasksReviewed ? <CircleCheck className="w-4 h-4 mr-1" /> : null}
                                Confirm Tasks Accuracy
                              </Button>
                            </div>
                            {isFacilityReviewComplete ? (
                              <p className="text-sm text-emerald flex items-center gap-2">
                                <CircleCheck className="w-4 h-4" />
                                Service location review complete. Proposal can be submitted.
                              </p>
                            ) : (
                              <p className="text-sm text-amber-300">
                                Confirm both checks after reviewing the service location.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <Textarea
                  label="Description"
                  placeholder="Enter proposal description"
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value || null)}
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Line Items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gold" />
                Line Items
              </h2>
              <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {(formData.proposalItems || []).length === 0 ? (
              <div className="text-center py-8 text-surface-500 dark:text-surface-400">
                <p>No line items added yet.</p>
                <p className="text-sm mt-1">Click "Add Item" to add line items to this proposal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase px-2">
                  <div className="col-span-2">Type</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items */}
                {(formData.proposalItems || []).map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-surface-100 dark:bg-surface-800/30 p-3 rounded-xl border border-surface-200 dark:border-surface-700"
                  >
                    <div className="md:col-span-2">
                      <Select
                        placeholder="Type"
                        value={item.itemType}
                        onChange={(value) => updateItem(index, 'itemType', value)}
                        options={ITEM_TYPES}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        placeholder="Unit Price"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-end">
                      <span className="text-xs text-surface-500 dark:text-surface-400 mr-2 md:hidden">Total:</span>
                      <span className="text-surface-900 dark:text-white font-medium">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Items Subtotal */}
                <div className="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                  <div className="text-right">
                    <span className="text-surface-500 dark:text-surface-400 text-sm mr-4">Items Subtotal:</span>
                    <span className="text-surface-900 dark:text-white font-semibold">
                      {formatCurrency(totals.itemsTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Services */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold" />
                Services
              </h2>
              <Button type="button" variant="secondary" size="sm" onClick={addService}>
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </Button>
            </div>

            {(formData.proposalServices || []).length === 0 ? (
              <div className="text-center py-8 text-surface-500 dark:text-surface-400">
                <p>No services added yet.</p>
                <p className="text-sm mt-1">Click "Add Service" to add recurring services to this proposal.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(formData.proposalServices || []).map((service, index) => {
                  const isExpanded = expandedServices.has(index);
                  const typeLabel = SERVICE_TYPES.find((t) => t.value === service.serviceType)?.label;
                  const freqLabel = SERVICE_FREQUENCIES.find((f) => f.value === service.frequency)?.label;
                  const parsedDescription = parseServiceDescription(service.description);

                  return (
                    <div
                      key={index}
                      className="bg-surface-100 dark:bg-surface-800/30 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden"
                    >
                      {/* Summary Row */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-50/[0.03] transition-colors"
                        onClick={() => toggleServiceExpand(index)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-surface-500 dark:text-surface-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-surface-500 dark:text-surface-400 shrink-0" />
                        )}
                        <span className={`font-medium truncate ${service.serviceName ? 'text-surface-900 dark:text-white' : 'text-surface-500 italic'}`}>
                          {service.serviceName || 'Untitled Service'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {freqLabel && <Badge size="sm" variant="default">{freqLabel}</Badge>}
                          {typeLabel && <Badge size="sm" variant="info">{typeLabel}</Badge>}
                        </div>
                        <span className="ml-auto text-surface-900 dark:text-white font-semibold tabular-nums shrink-0">
                          {formatCurrency(service.monthlyPrice)}/mo
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeService(index);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {(parsedDescription.areaSummary || parsedDescription.groups.length > 0) && (
                        <div className="border-t border-surface-200 dark:border-surface-700 px-4 py-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-surface-900 dark:text-white">Service Scope</div>
                            <div className="text-xs text-surface-500 dark:text-surface-400">Included in proposal and PDF</div>
                          </div>
                          {parsedDescription.areaSummary && (
                            <div className="mb-3 text-sm text-surface-600 dark:text-surface-400">
                              {parsedDescription.areaSummary}
                            </div>
                          )}
                          {parsedDescription.groups.length > 0 ? (
                            <div className="space-y-3">
                              {parsedDescription.groups.map((group) => (
                                <div key={`${service.id || index}-summary-${group.label}`}>
                                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold">
                                    {group.label}
                                  </div>
                                  <ul className="list-disc space-y-1 pl-5 text-sm text-surface-600 dark:text-surface-300">
                                    {group.tasks.map((task) => (
                                      <li key={`${service.id || index}-summary-${group.label}-${task}`}>{task}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-surface-200 dark:border-surface-700 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input
                              label="Service Name"
                              placeholder="e.g., Daily Cleaning"
                              value={service.serviceName}
                              onChange={(e) => updateService(index, 'serviceName', e.target.value)}
                            />
                            <Select
                              label="Service Type"
                              value={service.serviceType}
                              onChange={(value) => updateService(index, 'serviceType', value)}
                              options={SERVICE_TYPES}
                            />
                            <Select
                              label="Frequency"
                              value={service.frequency}
                              onChange={(value) => updateService(index, 'frequency', value)}
                              options={SERVICE_FREQUENCIES}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input
                              label="Est. Hours"
                              type="number"
                              placeholder="Hours"
                              min="0"
                              step="0.5"
                              value={service.estimatedHours || ''}
                              onChange={(e) =>
                                updateService(index, 'estimatedHours', e.target.value ? parseFloat(e.target.value) : null)
                              }
                            />
                            <Input
                              label="Hourly Rate"
                              type="number"
                              placeholder="$/hr"
                              min="0"
                              step="0.01"
                              value={service.hourlyRate || ''}
                              onChange={(e) =>
                                updateService(index, 'hourlyRate', e.target.value ? parseFloat(e.target.value) : null)
                              }
                            />
                            <Input
                              label="Monthly Price *"
                              type="number"
                              placeholder="Monthly price"
                              min="0"
                              step="0.01"
                              value={service.monthlyPrice}
                              onChange={(e) =>
                                updateService(index, 'monthlyPrice', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Services Subtotal */}
                <div className="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                  <div className="text-right">
                    <span className="text-surface-500 dark:text-surface-400 text-sm mr-4">Services Subtotal:</span>
                    <span className="text-surface-900 dark:text-white font-semibold">
                      {formatCurrency(totals.servicesTotal)}
                    </span>
                  </div>
                </div>
                {totals.oneTimeServicesTotal > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="text-right">
                      <span className="text-surface-500 dark:text-surface-400 text-sm mr-4">One-Time Services:</span>
                      <span className="text-surface-900 dark:text-white font-semibold">
                        {formatCurrency(totals.oneTimeServicesTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Notes</h2>
            <div className="space-y-4">
              <Textarea
                label="Internal Notes"
                placeholder="Internal notes (not visible to client)..."
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value || null)}
                rows={3}
              />
            </div>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card className="sticky top-6">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gold" />
              Financial Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500 dark:text-surface-400">Items Total:</span>
                <span className="text-surface-900 dark:text-white">{formatCurrency(totals.itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500 dark:text-surface-400">Services Total:</span>
                <span className="text-surface-900 dark:text-white">{formatCurrency(totals.servicesTotal)}</span>
              </div>
              {totals.oneTimeChargesTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500 dark:text-surface-400">One-Time Charges:</span>
                  <span className="text-surface-900 dark:text-white">{formatCurrency(totals.oneTimeChargesTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-surface-500 dark:text-surface-400">Recurring Monthly:</span>
                <span className="text-surface-900 dark:text-white">{formatCurrency(totals.monthlyTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500 dark:text-surface-400">Daily (by frequency):</span>
                <span className="text-surface-900 dark:text-white">{formatCurrency(totals.dailyTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500 dark:text-surface-400">Annual (recurring):</span>
                <span className="text-surface-900 dark:text-white">{formatCurrency(totals.annualTotal)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-surface-200 dark:border-surface-700 pt-3">
                <span className="text-surface-500 dark:text-surface-400">Subtotal:</span>
                <span className="text-surface-900 dark:text-white font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>

              {/* Tax Rate Input */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-surface-500 dark:text-surface-400 text-sm">Tax Rate:</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    aria-label="Tax Rate (%)"
                    value={((formData.taxRate || 0) * 100).toFixed(1)}
                    onChange={(e) => {
                      const percent = parseFloat(e.target.value) || 0;
                      handleChange('taxRate', percent / 100);
                    }}
                    className="w-20 text-right"
                  />
                  <span className="text-surface-500 dark:text-surface-400">%</span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-surface-500 dark:text-surface-400">Tax Amount:</span>
                <span className="text-surface-900 dark:text-white">{formatCurrency(totals.taxAmount)}</span>
              </div>
              {!hasRequiredTaxRate && (
                <div className="text-xs text-amber-300">
                  Tax rate is required before submitting this proposal.
                </div>
              )}

              <div className="flex justify-between text-xl font-bold border-t border-surface-200 dark:border-surface-700 pt-3 mt-3">
                <span className="text-surface-900 dark:text-white">Total:</span>
                <span className="text-emerald">{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>

            {/* Quick Info */}
            <div className="mt-6 pt-4 border-t border-surface-200 dark:border-surface-700 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500 dark:text-surface-400">Line Items:</span>
                <span className="text-surface-900 dark:text-white">{(formData.proposalItems || []).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500 dark:text-surface-400">Services:</span>
                <span className="text-surface-900 dark:text-white">{(formData.proposalServices || []).length}</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Actions</h2>
            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                isLoading={saving}
                disabled={!canSubmitProposal}
              >
                <Save className="w-5 h-5 mr-2" />
                {isEditMode ? (isRejectedRevision ? 'Revise Proposal' : 'Update Proposal') : 'Create Proposal'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/proposals')}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
};

export default ProposalForm;
