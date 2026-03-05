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
  completeInitialClean as completeInitialCleanApi,
  downloadContractPdf,
  downloadContractTermsDocument,
  generateContractTerms,
  listContractAmendments as listContractAmendmentsApi,
  createContractAmendment as createContractAmendmentApi,
  approveContractAmendment as approveContractAmendmentApi,
  applyContractAmendment as applyContractAmendmentApi,
} from '../../lib/contracts';
import ContractTimeline from '../../components/contracts/ContractTimeline';
import SendContractModal from '../../components/contracts/SendContractModal';
import { listTeams } from '../../lib/teams';
import { listUsers } from '../../lib/users';
import {
  listAreaTypes,
  listAreas,
  listFacilityTasks,
} from '../../lib/facilities';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import { SUBCONTRACTOR_TIER_OPTIONS, tierToPercentage } from '../../lib/subcontractorTiers';
import { CLEANING_FREQUENCIES } from '../facilities/facility-constants';
import type {
  Contract,
  ContractAmendment,
  CreateContractAmendmentInput,
  ContractStatus,
  RenewContractInput,
  SendContractInput,
  UpdateContractInput,
} from '../../types/contract';
import type { Team } from '../../types/team';
import type { User as SystemUser } from '../../types/user';
import type { Area, FacilityTask } from '../../types/facility';

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

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
type AmendmentAreaDraft = {
  areaTypeId: string;
  name: string;
  squareFeet: string;
};
type AmendmentTaskDraft = {
  customName: string;
  cleaningFrequency: string;
};
type AreaTypeOption = { id: string; name: string };

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
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
  const [amendmentsLoading, setAmendmentsLoading] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentSubmitting, setAmendmentSubmitting] = useState(false);
  const [areaTypes, setAreaTypes] = useState<AreaTypeOption[]>([]);
  const [existingAreasRaw, setExistingAreasRaw] = useState<Area[]>([]);
  const [existingTasksRaw, setExistingTasksRaw] = useState<FacilityTask[]>([]);
  const [activeAreaIndex, setActiveAreaIndex] = useState(0);
  const [areasToArchive, setAreasToArchive] = useState<string[]>([]);
  const [tasksToArchive, setTasksToArchive] = useState<string[]>([]);
  const [areasToCreate, setAreasToCreate] = useState<AmendmentAreaDraft[]>([]);
  const [tasksToCreateByArea, setTasksToCreateByArea] = useState<Record<string, AmendmentTaskDraft[]>>({});
  const [newTaskDraftByArea, setNewTaskDraftByArea] = useState<Record<string, AmendmentTaskDraft>>({});
  const [newAreaDraft, setNewAreaDraft] = useState<AmendmentAreaDraft>({
    areaTypeId: '',
    name: '',
    squareFeet: '',
  });
  const [amendmentFormData, setAmendmentFormData] = useState<CreateContractAmendmentInput>({
    title: '',
    description: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    monthlyValue: null,
    serviceFrequency: null,
    paymentTerms: null,
    billingCycle: null,
    areaChanges: null,
    taskChanges: null,
  });
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

  useEffect(() => {
    if (id) {
      fetchContract(id);
      if (!isLimitedContractViewer) {
        fetchAmendments(id);
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

  const refreshAll = (contractId: string) => {
    fetchContract(contractId);
    if (!isLimitedContractViewer) {
      fetchAmendments(contractId);
    }
    setActivityRefresh((n) => n + 1);
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

  const fetchAmendmentOptions = async (facilityId: string) => {
    try {
      const [areaTypesResult, areasResult, tasksResult] = await Promise.allSettled([
        listAreaTypes({ limit: 100 }),
        listAreas({ facilityId, limit: 100 }),
        listFacilityTasks({ facilityId, limit: 100 }),
      ]);

      const loadedAreas =
        areasResult.status === 'fulfilled' ? areasResult.value.data || [] : [];
      const loadedTasks =
        tasksResult.status === 'fulfilled' ? tasksResult.value.data || [] : [];

      const directAreaTypes =
        areaTypesResult.status === 'fulfilled'
          ? (areaTypesResult.value.data || []).map((type) => ({ id: type.id, name: type.name }))
          : [];
      const derivedAreaTypes = loadedAreas
        .map((area) => ({
          id: area.areaType.id,
          name: area.areaType.name,
        }))
        .filter(
          (type, index, self) => self.findIndex((item) => item.id === type.id) === index
        );

      setAreaTypes(directAreaTypes.length > 0 ? directAreaTypes : derivedAreaTypes);
      setExistingAreasRaw(loadedAreas);
      setActiveAreaIndex(0);
      setExistingTasksRaw(loadedTasks);
    } catch (error) {
      console.error('Failed to load amendment options:', error);
      setAreaTypes([]);
      setExistingAreasRaw([]);
      setExistingTasksRaw([]);
      setActiveAreaIndex(0);
    }
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
      if (!isLimitedContractViewer && data.facility?.id) {
        await fetchAmendmentOptions(data.facility.id);
      }
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

  const handleCompleteInitialClean = async () => {
    if (!contract || !confirm('Mark the initial clean as completed?')) return;

    try {
      const updated = await completeInitialCleanApi(contract.id);
      setContract(updated);
      setActivityRefresh((n) => n + 1);
      toast.success('Initial clean marked as completed');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to complete initial clean');
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

  const openAmendmentModal = () => {
    const baseSchedule = contract?.serviceSchedule || null;
    setAreasToArchive([]);
    setTasksToArchive([]);
    setAreasToCreate([]);
    setTasksToCreateByArea({});
    setNewTaskDraftByArea({});
    setActiveAreaIndex(0);
    setNewAreaDraft({
      areaTypeId: areaTypes[0]?.id || '',
      name: '',
      squareFeet: '',
    });
    setAmendmentFormData({
      title: '',
      description: '',
      effectiveDate: new Date().toISOString().slice(0, 10),
      monthlyValue: Number(contract?.monthlyValue ?? 0) || null,
      endDate: contract?.endDate ?? null,
      serviceFrequency: contract?.serviceFrequency ?? null,
      serviceSchedule: baseSchedule,
      billingCycle: contract?.billingCycle ?? null,
      paymentTerms: contract?.paymentTerms ?? null,
      autoRenew: contract?.autoRenew ?? null,
      renewalNoticeDays: contract?.renewalNoticeDays ?? null,
      termsAndConditions: contract?.termsAndConditions ?? null,
      specialInstructions: contract?.specialInstructions ?? null,
      areaChanges: null,
      taskChanges: null,
    });
    setShowAmendmentModal(true);
  };

  const addAreaChange = () => {
    if (!newAreaDraft.areaTypeId) {
      toast.error('Select area type first');
      return;
    }
    if (!newAreaDraft.name.trim()) {
      toast.error('Area name is required');
      return;
    }
    setAreasToCreate((prev) => [...prev, { ...newAreaDraft, name: newAreaDraft.name.trim() }]);
    setNewAreaDraft((prev) => ({
      ...prev,
      name: '',
      squareFeet: '',
    }));
  };

  const getNewTaskDraft = (areaId: string): AmendmentTaskDraft =>
    newTaskDraftByArea[areaId] || {
      customName: '',
      cleaningFrequency: 'daily',
    };

  const updateAreaTaskDraft = (areaId: string, patch: Partial<AmendmentTaskDraft>) => {
    setNewTaskDraftByArea((prev) => ({
      ...prev,
      [areaId]: {
        ...getNewTaskDraft(areaId),
        ...patch,
      },
    }));
  };

  const addTaskToArea = (areaId: string) => {
    const draft = getNewTaskDraft(areaId);
    if (!draft.customName.trim()) {
      toast.error('Task name is required');
      return;
    }

    setTasksToCreateByArea((prev) => ({
      ...prev,
      [areaId]: [...(prev[areaId] || []), { ...draft, customName: draft.customName.trim() }],
    }));
    setNewTaskDraftByArea((prev) => ({
      ...prev,
      [areaId]: {
        customName: '',
        cleaningFrequency: draft.cleaningFrequency || 'daily',
      },
    }));
  };

  const removePendingTask = (areaId: string, index: number) => {
    setTasksToCreateByArea((prev) => ({
      ...prev,
      [areaId]: (prev[areaId] || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const toggleAreaArchive = (areaId: string) => {
    setAreasToArchive((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const toggleTaskArchive = (taskId: string) => {
    setTasksToArchive((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleCreateAmendment = async () => {
    if (!contract) return;
    if (!amendmentFormData.title?.trim()) {
      toast.error('Amendment title is required');
      return;
    }
    if (!amendmentFormData.effectiveDate) {
      toast.error('Effective date is required');
      return;
    }

    const areaCreatePayload = areasToCreate.map((area) => ({
      areaTypeId: area.areaTypeId,
      name: area.name.trim(),
      squareFeet: area.squareFeet ? Number(area.squareFeet) : null,
      quantity: 1,
      floorType: 'vct',
      conditionLevel: 'standard',
      trafficLevel: 'medium',
      notes: null,
    }));
    const taskCreatePayload = Object.entries(tasksToCreateByArea).flatMap(([areaId, tasks]) =>
      tasks.map((task) => ({
        areaId,
        taskTemplateId: null,
        customName: task.customName.trim(),
        customInstructions: null,
        estimatedMinutes: null,
        baseMinutesOverride: null,
        perSqftMinutesOverride: null,
        priority: 3,
        isRequired: true,
        cleaningFrequency: task.cleaningFrequency,
      }))
    );

    const areaChanges =
      areaCreatePayload.length > 0 || areasToArchive.length > 0
        ? {
            ...(areaCreatePayload.length > 0 ? { create: areaCreatePayload } : {}),
            ...(areasToArchive.length > 0 ? { archiveIds: areasToArchive } : {}),
          }
        : null;
    const taskChanges =
      taskCreatePayload.length > 0 || tasksToArchive.length > 0
        ? {
            ...(taskCreatePayload.length > 0 ? { create: taskCreatePayload } : {}),
            ...(tasksToArchive.length > 0 ? { archiveIds: tasksToArchive } : {}),
          }
        : null;

    try {
      setAmendmentSubmitting(true);
      await createContractAmendmentApi(contract.id, {
        ...amendmentFormData,
        title: amendmentFormData.title.trim(),
        description: amendmentFormData.description?.trim() || null,
        areaChanges,
        taskChanges,
      });
      setShowAmendmentModal(false);
      toast.success('Amendment created');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to create amendment');
    } finally {
      setAmendmentSubmitting(false);
    }
  };

  const handleApproveAmendment = async (amendmentId: string) => {
    if (!contract) return;
    try {
      await approveContractAmendmentApi(contract.id, amendmentId);
      toast.success('Amendment approved');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to approve amendment');
    }
  };

  const handleApplyAmendment = async (amendmentId: string) => {
    if (!contract) return;
    if (!confirm('Apply this amendment now? This will update contract and future scheduled recurring jobs.')) {
      return;
    }
    try {
      await applyContractAmendmentApi(contract.id, amendmentId);
      toast.success('Amendment applied');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to apply amendment');
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
  const selectedAssignmentTeamId = assignmentMode === 'subcontractor_team' ? selectedTeamId || null : null;
  const selectedAssignmentUserId = assignmentMode === 'internal_employee' ? selectedUserId || null : null;
  const assignmentWillChange =
    selectedAssignmentTeamId !== (contract.assignedTeam?.id || null) ||
    selectedAssignmentUserId !== (contract.assignedToUser?.id || null);
  const hasNextAssignment = Boolean(selectedAssignmentTeamId || selectedAssignmentUserId);
  const shouldScheduleOverride = hasCurrentAssignment && hasNextAssignment && assignmentWillChange;
  const canManageAmendments = !isLimitedContractViewer && canWriteContracts;
  const canApproveAmendments = userRole === 'owner' || userRole === 'admin';

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
                <Button variant="secondary" onClick={openAmendmentModal}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Amendment
                </Button>
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

      {/* Initial Clean — hidden for subcontractors */}
      {contract.includesInitialClean && !isLimitedContractViewer && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Initial Clean</h2>
          </div>
          {contract.initialCleanCompleted ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Completed</span>
              <span className="text-sm text-gray-400 ml-2">
                {formatDate(contract.initialCleanCompletedAt)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-yellow-400 font-medium">Pending</span>
                <p className="text-sm text-gray-400 mt-1">
                  The initial deep clean has not been completed yet.
                </p>
              </div>
              {contract.status === 'active' && canWriteContracts && (
                <Button onClick={handleCompleteInitialClean}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Complete
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {canManageAmendments && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Amendments</h2>
              <p className="text-sm text-gray-400">
                Use amendments to update active contract scope, pricing, and area/task setup.
              </p>
            </div>
            <Button onClick={openAmendmentModal}>
              <Edit2 className="mr-2 h-4 w-4" />
              New Amendment
            </Button>
          </div>
          {amendmentsLoading ? (
            <div className="py-6 text-center text-sm text-gray-400">Loading amendments...</div>
          ) : amendments.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-gray-400">
              No amendments yet.
            </div>
          ) : (
            <div className="space-y-3">
              {amendments.map((amendment) => (
                <div
                  key={amendment.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white">{amendment.title}</div>
                    <Badge
                      variant={
                        amendment.status === 'applied'
                          ? 'success'
                          : amendment.status === 'approved'
                            ? 'info'
                            : amendment.status === 'canceled'
                              ? 'error'
                              : 'warning'
                      }
                    >
                      {amendment.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {amendment.description && (
                    <p className="mb-2 text-sm text-gray-300">{amendment.description}</p>
                  )}
                  <div className="grid gap-2 text-xs text-gray-400 sm:grid-cols-2">
                    <div>
                      Effective: <span className="text-gray-200">{formatDate(amendment.effectiveDate)}</span>
                    </div>
                    <div>
                      Created: <span className="text-gray-200">{formatDate(amendment.createdAt)}</span>
                    </div>
                    <div>
                      Proposed by:{' '}
                      <span className="text-gray-200">{amendment.proposedByUser.fullName}</span>
                    </div>
                    {amendment.approvedByUser && (
                      <div>
                        Approved by:{' '}
                        <span className="text-gray-200">{amendment.approvedByUser.fullName}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canApproveAmendments &&
                      (amendment.status === 'draft' || amendment.status === 'pending_approval') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApproveAmendment(amendment.id)}
                        >
                          Approve
                        </Button>
                      )}
                    {canApproveAmendments && amendment.status === 'approved' && (
                      <Button size="sm" onClick={() => handleApplyAmendment(amendment.id)}>
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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

      <Modal
        isOpen={showAmendmentModal}
        onClose={() => setShowAmendmentModal(false)}
        title="Create Contract Amendment"
        size="2xl"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-primary-500/30 bg-gradient-to-r from-primary-500/20 via-primary-400/10 to-transparent px-4 py-3">
            <div className="text-sm font-semibold text-white">Amendment Workspace</div>
            <div className="mt-1 text-xs text-primary-100/90">
              Update pricing, then review areas and tasks card-by-card before saving.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
            <Input
              label="Title *"
              value={amendmentFormData.title}
              onChange={(e) =>
                setAmendmentFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Scope change for April"
            />
            <Textarea
              label="Description"
              rows={2}
              value={amendmentFormData.description || ''}
              onChange={(e) =>
                setAmendmentFormData((prev) => ({ ...prev, description: e.target.value || null }))
              }
              placeholder="What changed and why"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Effective Date *"
                type="date"
                value={amendmentFormData.effectiveDate}
                onChange={(e) =>
                  setAmendmentFormData((prev) => ({ ...prev, effectiveDate: e.target.value }))
                }
              />
              <Input
                label="Monthly Value"
                type="number"
                step="0.01"
                value={amendmentFormData.monthlyValue ?? ''}
                onChange={(e) =>
                  setAmendmentFormData((prev) => ({
                    ...prev,
                    monthlyValue: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Service Frequency"
                placeholder="Keep current"
                options={SERVICE_FREQUENCIES}
                value={amendmentFormData.serviceFrequency || ''}
                onChange={(value) =>
                  setAmendmentFormData((prev) => ({
                    ...prev,
                    serviceFrequency: (value || null) as any,
                  }))
                }
              />
              <Input
                label="Payment Terms"
                value={amendmentFormData.paymentTerms ?? ''}
                onChange={(e) =>
                  setAmendmentFormData((prev) => ({
                    ...prev,
                    paymentTerms: e.target.value || null,
                  }))
                }
                placeholder="Net 30"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Areas and Tasks</div>
              <span className="rounded-full border border-primary-400/40 bg-primary-500/20 px-2.5 py-1 text-[11px] font-medium text-primary-100">
                Review Per Area
              </span>
            </div>
            {existingAreasRaw.length === 0 ? (
              <div className="rounded border border-dashed border-white/10 px-3 py-4 text-sm text-gray-400">
                No existing areas found on this facility.
              </div>
            ) : (
              (() => {
                const safeIndex = Math.min(activeAreaIndex, Math.max(existingAreasRaw.length - 1, 0));
                const area = existingAreasRaw[safeIndex];
                if (!area) return null;

                const areaName = area.name || `Area ${area.id.slice(0, 6)}`;
                const areaTasks = existingTasksRaw.filter((task) => task.area?.id === area.id);
                const isArchived = areasToArchive.includes(area.id);
                const pendingTasks = tasksToCreateByArea[area.id] || [];
                const taskDraft = getNewTaskDraft(area.id);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-primary-500/20 bg-primary-500/10 px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveAreaIndex((prev) => Math.max(prev - 1, 0))}
                        disabled={safeIndex === 0}
                      >
                        Back
                      </Button>
                      <div className="text-xs font-medium text-primary-100">
                        Area {safeIndex + 1} of {existingAreasRaw.length}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setActiveAreaIndex((prev) => Math.min(prev + 1, existingAreasRaw.length - 1))
                        }
                        disabled={safeIndex >= existingAreasRaw.length - 1}
                      >
                        Next
                      </Button>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
                        <div className="text-sm font-semibold text-white">{areaName}</div>
                        <Button
                          variant={isArchived ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => toggleAreaArchive(area.id)}
                        >
                          {isArchived ? 'Undo Remove Area' : 'Remove Area'}
                        </Button>
                      </div>

                      <div className="space-y-3 p-3.5">
                        <div className="text-xs text-gray-400">Existing tasks ({areaTasks.length})</div>
                        <div className="space-y-2">
                          {areaTasks.length === 0 ? (
                            <div className="text-sm text-gray-500">No tasks in this area yet.</div>
                          ) : (
                            areaTasks.map((task) => {
                              const taskName = task.customName || task.taskTemplate?.name || 'Unnamed task';
                              const isTaskArchived = tasksToArchive.includes(task.id);
                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
                                >
                                  <span className="text-gray-200">
                                    {taskName} ({task.cleaningFrequency})
                                  </span>
                                  <Button
                                    variant={isTaskArchived ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => toggleTaskArchive(task.id)}
                                  >
                                    {isTaskArchived ? 'Undo' : 'Remove'}
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="border-t border-white/10 pt-3">
                          <div className="mb-2 text-xs text-gray-400">Add task to this area</div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Input
                              label="Task Name"
                              value={taskDraft.customName}
                              onChange={(e) =>
                                updateAreaTaskDraft(area.id, { customName: e.target.value })
                              }
                              placeholder="Enter custom task"
                            />
                            <Select
                              label="Frequency"
                              options={CLEANING_FREQUENCIES}
                              value={taskDraft.cleaningFrequency}
                              onChange={(value) =>
                                updateAreaTaskDraft(area.id, {
                                  cleaningFrequency: value || 'daily',
                                })
                              }
                            />
                            <div className="flex items-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => addTaskToArea(area.id)}
                              >
                                Add Task
                              </Button>
                            </div>
                          </div>
                          {pendingTasks.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {pendingTasks.map((task, index) => (
                                <div
                                  key={`${area.id}-${index}`}
                                  className="flex items-center justify-between rounded border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm"
                                >
                                  <span className="text-emerald-100">
                                    New: {task.customName} ({task.cleaningFrequency})
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePendingTask(area.id, index)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="border-t border-white/10 pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Add New Area</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Select
                  label="Area Type"
                  options={areaTypes.map((item) => ({ value: item.id, label: item.name }))}
                  value={newAreaDraft.areaTypeId}
                  onChange={(value) => setNewAreaDraft((prev) => ({ ...prev, areaTypeId: value }))}
                  placeholder="Select area type"
                />
                <Input
                  label="Area Name"
                  value={newAreaDraft.name}
                  onChange={(e) => setNewAreaDraft((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label="Square Feet"
                  type="number"
                  value={newAreaDraft.squareFeet}
                  onChange={(e) =>
                    setNewAreaDraft((prev) => ({ ...prev, squareFeet: e.target.value }))
                  }
                />
              </div>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={addAreaChange}>
                  Add Area
                </Button>
              </div>
              {areasToCreate.length > 0 && (
                <div className="mt-3 space-y-2">
                  {areasToCreate.map((area, index) => (
                    <div
                      key={`${area.name}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm"
                    >
                      <span className="text-emerald-100">
                        New area: {area.name} ({area.squareFeet || 'n/a'} sqft)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAreasToCreate((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
            Apply flow: create amendment -&gt; approve -&gt; apply. Applying updates contract values and
            regenerates future recurring scheduled jobs from the effective date.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAmendmentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAmendment} isLoading={amendmentSubmitting}>
              Save Amendment
            </Button>
          </div>
        </div>
      </Modal>

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
    </div>
  );
};

export default ContractDetail;

