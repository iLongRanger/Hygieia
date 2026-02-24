import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  Building2,
  FileText,
  DollarSign,
  Calendar,
  GripVertical,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Settings,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleAlert,
  ClipboardCheck,
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
} from '../../lib/proposals';
import { listAccounts } from '../../lib/accounts';
import { listFacilities, listAreas, listFacilityTasks } from '../../lib/facilities';
import {
  getFacilityPricingReadiness,
  getFacilityProposalTemplate,
  listPricingSettings,
  type PricingSettings,
  type FacilityPricingReadiness,
  type PricingBreakdown,
  type FacilityProposalTemplate,
} from '../../lib/pricing';
import type {
  Proposal,
  CreateProposalInput,
  UpdateProposalInput,
  ProposalItem,
  ProposalService,
  ProposalItemType,
  ServiceType,
  ServiceFrequency,
  ProposalScheduleFrequency,
  ProposalServiceSchedule,
  ServiceScheduleDay,
} from '../../types/proposal';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { Area, FacilityTask, CleaningFrequency } from '../../types/facility';
import { AreaTaskTimeBreakdown } from '../../components/proposals/AreaTaskTimeBreakdown';
import { PricingBreakdownPanel } from '../../components/proposals/PricingBreakdownPanel';
import { listTemplates } from '../../lib/proposalTemplates';
import type { ProposalTemplate } from '../../types/proposalTemplate';
import { SUBCONTRACTOR_TIER_OPTIONS } from '../../lib/subcontractorTiers';

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

const FACILITY_TASK_TO_SCHEDULE_FREQUENCY: Record<CleaningFrequency, ProposalScheduleFrequency | null> = {
  daily: '7x_week',
  weekly: '1x_week',
  biweekly: 'biweekly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  annual: 'quarterly',
  as_needed: null,
};

const mapPricingFrequencyToScheduleFrequency = (
  frequency: string
): ProposalScheduleFrequency => {
  if (frequency === 'daily') return '7x_week';
  return (SCHEDULE_FREQUENCIES.some((opt) => opt.value === frequency)
    ? frequency
    : '5x_week') as ProposalScheduleFrequency;
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

const deriveScheduleFrequencyFromFacilityTasks = (
  tasks: FacilityTask[]
): ProposalScheduleFrequency | null => {
  const counts = new Map<ProposalScheduleFrequency, number>();
  for (const task of tasks) {
    const mapped = FACILITY_TASK_TO_SCHEDULE_FREQUENCY[task.cleaningFrequency];
    if (!mapped) continue;
    counts.set(mapped, (counts.get(mapped) || 0) + 1);
  }

  if (!counts.size) return null;

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    [0][0];
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

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Empty item template
const createEmptyItem = (sortOrder: number): ProposalItem => ({
  itemType: 'labor',
  description: '',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  sortOrder,
});

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

const ProposalForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<ProposalTemplate[]>([]);

  // Form data
  const [formData, setFormData] = useState<CreateProposalInput>({
    accountId: '',
    title: '',
    description: null,
    facilityId: null,
    validUntil: null,
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
  const [selectedFrequency, setSelectedFrequency] = useState<string>('5x_week');
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);
  const [scheduleTouchedByUser, setScheduleTouchedByUser] = useState(false);

  // Pricing plan states
  const [pricingPlans, setPricingPlans] = useState<PricingSettings[]>([]);
  const [selectedPricingPlanId, setSelectedPricingPlanId] = useState<string>('');
  const [workerCount, setWorkerCount] = useState<number>(1);
  const [selectedSubcontractorTier, setSelectedSubcontractorTier] = useState<string>('');

  // Frequency options for auto-population
  const PRICING_FREQUENCIES = [
    { value: '1x_week', label: '1x per Week' },
    { value: '2x_week', label: '2x per Week' },
    { value: '3x_week', label: '3x per Week' },
    { value: '4x_week', label: '4x per Week' },
    { value: '5x_week', label: '5x per Week' },
    { value: 'daily', label: 'Daily (7x)' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const selectedPricingPlan = pricingPlans.find((plan) => plan.id === selectedPricingPlanId);
  const isHourlyPlan = selectedPricingPlan?.pricingType === 'hourly';
  const selectedFacility = useMemo(
    () => facilities.find((facility) => facility.id === formData.facilityId),
    [facilities, formData.facilityId]
  );

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
      const [accountsRes, facilitiesRes, plansRes, templatesRes] = await Promise.all([
        listAccounts({ limit: 100 }),
        listFacilities({ limit: 100 }),
        listPricingSettings({ limit: 100, includeArchived: false, isActive: true }),
        listTemplates(),
      ]);
      setAccounts(accountsRes?.data || []);
      setFacilities(facilitiesRes?.data || []);
      setTermsTemplates(templatesRes || []);
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
      const scheduleFrequency = proposal.serviceFrequency || '5x_week';
      const incomingSchedule = proposal.serviceSchedule || createDefaultSchedule(scheduleFrequency);
      const normalizedDays = normalizeScheduleDays(incomingSchedule.days || [], scheduleFrequency);
      setFormData({
        accountId: proposal.account.id,
        title: proposal.title,
        description: proposal.description || null,
        facilityId: proposal.facility?.id || null,
        validUntil: proposal.validUntil
          ? proposal.validUntil.split('T')[0]
          : null,
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
      setSelectedFrequency(
        mapScheduleFrequencyToPricingFrequency(scheduleFrequency as ProposalScheduleFrequency)
      );
      setScheduleTouchedByUser(true);
      // Set pricing plan from proposal
      if (proposal.pricingPlanId) {
        setSelectedPricingPlanId(proposal.pricingPlanId);
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
    : facilities;

  useEffect(() => {
    const facilityId = formData.facilityId;

    setAreasReviewed(false);
    setTasksReviewed(false);

    if (!facilityId) {
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
  }, [formData.facilityId, isEditMode, scheduleTouchedByUser, selectedFacility]);

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

  const requiresFacilityReview = Boolean(formData.facilityId);
  const isFacilityReviewComplete =
    !requiresFacilityReview ||
    (!loadingFacilityReview &&
      !facilityReview.hasBlockingIssues &&
      areasReviewed &&
      tasksReviewed);
  const canSubmitProposal = !saving && isFacilityReviewComplete;

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
  }, [formData.facilityId, selectedFrequency, selectedPricingPlanId, workerCount, selectedSubcontractorTier]);

  const syncClientScheduleFromFacility = useCallback(
    (tasks: FacilityTask[]) => {
      if (isEditMode || scheduleTouchedByUser || !formData.facilityId) return;

      const derivedTaskFrequency = deriveScheduleFrequencyFromFacilityTasks(tasks);
      const addressDefaults = extractFacilityAddressSchedule(selectedFacility);
      const preferredFrequency =
        addressDefaults?.frequency ||
        derivedTaskFrequency ||
        ((formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency);
      setSelectedFrequency(mapScheduleFrequencyToPricingFrequency(preferredFrequency));

      setFormData((prev) => {
        const currentFrequency = (prev.serviceFrequency || '5x_week') as ProposalScheduleFrequency;
        const nextFrequency =
          addressDefaults?.frequency ||
          derivedTaskFrequency ||
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

  // Auto-populate services from facility pricing
  const handleAutoPopulateFromFacility = async () => {
    if (!formData.facilityId) {
      toast.error('Please select a facility first');
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
        selectedFrequency,
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
      const newItems: ProposalItem[] = template.suggestedItems.map((item: any, index: number) => ({
        itemType: (item.itemType as ProposalItemType) || 'other',
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        sortOrder: index,
      }));

      // Update form with auto-populated data
      const scheduleFrequency = mapPricingFrequencyToScheduleFrequency(selectedFrequency);
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
      toast.success(`Auto-populated ${newServices.length} service(s) from facility pricing`);
    } catch (error: any) {
      console.error('Failed to auto-populate from facility:', error);
      setPricingBreakdown(null);
      toast.error(error.response?.data?.message || 'Failed to calculate pricing from facility');
    } finally {
      setLoadingPricing(false);
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof CreateProposalInput, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Clear facility when account changes
      if (field === 'accountId') {
        updated.facilityId = null;
        setPricingBreakdown(null);
        setScheduleTouchedByUser(false);
      }
      // Clear breakdown when facility changes
      if (field === 'facilityId') {
        setPricingBreakdown(null);
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
    setSelectedFrequency(mapScheduleFrequencyToPricingFrequency(frequency));
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

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
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
    const newService = createEmptyService(newIndex);
    setFormData((prev) => ({
      ...prev,
      proposalServices: [...(prev.proposalServices || []), newService],
    }));
    // Auto-expand the newly added service
    setExpandedServices((prev) => new Set(prev).add(newIndex));
  };

  const updateService = (index: number, field: keyof ProposalService, value: any) => {
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
    if (!formData.pricingPlanId) {
      toast.error('Please select a pricing plan');
      return;
    }
    const scheduleFrequency = (formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency;
    const serviceSchedule = formData.serviceSchedule || createDefaultSchedule(scheduleFrequency);
    const expectedDays = expectedDaysForFrequency(scheduleFrequency);

    if (!serviceSchedule.allowedWindowStart || !serviceSchedule.allowedWindowEnd) {
      toast.error('Set the allowed service start and end time');
      return;
    }

    if (serviceSchedule.allowedWindowStart === serviceSchedule.allowedWindowEnd) {
      toast.error('Allowed window start and end times cannot be the same');
      return;
    }

    if ((serviceSchedule.days || []).length !== expectedDays) {
      toast.error(`${scheduleFrequency} requires exactly ${expectedDays} service day(s)`);
      return;
    }

    if (requiresFacilityReview && loadingFacilityReview) {
      toast.error('Please wait for facility review checks to finish');
      return;
    }
    if (requiresFacilityReview && !isFacilityReviewComplete) {
      if (facilityReview.hasBlockingIssues) {
        toast.error('Resolve facility review issues before creating the proposal');
        return;
      }
      toast.error('Please confirm area and task accuracy before creating the proposal');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const updateData: UpdateProposalInput = {
          ...formData,
          serviceFrequency: scheduleFrequency,
          serviceSchedule,
          validUntil: formData.validUntil || null,
          pricingSnapshot: pricingBreakdown?.settingsSnapshot ?? undefined,
        };
        await updateProposal(id, updateData);
        toast.success('Proposal updated successfully');
      } else {
        await createProposal({
          ...formData,
          serviceFrequency: scheduleFrequency,
          serviceSchedule,
          pricingSnapshot: pricingBreakdown?.settingsSnapshot ?? undefined,
        });
        toast.success('Proposal created successfully');
      }
      navigate('/proposals');
    } catch (error: any) {
      console.error('Failed to save proposal:', error);
      toast.error(
        error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} proposal`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/proposals')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isEditMode ? 'Edit Proposal' : 'New Proposal'}
            </h1>
            <p className="text-gray-400 mt-1">
              {isEditMode
                ? 'Update the proposal details below'
                : 'Fill in the details to create a new proposal'}
            </p>
          </div>
        </div>
        <Button type="submit" isLoading={saving} disabled={!canSubmitProposal}>
          <Save className="w-5 h-5 mr-2" />
          {isEditMode ? 'Update Proposal' : 'Create Proposal'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                label="Account *"
                placeholder="Select an account"
                value={formData.accountId}
                onChange={(value) => handleChange('accountId', value)}
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              />
              <Select
                label="Facility"
                placeholder="Select a facility (optional)"
                value={formData.facilityId || ''}
                onChange={(value) => handleChange('facilityId', value || null)}
                options={[
                  { value: '', label: 'None' },
                  ...filteredFacilities.map((f) => ({
                    value: f.id,
                    label: f.name,
                  })),
                ]}
              />
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
                  <p className="text-xs text-gray-400 mt-1">
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
              <Input
                label="Valid Until"
                type="date"
                value={formData.validUntil || ''}
                onChange={(e) => handleChange('validUntil', e.target.value || null)}
              />

              <div className="md:col-span-2">
                <div className="rounded-xl border border-white/10 bg-navy-dark/40 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gold" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">Client Service Schedule</h3>
                      <p className="text-xs text-gray-400">
                        Select exact service days (Mon-Sun) and allowed arrival window.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select
                      label="Cleaning Frequency"
                      value={formData.serviceFrequency || '5x_week'}
                      onChange={handleScheduleFrequencyChange}
                      options={SCHEDULE_FREQUENCIES}
                    />
                    <Input
                      label="Allowed Start Time"
                      type="time"
                      value={formData.serviceSchedule?.allowedWindowStart || '18:00'}
                      onChange={(e) => updateServiceSchedule({ allowedWindowStart: e.target.value || '00:00' })}
                    />
                    <Input
                      label="Allowed End Time"
                      type="time"
                      value={formData.serviceSchedule?.allowedWindowEnd || '06:00'}
                      onChange={(e) => updateServiceSchedule({ allowedWindowEnd: e.target.value || '23:59' })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-gray-400">
                      Required days: {expectedDaysForFrequency((formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SCHEDULE_DAY_OPTIONS.map((option) => {
                        const selectedDays = formData.serviceSchedule?.days || defaultDaysForFrequency((formData.serviceFrequency || '5x_week') as ProposalScheduleFrequency);
                        const selected = selectedDays.includes(option.value);
                        return (
                          <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={selected ? 'primary' : 'secondary'}
                            onClick={() => toggleScheduleDay(option.value)}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500">
                      Window anchor: start day. Example: 6:00 PM to 6:00 AM on Monday runs overnight into Tuesday morning.
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-populate from facility */}
              {formData.facilityId && (
                <div className="md:col-span-2 mt-2">
                  <div className="bg-navy-dark/50 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-gold" />
                        <span className="font-medium text-white">Auto-Populate from Facility</span>
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
                        <Select
                          placeholder="Service Frequency"
                          value={selectedFrequency}
                          onChange={(value) => setSelectedFrequency(value)}
                          options={PRICING_FREQUENCIES}
                        />
                        <div className="flex flex-col">
                          <Select
                            placeholder="Subcontractor Tier"
                            value={selectedSubcontractorTier}
                            onChange={(value) => setSelectedSubcontractorTier(value)}
                            options={SUBCONTRACTOR_TIERS}
                          />
                          <p className="text-xs text-gray-400 mt-1">
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
                      <p className="text-sm text-gray-400">
                        Complete the facility's area setup to enable automatic pricing calculation.
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

              {formData.facilityId && (
                <div className="md:col-span-2">
                  <div className="bg-navy-dark/50 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-gold" />
                        <span className="font-medium text-white">Facility Review Before Proposal</span>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/facilities/${formData.facilityId}`)}
                      >
                        Review Facility Details
                      </Button>
                    </div>

                    {loadingFacilityReview ? (
                      <p className="text-sm text-gray-400">Checking areas and tasks...</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                            <span className="text-gray-300">Areas</span>
                            <span className="text-white font-medium">{facilityReview.activeAreas.length}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                            <span className="text-gray-300">Tasks</span>
                            <span className="text-white font-medium">{facilityReview.activeTasks.length}</span>
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
                              Each active area must have square footage and at least one task, and the facility must
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
                                Facility review complete. Proposal can be submitted.
                              </p>
                            ) : (
                              <p className="text-sm text-amber-300">
                                Confirm both checks after reviewing the facility.
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
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gold" />
                Line Items
              </h2>
              <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {(formData.proposalItems || []).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No line items added yet.</p>
                <p className="text-sm mt-1">Click "Add Item" to add line items to this proposal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-medium text-gray-400 uppercase px-2">
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
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start bg-navy-dark/30 p-3 rounded-xl border border-white/5"
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
                      <span className="text-white font-medium">
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
                <div className="flex justify-end pt-2 border-t border-white/10">
                  <div className="text-right">
                    <span className="text-gray-400 text-sm mr-4">Items Subtotal:</span>
                    <span className="text-white font-semibold">
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
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold" />
                Services
              </h2>
              <Button type="button" variant="secondary" size="sm" onClick={addService}>
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </Button>
            </div>

            {(formData.proposalServices || []).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No services added yet.</p>
                <p className="text-sm mt-1">Click "Add Service" to add recurring services to this proposal.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(formData.proposalServices || []).map((service, index) => {
                  const isExpanded = expandedServices.has(index);
                  const typeLabel = SERVICE_TYPES.find((t) => t.value === service.serviceType)?.label;
                  const freqLabel = SERVICE_FREQUENCIES.find((f) => f.value === service.frequency)?.label;

                  return (
                    <div
                      key={index}
                      className="bg-navy-dark/30 rounded-xl border border-white/5 overflow-hidden"
                    >
                      {/* Summary Row */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                        onClick={() => toggleServiceExpand(index)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <span className={`font-medium truncate ${service.serviceName ? 'text-white' : 'text-gray-500 italic'}`}>
                          {service.serviceName || 'Untitled Service'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {freqLabel && <Badge size="sm" variant="default">{freqLabel}</Badge>}
                          {typeLabel && <Badge size="sm" variant="info">{typeLabel}</Badge>}
                        </div>
                        <span className="ml-auto text-white font-semibold tabular-nums shrink-0">
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

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
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
                          <Textarea
                            label="Service Description"
                            placeholder="Describe the service..."
                            value={service.description || ''}
                            onChange={(e) => updateService(index, 'description', e.target.value || null)}
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Services Subtotal */}
                <div className="flex justify-end pt-2 border-t border-white/10">
                  <div className="text-right">
                    <span className="text-gray-400 text-sm mr-4">Services Subtotal:</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(totals.servicesTotal)}
                    </span>
                  </div>
                </div>
                {totals.oneTimeServicesTotal > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="text-right">
                      <span className="text-gray-400 text-sm mr-4">One-Time Services:</span>
                      <span className="text-white font-semibold">
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
            <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
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
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gold" />
              Financial Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Items Total:</span>
                <span className="text-white">{formatCurrency(totals.itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Services Total:</span>
                <span className="text-white">{formatCurrency(totals.servicesTotal)}</span>
              </div>
              {totals.oneTimeChargesTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">One-Time Charges:</span>
                  <span className="text-white">{formatCurrency(totals.oneTimeChargesTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Recurring Monthly:</span>
                <span className="text-white">{formatCurrency(totals.monthlyTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Daily (by frequency):</span>
                <span className="text-white">{formatCurrency(totals.dailyTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Annual (recurring):</span>
                <span className="text-white">{formatCurrency(totals.annualTotal)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>

              {/* Tax Rate Input */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-400 text-sm">Tax Rate:</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={((formData.taxRate || 0) * 100).toFixed(1)}
                    onChange={(e) => {
                      const percent = parseFloat(e.target.value) || 0;
                      handleChange('taxRate', percent / 100);
                    }}
                    className="w-20 text-right"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax Amount:</span>
                <span className="text-white">{formatCurrency(totals.taxAmount)}</span>
              </div>

              <div className="flex justify-between text-xl font-bold border-t border-white/10 pt-3 mt-3">
                <span className="text-white">Total:</span>
                <span className="text-emerald">{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>

            {/* Quick Info */}
            <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Line Items:</span>
                <span className="text-white">{(formData.proposalItems || []).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Services:</span>
                <span className="text-white">{(formData.proposalServices || []).length}</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                isLoading={saving}
                disabled={!canSubmitProposal}
              >
                <Save className="w-5 h-5 mr-2" />
                {isEditMode ? 'Update Proposal' : 'Create Proposal'}
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
