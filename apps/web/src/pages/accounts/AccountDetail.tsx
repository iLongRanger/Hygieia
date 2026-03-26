import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import {
  getAccount,
  listAccountActivities,
  createAccountActivity,
  updateAccount,
  archiveAccount,
  restoreAccount,
} from '../../lib/accounts';
import { listAppointments } from '../../lib/appointments';
import { listFacilities, createFacility } from '../../lib/facilities';
import { listContacts } from '../../lib/contacts';
import { listJobs } from '../../lib/jobs';
import { listUsers } from '../../lib/users';
import { listProposals } from '../../lib/proposals';
import { listContracts } from '../../lib/contracts';
import { createResidentialProperty, listResidentialQuotes, updateResidentialProperty } from '../../lib/residential';
import { getAccountDetailPath } from '../../lib/accountRoutes';
import {
  COMMERCIAL_ACCOUNT_PIPELINE_STAGES,
  RESIDENTIAL_ACCOUNT_PIPELINE_STAGES,
  getResidentialJourneyState,
  getResidentialPropertyJourneyState,
  type CommercialAccountPipelineStageId,
} from '../../lib/accountPipeline';
import type {
  Account,
  AccountActivity,
  AccountActivityEntryType,
  ResidentialPropertySummary,
  UpdateAccountInput,
} from '../../types/crm';
import type { Appointment } from '../../types/crm';
import type { Facility, CreateFacilityInput } from '../../types/facility';
import type { User } from '../../types/user';
import type { Proposal } from '../../types/proposal';
import type { Contract } from '../../types/contract';
import type { Contact } from '../../types/contact';
import type { Job } from '../../types/job';
import type { ResidentialQuote } from '../../types/residential';
import type { ResidentialHomeProfile } from '../../types/residential';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { AccountHero } from './AccountHero';
import { AccountContacts } from './AccountContacts';
import { AccountFacilities } from './AccountFacilities';
import { AccountFinancials } from './AccountFinancials';
import { AccountServiceOverview } from './AccountServiceOverview';
import { AccountHistory } from './AccountHistory';
import { EditAccountModal } from './modals/EditAccountModal';
import { AddFacilityModal } from './modals/AddFacilityModal';

const residentialServiceTypeLabels: Record<string, string> = {
  recurring_standard: 'Recurring Standard',
  one_time_standard: 'One-Time Standard',
  deep_clean: 'Deep Clean',
  move_in_out: 'Move-In / Move-Out',
  turnover: 'Turnover',
  post_construction: 'Post-Construction',
};

const residentialFrequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  every_4_weeks: 'Every 4 Weeks',
  one_time: 'One-Time',
};

const DEFAULT_RESIDENTIAL_PROPERTY_FORM: {
  name: string;
  serviceAddress: NonNullable<UpdateAccountInput['serviceAddress']>;
  homeProfile: ResidentialHomeProfile;
  accessNotes: string;
  parkingAccess: string;
  entryNotes: string;
  pets: boolean;
  isPrimary: boolean;
} = {
  name: '',
  serviceAddress: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
  },
  homeProfile: {
    homeType: 'single_family',
    squareFeet: 1800,
    bedrooms: 3,
    fullBathrooms: 2,
    halfBathrooms: 0,
    levels: 1,
    occupiedStatus: 'occupied',
    condition: 'standard',
    hasPets: false,
    lastProfessionalCleaning: '',
    parkingAccess: '',
    entryNotes: '',
    specialInstructions: '',
    isFirstVisit: false,
  },
  accessNotes: '',
  parkingAccess: '',
  entryNotes: '',
  pets: false,
  isPrimary: false,
};

function formatCalendarDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatClockTime(value: string | null | undefined) {
  if (!value) return null;
  const [hoursString, minutesString = '0'] = value.split(':');
  const hours = Number(hoursString);
  const minutes = Number(minutesString);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function getResidentialServiceSummary(input: {
  activeContract: Contract | null;
  recentJobs: Job[];
}) {
  const sortedJobs = [...input.recentJobs].sort((left, right) => {
    return new Date(left.scheduledDate).getTime() - new Date(right.scheduledDate).getTime();
  });
  const now = Date.now();
  const upcomingJob = sortedJobs.find((job) => {
    return job.status !== 'completed' && job.status !== 'canceled' && new Date(job.scheduledDate).getTime() >= now;
  }) || sortedJobs.find((job) => job.status !== 'completed' && job.status !== 'canceled') || null;
  const lastCompletedJob = [...sortedJobs].reverse().find((job) => job.status === 'completed') || null;

  const assignmentLabel = input.activeContract?.assignedToUser?.fullName
    || input.activeContract?.assignedTeam?.name
    || upcomingJob?.assignedToUser?.fullName
    || upcomingJob?.assignedTeam?.name
    || 'Unassigned';

  const nextVisitWindow = upcomingJob
    ? [formatClockTime(upcomingJob.scheduledStartTime), formatClockTime(upcomingJob.scheduledEndTime)]
        .filter(Boolean)
        .join(' - ') || 'Time not set'
    : 'No visit scheduled yet';

  return {
    serviceType: input.activeContract?.residentialServiceType
      ? residentialServiceTypeLabels[input.activeContract.residentialServiceType] || input.activeContract.residentialServiceType
      : 'Not set',
    frequency: input.activeContract?.residentialFrequency
      ? residentialFrequencyLabels[input.activeContract.residentialFrequency] || input.activeContract.residentialFrequency
      : input.activeContract?.serviceFrequency || 'Not set',
    nextVisitDate: upcomingJob ? formatCalendarDate(upcomingJob.scheduledDate) : 'No visit scheduled yet',
    nextVisitWindow,
    assignmentLabel,
    latestCompletedVisit: lastCompletedJob ? formatCalendarDate(lastCompletedJob.scheduledDate) : 'No completed visits yet',
  };
}

function getCommercialJourneyState(input: {
  facilities: Facility[];
  appointments: Appointment[];
  proposals: Proposal[];
  activeContract: Contract | null;
  recentJobs: Job[];
}) {
  const getStage = (stageId: CommercialAccountPipelineStageId, nextStep: string) => ({
    currentStage: COMMERCIAL_ACCOUNT_PIPELINE_STAGES.find((stage) => stage.id === stageId)?.label || stageId,
    nextStep,
  });

  const latestProposal = [...input.proposals].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    return rightTime - leftTime;
  })[0];

  const walkthroughs = input.appointments.filter((appointment) => appointment.type === 'walk_through');
  const hasCompletedWalkthrough = walkthroughs.some((appointment) => appointment.status === 'completed');
  const hasBookedWalkthrough = walkthroughs.some((appointment) => appointment.status !== 'completed' && appointment.status !== 'canceled');
  const hasScheduledService = input.recentJobs.length > 0;

  if (hasScheduledService) {
    return getStage('scheduled_service', 'Review the job schedule and confirm the field team is assigned correctly.');
  }

  if (input.activeContract) {
    return getStage('active_contract', 'Activate delivery by confirming the service calendar and first visit assignment.');
  }

  switch (latestProposal?.status) {
    case 'accepted':
      return getStage('contract_ready', 'Create or finalize the contract from the accepted proposal.');
    case 'viewed':
      return getStage('proposal_viewed', 'Follow up with the client while the proposal is under review.');
    case 'sent':
      return getStage('proposal_sent', 'Follow up with the client or resend the proposal if needed.');
    case 'rejected':
      return {
        currentStage: 'Proposal Rejected',
        nextStep: 'Revise the proposal or close out the opportunity.',
      };
    case 'draft':
    case 'expired':
      return getStage('proposal_draft', 'Finish pricing and send the proposal to the client.');
    default:
      break;
  }

  if (hasCompletedWalkthrough) {
    return getStage('walkthrough_completed', 'Build the proposal using the completed walkthrough scope.');
  }

  if (hasBookedWalkthrough) {
    return getStage('walkthrough_booked', 'Prepare the facility details before the walkthrough happens.');
  }

  if (input.facilities.length > 0) {
    return getStage('facility_added', 'Book the first walkthrough for the service location.');
  }

  return getStage('account_created', 'Add the first facility so walkthrough planning can begin.');
}

const AccountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeContract, setActiveContract] = useState<Contract | null>(null);
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const [activityNote, setActivityNote] = useState('');
  const [activityType, setActivityType] = useState<AccountActivityEntryType>('note');
  const [activeTab, setActiveTab] = useState<'overview' | 'service' | 'history'>('overview');
  const [proposalTotal, setProposalTotal] = useState(0);
  const [contractTotal, setContractTotal] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [residentialQuotes, setResidentialQuotes] = useState<ResidentialQuote[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<ResidentialPropertySummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [creatingFacility, setCreatingFacility] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canAdminAccounts = hasPermission(PERMISSIONS.ACCOUNTS_ADMIN);
  const canWriteAccounts = hasPermission(PERMISSIONS.ACCOUNTS_WRITE);
  const canWriteFacilities = hasPermission(PERMISSIONS.FACILITIES_WRITE);

  const [formData, setFormData] = useState<UpdateAccountInput>({
    name: '',
    type: 'commercial',
    industry: null,
    website: null,
    billingEmail: null,
    billingPhone: null,
    billingAddress: null,
    serviceAddress: null,
    paymentTerms: 'NET30',
    creditLimit: null,
    accountManagerId: null,
    residentialProfile: null,
    notes: null,
  });

  const [facilityFormData, setFacilityFormData] = useState<Omit<CreateFacilityInput, 'accountId'>>({
    name: '',
    address: {},
    buildingType: null,
    accessInstructions: null,
    parkingInfo: null,
    specialRequirements: null,
    status: 'active',
    notes: null,
  });

  const [propertyFormData, setPropertyFormData] = useState(DEFAULT_RESIDENTIAL_PROPERTY_FORM);

  const fetchAccount = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getAccount(id);
      if (data) {
        setAccount(data);
        setFormData({
          name: data.name,
          type: data.type,
          industry: data.industry,
          website: data.website,
          billingEmail: data.billingEmail,
          billingPhone: data.billingPhone,
          billingAddress: data.billingAddress,
          serviceAddress: data.serviceAddress,
          paymentTerms: data.paymentTerms,
          creditLimit: data.creditLimit ? Number(data.creditLimit) : null,
          accountManagerId: data.accountManager?.id || null,
          residentialProfile: data.residentialProfile,
          notes: data.notes,
        });
      }
    } catch (error) {
      console.error('Failed to fetch account:', error);
      toast.error('Failed to load account details');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await listUsers({ limit: 100 });
      setUsers(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  const fetchFacilities = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listFacilities({ accountId: id, limit: 100 });
      setFacilities(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
    }
  }, [id]);

  const fetchProposals = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listProposals({
        accountId: id,
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includeArchived: false,
      });
      setProposals(response?.data || []);
      setProposalTotal(response?.pagination?.total ?? response?.data?.length ?? 0);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    }
  }, [id]);

  const fetchContracts = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listContracts({
        accountId: id,
        limit: 100,
        sortBy: 'startDate',
        sortOrder: 'desc',
        includeArchived: false,
      });
      setContracts(response?.data || []);
      setContractTotal(response?.pagination?.total ?? response?.data?.length ?? 0);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    }
  }, [id]);

  const fetchResidentialQuotes = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listResidentialQuotes({
        accountId: id,
        limit: 10,
        includeArchived: false,
      });
      setResidentialQuotes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch residential quotes:', error);
      setResidentialQuotes([]);
    }
  }, [id]);

  const fetchActiveContract = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listContracts({
        accountId: id,
        status: 'active',
        limit: 1,
        sortBy: 'startDate',
        sortOrder: 'desc',
        includeArchived: false,
      });
      setActiveContract(response?.data?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch active contract:', error);
      setActiveContract(null);
    }
  }, [id]);

  const fetchActivities = useCallback(async () => {
    if (!id) return;
    try {
      setActivitiesLoading(true);
      const response = await listAccountActivities(id, {
        page: 1,
        limit: 50,
      });
      setActivities(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch account activities:', error);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [id]);

  const fetchContacts = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listContacts({ accountId: id, limit: 100 });
      setContacts(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  }, [id]);

  const fetchRecentJobs = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listJobs({ accountId: id, limit: 100 });
      setRecentJobs(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch recent jobs:', error);
    }
  }, [id]);

  const fetchAppointments = useCallback(async () => {
    if (!id) return;
    try {
      const data = await listAppointments({ accountId: id, includePast: true });
      setAppointments(data || []);
    } catch (error) {
      console.error('Failed to fetch account appointments:', error);
      setAppointments([]);
    }
  }, [id]);

  useEffect(() => {
    fetchAccount();
    fetchUsers();
    fetchFacilities();
    fetchProposals();
    fetchContracts();
    fetchResidentialQuotes();
    fetchActiveContract();
    fetchActivities();
    fetchContacts();
    fetchRecentJobs();
    fetchAppointments();
  }, [fetchAccount, fetchUsers, fetchFacilities, fetchProposals, fetchContracts, fetchResidentialQuotes, fetchActiveContract, fetchActivities, fetchContacts, fetchRecentJobs, fetchAppointments]);

  useEffect(() => {
    if (!account) return;
    const expectedPath = getAccountDetailPath(account);
    if (location.pathname !== expectedPath) {
      navigate(expectedPath, { replace: true });
    }
  }, [account, location.pathname, navigate]);

  const handleUpdate = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateAccount(id, formData);
      toast.success('Account updated successfully');
      setShowEditModal(false);
      fetchAccount();
    } catch (error) {
      console.error('Failed to update account:', error);
      toast.error('Failed to update account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveAccount(id);
      toast.success('Account archived successfully');
      fetchAccount();
    } catch (error) {
      console.error('Failed to archive account:', error);
      toast.error('Failed to archive account');
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    try {
      await restoreAccount(id);
      toast.success('Account restored successfully');
      fetchAccount();
    } catch (error) {
      console.error('Failed to restore account:', error);
      toast.error('Failed to restore account');
    }
  };

  const handleCreateFacility = async () => {
    if (!id || !facilityFormData.name) return;
    try {
      setCreatingFacility(true);
      await createFacility({ ...facilityFormData, accountId: id });
      toast.success('Facility created successfully');
      setShowFacilityModal(false);
      setFacilityFormData({
        name: '',
        address: {},
        buildingType: null,
        accessInstructions: null,
        parkingInfo: null,
        specialRequirements: null,
        status: 'active',
        notes: null,
      });
      fetchFacilities();
      fetchAccount();
    } catch (error) {
      console.error('Failed to create facility:', error);
      toast.error('Failed to create facility');
    } finally {
      setCreatingFacility(false);
    }
  };

  const openCreatePropertyModal = () => {
    setEditingProperty(null);
    setPropertyFormData({
      ...DEFAULT_RESIDENTIAL_PROPERTY_FORM,
      isPrimary: !(account?.residentialProperties?.length ?? 0),
    });
    setShowPropertyModal(true);
  };

  const openEditPropertyModal = (property: ResidentialPropertySummary) => {
    setEditingProperty(property);
    setPropertyFormData({
      name: property.name,
      serviceAddress: property.serviceAddress ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.serviceAddress,
      homeProfile: {
        ...DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile,
        homeType: property.homeProfile?.homeType ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.homeType,
        squareFeet: property.homeProfile?.squareFeet ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.squareFeet,
        bedrooms: property.homeProfile?.bedrooms ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.bedrooms,
        fullBathrooms: property.homeProfile?.fullBathrooms ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.fullBathrooms,
        halfBathrooms: property.homeProfile?.halfBathrooms ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.halfBathrooms,
        levels: property.homeProfile?.levels ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.levels,
        occupiedStatus: property.homeProfile?.occupiedStatus ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.occupiedStatus,
        condition: property.homeProfile?.condition ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.condition,
        hasPets: property.homeProfile?.hasPets ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.hasPets,
        lastProfessionalCleaning:
          property.homeProfile?.lastProfessionalCleaning ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.lastProfessionalCleaning,
        parkingAccess: property.homeProfile?.parkingAccess ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.parkingAccess,
        entryNotes: property.homeProfile?.entryNotes ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.entryNotes,
        specialInstructions:
          property.homeProfile?.specialInstructions ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.specialInstructions,
        isFirstVisit: property.homeProfile?.isFirstVisit ?? DEFAULT_RESIDENTIAL_PROPERTY_FORM.homeProfile.isFirstVisit,
      },
      accessNotes: property.accessNotes ?? '',
      parkingAccess: property.parkingAccess ?? '',
      entryNotes: property.entryNotes ?? '',
      pets: Boolean(property.pets),
      isPrimary: property.isPrimary,
    });
    setShowPropertyModal(true);
  };

  const handleSaveProperty = async () => {
    if (!id || !propertyFormData.name.trim()) {
      toast.error('Property name is required');
      return;
    }

    try {
      setSavingProperty(true);
      if (editingProperty) {
        await updateResidentialProperty(editingProperty.id, {
          name: propertyFormData.name,
          serviceAddress: propertyFormData.serviceAddress,
          homeProfile: propertyFormData.homeProfile,
          accessNotes: propertyFormData.accessNotes,
          parkingAccess: propertyFormData.parkingAccess,
          entryNotes: propertyFormData.entryNotes,
          pets: propertyFormData.pets,
          isPrimary: propertyFormData.isPrimary,
          status: 'active',
        });
        toast.success('Residential property updated');
      } else {
        await createResidentialProperty({
          accountId: id,
          name: propertyFormData.name,
          serviceAddress: propertyFormData.serviceAddress,
          homeProfile: propertyFormData.homeProfile,
          accessNotes: propertyFormData.accessNotes,
          parkingAccess: propertyFormData.parkingAccess,
          entryNotes: propertyFormData.entryNotes,
          pets: propertyFormData.pets,
          isPrimary: propertyFormData.isPrimary,
          status: 'active',
        });
        toast.success('Residential property created');
      }
      setShowPropertyModal(false);
      await fetchAccount();
    } catch (error) {
      console.error('Failed to save residential property:', error);
      toast.error('Failed to save residential property');
    } finally {
      setSavingProperty(false);
    }
  };

  const handleAddActivity = async () => {
    if (!id) return;
    const trimmed = activityNote.trim();
    if (!trimmed) {
      toast.error('Please enter a note');
      return;
    }
    try {
      setAddingActivity(true);
      await createAccountActivity(id, {
        entryType: activityType,
        note: trimmed,
      });
      setActivityNote('');
      setActivityType('note');
      toast.success('Account history note added');
      fetchActivities();
    } catch (error) {
      console.error('Failed to add account activity:', error);
      toast.error('Failed to add account history note');
    } finally {
      setAddingActivity(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!account) {
    return <div className="text-center text-surface-500 dark:text-surface-400">Account not found</div>;
  }

  const isResidentialAccount = account.type === 'residential';
  const residentialProperties = account.residentialProperties ?? [];
  const residentialPropertyJourneys = residentialProperties.map((property) => ({
    property,
    journey: getResidentialPropertyJourneyState({
      property,
      residentialQuotes,
      contracts,
      recentJobs,
    }),
  }));
  const residentialStageOrder = new Map(
    RESIDENTIAL_ACCOUNT_PIPELINE_STAGES.map((stage, index) => [stage.id, index])
  );
  const focusedResidentialPropertyJourney = [...residentialPropertyJourneys].sort((left, right) => {
    const leftStageIndex = 'stageId' in left.journey
      ? (residentialStageOrder.get(left.journey.stageId) ?? -1)
      : -1;
    const rightStageIndex = 'stageId' in right.journey
      ? (residentialStageOrder.get(right.journey.stageId) ?? -1)
      : -1;

    if (leftStageIndex !== rightStageIndex) {
      return rightStageIndex - leftStageIndex;
    }

    if (left.property.isPrimary !== right.property.isPrimary) {
      return left.property.isPrimary ? -1 : 1;
    }

    return new Date(right.property.updatedAt).getTime() - new Date(left.property.updatedAt).getTime();
  })[0] ?? null;
  const residentialJourney = focusedResidentialPropertyJourney?.journey ?? getResidentialJourneyState({
    residentialQuotes,
    activeContract,
    recentJobs,
  });
  const residentialJourneyPropertyLabel = focusedResidentialPropertyJourney?.property.name ?? null;
  const commercialJourney = getCommercialJourneyState({
    facilities,
    appointments,
    proposals,
    activeContract,
    recentJobs,
  });
  const residentialServiceSummary = getResidentialServiceSummary({
    activeContract,
    recentJobs,
  });
  const upcomingAppointments = appointments
    .filter((appointment) => appointment.status !== 'completed' && appointment.status !== 'canceled')
    .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime());
  const recentAppointments = appointments
    .filter((appointment) => appointment.status === 'completed' || appointment.status === 'rescheduled')
    .sort((left, right) => new Date(right.scheduledStart).getTime() - new Date(left.scheduledStart).getTime());

  const accountBackState = {
    state: { backLabel: account.name, backPath: getAccountDetailPath(account) },
  };

  const navigateFromAccount = (path: string) => navigate(path, accountBackState);

  const bookingsSection = (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Bookings</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Upcoming and recent walkthroughs or service appointments linked to this account.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigateFromAccount('/appointments')}>
          Open Appointments
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
          <div className="text-xs uppercase tracking-wide text-surface-500">Upcoming</div>
          {upcomingAppointments.length === 0 ? (
            <div className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              No upcoming bookings.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {upcomingAppointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-surface-900 dark:text-surface-100">
                      {appointment.type === 'walk_through' ? 'Walkthrough' : 'Service Booking'}
                    </div>
                    <Badge variant={appointment.status === 'rescheduled' ? 'warning' : 'info'}>
                      {appointment.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                    {formatCalendarDate(appointment.scheduledStart)}
                  </div>
                  <div className="text-xs text-surface-500">
                    {appointment.facility?.name || 'No facility'} · {appointment.assignedToUser?.fullName || appointment.assignedTeam?.name || 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
          <div className="text-xs uppercase tracking-wide text-surface-500">Recent</div>
          {recentAppointments.length === 0 ? (
            <div className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              No recent bookings.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {recentAppointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-surface-900 dark:text-surface-100">
                      {appointment.type === 'walk_through' ? 'Walkthrough' : 'Service Booking'}
                    </div>
                    <Badge variant={appointment.status === 'completed' ? 'success' : 'warning'}>
                      {appointment.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                    {formatCalendarDate(appointment.scheduledStart)}
                  </div>
                  <div className="text-xs text-surface-500">
                    {appointment.facility?.name || 'No facility'} · {appointment.assignedToUser?.fullName || appointment.assignedTeam?.name || 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'service' as const, label: 'Service' },
    { id: 'history' as const, label: 'History' },
  ];

  const journeyStage = isResidentialAccount ? residentialJourney.currentStage : commercialJourney.currentStage;
  const journeyNextStep = isResidentialAccount ? residentialJourney.nextStep : commercialJourney.nextStep;
  const journeyVariant = activeContract
    ? 'success' as const
    : isResidentialAccount
      ? (residentialQuotes.length > 0 ? 'warning' as const : 'info' as const)
      : (proposals.length > 0 || appointments.length > 0 ? 'warning' as const : 'info' as const);

  return (
    <div className="space-y-6">
      <AccountHero
        account={account}
        activeContract={activeContract}
        proposalTotal={proposalTotal}
        contractTotal={contractTotal}
        contacts={contacts}
        recentJobs={recentJobs}
        canAdminAccounts={canAdminAccounts}
        onEdit={() => setShowEditModal(true)}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onNavigate={navigateFromAccount}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-surface-200 dark:border-surface-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Overview tab ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Journey card — shared structure */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                      {isResidentialAccount ? 'Residential Journey' : 'Commercial Journey'}
                    </h3>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {isResidentialAccount
                        ? 'Track where this residential customer is in the sales-to-service flow.'
                        : 'Track where this commercial account is in the sales-to-service pipeline.'}
                    </p>
                  </div>
                  <Badge variant={journeyVariant}>{journeyStage}</Badge>
                </div>
                <div className={`grid gap-3 ${isResidentialAccount ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {isResidentialAccount && (
                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Property In Journey</div>
                      <div className="mt-2 text-base font-semibold text-surface-900 dark:text-surface-100">
                        {residentialJourneyPropertyLabel ?? 'All Properties'}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                    <div className="text-xs uppercase tracking-wide text-surface-500">Current Stage</div>
                    <div className="mt-2 text-base font-semibold text-surface-900 dark:text-surface-100">
                      {journeyStage}
                    </div>
                  </div>
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                    <div className="text-xs uppercase tracking-wide text-surface-500">Next Step</div>
                    <div className="mt-2 text-sm text-surface-900 dark:text-surface-100">
                      {journeyNextStep}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isResidentialAccount ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => navigateFromAccount('/residential/quotes')}>
                        Open Residential Quotes
                      </Button>
                      {activeContract ? (
                        <Button size="sm" onClick={() => navigateFromAccount(`/contracts/${activeContract.id}`)}>
                          Open Active Contract
                        </Button>
                      ) : null}
                      {!activeContract && recentJobs.length > 0 ? (
                        <Button size="sm" onClick={() => navigateFromAccount('/jobs')}>
                          View Jobs
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => navigateFromAccount(`/accounts/${account.id}/facilities`)}>
                        Open Facilities
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigateFromAccount('/appointments')}>
                        Open Appointments
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigateFromAccount('/proposals')}>
                        Open Proposals
                      </Button>
                      {activeContract ? (
                        <Button size="sm" onClick={() => navigateFromAccount(`/contracts/${activeContract.id}`)}>
                          Open Active Contract
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </Card>

              {/* Type-specific content */}
              {isResidentialAccount ? (
                <>
                  {/* Properties */}
                  <Card className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Properties</h3>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          Service locations under this residential customer.
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={openCreatePropertyModal}>
                        Add Property
                      </Button>
                    </div>
                    {residentialProperties.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
                        No residential properties yet. Add the first service location before creating a quote.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {residentialPropertyJourneys.map(({ property, journey: propertyJourney }) => (
                          <div key={property.id} className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-surface-900 dark:text-surface-100">{property.name}</div>
                                  {property.isPrimary ? <Badge variant="success">Primary</Badge> : null}
                                  <Badge variant={propertyJourney.currentStage === 'Scheduled Service' || propertyJourney.currentStage === 'Active Contract' ? 'success' : propertyJourney.currentStage === 'Account Created' ? 'info' : 'warning'}>
                                    {propertyJourney.currentStage}
                                  </Badge>
                                </div>
                                <div className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                                  {[
                                    property.serviceAddress?.street,
                                    property.serviceAddress?.city,
                                    property.serviceAddress?.state,
                                    property.serviceAddress?.postalCode,
                                  ].filter(Boolean).join(', ') || 'No service address set'}
                                </div>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => openEditPropertyModal(property)}>
                                Edit
                              </Button>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                              <div>
                                <div className="text-xs uppercase tracking-wide text-surface-500">Home Profile</div>
                                <div className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                                  {property.homeProfile?.homeType ? property.homeProfile.homeType.replace('_', ' ') : 'No home type set'}
                                  {property.homeProfile?.squareFeet ? `, ${property.homeProfile.squareFeet} sq ft` : ''}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wide text-surface-500">Bedrooms / Baths</div>
                                <div className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                                  {property.homeProfile?.bedrooms ?? 0} bed / {property.homeProfile?.fullBathrooms ?? 0} bath
                                </div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wide text-surface-500">Access</div>
                                <div className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                                  {property.entryNotes || property.parkingAccess || property.accessNotes || 'No access notes set'}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg bg-surface-50 p-3 text-sm text-surface-700 dark:bg-surface-900/40 dark:text-surface-300">
                              <span className="font-medium text-surface-900 dark:text-surface-100">Next step:</span>{' '}
                              {propertyJourney.nextStep}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Quotes */}
                  <Card className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Quotes</h3>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          Quotes linked to this residential account.
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigateFromAccount('/residential/quotes')}>
                        Open Quotes
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {residentialQuotes.length === 0 ? (
                        <div className="text-sm text-surface-500 dark:text-surface-400">No residential quotes yet.</div>
                      ) : (
                        residentialQuotes.map((quote) => (
                          <button
                            key={quote.id}
                            type="button"
                            onClick={() => navigateFromAccount('/residential/quotes')}
                            className="w-full rounded-xl border border-surface-200 p-3 text-left transition-colors hover:border-surface-300 dark:border-surface-700 dark:hover:border-surface-600"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium text-surface-900 dark:text-surface-100">{quote.title}</div>
                                <div className="text-xs text-surface-500">{quote.quoteNumber}</div>
                              </div>
                              <Badge variant={quote.status === 'accepted' || quote.status === 'converted' ? 'success' : quote.status === 'declined' ? 'error' : 'warning'}>
                                {quote.status}
                              </Badge>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </Card>
                </>
              ) : (
                <>
                  <AccountFacilities
                    facilities={facilities}
                    canWriteFacilities={canWriteFacilities}
                    onAddFacility={() => setShowFacilityModal(true)}
                    onNavigate={navigateFromAccount}
                  />
                  <AccountFinancials
                    account={account}
                    activeContract={activeContract}
                    proposals={proposals}
                    contracts={contracts}
                    proposalTotal={proposalTotal}
                    contractTotal={contractTotal}
                    onNavigate={navigateFromAccount}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Service tab ── */}
          {activeTab === 'service' && (
            <div className="space-y-6">
              {bookingsSection}

              {isResidentialAccount && (
                <Card className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Service Details</h3>
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        Current service shape and next visit details.
                      </p>
                    </div>
                    <Badge variant={activeContract ? 'success' : 'info'}>
                      {activeContract ? 'Live Service' : 'Pre-Service'}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Service Type</div>
                      <div className="mt-2 text-base font-semibold text-surface-900 dark:text-surface-100">
                        {residentialServiceSummary.serviceType}
                      </div>
                    </div>
                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Frequency</div>
                      <div className="mt-2 text-base font-semibold text-surface-900 dark:text-surface-100">
                        {residentialServiceSummary.frequency}
                      </div>
                    </div>
                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Next Visit</div>
                      <div className="mt-2 text-base font-semibold text-surface-900 dark:text-surface-100">
                        {residentialServiceSummary.nextVisitDate}
                      </div>
                      <div className="mt-1 text-xs text-surface-500">{residentialServiceSummary.nextVisitWindow}</div>
                    </div>
                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                      <div className="text-xs uppercase tracking-wide text-surface-500">Assigned To</div>
                      <div className="mt-2 text-base font-semibold text-surface-900 dark:text-surface-100">
                        {residentialServiceSummary.assignmentLabel}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-dashed border-surface-200 p-4 text-sm text-surface-600 dark:border-surface-700 dark:text-surface-300">
                    <span className="font-medium text-surface-900 dark:text-surface-100">Latest completed visit:</span>{' '}
                    {residentialServiceSummary.latestCompletedVisit}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── History tab ── */}
          {activeTab === 'history' && (
            <AccountHistory
              activities={activities}
              activitiesLoading={activitiesLoading}
              canWriteAccounts={canWriteAccounts}
              activityNote={activityNote}
              setActivityNote={setActivityNote}
              activityType={activityType}
              setActivityType={setActivityType}
              onAddActivity={handleAddActivity}
              addingActivity={addingActivity}
            />
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          <AccountContacts
            contacts={contacts}
            accountId={account.id}
            onNavigate={navigateFromAccount}
          />
          <AccountServiceOverview
            activeContract={activeContract}
            recentJobs={recentJobs}
            onNavigate={navigateFromAccount}
          />
        </div>
      </div>

      {/* Modals */}
      <EditAccountModal
        isOpen={showEditModal && canAdminAccounts}
        onClose={() => setShowEditModal(false)}
        formData={formData}
        setFormData={setFormData}
        users={users}
        activeContract={activeContract}
        onSave={handleUpdate}
        saving={saving}
      />
      <AddFacilityModal
        isOpen={showFacilityModal && canWriteFacilities && !isResidentialAccount}
        onClose={() => setShowFacilityModal(false)}
        facilityFormData={facilityFormData}
        setFacilityFormData={setFacilityFormData}
        onSave={handleCreateFacility}
        saving={creatingFacility}
      />
      <Modal
        isOpen={showPropertyModal && isResidentialAccount}
        onClose={() => setShowPropertyModal(false)}
        title={editingProperty ? 'Edit Residential Property' : 'Add Residential Property'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Property Name"
              value={propertyFormData.name}
              onChange={(event) =>
                setPropertyFormData((current) => ({ ...current, name: event.target.value }))
              }
            />
            <Select
              label="Home Type"
              value={propertyFormData.homeProfile.homeType ?? ''}
              options={[
                { value: 'apartment', label: 'Apartment' },
                { value: 'condo', label: 'Condo' },
                { value: 'townhouse', label: 'Townhouse' },
                { value: 'single_family', label: 'Single Family' },
              ]}
              onChange={(value) =>
                setPropertyFormData((current) => ({
                  ...current,
                  homeProfile: { ...current.homeProfile, homeType: value as NonNullable<typeof current.homeProfile.homeType> },
                }))
              }
            />
            <Input
              label="Street"
              value={propertyFormData.serviceAddress.street ?? ''}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  serviceAddress: { ...current.serviceAddress, street: event.target.value },
                }))
              }
            />
            <Input
              label="City"
              value={propertyFormData.serviceAddress.city ?? ''}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  serviceAddress: { ...current.serviceAddress, city: event.target.value },
                }))
              }
            />
            <Input
              label="State"
              value={propertyFormData.serviceAddress.state ?? ''}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  serviceAddress: { ...current.serviceAddress, state: event.target.value },
                }))
              }
            />
            <Input
              label="Postal Code"
              value={propertyFormData.serviceAddress.postalCode ?? ''}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  serviceAddress: { ...current.serviceAddress, postalCode: event.target.value },
                }))
              }
            />
            <Input
              type="number"
              label="Square Feet"
              value={propertyFormData.homeProfile.squareFeet ?? ''}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  homeProfile: { ...current.homeProfile, squareFeet: Number(event.target.value) || 0 },
                }))
              }
            />
            <Input
              type="number"
              label="Bedrooms"
              value={propertyFormData.homeProfile.bedrooms ?? 0}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  homeProfile: { ...current.homeProfile, bedrooms: Number(event.target.value) || 0 },
                }))
              }
            />
            <Input
              type="number"
              label="Full Bathrooms"
              value={propertyFormData.homeProfile.fullBathrooms ?? 0}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  homeProfile: { ...current.homeProfile, fullBathrooms: Number(event.target.value) || 0 },
                }))
              }
            />
            <Input
              type="number"
              label="Half Bathrooms"
              value={propertyFormData.homeProfile.halfBathrooms ?? 0}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  homeProfile: { ...current.homeProfile, halfBathrooms: Number(event.target.value) || 0 },
                }))
              }
            />
            <Input
              type="number"
              label="Levels"
              value={propertyFormData.homeProfile.levels ?? 1}
              onChange={(event) =>
                setPropertyFormData((current) => ({
                  ...current,
                  homeProfile: { ...current.homeProfile, levels: Number(event.target.value) || 1 },
                }))
              }
            />
            <label className="flex items-center gap-3 rounded-lg border border-surface-200 px-3 py-2 text-sm dark:border-surface-700">
              <input
                type="checkbox"
                checked={propertyFormData.isPrimary}
                onChange={(event) =>
                  setPropertyFormData((current) => ({ ...current, isPrimary: event.target.checked }))
                }
              />
              Primary residential property
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Parking Access"
              value={propertyFormData.parkingAccess}
              onChange={(event) =>
                setPropertyFormData((current) => ({ ...current, parkingAccess: event.target.value }))
              }
            />
            <label className="flex items-center gap-3 rounded-lg border border-surface-200 px-3 py-2 text-sm dark:border-surface-700">
              <input
                type="checkbox"
                checked={propertyFormData.pets}
                onChange={(event) =>
                  setPropertyFormData((current) => ({ ...current, pets: event.target.checked }))
                }
              />
              Pets at property
            </label>
          </div>
          <Textarea
            label="Entry Notes"
            value={propertyFormData.entryNotes}
            onChange={(event) =>
              setPropertyFormData((current) => ({ ...current, entryNotes: event.target.value }))
            }
          />
          <Textarea
            label="Access Notes"
            value={propertyFormData.accessNotes}
            onChange={(event) =>
              setPropertyFormData((current) => ({ ...current, accessNotes: event.target.value }))
            }
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPropertyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProperty} disabled={savingProperty}>
              {savingProperty ? 'Saving...' : editingProperty ? 'Save Property' : 'Create Property'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountDetail;
