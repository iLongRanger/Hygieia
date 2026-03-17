import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  FileSignature,
  CheckCircle,
  XCircle,
  Archive,
  Building2,
  MapPin,
  User,
  Users,
  Calendar,
  DollarSign,
  FileText,
  RotateCcw,
  PlayCircle,
  AlertTriangle,
  RefreshCw,
  Link as LinkIcon,
  Download,
  Upload,
  X,
  MoreHorizontal,
  Sparkles,
  Send,
  Eye,
  Mail,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  getContract,
  updateContract,
  updateContractStatus,
  signContract,
  sendContract,
  terminateContract,
  archiveContract,
  restoreContract,
  renewContract,
  assignContractTeam,
  downloadContractPdf,
  downloadContractTermsDocument,
  generateContractTerms,
  listContractAmendments as listContractAmendmentsApi,
  createContractAmendment as createContractAmendmentApi,
  getContractAmendment as getContractAmendmentApi,
  recalculateContractAmendment as recalculateContractAmendmentApi,
  approveContractAmendment as approveContractAmendmentApi,
  applyContractAmendment as applyContractAmendmentApi,
  rejectContractAmendment as rejectContractAmendmentApi,
  updateContractAmendment as updateContractAmendmentApi,
} from '../../lib/contracts';
import { getAreaTemplateByAreaType, listTaskTemplates } from '../../lib/facilities';
import ContractTimeline from '../../components/contracts/ContractTimeline';
import {
  AmendmentAreaSetupModal,
  buildAmendmentTasksFromSelections,
} from '../../components/contracts/AmendmentAreaSetupModal';
import { TaskSelectionModal } from '../facilities/modals/TaskSelectionModal';
import SendContractModal from '../../components/contracts/SendContractModal';
import { listTeams } from '../../lib/teams';
import { listUsers } from '../../lib/users';
import { listAreaTypes } from '../../lib/facilities';
import { listPricingSettings, type PricingSettings, type FacilityPricingResult } from '../../lib/pricing';
import { PricingBreakdownPanel } from '../../components/proposals/PricingBreakdownPanel';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import { SUBCONTRACTOR_TIER_OPTIONS, tierToPercentage } from '../../lib/subcontractorTiers';
import type {
  Contract,
  ContractAmendment,
  ContractAmendmentWorkingScope,
  CreateContractAmendmentInput,
  RecalculateContractAmendmentInput,
  ContractStatus,
  RenewContractInput,
  ServiceSchedule,
  SendContractInput,
  UpdateContractInput,
} from '../../types/contract';
import type { Team } from '../../types/team';
import type { User as SystemUser } from '../../types/user';
import type { AreaType, CleaningFrequency, TaskTemplate } from '../../types/facility';
import {
  ORDERED_CLEANING_FREQUENCIES,
  isCleaningFrequency,
  type AreaTemplateTaskSelection,
} from '../facilities/facility-constants';

// Format address object into readable string
const formatAddress = (address: any): string => {
  if (!address) return '';
  if (typeof address === 'string') return address;

  const lines: string[] = [];
  if (address.street) lines.push(address.street);
  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
  if (cityLine) lines.push(cityLine);
  if (address.country) lines.push(address.country);
  return lines.length > 0 ? lines.join(', ') : '';
};

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'DRAFT',
  sent: 'SENT',
  viewed: 'VIEWED',
  pending_signature: 'SIGNED',
  active: 'ACTIVE',
  expired: 'EXPIRED',
  terminated: 'TERMINATED',
};

const getStatusVariant = (status: ContractStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const variants: Record<ContractStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    sent: 'info',
    viewed: 'info',
    pending_signature: 'success',
    active: 'success',
    expired: 'default',
    terminated: 'error',
  };
  return variants[status];
};

const getStatusIcon = (status: ContractStatus) => {
  const icons: Record<ContractStatus, React.ElementType> = {
    draft: FileText,
    sent: Send,
    viewed: Eye,
    pending_signature: CheckCircle,
    active: CheckCircle,
    expired: Calendar,
    terminated: XCircle,
  };
  return icons[status];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatCurrencyChange = (amount: number) => {
  const abs = Math.abs(amount);
  const formatted = formatCurrency(abs);
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatCurrency(0);
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateInput = (date: string | null | undefined) => {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
};

const isInternalEmployeeOption = (user: SystemUser): boolean => {
  const primaryRole = typeof user.role === 'string' ? user.role.toLowerCase() : '';
  if (primaryRole === 'subcontractor') return false;

  const roleKeys = (user.roles || [])
    .map((assignment) => assignment.role?.key?.toLowerCase())
    .filter((value): value is string => Boolean(value));

  return !roleKeys.includes('subcontractor');
};

const formatShortDate = (date: string | null | undefined) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatFrequency = (value: string | null | undefined) => {
  if (!value) return 'as scheduled';
  const normalized = value.replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const normalizeServiceBullet = (value: string): string =>
  value.replace(/^[\s*-•]+/, '').trim();

type ServiceTaskGroup = {
  label: string;
  tasks: string[];
};

const ServiceTaskStepper = ({
  serviceId,
  groups,
}: {
  serviceId: string;
  groups: ServiceTaskGroup[];
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [serviceId, groups.length]);

  if (groups.length === 0) {
    return <div className="mt-3 text-sm text-gray-500">No service tasks listed.</div>;
  }

  const activeGroup = groups[Math.min(activeIndex, groups.length - 1)];

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((group, index) => (
          <button
            key={`${serviceId}-${group.label}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              index === activeIndex
                ? 'bg-emerald-400 text-slate-950'
                : 'border border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:text-white'
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          {activeGroup.label}
        </div>
        <div className="text-xs text-gray-500">
          {activeIndex + 1} of {groups.length}
        </div>
      </div>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-gray-200">
        {activeGroup.tasks.map((task) => (
          <li key={`${serviceId}-${activeGroup.label}-${task}`}>{task}</li>
        ))}
      </ul>
      {groups.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={activeIndex >= groups.length - 1}
            onClick={() => setActiveIndex((current) => Math.min(groups.length - 1, current + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

const serviceTaskGroupLabel = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('annual') || normalized.includes('yearly')) return 'Annual';
  if (normalized.includes('quarterly')) return 'Quarterly';
  if (normalized.includes('monthly')) return 'Monthly';
  if (normalized.includes('biweekly')) return 'Bi-Weekly';
  if (normalized.includes('weekly')) return 'Weekly';
  if (normalized.includes('daily')) return 'Daily';
  if (normalized.includes('manual') || normalized.includes('scope')) return 'Scope';
  return value.trim();
};

const buildServiceTaskGroups = (
  description: string | null | undefined,
  includedTasks: string[] | undefined
) => {
  const lines = (description || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const areaSummary = lines[0] || '';
  const grouped = new Map<string, Set<string>>();

  const addTask = (label: string, value: string) => {
    let normalized = value.trim();
    while (normalized.startsWith('-') || normalized.startsWith('*')) {
      normalized = normalized.slice(1).trimStart();
    }
    if (!normalized) return;
    const normalizedLabel = serviceTaskGroupLabel(label);
    if (!grouped.has(normalizedLabel)) {
      grouped.set(normalizedLabel, new Set<string>());
    }
    grouped.get(normalizedLabel)!.add(normalized);
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

  for (const taskLine of includedTasks || []) {
    const match = taskLine.match(/^(.+?):\s*(.+)$/);
    if (match) {
      for (const task of match[2].split(',')) {
        addTask(match[1], task);
      }
      continue;
    }
    addTask('Scope', taskLine);
  }

  return {
    areaSummary,
    groups: Array.from(grouped.entries()).map(([label, tasks]) => ({
      label,
      tasks: Array.from(tasks),
    })),
  };
};

const getFrequencyOrder = (value: string | null | undefined) => {
  const key = (value || '').toLowerCase();
  const order: Record<string, number> = {
    daily: 1,
    '1x_week': 2,
    weekly: 2,
    '2x_week': 3,
    '3x_week': 4,
    '4x_week': 5,
    '5x_week': 6,
    '7x_week': 7,
    bi_weekly: 8,
    monthly: 9,
    quarterly: 10,
  };
  return order[key] ?? 99;
};

const groupTasksByFrequency = <T extends { cleaningFrequency?: string | null }>(tasks: T[]) => {
  const grouped = new Map<string, { tasks: T[]; order: number }>();
  for (const task of tasks) {
    const label = formatFrequency(task.cleaningFrequency);
    const current = grouped.get(label) || {
      tasks: [],
      order: getFrequencyOrder(task.cleaningFrequency),
    };
    current.tasks.push(task);
    grouped.set(label, current);
  }
  return [...grouped.entries()]
    .sort((a, b) => {
      if (a[1].order !== b[1].order) return a[1].order - b[1].order;
      return a[0].localeCompare(b[0]);
    })
    .map(([label, value]) => [label, value.tasks] as const);
};

const AmendmentTaskFrequencyEditor = ({
  sectionKey,
  tasks,
  updateTask,
  removeTask,
}: {
  sectionKey: string;
  tasks: ContractAmendmentWorkingScope['tasks'];
  updateTask: (
    taskKey: string,
    updates: Partial<ContractAmendmentWorkingScope['tasks'][number]>
  ) => void;
  removeTask: (taskKey: string) => void;
}) => {
  const frequencyGroups = groupTasksByFrequency(tasks);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [sectionKey, frequencyGroups.length]);

  if (tasks.length === 0) {
    return (
      <div className="rounded border border-dashed border-white/10 p-3 text-sm text-gray-500">
        No tasks in this section yet.
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, Math.max(frequencyGroups.length - 1, 0));
  const [activeFrequency, activeTasks] = frequencyGroups[safeIndex];

  return (
    <div className="space-y-3">
      {frequencyGroups.length > 1 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex flex-wrap gap-2">
            {frequencyGroups.map(([frequency], index) => (
              <button
                key={`${sectionKey}-${frequency}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  index === safeIndex
                    ? 'bg-emerald-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:text-white'
                }`}
              >
                {frequency}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              {activeFrequency}
            </div>
            <div className="text-xs text-gray-500">
              {safeIndex + 1} of {frequencyGroups.length}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={safeIndex === 0}
              onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={safeIndex >= frequencyGroups.length - 1}
              onClick={() =>
                setActiveIndex((current) => Math.min(frequencyGroups.length - 1, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {activeTasks.map((task, taskIndex) => {
        const taskKey = task.id || task.tempId || `${sectionKey}-${safeIndex}-${taskIndex}`;
        return (
          <div key={taskKey} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="Task Name"
                value={task.customName || task.taskTemplate?.name || ''}
                onChange={(e) => updateTask(taskKey, { customName: e.target.value })}
              />
              <Select
                label="Frequency"
                options={TASK_FREQUENCY_OPTIONS}
                value={task.cleaningFrequency || 'daily'}
                onChange={(value) => updateTask(taskKey, { cleaningFrequency: value })}
              />
              <Input
                label="Estimated Minutes"
                type="number"
                min="0"
                value={task.estimatedMinutes ?? task.baseMinutesOverride ?? 0}
                onChange={(e) =>
                  updateTask(taskKey, {
                    estimatedMinutes: e.target.value ? Number(e.target.value) : 0,
                    baseMinutesOverride: e.target.value ? Number(e.target.value) : 0,
                  })
                }
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => removeTask(taskKey)}>
                Remove Task
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const formatTime24h = (value: string) => {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const getScheduleDays = (schedule: unknown): string[] => {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return [];
  const raw = schedule as Record<string, unknown>;
  if (!Array.isArray(raw.days)) return [];
  return raw.days
    .filter((day): day is string => typeof day === 'string')
    .map((day) => day.toLowerCase())
    .filter((day) => DAY_LABELS[day]);
};

const getScheduleTimeWindow = (schedule: unknown): string | null => {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return null;
  const raw = schedule as Record<string, unknown>;
  if (typeof raw.allowedWindowStart !== 'string' || typeof raw.allowedWindowEnd !== 'string') {
    return null;
  }
  return `${formatTime24h(raw.allowedWindowStart)} to ${formatTime24h(raw.allowedWindowEnd)}`;
};

const SERVICE_FREQUENCIES = [
  { value: '1x_week', label: '1x Week' },
  { value: '2x_week', label: '2x Week' },
  { value: '3x_week', label: '3x Week' },
  { value: '4x_week', label: '4x Week' },
  { value: '5x_week', label: '5x Week' },
  { value: '7x_week', label: '7x Week' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom', label: 'Custom' },
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const CONTRACT_PIPELINE_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'pending_signature', label: 'Signed' },
  { key: 'active', label: 'Active' },
] as const;

type AssignmentMode = 'subcontractor_team' | 'internal_employee';
type TermsDocumentAction = 'unchanged' | 'replace' | 'remove';

const getDefaultAmendmentDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const AMENDMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Sent for Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  signed: 'Signed',
  applied: 'Applied',
  canceled: 'Canceled',
};

const getAmendmentStatusVariant = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'approved':
    case 'applied':
    case 'signed':
      return 'success';
    case 'submitted':
      return 'info';
    case 'rejected':
    case 'canceled':
      return 'error';
    default:
      return 'warning';
  }
};

const FLOOR_TYPE_OPTIONS = [
  { value: 'vct', label: 'VCT' },
  { value: 'carpet', label: 'Carpet' },
  { value: 'hardwood', label: 'Hardwood' },
  { value: 'tile', label: 'Tile' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'epoxy', label: 'Epoxy' },
];

const CONDITION_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const TRAFFIC_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const TASK_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const AMENDMENT_SCHEDULE_DAY_OPTIONS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const expectedScheduleDays = (frequency: string | null | undefined): number => {
  switch (frequency) {
    case '1x_week':
    case 'weekly':
    case 'bi_weekly':
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
    default:
      return 0;
  }
};

const defaultScheduleDays = (frequency: string | null | undefined): string[] => {
  switch (frequency) {
    case '1x_week':
    case 'weekly':
    case 'bi_weekly':
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
      return AMENDMENT_SCHEDULE_DAY_OPTIONS.map((day) => day.value);
    case '5x_week':
    case 'daily':
    default:
      return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }
};

const getAmendmentScheduleValidationMessage = (
  frequency: string | null | undefined,
  days: string[] | null | undefined
): string | null => {
  const expected = expectedScheduleDays(frequency);
  if (!expected) return null;
  const selectedCount = Array.isArray(days) ? days.length : 0;
  if (selectedCount === expected) return null;
  return `Select exactly ${expected} service day${expected === 1 ? '' : 's'} for this frequency`;
};

const createTempId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeTaskName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

const templateSpecificity = (template: TaskTemplate, areaTypeId: string) => {
  if (template.areaType?.id === areaTypeId) return 0;
  if (template.isGlobal) return 1;
  if (!template.areaType?.id) return 2;
  return 3;
};

const buildFallbackTemplateTasks = (
  areaTypeId: string,
  taskTemplates: TaskTemplate[]
): AreaTemplateTaskSelection[] =>
  taskTemplates
    .filter(
      (template) =>
        template.isActive &&
        (template.areaType?.id === areaTypeId || template.isGlobal || !template.areaType?.id)
    )
    .map((template) => ({
      id: `task-template-${template.id}`,
      taskTemplateId: template.id,
      name: template.name,
      cleaningType: isCleaningFrequency(template.cleaningType)
        ? template.cleaningType
        : 'daily',
      estimatedMinutes: template.estimatedMinutes ?? null,
      baseMinutes: Number(template.baseMinutes) || 0,
      perSqftMinutes: Number(template.perSqftMinutes) || 0,
      perUnitMinutes: Number(template.perUnitMinutes) || 0,
      perRoomMinutes: Number(template.perRoomMinutes) || 0,
      include: true,
    }));

const getWorkingScopeFromAmendment = (
  amendment: ContractAmendment | null
): ContractAmendmentWorkingScope => {
  const workingSnapshot = [...(amendment?.snapshots || [])]
    .reverse()
    .find((snapshot) => snapshot.snapshotType === 'working');
  const scope = (workingSnapshot?.scopeJson || {}) as ContractAmendmentWorkingScope;
  return {
    contract: scope.contract || null,
    facility: scope.facility || null,
    areas: Array.isArray(scope.areas) ? scope.areas : [],
    tasks: Array.isArray(scope.tasks) ? scope.tasks : [],
  };
};

const getLatestAmendmentSnapshot = (
  amendment: ContractAmendment | null,
  snapshotType: string
) =>
  [...(amendment?.snapshots || [])]
    .reverse()
    .find((snapshot) => snapshot.snapshotType === snapshotType);

const normalizeLabel = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed || fallback;
};

const getAreaComparisonKey = (area: Record<string, any>, index: number) =>
  area.id || area.tempId || `${normalizeLabel(area.name, `Area ${index + 1}`)}-${index}`;

const getAreaDisplayName = (area: Record<string, any>, index: number) =>
  normalizeLabel(area.name, area.areaType?.name || `Area ${index + 1}`);

const getTaskComparisonKey = (task: Record<string, any>, index: number) =>
  task.id ||
  task.tempId ||
  [
    task.areaId || 'facility-wide',
    normalizeLabel(task.customName, task.taskTemplate?.name || `Task ${index + 1}`),
    task.cleaningFrequency || 'unscheduled',
    index,
  ].join(':');

const getTaskDisplayName = (task: Record<string, any>, index: number) =>
  normalizeLabel(task.customName, task.taskTemplate?.name || `Task ${index + 1}`);

const getTaskAreaNameMap = (areas: Record<string, any>[]) => {
  const map = new Map<string, string>();
  areas.forEach((area, index) => {
    const id = area.id || area.tempId;
    if (id) {
      map.set(id, getAreaDisplayName(area, index));
    }
  });
  return map;
};

const describeTaskForComparison = (
  task: Record<string, any>,
  index: number,
  areaNameMap: Map<string, string>
) => {
  const name = getTaskDisplayName(task, index);
  const areaName = task.areaId ? areaNameMap.get(task.areaId) : null;
  return areaName ? `${name} (${areaName})` : `${name} (Facility-Wide)`;
};

const buildComparisonList = (
  beforeItems: Record<string, any>[],
  targetItems: Record<string, any>[],
  getKey: (item: Record<string, any>, index: number) => string,
  getLabel: (item: Record<string, any>, index: number) => string
) => {
  const beforeMap = new Map(beforeItems.map((item, index) => [getKey(item, index), getLabel(item, index)]));
  const targetMap = new Map(targetItems.map((item, index) => [getKey(item, index), getLabel(item, index)]));

  const added = [...targetMap.entries()]
    .filter(([key]) => !beforeMap.has(key))
    .map(([, label]) => label);
  const removed = [...beforeMap.entries()]
    .filter(([key]) => !targetMap.has(key))
    .map(([, label]) => label);

  return { added, removed };
};

const getScheduleSummary = (scope: Record<string, any> | undefined) => {
  const frequency = formatFrequency(scope?.contract?.serviceFrequency);
  const days = getScheduleDays(scope?.contract?.serviceSchedule);
  if (days.length === 0) return frequency;
  return `${frequency} on ${days.map((day) => DAY_LABELS[day]).join(', ')}`;
};

const getLatestAmendmentActivity = (amendment: ContractAmendment | null, action: string) =>
  [...(amendment?.activities || [])]
    .reverse()
    .find((activity) => activity.action === action);

const getAmendmentActivityLabel = (action: string) => {
  switch (action) {
    case 'created':
      return 'Draft created';
    case 'updated':
      return 'Draft updated';
    case 'recalculated':
      return 'Price updated';
    case 'submitted':
      return 'Sent for approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'applied':
      return 'Applied to the live contract';
    default:
      return action.replace(/_/g, ' ');
  }
};

const getAmendmentActivityDetails = (activity: {
  action: string;
  metadata?: Record<string, any>;
}) => {
  const metadata = activity.metadata || {};

  switch (activity.action) {
    case 'rejected':
      return metadata.rejectedReason ? `Reason: ${metadata.rejectedReason}` : null;
    case 'applied': {
      const parts = [
        `${metadata.updatedAreaCount ?? 0} areas updated`,
        `${metadata.createdAreaCount ?? 0} areas added`,
        `${metadata.removedAreaCount ?? metadata.archivedAreaCount ?? 0} areas removed`,
        `${metadata.updatedTaskCount ?? 0} tasks updated`,
        `${metadata.createdTaskCount ?? 0} tasks added`,
        `${metadata.removedTaskCount ?? metadata.archivedTaskCount ?? 0} tasks removed`,
      ];
      return parts.join(' • ');
    }
    default:
      return null;
  }
};

const buildWorkingScopeForComparison = (
  amendment: ContractAmendment | null,
  workingScope: ContractAmendmentWorkingScope
) => {
  const latestSnapshot =
    getLatestAmendmentSnapshot(amendment, 'after') ||
    getLatestAmendmentSnapshot(amendment, 'working');
  const snapshotScope = (latestSnapshot?.scopeJson || {}) as Record<string, any>;

  return {
    ...snapshotScope,
    contract: {
      ...(snapshotScope.contract || {}),
      ...(workingScope.contract || {}),
      serviceFrequency:
        workingScope.contract?.serviceFrequency ||
        amendment?.newServiceFrequency ||
        snapshotScope.contract?.serviceFrequency ||
        null,
      serviceSchedule:
        workingScope.contract?.serviceSchedule ||
        amendment?.newServiceSchedule ||
        snapshotScope.contract?.serviceSchedule ||
        null,
    },
    facility: {
      ...(snapshotScope.facility || {}),
      ...(workingScope.facility || {}),
    },
    areas: Array.isArray(workingScope.areas) ? workingScope.areas : [],
    tasks: Array.isArray(workingScope.tasks) ? workingScope.tasks : [],
  };
};

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('subcontractor_team');
  const [assigningTeam, setAssigningTeam] = useState(false);
  const [selectedTier, setSelectedTier] = useState('premium');
  const [overrideEffectivityDate, setOverrideEffectivityDate] = useState('');

  // T&C inline editing state
  const [editingTerms, setEditingTerms] = useState(false);
  const [termsText, setTermsText] = useState('');
  const [savingTerms, setSavingTerms] = useState(false);
  const [generatingTerms, setGeneratingTerms] = useState(false);
  const [termsDocumentAction, setTermsDocumentAction] = useState<TermsDocumentAction>('unchanged');
  const [termsDocumentUpload, setTermsDocumentUpload] = useState<{
    name: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);

  // Menu & send modal state
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userRole = useAuthStore((state) => state.user?.role);
  const canViewPipelines = userRole === 'owner' || userRole === 'admin';
  const isSubcontractor = userRole === 'subcontractor';
  const isLimitedContractViewer = userRole === 'subcontractor' || userRole === 'cleaner';
  const canWriteContracts = hasPermission(PERMISSIONS.CONTRACTS_WRITE);
  const canAdminContracts = hasPermission(PERMISSIONS.CONTRACTS_ADMIN);

  // Renewal modal state
  const [activityRefresh, setActivityRefresh] = useState(0);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewalFormData, setRenewalFormData] = useState<RenewContractInput>({
    startDate: '',
    endDate: null,
    monthlyValue: undefined,
    serviceFrequency: null,
    autoRenew: false,
    renewalNoticeDays: 30,
    billingCycle: 'monthly',
    paymentTerms: 'Net 30',
    termsAndConditions: null,
    specialInstructions: null,
  });
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
  const [amendmentsLoading, setAmendmentsLoading] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentSubmitting, setAmendmentSubmitting] = useState(false);
  const [amendmentDetailLoading, setAmendmentDetailLoading] = useState(false);
  const [selectedAmendment, setSelectedAmendment] = useState<ContractAmendment | null>(null);
  const [showAmendmentDetailModal, setShowAmendmentDetailModal] = useState(false);
  const [appliedRecurringJobsSummary, setAppliedRecurringJobsSummary] = useState<{
    created: number;
    canceled: number;
  } | null>(null);
  const [amendmentPricing, setAmendmentPricing] = useState<FacilityPricingResult | null>(null);
  const [amendmentPricingLoading, setAmendmentPricingLoading] = useState(false);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingSettings[]>([]);
  const [amendmentWorkingScope, setAmendmentWorkingScope] = useState<ContractAmendmentWorkingScope>({
    areas: [],
    tasks: [],
  });
  const [showAmendmentAreaModal, setShowAmendmentAreaModal] = useState(false);
  const [amendmentAreaForm, setAmendmentAreaForm] = useState<ContractAmendmentWorkingScope['areas'][number]>({
    areaTypeId: '',
    areaType: null,
    name: '',
    quantity: 1,
    squareFeet: null,
    floorType: 'vct',
    conditionLevel: 'standard',
    trafficLevel: 'medium',
    roomCount: 0,
    unitCount: 0,
    notes: null,
  });
  const [areaTemplateTasks, setAreaTemplateTasks] = useState<AreaTemplateTaskSelection[]>([]);
  const [areaTemplateLoading, setAreaTemplateLoading] = useState(false);
  const [areaTaskPipelineStep, setAreaTaskPipelineStep] = useState(0);
  const [reviewedAreaTaskFrequencies, setReviewedAreaTaskFrequencies] =
    useState<Set<CleaningFrequency>>(new Set());
  const [newAreaCustomTaskName, setNewAreaCustomTaskName] = useState('');
  const [showAmendmentTaskSelectionModal, setShowAmendmentTaskSelectionModal] = useState(false);
  const [selectedAmendmentAreaForTask, setSelectedAmendmentAreaForTask] =
    useState<ContractAmendmentWorkingScope['areas'][number] | null>(null);
  const [amendmentTaskSelectionTasks, setAmendmentTaskSelectionTasks] = useState<AreaTemplateTaskSelection[]>([]);
  const [amendmentTaskSelectionStep, setAmendmentTaskSelectionStep] = useState(0);
  const [reviewedAmendmentTaskSelectionFrequencies, setReviewedAmendmentTaskSelectionFrequencies] =
    useState<Set<CleaningFrequency>>(new Set());
  const [newAmendmentTaskSelectionCustomName, setNewAmendmentTaskSelectionCustomName] = useState('');
  const [amendmentScopeDirty, setAmendmentScopeDirty] = useState(false);
  const [collapsedAmendmentAreas, setCollapsedAmendmentAreas] = useState<Record<string, boolean>>({});
  const [collapsedAmendmentTaskGroups, setCollapsedAmendmentTaskGroups] = useState<Record<string, boolean>>({});
  const [amendmentFormData, setAmendmentFormData] = useState<CreateContractAmendmentInput>({
    title: '',
    effectiveDate: getDefaultAmendmentDate(),
    reason: '',
    summary: '',
  });

  useEffect(() => {
    if (id) {
      fetchContract(id);
      fetchAmendments(id);
      if (!isLimitedContractViewer) {
        fetchTeams();
        fetchUsers();
      }
    }
  }, [id, isLimitedContractViewer]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!showAmendmentDetailModal || !selectedAmendment) return;
    setAmendmentWorkingScope(getWorkingScopeFromAmendment(selectedAmendment));
    const pricingSnapshot = selectedAmendment.pricingSnapshot as
      | (FacilityPricingResult & { totalSquareFeet?: number })
      | null
      | undefined;
    setAmendmentPricing(
      pricingSnapshot && typeof pricingSnapshot.totalSquareFeet === 'number'
        ? pricingSnapshot
        : null
    );
    setAmendmentScopeDirty(false);
    setCollapsedAmendmentAreas({});
    setCollapsedAmendmentTaskGroups({});
    if (areaTypes.length === 0) {
      fetchAreaTypes();
    }
    if (taskTemplates.length === 0) {
      fetchTaskTemplates();
    }
    if (pricingPlans.length === 0) {
      fetchPricingPlans();
    }
  }, [showAmendmentDetailModal, selectedAmendment]);

  const refreshAll = (contractId: string) => {
    fetchContract(contractId);
    fetchAmendments(contractId);
    setActivityRefresh((n) => n + 1);
  };

  const fetchContract = async (contractId: string) => {
    try {
      setLoading(true);
      const data = await getContract(contractId);
      setContract(data);
      const hasAssignedUser = Boolean(data.assignedToUser?.id);
      setAssignmentMode(hasAssignedUser ? 'internal_employee' : 'subcontractor_team');
      setSelectedTeamId(data.assignedTeam?.id || '');
      setSelectedUserId(data.assignedToUser?.id || '');
      setSelectedTier(data.subcontractorTier || 'premium');
      setOverrideEffectivityDate(
        data.assignmentOverrideEffectiveDate
          ? new Date(data.assignmentOverrideEffectiveDate).toISOString().slice(0, 10)
          : ''
      );
    } catch (error) {
      console.error('Failed to fetch contract:', error);
      toast.error('Failed to load contract');
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await listTeams({ limit: 100, isActive: true });
      setTeams(response.data || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await listUsers({ limit: 100, status: 'active' });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load employees');
    }
  };

  const handleAssignTeam = async () => {
    if (!contract) return;

    try {
      const teamId =
        assignmentMode === 'subcontractor_team' ? selectedTeamId || null : null;
      const assignedToUserId =
        assignmentMode === 'internal_employee' ? selectedUserId || null : null;
      const requiresEffectivityDate =
        Boolean(contract.assignedTeam?.id || contract.assignedToUser?.id) &&
        Boolean(teamId || assignedToUserId) &&
        (teamId !== (contract.assignedTeam?.id || null) ||
          assignedToUserId !== (contract.assignedToUser?.id || null));

      if (requiresEffectivityDate && !overrideEffectivityDate) {
        toast.error('Effectivity date is required when overriding an existing assignment');
        return;
      }

      setAssigningTeam(true);
      const updatedContract = await assignContractTeam(
        contract.id,
        teamId,
        assignedToUserId,
        teamId ? selectedTier : undefined,
        requiresEffectivityDate ? overrideEffectivityDate : null
      );
      setContract(updatedContract);
      setActivityRefresh((n) => n + 1);
      const teamName = teams.find((t) => t.id === selectedTeamId)?.name;
      const userName = users.find((u) => u.id === selectedUserId)?.fullName;
      if (requiresEffectivityDate) {
        const dateLabel = new Date(`${overrideEffectivityDate}T00:00:00`).toLocaleDateString();
        toast.success(`Assignment override scheduled for ${dateLabel}`);
      } else if (assignmentMode === 'internal_employee') {
        toast.success(
          assignedToUserId
            ? `${userName || 'Employee'} assigned successfully`
            : 'Employee unassigned successfully'
        );
      } else {
        toast.success(teamId ? `${teamName || 'Team'} assigned successfully` : 'Team unassigned successfully');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to assign team');
    } finally {
      setAssigningTeam(false);
    }
  };

  const handleActivate = async () => {
    if (!contract || !confirm('Activate this contract? This will make it active and billable.')) return;

    try {
      await updateContractStatus(contract.id, 'active');
      toast.success('Contract activated successfully');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate contract');
    }
  };

  const handleSign = async () => {
    if (!contract) return;

    const signedByName = prompt('Enter signer name:');
    if (!signedByName) return;

    const signedByEmail = prompt('Enter signer email:');
    if (!signedByEmail) return;

    try {
      await signContract(contract.id, {
        signedDate: new Date().toISOString().split('T')[0],
        signedByName,
        signedByEmail,
      });
      toast.success('Contract signed successfully');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to sign contract');
    }
  };

  const handleTerminate = async () => {
    if (!contract) return;

    const reason = prompt('Please provide a termination reason:');
    if (!reason) return;

    if (!confirm('Terminate this contract? This action will end the service agreement.')) return;

    try {
      await terminateContract(contract.id, { terminationReason: reason });
      toast.success('Contract terminated');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to terminate contract');
    }
  };

  const handleArchive = async () => {
    if (!contract || !confirm('Archive this contract?')) return;

    try {
      await archiveContract(contract.id);
      toast.success('Contract archived');
      refreshAll(contract.id);
    } catch (error) {
      toast.error('Failed to archive contract');
    }
  };

  const handleRestore = async () => {
    if (!contract) return;

    try {
      await restoreContract(contract.id);
      toast.success('Contract restored');
      refreshAll(contract.id);
    } catch (error) {
      toast.error('Failed to restore contract');
    }
  };

  const openRenewModal = () => {
    if (!contract) return;

    if (contract.status !== 'active' && contract.status !== 'expired') {
      toast.error('Only active or expired contracts can be renewed');
      return;
    }

    // Pre-fill form with contract data
    const startDate = contract.endDate
      ? new Date(new Date(contract.endDate).getTime() + 86400000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setRenewalFormData({
      startDate,
      endDate: null,
      monthlyValue: Number(contract.monthlyValue),
      serviceFrequency: contract.serviceFrequency || null,
      autoRenew: contract.autoRenew,
      renewalNoticeDays: contract.renewalNoticeDays || 30,
      billingCycle: contract.billingCycle,
      paymentTerms: contract.paymentTerms,
      termsAndConditions: contract.termsAndConditions || null,
      specialInstructions: contract.specialInstructions || null,
    });
    setShowRenewModal(true);
  };

  const handleRenew = async () => {
    if (!contract) return;

    if (!renewalFormData.startDate) {
      toast.error('Start date is required');
      return;
    }

    try {
      setRenewing(true);
      await renewContract(contract.id, renewalFormData);
      toast.success('Contract renewed successfully');
      setShowRenewModal(false);
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to renew contract');
    } finally {
      setRenewing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contract) return;
    try {
      await downloadContractPdf(contract.id, contract.contractNumber);
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleDownloadTermsDocument = async () => {
    if (!contract?.termsDocumentName) return;
    try {
      await downloadContractTermsDocument(contract.id, contract.termsDocumentName);
      toast.success('Terms document downloaded');
    } catch {
      toast.error('Failed to download terms document');
    }
  };

  const fetchAreaTypes = async () => {
    try {
      const response = await listAreaTypes({ limit: 100 });
      setAreaTypes(response.data || []);
    } catch (error) {
      console.error('Failed to fetch area types:', error);
      toast.error('Failed to load area types');
    }
  };

  const fetchTaskTemplates = async () => {
    try {
      const response = await listTaskTemplates({ isActive: true, limit: 100 });
      setTaskTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch task templates:', error);
      toast.error('Failed to load task templates');
    }
  };

  const fetchPricingPlans = async () => {
    try {
      const response = await listPricingSettings({ limit: 100, isActive: true });
      setPricingPlans(response.data || []);
    } catch (error) {
      console.error('Failed to fetch pricing plans:', error);
      toast.error('Failed to load pricing plans');
    }
  };

  const fetchAmendments = async (contractId: string) => {
    try {
      setAmendmentsLoading(true);
      const data = await listContractAmendmentsApi(contractId);
      setAmendments(data);
    } catch (error) {
      console.error('Failed to fetch amendments:', error);
      toast.error('Failed to load amendments');
    } finally {
      setAmendmentsLoading(false);
    }
  };

  const openAmendmentModal = () => {
    if (!contract) return;
    setAppliedRecurringJobsSummary(null);
    setAmendmentFormData({
      title: `${contract.title} Amendment`,
      effectiveDate: getDefaultAmendmentDate(),
      reason: '',
      summary: '',
    });
    setShowAmendmentModal(true);
  };

  const handleCreateAmendment = async () => {
    if (!contract) return;
    if (!amendmentFormData.effectiveDate) {
      toast.error('Effective date is required');
      return;
    }

    try {
      setAmendmentSubmitting(true);
      const created = await createContractAmendmentApi(contract.id, amendmentFormData);
      const detail = await getContractAmendmentApi(contract.id, created.id);
      setShowAmendmentModal(false);
      setAppliedRecurringJobsSummary(null);
      setSelectedAmendment(detail);
      setShowAmendmentDetailModal(true);
      toast.success('Amendment draft created');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create amendment');
    } finally {
      setAmendmentSubmitting(false);
    }
  };

  const handleOpenAmendmentDetail = async (amendmentId: string) => {
    if (!contract) return;
    try {
      setAmendmentDetailLoading(true);
      setAppliedRecurringJobsSummary(null);
      const detail = await getContractAmendmentApi(contract.id, amendmentId);
      setSelectedAmendment(detail);
      setShowAmendmentDetailModal(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load amendment detail');
    } finally {
      setAmendmentDetailLoading(false);
    }
  };

  const updateAmendmentArea = (
    areaKey: string,
    updates: Partial<ContractAmendmentWorkingScope['areas'][number]>
  ) => {
    setAmendmentWorkingScope((current) => ({
      ...current,
      areas: current.areas.map((area) => {
        const key = area.id || area.tempId;
        return key === areaKey ? { ...area, ...updates } : area;
      }),
    }));
    setAmendmentScopeDirty(true);
  };

  const updateAmendmentTask = (
    taskKey: string,
    updates: Partial<ContractAmendmentWorkingScope['tasks'][number]>
  ) => {
    setAmendmentWorkingScope((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        const key = task.id || task.tempId;
        return key === taskKey ? { ...task, ...updates } : task;
      }),
    }));
    setAmendmentScopeDirty(true);
  };

  const resetAmendmentAreaSetup = () => {
    const defaultAreaType = areaTypes[0];
    setAmendmentAreaForm({
      areaTypeId: defaultAreaType?.id || '',
      areaType: defaultAreaType
        ? { id: defaultAreaType.id, name: defaultAreaType.name }
        : null,
      name: defaultAreaType?.name || '',
      quantity: 1,
      squareFeet: defaultAreaType?.defaultSquareFeet
        ? Number(defaultAreaType.defaultSquareFeet)
        : null,
      floorType: 'vct',
      conditionLevel: 'standard',
      trafficLevel: 'medium',
      roomCount: 0,
      unitCount: 0,
      notes: null,
    });
    setAreaTemplateTasks(
      defaultAreaType ? buildFallbackTemplateTasks(defaultAreaType.id, taskTemplates) : []
    );
    setAreaTaskPipelineStep(0);
    setReviewedAreaTaskFrequencies(new Set());
    setNewAreaCustomTaskName('');
  };

  const resetAmendmentTaskSelectionState = () => {
    setSelectedAmendmentAreaForTask(null);
    setAmendmentTaskSelectionTasks([]);
    setAmendmentTaskSelectionStep(0);
    setReviewedAmendmentTaskSelectionFrequencies(new Set());
    setNewAmendmentTaskSelectionCustomName('');
  };

  const openAmendmentAreaModal = () => {
    resetAmendmentAreaSetup();
    setShowAmendmentAreaModal(true);
  };

  const buildTaskSelectionsForAmendmentArea = (
    area: ContractAmendmentWorkingScope['areas'][number]
  ) => {
    const areaTypeId = area.areaTypeId || area.areaType?.id;
    const matchingTemplates = taskTemplates
      .filter(
        (template) =>
          template.isActive &&
          (areaTypeId
            ? (
                template.areaType?.id === areaTypeId
                || template.isGlobal
                || !template.areaType?.id
              )
            : (template.isGlobal || !template.areaType?.id))
      )
      .sort((a, b) => {
        const aSpecificity = areaTypeId ? templateSpecificity(a, areaTypeId) : (a.isGlobal ? 1 : 2);
        const bSpecificity = areaTypeId ? templateSpecificity(b, areaTypeId) : (b.isGlobal ? 1 : 2);
        if (aSpecificity !== bSpecificity) return aSpecificity - bSpecificity;
        const aIndex = ORDERED_CLEANING_FREQUENCIES.indexOf(
          isCleaningFrequency(a.cleaningType) ? a.cleaningType : 'daily'
        );
        const bIndex = ORDERED_CLEANING_FREQUENCIES.indexOf(
          isCleaningFrequency(b.cleaningType) ? b.cleaningType : 'daily'
        );
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.name.localeCompare(b.name);
      });

    const uniqueTemplates = matchingTemplates.filter((template, index, templates) => {
      const normalizedKey = `${normalizeTaskName(template.name)}::${template.cleaningType}`;
      return (
        templates.findIndex(
          (candidate) =>
            `${normalizeTaskName(candidate.name)}::${candidate.cleaningType}` === normalizedKey
        ) === index
      );
    });

    return uniqueTemplates.map((template) => ({
      id: `task-template-${template.id}`,
      taskTemplateId: template.id,
      name: template.name,
      cleaningType: isCleaningFrequency(template.cleaningType)
        ? template.cleaningType
        : 'daily',
      estimatedMinutes: template.estimatedMinutes ?? null,
      baseMinutes: Number(template.baseMinutes) || 0,
      perSqftMinutes: Number(template.perSqftMinutes) || 0,
      perUnitMinutes: Number(template.perUnitMinutes) || 0,
      perRoomMinutes: Number(template.perRoomMinutes) || 0,
      include: true,
    }));
  };

  const openAmendmentTaskSelectionForArea = (
    area: ContractAmendmentWorkingScope['areas'][number]
  ) => {
    resetAmendmentTaskSelectionState();
    setSelectedAmendmentAreaForTask(area);
    setAmendmentTaskSelectionTasks(buildTaskSelectionsForAmendmentArea(area));
    setShowAmendmentTaskSelectionModal(true);
  };

  const applyAmendmentAreaTemplate = async (areaTypeId: string) => {
    if (!areaTypeId) {
      setAreaTemplateTasks([]);
      return;
    }

    try {
      setAreaTemplateLoading(true);
      const template = await getAreaTemplateByAreaType(areaTypeId);
      const templateTasks = template.tasks?.map((task) => ({
        id: task.id,
        taskTemplateId: task.taskTemplate?.id || null,
        name: task.taskTemplate?.name || task.name || 'Untitled Task',
        cleaningType:
          task.taskTemplate?.cleaningType && isCleaningFrequency(task.taskTemplate.cleaningType)
            ? task.taskTemplate.cleaningType
            : 'daily',
        estimatedMinutes: task.taskTemplate?.estimatedMinutes ?? null,
        baseMinutes: Number(task.taskTemplate?.baseMinutes ?? task.baseMinutes) || 0,
        perSqftMinutes: Number(task.taskTemplate?.perSqftMinutes ?? task.perSqftMinutes) || 0,
        perUnitMinutes: Number(task.taskTemplate?.perUnitMinutes ?? task.perUnitMinutes) || 0,
        perRoomMinutes: Number(task.taskTemplate?.perRoomMinutes ?? task.perRoomMinutes) || 0,
        include: true,
      })) || [];
      const fallbackTasks = buildFallbackTemplateTasks(areaTypeId, taskTemplates);
      setAreaTemplateTasks(templateTasks.length > 0 ? templateTasks : fallbackTasks);
      setAreaTaskPipelineStep(0);
      setReviewedAreaTaskFrequencies(new Set());
      setNewAreaCustomTaskName('');
      setAmendmentAreaForm((current) => ({
        ...current,
        squareFeet:
          current.squareFeet ??
          (template.defaultSquareFeet ? Number(template.defaultSquareFeet) : current.squareFeet),
      }));
    } catch (error) {
      console.error('Failed to load amendment area template:', error);
      setAreaTemplateTasks(buildFallbackTemplateTasks(areaTypeId, taskTemplates));
      setAreaTaskPipelineStep(0);
      setReviewedAreaTaskFrequencies(new Set());
      setNewAreaCustomTaskName('');
    } finally {
      setAreaTemplateLoading(false);
    }
  };

  const toggleAmendmentAreaTemplateTaskInclude = (taskId: string, include: boolean) => {
    setAreaTemplateTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, include } : task))
    );
  };

  const addCustomAmendmentAreaTemplateTask = () => {
    const name = newAreaCustomTaskName.trim();
    if (!name) {
      toast.error('Enter a task name');
      return;
    }

    const duplicate = areaTemplateTasks.some(
      (task) =>
        task.cleaningType === currentAreaTaskFrequency &&
        task.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      toast.error('Task already exists in this frequency');
      return;
    }

    setAreaTemplateTasks((current) => [
      ...current,
      {
        id: createTempId('template-task'),
        taskTemplateId: null,
        name,
        cleaningType: currentAreaTaskFrequency,
        estimatedMinutes: null,
        baseMinutes: 0,
        perSqftMinutes: 0,
        perUnitMinutes: 0,
        perRoomMinutes: 0,
        include: true,
      },
    ]);
    setNewAreaCustomTaskName('');
  };

  const removeCustomAmendmentAreaTemplateTask = (taskId: string) => {
    setAreaTemplateTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const toggleAmendmentTaskSelectionInclude = (taskId: string, include: boolean) => {
    setAmendmentTaskSelectionTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, include } : task))
    );
  };

  const goToNextAmendmentTaskSelectionStep = () => {
    setReviewedAmendmentTaskSelectionFrequencies((current) => {
      const next = new Set(current);
      next.add(currentAmendmentTaskSelectionFrequency as CleaningFrequency);
      return next;
    });
    setAmendmentTaskSelectionStep((current) =>
      Math.min(current + 1, ORDERED_CLEANING_FREQUENCIES.length - 1)
    );
  };

  const goToPreviousAmendmentTaskSelectionStep = () => {
    setAmendmentTaskSelectionStep((current) => Math.max(current - 1, 0));
  };

  const addCustomAmendmentTaskSelectionTask = () => {
    const name = newAmendmentTaskSelectionCustomName.trim();
    if (!name) {
      toast.error('Enter a task name');
      return;
    }

    const duplicate = amendmentTaskSelectionTasks.some(
      (task) =>
        task.cleaningType === currentAmendmentTaskSelectionFrequency &&
        task.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      toast.error('Task already exists in this frequency');
      return;
    }

    setAmendmentTaskSelectionTasks((current) => [
      ...current,
      {
        id: createTempId('custom-task'),
        taskTemplateId: null,
        name,
        cleaningType: currentAmendmentTaskSelectionFrequency,
        estimatedMinutes: null,
        baseMinutes: 0,
        perSqftMinutes: 0,
        perUnitMinutes: 0,
        perRoomMinutes: 0,
        include: true,
      },
    ]);
    setNewAmendmentTaskSelectionCustomName('');
  };

  const removeCustomAmendmentTaskSelectionTask = (taskId: string) => {
    setAmendmentTaskSelectionTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const goToNextAmendmentAreaTaskFrequencyStep = () => {
    setReviewedAreaTaskFrequencies((current) => {
      const next = new Set(current);
      next.add(currentAreaTaskFrequency as CleaningFrequency);
      return next;
    });
    setAreaTaskPipelineStep((current) =>
      Math.min(current + 1, ORDERED_CLEANING_FREQUENCIES.length - 1)
    );
  };

  const goToPreviousAmendmentAreaTaskFrequencyStep = () => {
    setAreaTaskPipelineStep((current) => Math.max(current - 1, 0));
  };

  const saveAmendmentAreaWithTasks = () => {
    if (!amendmentAreaForm.areaTypeId) {
      toast.error('Area type is required');
      return;
    }

    const areaKey = createTempId('area');
    const selectedAreaType =
      amendmentAreaForm.areaType ||
      areaTypes.find((areaType) => areaType.id === amendmentAreaForm.areaTypeId);
    const draftArea = {
      ...amendmentAreaForm,
      tempId: areaKey,
      areaType: selectedAreaType
        ? {
            id: amendmentAreaForm.areaTypeId || undefined,
            name: selectedAreaType.name || amendmentAreaForm.name || 'Area',
          }
        : null,
      name: amendmentAreaForm.name || selectedAreaType?.name || '',
    };

    const seededTasks = buildAmendmentTasksFromSelections(areaKey, areaTemplateTasks).map((task) => ({
      ...task,
      tempId: task.tempId || createTempId('task'),
    }));

    setAmendmentWorkingScope((current) => ({
      ...current,
      areas: [...current.areas, draftArea],
      tasks: [...current.tasks, ...seededTasks],
    }));
    setAmendmentScopeDirty(true);
    setShowAmendmentAreaModal(false);
    resetAmendmentAreaSetup();
  };

  const saveSelectedAmendmentTasks = () => {
    const selectedArea = selectedAmendmentAreaForTask;
    const areaKey = selectedArea?.id || selectedArea?.tempId;
    if (!areaKey) {
      toast.error('Select an area before adding tasks');
      return;
    }

    const seededTasks = buildAmendmentTasksFromSelections(areaKey, amendmentTaskSelectionTasks).map((task) => ({
      ...task,
      tempId: task.tempId || createTempId('task'),
    }));

    setAmendmentWorkingScope((current) => ({
      ...current,
      tasks: [...current.tasks, ...seededTasks],
    }));
    setAmendmentScopeDirty(true);
    setShowAmendmentTaskSelectionModal(false);
    resetAmendmentTaskSelectionState();
  };

  const removeDraftArea = (areaKey: string) => {
    setAmendmentWorkingScope((current) => {
      const nextAreas = current.areas.filter((area) => (area.id || area.tempId) !== areaKey);
      return {
        ...current,
        areas: nextAreas,
        tasks: current.tasks.map((task) =>
          task.areaId === areaKey ? { ...task, areaId: null } : task
        ),
      };
    });
    setAmendmentScopeDirty(true);
  };

  const addDraftTask = (areaId?: string | null) => {
    const firstArea = amendmentWorkingScope.areas[0];
    setAmendmentWorkingScope((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          tempId: createTempId('task'),
          areaId: areaId === undefined ? firstArea?.id || firstArea?.tempId || null : areaId,
          customName: '',
          cleaningFrequency: 'daily',
          estimatedMinutes: 0,
        },
      ],
    }));
    setAmendmentScopeDirty(true);
  };

  const removeDraftTask = (taskKey: string) => {
    setAmendmentWorkingScope((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => (task.id || task.tempId) !== taskKey),
    }));
    setAmendmentScopeDirty(true);
  };

  const handleSaveAmendmentScope = async () => {
    if (!contract || !selectedAmendment) return;
    const scheduleValidationMessage = getAmendmentScheduleValidationMessage(
      selectedAmendment.newServiceFrequency || selectedAmendment.oldServiceFrequency || null,
      selectedAmendment.newServiceSchedule?.days as string[] | undefined
    );
    if (scheduleValidationMessage) {
      toast.error(scheduleValidationMessage);
      return;
    }
    try {
      setAmendmentSubmitting(true);
      const updated = await updateContractAmendmentApi(contract.id, selectedAmendment.id, {
        workingScope: amendmentWorkingScope,
        pricingPlanId: selectedAmendment.pricingPlanId,
        newServiceFrequency: selectedAmendment.newServiceFrequency,
        newServiceSchedule: selectedAmendment.newServiceSchedule,
      });
      setSelectedAmendment(updated);
      setAmendmentScopeDirty(false);
      toast.success('Amendment draft saved');
      fetchAmendments(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save amendment draft');
    } finally {
      setAmendmentSubmitting(false);
    }
  };

  const handleRecalculateAmendment = async () => {
    if (!contract || !selectedAmendment) return;
    const scheduleValidationMessage = getAmendmentScheduleValidationMessage(
      selectedAmendment.newServiceFrequency || selectedAmendment.oldServiceFrequency || null,
      selectedAmendment.newServiceSchedule?.days as string[] | undefined
    );
    if (scheduleValidationMessage) {
      toast.error(scheduleValidationMessage);
      return;
    }
    try {
      setAmendmentPricingLoading(true);
      const payload: RecalculateContractAmendmentInput = {
        pricingPlanId: selectedAmendment.pricingPlanId,
        newServiceFrequency: selectedAmendment.newServiceFrequency,
        newServiceSchedule: selectedAmendment.newServiceSchedule,
        workingScope: amendmentWorkingScope,
      };
      const result = await recalculateContractAmendmentApi(
        contract.id,
        selectedAmendment.id,
        payload
      );
      setSelectedAmendment(result.amendment);
      setAmendmentPricing(result.pricing);
      setAmendmentScopeDirty(false);
      toast.success('Amendment price recalculated');
      fetchAmendments(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to recalculate amendment');
    } finally {
      setAmendmentPricingLoading(false);
    }
  };

  const handleToggleAmendmentServiceDay = (day: string) => {
    setSelectedAmendment((current) => {
      if (!current) return current;
      const frequency = current.newServiceFrequency || current.oldServiceFrequency || null;
      const expected = expectedScheduleDays(frequency);
      const currentDays = Array.isArray(current.newServiceSchedule?.days)
        ? [...current.newServiceSchedule.days]
        : defaultScheduleDays(frequency);
      const hasDay = currentDays.includes(day);
      const nextDays = hasDay
        ? currentDays.filter((value) => value !== day)
        : [...currentDays, day];
      if (!hasDay && expected > 0 && nextDays.length > expected) {
        return current;
      }
      return {
        ...current,
        newServiceSchedule: {
          ...(current.newServiceSchedule || {}),
          days: nextDays as ServiceSchedule['days'],
        },
      };
    });
    setAmendmentScopeDirty(true);
  };

  const handleSubmitAmendmentDraft = async () => {
    if (!contract || !selectedAmendment) return;
    const scheduleValidationMessage = getAmendmentScheduleValidationMessage(
      selectedAmendment.newServiceFrequency || selectedAmendment.oldServiceFrequency || null,
      selectedAmendment.newServiceSchedule?.days as string[] | undefined
    );
    if (scheduleValidationMessage) {
      toast.error(scheduleValidationMessage);
      return;
    }
    if (amendmentScopeDirty) {
      toast.error('Save or recalculate the amendment before submitting');
      return;
    }
    if (!selectedAmendment.pricingSnapshot) {
      toast.error('Recalculate the amendment price before submitting');
      return;
    }
    try {
      setAmendmentSubmitting(true);
      const updated = await updateContractAmendmentApi(contract.id, selectedAmendment.id, {
        status: 'submitted',
      });
      setSelectedAmendment(updated);
      toast.success('Amendment submitted');
      fetchAmendments(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit amendment');
    } finally {
      setAmendmentSubmitting(false);
    }
  };

  const handleApproveAmendment = async () => {
    if (!contract || !selectedAmendment) return;
    try {
      setAmendmentSubmitting(true);
      const updated = await approveContractAmendmentApi(contract.id, selectedAmendment.id);
      setSelectedAmendment(updated);
      toast.success('Amendment approved');
      fetchAmendments(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve amendment');
    } finally {
      setAmendmentSubmitting(false);
    }
  };

  const handleRejectAmendment = async () => {
    if (!contract || !selectedAmendment) return;
    const rejectedReason = prompt('Enter rejection reason:');
    if (!rejectedReason) return;
    try {
      setAmendmentSubmitting(true);
      const updated = await rejectContractAmendmentApi(
        contract.id,
        selectedAmendment.id,
        rejectedReason
      );
      setSelectedAmendment(updated);
      toast.success('Amendment rejected');
      fetchAmendments(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject amendment');
    } finally {
      setAmendmentSubmitting(false);
    }
  };

  const handleApplyAmendment = async () => {
    if (!contract || !selectedAmendment) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveDate = new Date(selectedAmendment.effectiveDate);
    effectiveDate.setHours(0, 0, 0, 0);
    const applyingEarly = effectiveDate.getTime() > today.getTime();

    let forceApply = false;
    if (applyingEarly) {
      const confirmedEarlyApply = confirm(
        `This contract change is scheduled to start on ${formatDate(selectedAmendment.effectiveDate)}. Apply it early and start it today instead?`
      );
      if (!confirmedEarlyApply) return;
      forceApply = true;
    } else if (!confirm('Apply this approved contract change to the live contract and facility?')) {
      return;
    }

    try {
      setAmendmentSubmitting(true);
      const result = await applyContractAmendmentApi(contract.id, selectedAmendment.id, {
        forceApply,
      });
      setSelectedAmendment(result.amendment);
      setAppliedRecurringJobsSummary(result.recurringJobs || null);
      const appliedActivity = getLatestAmendmentActivity(result.amendment, 'applied');
      const summary = appliedActivity?.metadata || {};
      const summaryParts = [
        `${summary.updatedAreaCount ?? 0} areas updated`,
        `${summary.createdAreaCount ?? 0} areas added`,
        `${summary.removedAreaCount ?? summary.archivedAreaCount ?? 0} areas removed`,
        `${summary.updatedTaskCount ?? 0} tasks updated`,
        `${summary.createdTaskCount ?? 0} tasks added`,
        `${summary.removedTaskCount ?? summary.archivedTaskCount ?? 0} tasks removed`,
      ];
      if (result.recurringJobs) {
        summaryParts.push(
          `${result.recurringJobs.created} future jobs created`,
          `${result.recurringJobs.canceled} future jobs removed`
        );
      }
      toast.success(
        `${
          forceApply
            ? `Contract change applied early. The original start date was ${formatDateInput(selectedAmendment.effectiveDate)}.`
            : 'Contract change applied.'
        } ${summaryParts.join(' • ')}`
      );
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to apply contract change');
    } finally {
      setAmendmentSubmitting(false);
    }
  };

  const handleTermsDocumentUpload = async (file: File | null) => {
    if (!file) return;
    const allowedTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    if (!allowedTypes.has(file.type)) {
      toast.error('Only PDF, DOC, and DOCX files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Document size must be 5MB or less');
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      setTermsDocumentUpload({
        name: file.name,
        mimeType: file.type,
        dataUrl,
      });
      setTermsDocumentAction('replace');
      toast.success('Terms document attached');
    } catch {
      toast.error('Failed to read selected document');
    }
  };

  const handleSend = async (data: SendContractInput) => {
    if (!contract) return;
    try {
      await sendContract(contract.id, data);
      toast.success('Contract sent successfully');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send contract');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!contract) {
    return <div className="text-center text-gray-400">Contract not found</div>;
  }

  const StatusIcon = getStatusIcon(contract.status);
  const scheduleDays = getScheduleDays(contract.serviceSchedule);
  const scheduleWindow = getScheduleTimeWindow(contract.serviceSchedule);
  const facilityAreas = contract.facility?.areas || [];
  const facilityTasks = contract.facility?.tasks || [];
  const facilityTimezone =
    (contract.facility?.address?.timezone as string | undefined) ||
    (contract.facility?.address?.timeZone as string | undefined) ||
    null;
  const pipelineStatusIndex: Record<ContractStatus, number> = {
    draft: 0,
    sent: 1,
    viewed: 2,
    pending_signature: 3,
    active: 4,
    expired: 4,
    terminated: 4,
  };
  const currentPipelineIndex = pipelineStatusIndex[contract.status];
  const pipelineDates: Array<string | null | undefined> = [
    contract.createdAt,
    contract.sentAt,
    contract.viewedAt,
    contract.signedDate,
    contract.approvedAt,
  ];
  const nextActionText: Partial<Record<ContractStatus, string>> = {
    draft: 'Send contract to client.',
    sent: 'Wait for client to view and accept.',
    viewed: 'Follow up with client for acceptance.',
    pending_signature: 'Activate to start service and billing.',
    active: 'Contract is active.',
    expired: 'Renew this contract or create a new term.',
    terminated: 'Contract closed.',
  };
  const internalEmployeeUsers = users.filter(isInternalEmployeeOption);
  const hasCurrentAssignment = Boolean(contract.assignedTeam?.id || contract.assignedToUser?.id);
  const currentAreaTaskFrequency =
    ORDERED_CLEANING_FREQUENCIES[areaTaskPipelineStep] || 'daily';
  const currentAmendmentTaskSelectionFrequency =
    ORDERED_CLEANING_FREQUENCIES[amendmentTaskSelectionStep] || 'daily';
  const filteredAreaTemplateTasks = areaTemplateTasks.filter(
    (task) => task.cleaningType === currentAreaTaskFrequency
  );
  const filteredAmendmentTaskSelectionTasks = amendmentTaskSelectionTasks.filter(
    (task) => task.cleaningType === currentAmendmentTaskSelectionFrequency
  );
  const allAreaTaskFrequenciesReviewed =
    reviewedAreaTaskFrequencies.size === ORDERED_CLEANING_FREQUENCIES.length;
  const hasSelectedAmendmentTaskSelectionTasks = amendmentTaskSelectionTasks.some((task) => task.include);
  const amendmentAreaTaskGroups = amendmentWorkingScope.areas.map((area, index) => {
    const areaKey = area.id || area.tempId || `draft-area-${index + 1}`;
    return {
      key: areaKey,
      label: area.name || area.areaType?.name || 'Unnamed Area',
      tasks: amendmentWorkingScope.tasks.filter((task) => task.areaId === areaKey),
    };
  });
  const beforeAmendmentSnapshot = getLatestAmendmentSnapshot(selectedAmendment, 'before');
  const beforeAmendmentScope = (beforeAmendmentSnapshot?.scopeJson || {}) as Record<string, any>;
  const targetAmendmentScope = buildWorkingScopeForComparison(
    selectedAmendment,
    amendmentWorkingScope
  );
  const beforeAreas = Array.isArray(beforeAmendmentScope.areas) ? beforeAmendmentScope.areas : [];
  const targetAreas = Array.isArray(targetAmendmentScope.areas) ? targetAmendmentScope.areas : [];
  const beforeTasks = Array.isArray(beforeAmendmentScope.tasks) ? beforeAmendmentScope.tasks : [];
  const targetTasks = Array.isArray(targetAmendmentScope.tasks) ? targetAmendmentScope.tasks : [];
  const targetAreaNameMap = getTaskAreaNameMap(targetAreas);
  const beforeAreaNameMap = getTaskAreaNameMap(beforeAreas);
  const areaChangeSummary = buildComparisonList(
    beforeAreas,
    targetAreas,
    getAreaComparisonKey,
    getAreaDisplayName
  );
  const taskChangeSummary = buildComparisonList(
    beforeTasks,
    targetTasks,
    getTaskComparisonKey,
    (task, index) => describeTaskForComparison(task, index, targetAreaNameMap)
  );
  const removedTaskSummary = buildComparisonList(
    targetTasks,
    beforeTasks,
    getTaskComparisonKey,
    (task, index) => describeTaskForComparison(task, index, beforeAreaNameMap)
  );
  const beforeScheduleSummary = getScheduleSummary(beforeAmendmentScope);
  const targetScheduleSummary = getScheduleSummary(targetAmendmentScope);
  const hasScopeComparison =
    areaChangeSummary.added.length > 0 ||
    areaChangeSummary.removed.length > 0 ||
    taskChangeSummary.added.length > 0 ||
    removedTaskSummary.added.length > 0 ||
    beforeScheduleSummary !== targetScheduleSummary;
  const selectedAmendmentEffectiveDate = selectedAmendment?.effectiveDate
    ? new Date(selectedAmendment.effectiveDate)
    : null;
  const selectedAmendmentStartsInFuture = (() => {
    if (!selectedAmendmentEffectiveDate || Number.isNaN(selectedAmendmentEffectiveDate.getTime())) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effective = new Date(selectedAmendmentEffectiveDate);
    effective.setHours(0, 0, 0, 0);
    return effective.getTime() > today.getTime();
  })();
  const latestAppliedActivity = getLatestAmendmentActivity(selectedAmendment, 'applied');
  const latestApplySummary = latestAppliedActivity?.metadata || null;
  const facilityWideDraftTasks = amendmentWorkingScope.tasks.filter((task) => !task.areaId);
  const selectedAssignmentTeamId = assignmentMode === 'subcontractor_team' ? selectedTeamId || null : null;
  const selectedAssignmentUserId = assignmentMode === 'internal_employee' ? selectedUserId || null : null;
  const assignmentWillChange =
    selectedAssignmentTeamId !== (contract.assignedTeam?.id || null) ||
    selectedAssignmentUserId !== (contract.assignedToUser?.id || null);
  const hasNextAssignment = Boolean(selectedAssignmentTeamId || selectedAssignmentUserId);
  const shouldScheduleOverride = hasCurrentAssignment && hasNextAssignment && assignmentWillChange;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" onClick={() => navigate('/contracts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white truncate">{contract.contractNumber}</h1>
            <Badge variant={getStatusVariant(contract.status)}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {STATUS_LABELS[contract.status] || contract.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {contract.status === 'active' && contract.endDate && (() => {
              const daysLeft = Math.ceil(
                (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return daysLeft <= 30 && daysLeft > 0 ? (
                <Badge variant="warning">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Expires in {daysLeft} days
                </Badge>
              ) : null;
            })()}
          </div>
          <p className="text-gray-400">{contract.title}</p>
        </div>
        {!isLimitedContractViewer && (
          <div className="flex items-center gap-2">
            {/* Primary actions based on status */}
            {contract.status === 'draft' && canWriteContracts && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={() => setShowSendModal(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </>
            )}
            {(contract.status === 'sent' || contract.status === 'viewed') && canWriteContracts && (
              <Button onClick={handleActivate}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Activate
              </Button>
            )}
            {contract.status === 'pending_signature' && canWriteContracts && (
              <Button onClick={handleActivate}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Activate
              </Button>
            )}
            {(contract.status === 'active' || contract.status === 'expired') && canWriteContracts && (
              <>
                <Button onClick={openRenewModal}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renew
                </Button>
              </>
            )}
            {contract.archivedAt && canAdminContracts && (
              <Button variant="secondary" onClick={handleRestore}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </Button>
            )}

            {/* More actions dropdown */}
            <div className="relative">
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-white/10 bg-surface-800 shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    onClick={handleDownloadPdf}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                  {contract.publicToken && (
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}/c/${contract.publicToken}`;
                        try {
                          await navigator.clipboard.writeText(url);
                          toast.success('Link copied');
                        } catch {
                          prompt('Copy this link:', url);
                        }
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Copy Public Link
                    </button>
                  )}
                  {['sent', 'viewed', 'active'].includes(contract.status) && canWriteContracts && (
                    <button
                      onClick={() => { setMenuOpen(false); setShowSendModal(true); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      <Mail className="h-4 w-4" />
                      Resend Email
                    </button>
                  )}
                  {contract.status === 'active' && canWriteContracts && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        onClick={() => { setMenuOpen(false); handleTerminate(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Terminate
                      </button>
                    </>
                  )}
                  {!contract.archivedAt && !['active', 'terminated'].includes(contract.status) && canAdminContracts && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        onClick={() => { setMenuOpen(false); handleArchive(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-white/5 hover:text-orange-300"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {canViewPipelines && (
      <Card>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-white">Contract Pipeline</div>
              <div className="text-xs text-gray-400">
                Track required stages from draft to active.
              </div>
            </div>
            <Badge variant={contract.status === 'terminated' ? 'error' : contract.status === 'expired' ? 'warning' : 'info'}>
              {nextActionText[contract.status]}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-1 overflow-x-auto px-1 py-1">
            {CONTRACT_PIPELINE_STEPS.map((step, index) => {
              const isLast = index === CONTRACT_PIPELINE_STEPS.length - 1;
              const isDone = index <= currentPipelineIndex;
              const isCurrent = index === currentPipelineIndex;
              const isBlocked =
                contract.status === 'terminated' && index === CONTRACT_PIPELINE_STEPS.length - 1;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex min-w-[62px] flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                        isBlocked
                          ? 'border-red-500/70 bg-red-500/15 text-red-300'
                          : isDone
                            ? `border-emerald-400 bg-emerald-400/15 text-emerald-200 ${isCurrent ? 'ring-2 ring-emerald-400/30 ring-offset-2 ring-offset-surface-800' : ''}`
                            : 'border-gray-600 text-gray-500'
                      }`}
                    >
                      {isDone ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className={`mt-1 text-xs ${isDone ? 'text-white' : 'text-gray-500'}`}>
                      {step.label}
                    </div>
                    <div className="mt-0.5 text-[10px] text-gray-500">
                      {isDone ? formatShortDate(pipelineDates[index]) : '\u00A0'}
                    </div>
                  </div>
                  {!isLast && (
                    <div
                      className={`mx-1 mt-[-18px] h-0.5 flex-1 ${
                        index < currentPipelineIndex ? 'bg-emerald-400/60' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {contract.status === 'terminated' && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              This contract is terminated and no longer progresses in the pipeline.
            </div>
          )}
          {contract.status === 'expired' && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              This contract has expired. Renew to continue service.
            </div>
          )}
        </div>
      </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account & Facility Information */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Account & Facility</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400">Account</div>
              <div className="text-white font-medium">{contract.account.name}</div>
              <div className="text-sm text-gray-400 capitalize">{contract.account.type}</div>
            </div>
            {contract.facility && (
              <div>
                <div className="text-sm text-gray-400">Facility</div>
                <div className="text-white font-medium">{contract.facility.name}</div>
                {contract.facility.address && (
                  <div className="flex items-start gap-1 text-sm text-gray-400">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{formatAddress(contract.facility.address)}</span>
                  </div>
                )}
                {contract.facility.buildingType && (
                  <div className="text-sm text-gray-400 mt-1 capitalize">
                    {contract.facility.buildingType.replace(/_/g, ' ')}
                  </div>
                )}
                {isLimitedContractViewer &&
                  (contract.facility.accessInstructions ||
                    contract.facility.parkingInfo ||
                    contract.facility.specialRequirements ||
                    contract.facility.notes) && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
                      <div className="text-xs uppercase tracking-wide text-emerald-300">
                        Facility Notes & Access
                      </div>
                      {contract.facility.accessInstructions && (
                        <div>
                          <div className="text-xs text-gray-400">Access Instructions</div>
                          <div className="text-sm text-gray-200 whitespace-pre-wrap">
                            {contract.facility.accessInstructions}
                          </div>
                        </div>
                      )}
                      {contract.facility.parkingInfo && (
                        <div>
                          <div className="text-xs text-gray-400">Parking</div>
                          <div className="text-sm text-gray-200 whitespace-pre-wrap">
                            {contract.facility.parkingInfo}
                          </div>
                        </div>
                      )}
                      {contract.facility.specialRequirements && (
                        <div>
                          <div className="text-xs text-gray-400">Special Requirements</div>
                          <div className="text-sm text-gray-200 whitespace-pre-wrap">
                            {contract.facility.specialRequirements}
                          </div>
                        </div>
                      )}
                      {contract.facility.notes && (
                        <div>
                          <div className="text-xs text-gray-400">Facility Notes</div>
                          <div className="text-sm text-gray-200 whitespace-pre-wrap">
                            {contract.facility.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}
            {contract.proposal && !isLimitedContractViewer && (
              <div>
                <div className="text-sm text-gray-400">Source Proposal</div>
                <button
                  onClick={() => navigate(`/proposals/${contract.proposal?.id}`)}
                  className="text-gold hover:underline"
                >
                  {contract.proposal.proposalNumber} - {contract.proposal.title}
                </button>
              </div>
            )}
            {contract.renewalNumber > 0 && (
              <div>
                <div className="text-sm text-gray-400">Renewal</div>
                <div className="text-white">Renewal #{contract.renewalNumber}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Financial Terms */}
        {isSubcontractor ? (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-teal-400" />
              <h2 className="text-lg font-semibold text-white">Your Payout</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">Monthly Payout</div>
                <div className="text-2xl font-bold text-teal-400">
                  {formatCurrency(Number(contract.subcontractorPayout || 0))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Billing Cycle</div>
                  <div className="text-white capitalize">
                    {contract.billingCycle.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Payment Terms</div>
                  <div className="text-white">{contract.paymentTerms}</div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">Financial Terms</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">Monthly Value</div>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(Number(contract.monthlyValue))}
                </div>
              </div>
              {contract.totalValue && (
                <div>
                  <div className="text-sm text-gray-400">Total Contract Value</div>
                  <div className="text-xl font-semibold text-white">
                    {formatCurrency(Number(contract.totalValue))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Billing Cycle</div>
                  <div className="text-white capitalize">
                    {contract.billingCycle.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Payment Terms</div>
                  <div className="text-white">{contract.paymentTerms}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Assignment — hidden for subcontractors */}
        {isLimitedContractViewer && contract.facility && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Facility Areas & Tasks</h2>
            </div>
            <div className="space-y-5">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-xs uppercase tracking-wide text-emerald-300">Scope Summary</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="success" size="sm">
                    {facilityAreas.length} area{facilityAreas.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="info" size="sm">
                    {facilityTasks.length} task{facilityTasks.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              {facilityAreas.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {facilityAreas.map((area) => {
                    const areaName = area.name || '';
                    const areaTasks = facilityTasks.filter((task) => (task.areaName || '') === areaName);
                    const tasksByFrequency = groupTasksByFrequency(areaTasks);

                    return (
                      <div key={area.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="font-medium text-white">{area.name || 'Unnamed area'}</div>
                          <Badge variant="default" size="sm">
                            {areaTasks.length} task{areaTasks.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400">
                          {area.areaType || 'General area'}
                          {area.squareFeet ? ` - ${area.squareFeet.toLocaleString()} sq ft` : ''}
                        </div>
                        {areaTasks.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {tasksByFrequency.map(([frequency, tasks]) => (
                              <div key={`${area.id}-${frequency}`} className="space-y-1.5">
                                <div className="text-[11px] uppercase tracking-wide text-emerald-300">
                                  {frequency}
                                </div>
                                {tasks.map((task, idx) => (
                                  <div
                                    key={`${area.id}-${frequency}-${task.name}-${idx}`}
                                    className="rounded-md border border-white/10 bg-black/10 px-2.5 py-1.5 text-sm text-gray-200"
                                  >
                                    {task.name}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-gray-500">No tasks assigned for this area</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No facility areas configured on this contract.</div>
              )}

              {facilityTasks.some((task) => !task.areaName) && (
                <div className="rounded-lg border border-white/10 p-3">
                  <div className="mb-2 text-sm font-medium text-gray-300">General Tasks</div>
                  <div className="space-y-2">
                    {groupTasksByFrequency(facilityTasks.filter((task) => !task.areaName)).map(
                      ([frequency, tasks]) => (
                        <div key={`general-${frequency}`} className="space-y-1.5">
                          <div className="text-[11px] uppercase tracking-wide text-emerald-300">
                            {frequency}
                          </div>
                          {tasks.map((task, idx) => (
                            <div
                              key={`general-task-${frequency}-${task.name}-${idx}`}
                              className="rounded-md border border-white/10 bg-black/10 px-2.5 py-1.5 text-sm text-gray-200"
                            >
                              {task.name}
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {contract.proposal?.proposalServices && contract.proposal.proposalServices.length > 0 && (
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold text-white">Services</h2>
            </div>
            <div className="space-y-5">
              {contract.proposal.proposalServices.map((service) => {
                const { areaSummary, groups } = buildServiceTaskGroups(
                  service.description,
                  service.includedTasks
                );

                return (
                  <div
                    key={service.id}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-white">{service.serviceName}</div>
                        {areaSummary && (
                          <div className="mt-1 text-sm text-gray-400">{areaSummary}</div>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatFrequency(service.frequency)}
                        {service.monthlyPrice != null && (
                          <span className="ml-2 font-medium text-emerald-300">
                            {formatCurrency(Number(service.monthlyPrice))}/month
                          </span>
                        )}
                      </div>
                    </div>
                    <ServiceTaskStepper serviceId={service.id} groups={groups} />
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {!isLimitedContractViewer && <Card>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Assignment</h2>
          </div>
          <div className="space-y-4">
            {contract.assignmentOverrideEffectiveDate &&
              (contract.pendingAssignedTeam || contract.pendingAssignedToUser) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  A new assignee is scheduled on{' '}
                  <span className="font-semibold">
                    {formatDate(contract.assignmentOverrideEffectiveDate)}
                  </span>
                  :{' '}
                  <span className="font-semibold">
                    {contract.pendingAssignedToUser?.fullName ||
                      contract.pendingAssignedTeam?.name ||
                      'Pending assignee'}
                  </span>
                  . Future scheduled jobs from that date will be reassigned automatically.
                </div>
              )}
            <Select
              label="Assign To"
              value={assignmentMode}
              onChange={(value) => setAssignmentMode(value as AssignmentMode)}
              disabled={contract.status !== 'active' || !canAdminContracts}
              options={[
                { value: 'subcontractor_team', label: 'Subcontractor Team' },
                { value: 'internal_employee', label: 'Internal Employee' },
              ]}
            />
            {assignmentMode === 'subcontractor_team' ? (
              <>
                <Select
                  label="Subcontractor Team"
                  value={selectedTeamId}
                  onChange={(value) => {
                    setSelectedTeamId(value);
                    if (value) setSelectedUserId('');
                  }}
                  disabled={contract.status !== 'active' || !canAdminContracts}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...teams.map((team) => ({ value: team.id, label: team.name })),
                  ]}
                  hint={
                    contract.status !== 'active'
                      ? 'Assignments can only be changed on active contracts'
                      : !canAdminContracts
                        ? 'You do not have permission to update assignments'
                        : undefined
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Subcontractor Tier"
                    value={selectedTier}
                    onChange={setSelectedTier}
                    disabled={contract.status !== 'active' || !canAdminContracts}
                    options={SUBCONTRACTOR_TIER_OPTIONS}
                  />
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Subcontract Pay</div>
                    <div className="text-lg font-semibold text-teal-400">
                      ${(Number(contract.monthlyValue) * tierToPercentage(selectedTier)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {(tierToPercentage(selectedTier) * 100).toFixed(0)}% of monthly value
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Select
                label="Internal Employee"
                value={selectedUserId}
                onChange={(value) => {
                  setSelectedUserId(value);
                  if (value) setSelectedTeamId('');
                }}
                disabled={contract.status !== 'active' || !canAdminContracts}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...internalEmployeeUsers.map((user) => ({ value: user.id, label: user.fullName })),
                ]}
                hint={
                  contract.status !== 'active'
                    ? 'Assignments can only be changed on active contracts'
                    : !canAdminContracts
                      ? 'You do not have permission to update assignments'
                      : internalEmployeeUsers.length === 0
                        ? 'No internal employees available'
                      : undefined
                }
              />
            )}
            {shouldScheduleOverride && (
              <Input
                label="Effectivity Date *"
                type="date"
                value={overrideEffectivityDate}
                onChange={(e) => setOverrideEffectivityDate(e.target.value)}
                hint="Because this is an override, assignment changes take effect on this date and future scheduled jobs will be reassigned automatically."
                disabled={contract.status !== 'active' || !canAdminContracts}
              />
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Current: {contract.assignedTeam?.name || contract.assignedToUser?.fullName || 'Unassigned'}
              </div>
              <Button
                onClick={handleAssignTeam}
                disabled={contract.status !== 'active' || !canAdminContracts}
                isLoading={assigningTeam}
              >
                {shouldScheduleOverride ? 'Schedule Override' : 'Save Assignment'}
              </Button>
            </div>
          </div>
        </Card>}

        {/* Service Terms */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Service Terms</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Start Date</div>
                <div className="text-white">{formatDate(contract.startDate)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">End Date</div>
                <div className="text-white">{formatDate(contract.endDate)}</div>
              </div>
            </div>
            {contract.serviceFrequency && (
              <div>
                <div className="text-sm text-gray-400">Service Frequency</div>
                <div className="text-white capitalize">
                  {contract.serviceFrequency.replace('_', ' ')}
                </div>
              </div>
            )}
            {scheduleDays.length > 0 && (
              <div>
                <div className="text-sm text-gray-400">Scheduled Days</div>
                <div className="text-white">
                  {scheduleDays.map((day) => DAY_LABELS[day] || day).join(', ')}
                </div>
              </div>
            )}
            {scheduleWindow && (
              <div>
                <div className="text-sm text-gray-400">Allowed Service Window</div>
                <div className="text-white">{scheduleWindow}</div>
              </div>
            )}
            {(facilityTimezone || scheduleWindow) && (
              <div>
                <div className="text-sm text-gray-400">Timezone / Anchor</div>
                <div className="text-white">
                  {(facilityTimezone || 'Facility timezone')} (start day anchor)
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Auto-Renew</div>
                <div className="text-white">{contract.autoRenew ? 'Yes' : 'No'}</div>
              </div>
              {contract.renewalNoticeDays && (
                <div>
                  <div className="text-sm text-gray-400">Renewal Notice</div>
                  <div className="text-white">{contract.renewalNoticeDays} days</div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Workflow & Signatures — hidden for subcontractors */}
        {!isLimitedContractViewer && <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileSignature className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Workflow & Signatures</h2>
          </div>
          <div className="space-y-4">
            {contract.sentAt && (
              <div>
                <div className="text-sm text-gray-400">Sent</div>
                <div className="text-white">{formatDate(contract.sentAt)}</div>
              </div>
            )}
            {contract.viewedAt && (
              <div>
                <div className="text-sm text-gray-400">Viewed by Client</div>
                <div className="text-white">{formatDate(contract.viewedAt)}</div>
              </div>
            )}
            {contract.signedByName && (
              <div>
                <div className="text-sm text-gray-400">Signed By</div>
                <div className="text-white">{contract.signedByName}</div>
                <div className="text-sm text-gray-400">{contract.signedByEmail}</div>
                <div className="text-sm text-gray-400">
                  Signed on: {formatDate(contract.signedDate)}
                </div>
              </div>
            )}
            {contract.approvedByUser && (
              <div>
                <div className="text-sm text-gray-400">Approved By</div>
                <div className="text-white">{contract.approvedByUser.fullName}</div>
                <div className="text-sm text-gray-400">
                  Approved on: {formatDate(contract.approvedAt)}
                </div>
              </div>
            )}
            {contract.terminationReason && (
              <div>
                <div className="text-sm text-gray-400">Termination Reason</div>
                <div className="text-white">{contract.terminationReason}</div>
                <div className="text-sm text-gray-400">
                  Terminated on: {formatDate(contract.terminatedAt)}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-400">Created By</div>
              <div className="flex items-center gap-1 text-white">
                <User className="h-4 w-4" />
                {contract.createdByUser.fullName}
              </div>
              <div className="text-sm text-gray-400">
                {formatDate(contract.createdAt)}
              </div>
            </div>
            {contract.publicToken && (
              <div>
                <div className="text-sm text-gray-400 mb-1">Public Link</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-white/5 px-2 py-1 text-xs text-gray-300">
                    {`${window.location.origin}/c/${contract.publicToken}`}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const url = `${window.location.origin}/c/${contract.publicToken}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        toast.success('Link copied');
                      } catch {
                        prompt('Copy this link:', url);
                      }
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>}
      </div>

      {/* Terms & Conditions — hidden for subcontractors */}
      {!isLimitedContractViewer && <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Terms & Conditions</h2>
          {['draft', 'sent', 'viewed', 'pending_signature'].includes(contract.status) && !editingTerms && canWriteContracts && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTermsText(contract.termsAndConditions || '');
                setTermsDocumentAction('unchanged');
                setTermsDocumentUpload(null);
                setEditingTerms(true);
              }}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
        {editingTerms ? (
          <div className="space-y-3">
            <Textarea
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              rows={16}
              placeholder="Enter contract terms and conditions..."
            />
            <div className="rounded-lg border border-white/10 bg-navy-darker/40 p-3">
              <div className="text-sm font-medium text-gray-300 mb-2">Custom Terms Document</div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10">
                  <Upload className="h-4 w-4" />
                  {termsDocumentAction === 'replace' || contract.termsDocumentName ? 'Replace Document' : 'Upload Document'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => handleTermsDocumentUpload(e.target.files?.[0] || null)}
                  />
                </label>
                {(termsDocumentAction === 'replace' ? termsDocumentUpload?.name : contract.termsDocumentName) && (
                  <span className="text-sm text-gray-300">
                    {termsDocumentAction === 'replace' ? termsDocumentUpload?.name : contract.termsDocumentName}
                  </span>
                )}
                {(termsDocumentAction === 'replace' || contract.termsDocumentName) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTermsDocumentUpload(null);
                      setTermsDocumentAction('remove');
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-400">Supported formats: PDF, DOC, DOCX. Max file size: 5MB.</p>
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (termsText && !window.confirm('This will replace the current terms. Continue?')) return;
                  setGeneratingTerms(true);
                  try {
                    const terms = await generateContractTerms({
                      accountId: contract.account.id,
                      facilityId: contract.facility?.id,
                      startDate: contract.startDate,
                      endDate: contract.endDate,
                      monthlyValue: Number(contract.monthlyValue),
                      billingCycle: contract.billingCycle,
                      paymentTerms: contract.paymentTerms,
                      serviceFrequency: contract.serviceFrequency,
                      autoRenew: contract.autoRenew,
                      renewalNoticeDays: contract.renewalNoticeDays,
                      title: contract.title,
                    });
                    setTermsText(terms);
                    toast.success('Default terms generated');
                  } catch {
                    toast.error('Failed to generate terms');
                  } finally {
                    setGeneratingTerms(false);
                  }
                }}
                disabled={generatingTerms}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {generatingTerms ? 'Generating...' : 'Generate Default Terms'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingTerms(false)}
                  disabled={savingTerms}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    setSavingTerms(true);
                    try {
                      const updatePayload: UpdateContractInput = { termsAndConditions: termsText || null };
                      if (termsDocumentAction === 'replace' && termsDocumentUpload) {
                        updatePayload.termsDocumentName = termsDocumentUpload.name;
                        updatePayload.termsDocumentMimeType = termsDocumentUpload.mimeType;
                        updatePayload.termsDocumentDataUrl = termsDocumentUpload.dataUrl;
                      } else if (termsDocumentAction === 'remove') {
                        updatePayload.termsDocumentName = null;
                        updatePayload.termsDocumentMimeType = null;
                        updatePayload.termsDocumentDataUrl = null;
                      }
                      await updateContract(contract.id, updatePayload);
                      setEditingTerms(false);
                      refreshAll(contract.id);
                      toast.success('Terms updated');
                    } catch {
                      toast.error('Failed to save terms');
                    } finally {
                      setSavingTerms(false);
                    }
                  }}
                  disabled={savingTerms}
                >
                  {savingTerms ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        ) : contract.termsAndConditions ? (
          <div className="text-gray-300 whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
            {contract.termsAndConditions}
          </div>
        ) : !isLimitedContractViewer ? (
          <p className="text-gray-500 text-sm italic">No terms and conditions set.</p>
        ) : null}
        {contract.termsDocumentName && !editingTerms && (
          <div className="mt-4 rounded-lg border border-white/10 bg-navy-darker/40 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-gray-200">Custom Contract Document</div>
                <div className="text-xs text-gray-400">{contract.termsDocumentName}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={handleDownloadTermsDocument}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}
      </Card>}

      {/* Special Instructions */}
      {contract.specialInstructions && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Special Instructions</h2>
          <div className="text-gray-300 whitespace-pre-wrap">
            {contract.specialInstructions}
          </div>
        </Card>
      )}

      {!isLimitedContractViewer && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Contract Changes</h2>
              <p className="mt-1 text-sm text-gray-400">
                Draft and track scope changes against the active contract without touching the live facility yet.
              </p>
            </div>
            {canWriteContracts && contract.status === 'active' && (
              <Button onClick={openAmendmentModal}>
                <FileText className="mr-2 h-4 w-4" />
                Create Contract Change
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {amendmentsLoading ? (
              <div className="text-sm text-gray-400">Loading amendments...</div>
            ) : amendments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-4 py-5 text-sm text-gray-400">
                No amendments yet.
              </div>
            ) : (
              amendments.map((amendment) => {
                const snapshotCount = amendment.snapshots?.length || 0;
                return (
                  <div
                    key={amendment.id}
                    className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-white">
                            Amendment #{amendment.amendmentNumber}
                          </div>
                          <Badge variant={getAmendmentStatusVariant(amendment.status)}>
                            {AMENDMENT_STATUS_LABELS[amendment.status] || amendment.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-gray-300">
                          {amendment.title}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Effective {formatDate(amendment.effectiveDate)} · Old {formatCurrency(amendment.oldMonthlyValue)}
                          {amendment.newMonthlyValue != null
                            ? ` -> New ${formatCurrency(amendment.newMonthlyValue)}`
                            : ''}
                        </div>
                        {amendment.summary && (
                          <div className="mt-1 text-xs text-gray-500">{amendment.summary}</div>
                        )}
                        {snapshotCount > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {snapshotCount} snapshot{snapshotCount === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenAmendmentDetail(amendment.id)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Activity Timeline — hidden for subcontractors */}
      {contract && !isLimitedContractViewer && (
        <ContractTimeline contractId={contract.id} refreshTrigger={activityRefresh} />
      )}

      {/* Send Contract Modal */}
      {contract && canWriteContracts && !isLimitedContractViewer && (
        <SendContractModal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          contract={contract}
          onSend={handleSend}
        />
      )}

      {/* Renewal Modal */}
      <Modal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        title="Renew Contract"
        size="lg"
      >
        <div className="space-y-6">
          <div className="rounded-lg border border-white/10 bg-navy-darker/50 p-4">
            <h4 className="text-sm font-medium text-gray-400">Renewing Contract</h4>
            <p className="mt-1 text-white">{contract.contractNumber}</p>
            <p className="text-sm text-gray-400">{contract.title}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              value={renewalFormData.startDate}
              onChange={(e) =>
                setRenewalFormData({ ...renewalFormData, startDate: e.target.value })
              }
            />
            <Input
              label="End Date"
              type="date"
              value={renewalFormData.endDate || ''}
              onChange={(e) =>
                setRenewalFormData({
                  ...renewalFormData,
                  endDate: e.target.value || null,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Value"
              type="number"
              step="0.01"
              value={renewalFormData.monthlyValue || ''}
              onChange={(e) =>
                setRenewalFormData({
                  ...renewalFormData,
                  monthlyValue: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <Select
              label="Billing Cycle"
              options={BILLING_CYCLES}
              value={renewalFormData.billingCycle || 'monthly'}
              onChange={(value) =>
                setRenewalFormData({
                  ...renewalFormData,
                  billingCycle: value as any,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Service Frequency"
              placeholder="Select frequency"
              options={SERVICE_FREQUENCIES}
              value={renewalFormData.serviceFrequency || ''}
              onChange={(value) =>
                setRenewalFormData({
                  ...renewalFormData,
                  serviceFrequency: (value || null) as any,
                })
              }
            />
            <Input
              label="Payment Terms"
              value={renewalFormData.paymentTerms || ''}
              onChange={(e) =>
                setRenewalFormData({
                  ...renewalFormData,
                  paymentTerms: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={renewalFormData.autoRenew || false}
                  onChange={(e) =>
                    setRenewalFormData({
                      ...renewalFormData,
                      autoRenew: e.target.checked,
                    })
                  }
                  className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                />
                Auto-Renew
              </label>
            </div>
            <Input
              label="Renewal Notice Days"
              type="number"
              value={renewalFormData.renewalNoticeDays || ''}
              onChange={(e) =>
                setRenewalFormData({
                  ...renewalFormData,
                  renewalNoticeDays: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>

          <Textarea
            label="Terms & Conditions"
            rows={3}
            value={renewalFormData.termsAndConditions || ''}
            onChange={(e) =>
              setRenewalFormData({
                ...renewalFormData,
                termsAndConditions: e.target.value || null,
              })
            }
          />

          <Textarea
            label="Special Instructions"
            rows={2}
            value={renewalFormData.specialInstructions || ''}
            onChange={(e) =>
              setRenewalFormData({
                ...renewalFormData,
                specialInstructions: e.target.value || null,
              })
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRenewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenew} isLoading={renewing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Renew Contract
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAmendmentModal}
        onClose={() => setShowAmendmentModal(false)}
        title="Create Contract Change Draft"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-navy-darker/50 p-4 text-sm text-gray-300">
            This creates an amendment draft with a snapshot of the current contract and facility scope. The live contract and facility are not changed yet.
          </div>
          <Input
            label="Title"
            value={amendmentFormData.title || ''}
            onChange={(e) =>
              setAmendmentFormData((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <Input
            label="Effective Date"
            type="date"
            value={amendmentFormData.effectiveDate || ''}
            onChange={(e) =>
              setAmendmentFormData((prev) => ({
                ...prev,
                effectiveDate: e.target.value,
              }))
            }
          />
          <Textarea
            label="Reason"
            rows={3}
            value={amendmentFormData.reason || ''}
            onChange={(e) =>
              setAmendmentFormData((prev) => ({ ...prev, reason: e.target.value }))
            }
          />
          <Textarea
            label="Summary"
            rows={3}
            value={amendmentFormData.summary || ''}
            onChange={(e) =>
              setAmendmentFormData((prev) => ({ ...prev, summary: e.target.value }))
            }
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAmendmentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAmendment} isLoading={amendmentSubmitting}>
              Create Draft
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAmendmentDetailModal}
        onClose={() => {
          setAppliedRecurringJobsSummary(null);
          setShowAmendmentDetailModal(false);
        }}
        title={
          selectedAmendment
            ? `Amendment #${selectedAmendment.amendmentNumber}`
            : 'Amendment Detail'
        }
        size="2xl"
      >
        {amendmentDetailLoading || !selectedAmendment ? (
          <div className="py-8 text-sm text-gray-400">Loading amendment detail...</div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getAmendmentStatusVariant(selectedAmendment.status)}>
                {AMENDMENT_STATUS_LABELS[selectedAmendment.status] || selectedAmendment.status}
              </Badge>
              <div className="text-sm text-gray-400">
                Effective {formatDate(selectedAmendment.effectiveDate)}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-white">{selectedAmendment.title}</div>
              {selectedAmendment.reason && (
                <div className="mt-2 text-sm text-gray-300">{selectedAmendment.reason}</div>
              )}
              {selectedAmendment.summary && (
                <div className="mt-2 text-sm text-gray-400">{selectedAmendment.summary}</div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-navy-darker/40 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Old Monthly</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatCurrency(selectedAmendment.oldMonthlyValue)}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-navy-darker/40 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">New Monthly</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {selectedAmendment.newMonthlyValue != null
                    ? formatCurrency(selectedAmendment.newMonthlyValue)
                    : 'Pending'}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-navy-darker/40 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Monthly Change</div>
                <div
                  className={`mt-1 text-lg font-semibold ${
                    selectedAmendment.monthlyDelta == null
                      ? 'text-white'
                      : selectedAmendment.monthlyDelta > 0
                        ? 'text-emerald-400'
                        : selectedAmendment.monthlyDelta < 0
                          ? 'text-rose-400'
                          : 'text-white'
                  }`}
                >
                  {selectedAmendment.monthlyDelta != null
                    ? formatCurrencyChange(selectedAmendment.monthlyDelta)
                    : 'Pending'}
                </div>
              </div>
            </div>

            {selectedAmendment.status === 'draft' && canWriteContracts && (
              <div className="space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-white">Edit Service Areas and Tasks</div>
                    <div className="mt-1 text-xs text-gray-400">
                      Update the service areas, tasks, and schedule here, then update the price before sending it for approval.
                    </div>
                  </div>
                  {amendmentScopeDirty && (
                    <Badge variant="warning">Unsaved changes</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select
                    label="Pricing Plan"
                    options={pricingPlans.map((plan) => ({ value: plan.id, label: plan.name }))}
                    value={selectedAmendment.pricingPlanId || ''}
                    onChange={(value) => {
                      setSelectedAmendment((current) =>
                        current ? { ...current, pricingPlanId: value || null } : current
                      );
                      setAmendmentScopeDirty(true);
                    }}
                  />
                  <Select
                    label="Service Frequency"
                    options={SERVICE_FREQUENCIES.filter((option) => option.value !== 'custom')}
                    value={selectedAmendment.newServiceFrequency || ''}
                    onChange={(value) => {
                      const nextDays = defaultScheduleDays(value || null);
                      setSelectedAmendment((current) =>
                        current
                          ? {
                              ...current,
                              newServiceFrequency: (value || null) as any,
                              newServiceSchedule: {
                                ...(current.newServiceSchedule || {}),
                                days: nextDays as ServiceSchedule['days'],
                              },
                            }
                          : current
                      );
                      setAmendmentScopeDirty(true);
                    }}
                  />
                </div>

                <div className="rounded-lg border border-white/10 bg-navy-darker/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">Service Days</div>
                      <div className="mt-1 text-xs text-gray-400">
                        Select the new service days for this amendment.
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Required: {expectedScheduleDays(selectedAmendment.newServiceFrequency || selectedAmendment.oldServiceFrequency || null) || 'Custom'}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {AMENDMENT_SCHEDULE_DAY_OPTIONS.map((day) => {
                      const requiredDays = expectedScheduleDays(
                        selectedAmendment.newServiceFrequency ||
                          selectedAmendment.oldServiceFrequency ||
                          null
                      );
                      const selectedDays = Array.isArray(selectedAmendment.newServiceSchedule?.days)
                        ? selectedAmendment.newServiceSchedule?.days
                        : defaultScheduleDays(
                            selectedAmendment.newServiceFrequency ||
                              selectedAmendment.oldServiceFrequency ||
                              null
                          );
                      const isSelected = selectedDays.includes(day.value);
                      const disabled = !isSelected && requiredDays > 0 && selectedDays.length >= requiredDays;
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => handleToggleAmendmentServiceDay(day.value)}
                          disabled={disabled}
                          className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                            isSelected
                              ? 'border-emerald bg-emerald/15 text-white'
                              : disabled
                                ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-500'
                                : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  {getAmendmentScheduleValidationMessage(
                    selectedAmendment.newServiceFrequency ||
                      selectedAmendment.oldServiceFrequency ||
                      null,
                    selectedAmendment.newServiceSchedule?.days as string[] | undefined
                  ) && (
                    <div className="mt-2 text-xs text-amber-300">
                      {getAmendmentScheduleValidationMessage(
                        selectedAmendment.newServiceFrequency ||
                          selectedAmendment.oldServiceFrequency ||
                          null,
                        selectedAmendment.newServiceSchedule?.days as string[] | undefined
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Areas</div>
                      <div className="mt-1 text-xs text-gray-500">
                        New areas use the guided facility task setup with frequency progress.
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={openAmendmentAreaModal}>
                      Add Area
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {amendmentWorkingScope.areas.map((area) => {
                      const areaKey = area.id || area.tempId || createTempId('area');
                      const isCollapsed = collapsedAmendmentAreas[areaKey] ?? false;
                      return (
                        <div key={areaKey} className="rounded-lg border border-white/10 bg-navy-darker/40">
                          <div className="flex items-center justify-between gap-3 px-3 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-2 text-left"
                              onClick={() =>
                                setCollapsedAmendmentAreas((current) => ({
                                  ...current,
                                  [areaKey]: !isCollapsed,
                                }))
                              }
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {area.name || area.areaType?.name || 'Unnamed Area'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {(area.squareFeet ?? 0).toLocaleString()} sqft · Qty {area.quantity ?? 1}
                                </div>
                              </div>
                            </button>
                            <Button size="sm" variant="secondary" onClick={() => removeDraftArea(areaKey)}>
                              Remove Area
                            </Button>
                          </div>
                          {!isCollapsed && (
                            <div className="space-y-3 border-t border-white/10 px-3 py-3">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <Select
                                  label="Area Type"
                                  options={areaTypes.map((type) => ({ value: type.id, label: type.name }))}
                                  value={area.areaTypeId || area.areaType?.id || ''}
                                  onChange={(value) => {
                                    const type = areaTypes.find((entry) => entry.id === value);
                                    updateAmendmentArea(areaKey, {
                                      areaTypeId: value || null,
                                      areaType: type ? { id: type.id, name: type.name } : null,
                                      name: area.name || type?.name || '',
                                    });
                                  }}
                                />
                                <Input
                                  label="Area Name"
                                  value={area.name || ''}
                                  onChange={(e) => updateAmendmentArea(areaKey, { name: e.target.value })}
                                />
                                <Input
                                  label="Square Feet"
                                  type="number"
                                  min="0"
                                  value={area.squareFeet ?? 0}
                                  onChange={(e) =>
                                    updateAmendmentArea(areaKey, {
                                      squareFeet: e.target.value ? Number(e.target.value) : 0,
                                    })
                                  }
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                <Input
                                  label="Qty"
                                  type="number"
                                  min="1"
                                  value={area.quantity ?? 1}
                                  onChange={(e) =>
                                    updateAmendmentArea(areaKey, {
                                      quantity: e.target.value ? Number(e.target.value) : 1,
                                    })
                                  }
                                />
                                <Select
                                  label="Floor"
                                  options={FLOOR_TYPE_OPTIONS}
                                  value={area.floorType || 'vct'}
                                  onChange={(value) => updateAmendmentArea(areaKey, { floorType: value })}
                                />
                                <Select
                                  label="Condition"
                                  options={CONDITION_OPTIONS}
                                  value={area.conditionLevel || 'standard'}
                                  onChange={(value) =>
                                    updateAmendmentArea(areaKey, { conditionLevel: value })
                                  }
                                />
                                <Select
                                  label="Traffic"
                                  options={TRAFFIC_OPTIONS}
                                  value={area.trafficLevel || 'medium'}
                                  onChange={(value) =>
                                    updateAmendmentArea(areaKey, { trafficLevel: value })
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {amendmentWorkingScope.areas.length === 0 && (
                      <div className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-gray-500">
                        No draft areas yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-white">Tasks</div>
                    <Button size="sm" variant="secondary" onClick={() => addDraftTask(null)}>
                      Add Custom Facility-Wide Task
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {amendmentAreaTaskGroups.map((group) => {
                      const isCollapsed = collapsedAmendmentTaskGroups[group.key] ?? false;
                      return (
                        <div key={group.key} className="rounded-lg border border-white/10 bg-navy-darker/40">
                          <div className="flex items-center justify-between gap-3 px-3 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-2 text-left"
                              onClick={() =>
                                setCollapsedAmendmentTaskGroups((current) => ({
                                  ...current,
                                  [group.key]: !isCollapsed,
                                }))
                              }
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-white">{group.label}</div>
                                <div className="text-xs text-gray-500">
                                  {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </button>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  const area = amendmentWorkingScope.areas.find(
                                    (entry) => (entry.id || entry.tempId) === group.key
                                  );
                                  if (!area) return;
                                  openAmendmentTaskSelectionForArea(area);
                                }}
                              >
                                Add From Templates
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => addDraftTask(group.key)}>
                                Add Custom Task
                              </Button>
                            </div>
                          </div>
                          {!isCollapsed && (
                            <div className="space-y-3 border-t border-white/10 px-3 py-3">
                              <AmendmentTaskFrequencyEditor
                                sectionKey={group.key}
                                tasks={group.tasks}
                                updateTask={updateAmendmentTask}
                                removeTask={removeDraftTask}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="rounded-lg border border-white/10 bg-navy-darker/40">
                      <div className="flex items-center justify-between gap-3 px-3 py-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left"
                          onClick={() =>
                            setCollapsedAmendmentTaskGroups((current) => ({
                              ...current,
                              facilityWide: !(current.facilityWide ?? false),
                            }))
                          }
                        >
                          {collapsedAmendmentTaskGroups.facilityWide ? (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-white">Facility-Wide</div>
                            <div className="text-xs text-gray-500">
                              {facilityWideDraftTasks.length} task{facilityWideDraftTasks.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </button>
                        <Button size="sm" variant="secondary" onClick={() => addDraftTask(null)}>
                          Add Custom Task
                        </Button>
                      </div>
                      {!(collapsedAmendmentTaskGroups.facilityWide ?? false) && (
                        <div className="space-y-3 border-t border-white/10 px-3 py-3">
                          <AmendmentTaskFrequencyEditor
                            sectionKey="facility-wide"
                            tasks={facilityWideDraftTasks}
                            updateTask={updateAmendmentTask}
                            removeTask={removeDraftTask}
                          />
                        </div>
                      )}
                    </div>
                    {amendmentWorkingScope.tasks.length === 0 && (
                      <div className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-gray-500">
                        No draft tasks yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleSaveAmendmentScope}
                    isLoading={amendmentSubmitting}
                  >
                    Save Changes
                  </Button>
                  <Button onClick={handleRecalculateAmendment} isLoading={amendmentPricingLoading}>
                    Update Price
                  </Button>
                </div>
              </div>
            )}

            {amendmentPricing && (
              <PricingBreakdownPanel pricing={amendmentPricing} />
            )}

            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">What Will Change</div>
                  <div className="mt-1 text-xs text-gray-400">
                    Review the service updates before approval or apply.
                  </div>
                </div>
                {selectedAmendment.status === 'applied' && (
                  <Badge variant="success">Applied</Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Current Schedule</div>
                  <div className="mt-1 text-sm text-gray-100">{beforeScheduleSummary}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Updated Schedule</div>
                  <div className="mt-1 text-sm text-gray-100">{targetScheduleSummary}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Monthly Change</div>
                  <div className="mt-1 text-sm font-medium text-gray-100">
                    {formatCurrencyChange(selectedAmendment.monthlyDelta || 0)}
                  </div>
                </div>
              </div>

              {selectedAmendmentStartsInFuture && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  This contract change is scheduled to start on {formatDate(selectedAmendment.effectiveDate)}.
                  Applying it now will start the updated service and pricing early.
                </div>
              )}

              {selectedAmendment.status === 'applied' && latestApplySummary && (
                <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="text-sm font-medium text-emerald-100">Apply Summary</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-emerald-400/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-200/70">Areas</div>
                      <div className="mt-2 text-sm text-emerald-50">
                        {latestApplySummary.updatedAreaCount ?? 0} updated
                      </div>
                      <div className="text-sm text-emerald-50">
                        {latestApplySummary.createdAreaCount ?? 0} added
                      </div>
                      <div className="text-sm text-emerald-50">
                        {latestApplySummary.removedAreaCount ??
                          latestApplySummary.archivedAreaCount ??
                          0}{' '}
                        removed
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-400/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-200/70">Tasks</div>
                      <div className="mt-2 text-sm text-emerald-50">
                        {latestApplySummary.updatedTaskCount ?? 0} updated
                      </div>
                      <div className="text-sm text-emerald-50">
                        {latestApplySummary.createdTaskCount ?? 0} added
                      </div>
                      <div className="text-sm text-emerald-50">
                        {latestApplySummary.removedTaskCount ??
                          latestApplySummary.archivedTaskCount ??
                          0}{' '}
                        removed
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-400/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-200/70">Active Scope</div>
                      <div className="mt-2 text-sm text-emerald-50">
                        {latestApplySummary.activeAreaCount ?? 0} total areas
                      </div>
                      <div className="text-sm text-emerald-50">
                        {latestApplySummary.activeTaskCount ?? 0} total tasks
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-400/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-200/70">Applied On</div>
                      <div className="mt-2 text-sm text-emerald-50">
                        {formatDate(selectedAmendment.appliedAt)}
                      </div>
                      <div className="text-sm text-emerald-50">
                        {selectedAmendment.appliedByUser?.fullName || 'System'}
                      </div>
                    </div>
                    {appliedRecurringJobsSummary && (
                      <div className="rounded-lg border border-emerald-400/10 bg-black/20 p-3">
                        <div className="text-xs uppercase tracking-wide text-emerald-200/70">
                          Future Jobs
                        </div>
                        <div className="mt-2 text-sm text-emerald-50">
                          {appliedRecurringJobsSummary.created} created
                        </div>
                        <div className="text-sm text-emerald-50">
                          {appliedRecurringJobsSummary.canceled} removed
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasScopeComparison ? (
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="text-sm font-medium text-emerald-200">Being Added</div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                          Areas ({areaChangeSummary.added.length})
                        </div>
                        {areaChangeSummary.added.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {areaChangeSummary.added.map((item) => (
                              <span
                                key={`added-area-${item}`}
                                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-100"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-emerald-100/70">No new areas.</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                          Tasks ({taskChangeSummary.added.length})
                        </div>
                        {taskChangeSummary.added.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {taskChangeSummary.added.map((item) => (
                              <div
                                key={`added-task-${item}`}
                                className="rounded border border-emerald-400/15 px-3 py-2 text-sm text-emerald-50"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-emerald-100/70">No new tasks.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                    <div className="text-sm font-medium text-rose-200">Being Removed</div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-rose-300/80">
                          Areas ({areaChangeSummary.removed.length})
                        </div>
                        {areaChangeSummary.removed.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {areaChangeSummary.removed.map((item) => (
                              <span
                                key={`removed-area-${item}`}
                                className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs text-rose-100"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-rose-100/70">No areas removed.</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wide text-rose-300/80">
                          Tasks ({removedTaskSummary.added.length})
                        </div>
                        {removedTaskSummary.added.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {removedTaskSummary.added.map((item) => (
                              <div
                                key={`removed-task-${item}`}
                                className="rounded border border-rose-400/15 px-3 py-2 text-sm text-rose-50"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-rose-100/70">No tasks removed.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-white/10 px-4 py-3 text-sm text-gray-400">
                  No service scope changes yet.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="text-sm font-medium text-white">Snapshots</div>
                <div className="mt-3 space-y-2">
                  {(selectedAmendment.snapshots || []).map((snapshot) => {
                    const areas = Array.isArray(snapshot.scopeJson?.areas)
                      ? snapshot.scopeJson.areas.length
                      : 0;
                    const tasks = Array.isArray(snapshot.scopeJson?.tasks)
                      ? snapshot.scopeJson.tasks.length
                      : 0;
                    return (
                      <div
                        key={snapshot.id}
                        className="rounded border border-white/10 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-200">
                            {snapshot.snapshotType}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatShortDate(snapshot.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {areas} areas · {tasks} tasks
                        </div>
                      </div>
                    );
                  })}
                  {(selectedAmendment.snapshots || []).length === 0 && (
                    <div className="text-sm text-gray-500">No snapshots recorded.</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="text-sm font-medium text-white">History</div>
                <div className="mt-3 space-y-2">
                  {(selectedAmendment.activities || []).map((activity) => {
                    const details = getAmendmentActivityDetails(activity);
                    return (
                      <div key={`history-${activity.id}`} className="rounded border border-white/10 px-3 py-2">
                        <div className="text-sm text-gray-200">
                          {getAmendmentActivityLabel(activity.action)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatDate(activity.createdAt)}
                          {activity.performedByUser?.fullName
                            ? ` Â· ${activity.performedByUser.fullName}`
                            : ''}
                        </div>
                        {details && (
                          <div className="mt-2 text-xs text-gray-400">{details}</div>
                        )}
                      </div>
                    );
                  })}
                  {(selectedAmendment.activities || []).length === 0 && (
                    <div className="text-sm text-gray-500">No history yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="text-sm font-medium text-white">Activity</div>
                <div className="mt-3 space-y-2">
                  {(selectedAmendment.activities || []).map((activity) => (
                    <div key={activity.id} className="rounded border border-white/10 px-3 py-2">
                      <div className="text-sm text-gray-200">{activity.action.replace(/_/g, ' ')}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatDate(activity.createdAt)}
                        {activity.performedByUser?.fullName
                          ? ` · ${activity.performedByUser.fullName}`
                          : ''}
                      </div>
                    </div>
                  ))}
                  {(selectedAmendment.activities || []).length === 0 && (
                    <div className="text-sm text-gray-500">No amendment activity yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {selectedAmendment.status === 'submitted' && canAdminContracts && (
                <>
                  <Button
                    variant="secondary"
                    onClick={handleRejectAmendment}
                    isLoading={amendmentSubmitting}
                  >
                    Reject
                  </Button>
                  <Button onClick={handleApproveAmendment} isLoading={amendmentSubmitting}>
                    Approve
                  </Button>
                </>
              )}
              {selectedAmendment.status === 'approved' && canAdminContracts && (
                <Button onClick={handleApplyAmendment} isLoading={amendmentSubmitting}>
                  Apply Change
                </Button>
              )}
              {selectedAmendment.status === 'draft' && canWriteContracts && (
                <Button
                  onClick={handleSubmitAmendmentDraft}
                  isLoading={amendmentSubmitting}
                  disabled={amendmentScopeDirty || !selectedAmendment.pricingSnapshot}
                >
                  Send for Approval
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setAppliedRecurringJobsSummary(null);
                  setShowAmendmentDetailModal(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <AmendmentAreaSetupModal
        isOpen={showAmendmentAreaModal}
        onClose={() => {
          setShowAmendmentAreaModal(false);
          resetAmendmentAreaSetup();
        }}
        areaForm={amendmentAreaForm}
        setAreaForm={setAmendmentAreaForm}
        areaTypes={areaTypes}
        areaTemplateLoading={areaTemplateLoading}
        filteredAreaTemplateTasks={filteredAreaTemplateTasks}
        currentAreaTaskFrequency={currentAreaTaskFrequency}
        areaTaskPipelineStep={areaTaskPipelineStep}
        reviewedAreaTaskFrequencies={reviewedAreaTaskFrequencies}
        allAreaTaskFrequenciesReviewed={allAreaTaskFrequenciesReviewed}
        newAreaCustomTaskName={newAreaCustomTaskName}
        setNewAreaCustomTaskName={setNewAreaCustomTaskName}
        toggleAreaTemplateTaskInclude={toggleAmendmentAreaTemplateTaskInclude}
        addCustomAreaTemplateTask={addCustomAmendmentAreaTemplateTask}
        removeCustomAreaTemplateTask={removeCustomAmendmentAreaTemplateTask}
        goToNextAreaTaskFrequencyStep={goToNextAmendmentAreaTaskFrequencyStep}
        goToPreviousAreaTaskFrequencyStep={goToPreviousAmendmentAreaTaskFrequencyStep}
        applyAreaTemplate={applyAmendmentAreaTemplate}
        onSave={saveAmendmentAreaWithTasks}
        saving={amendmentSubmitting}
      />

      <TaskSelectionModal
        isOpen={showAmendmentTaskSelectionModal}
        onClose={() => {
          setShowAmendmentTaskSelectionModal(false);
          resetAmendmentTaskSelectionState();
        }}
        selectedAreaForTask={
          selectedAmendmentAreaForTask
            ? {
                name: selectedAmendmentAreaForTask.name || null,
                areaType: {
                  name:
                    selectedAmendmentAreaForTask.areaType?.name
                    || selectedAmendmentAreaForTask.name
                    || 'Area',
                },
              }
            : null
        }
        filteredTaskSelectionTasks={filteredAmendmentTaskSelectionTasks}
        currentTaskSelectionFrequency={currentAmendmentTaskSelectionFrequency}
        taskSelectionStep={amendmentTaskSelectionStep}
        reviewedTaskSelectionFrequencies={reviewedAmendmentTaskSelectionFrequencies}
        newTaskSelectionCustomName={newAmendmentTaskSelectionCustomName}
        setNewTaskSelectionCustomName={setNewAmendmentTaskSelectionCustomName}
        toggleTaskSelectionInclude={toggleAmendmentTaskSelectionInclude}
        addCustomTaskSelectionTask={addCustomAmendmentTaskSelectionTask}
        removeCustomTaskSelectionTask={removeCustomAmendmentTaskSelectionTask}
        goToNextTaskSelectionStep={goToNextAmendmentTaskSelectionStep}
        goToPreviousTaskSelectionStep={goToPreviousAmendmentTaskSelectionStep}
        onSave={saveSelectedAmendmentTasks}
        saving={amendmentSubmitting}
        hasSelectedTasks={hasSelectedAmendmentTaskSelectionTasks}
      />
    </div>
  );
};

export default ContractDetail;



