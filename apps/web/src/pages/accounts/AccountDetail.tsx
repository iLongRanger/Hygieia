import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { listAppointments, updateAppointment } from '../../lib/appointments';
import { listFacilities, createFacility } from '../../lib/facilities';
import { listContacts } from '../../lib/contacts';
import { listJobs } from '../../lib/jobs';
import { listUsers } from '../../lib/users';
import { listProposals } from '../../lib/proposals';
import { listContracts } from '../../lib/contracts';
import { createResidentialProperty, listResidentialQuotes, updateResidentialProperty } from '../../lib/residential';
import { getAccountDetailPath } from '../../lib/accountRoutes';
import { RESIDENTIAL_BUILDING_TYPES } from '../facilities/facility-constants';
import { FacilityServiceScheduleFields } from '../facilities/modals/FacilityServiceScheduleFields';
import {
  COMMERCIAL_ACCOUNT_PIPELINE_STAGES,
  RESIDENTIAL_ACCOUNT_PIPELINE_STAGES,
  getResidentialJourneyState,
  getResidentialPropertyJourneyState,
  type CommercialAccountPipelineStageId,
  type ResidentialAccountPipelineStageId,
} from '../../lib/accountPipeline';
import type {
  Account,
  AccountActivity,
  AccountActivityEntryType,
  ResidentialPropertySummary,
  UpdateAccountInput,
  Appointment,
} from '../../types/crm';
import type { Facility, CreateFacilityInput, Address as FacilityAddress } from '../../types/facility';
import type { User } from '../../types/user';
import type { Proposal } from '../../types/proposal';
import type { Contract } from '../../types/contract';
import type { Contact } from '../../types/contact';
import type { Job } from '../../types/job';
import type { ResidentialQuote } from '../../types/residential';
import type { ResidentialHomeProfile } from '../../types/residential';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Drawer } from '../../components/ui/Drawer';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { AccountHero } from './AccountHero';
import { AccountContacts } from './AccountContacts';
import { AccountFacilities } from './AccountFacilities';
import { AccountHistory } from './AccountHistory';
import { EditAccountModal } from './modals/EditAccountModal';
import { AddFacilityModal } from './modals/AddFacilityModal';
import {
  AccountJourneyStepper,
  type JourneyAction,
} from './AccountJourneyStepper';
import { AccountAssignment } from './AccountAssignment';
import { AccountDetailsSidebar } from './AccountDetailsSidebar';
import { AccountProposalsContracts } from './AccountProposalsContracts';
import { AccountResidentialProperties } from './AccountResidentialProperties';
import { AccountServiceTab } from './AccountServiceTab';
import { StickyNote } from 'lucide-react';

const RESIDENTIAL_PROPERTY_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const RESIDENTIAL_SERVICE_LOCATION_TYPES = RESIDENTIAL_BUILDING_TYPES.filter(
  (option) => option.value !== 'other'
);

const DEFAULT_RESIDENTIAL_PROPERTY_FORM: {
  name: string;
  serviceAddress: NonNullable<UpdateAccountInput['serviceAddress']>;
  homeProfile: ResidentialHomeProfile;
  defaultTasks: string[];
  accessNotes: string;
  parkingAccess: string;
  entryNotes: string;
  pets: boolean;
  isPrimary: boolean;
  status: ResidentialPropertySummary['status'];
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
  defaultTasks: [],
  accessNotes: '',
  parkingAccess: '',
  entryNotes: '',
  pets: false,
  isPrimary: false,
  status: 'active',
};

function normalizeResidentialTaskList(tasks: string[] | null | undefined) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((task) => task.trim())
    .filter(
      (task, index, list) =>
        task.length > 0 &&
        list.findIndex((entry) => entry.toLowerCase() === task.toLowerCase()) === index
    );
}

interface CommercialJourneyResult {
  stageId: CommercialAccountPipelineStageId;
  currentStage: string;
  nextStep: string;
  isLost: boolean;
  lostLabel?: string;
}

function getCommercialJourneyState(input: {
  facilities: Facility[];
  appointments: Appointment[];
  proposals: Proposal[];
  activeContract: Contract | null;
  recentJobs: Job[];
}): CommercialJourneyResult {
  const stageLabel = (stageId: CommercialAccountPipelineStageId) =>
    COMMERCIAL_ACCOUNT_PIPELINE_STAGES.find((stage) => stage.id === stageId)?.label || stageId;

  const build = (
    stageId: CommercialAccountPipelineStageId,
    nextStep: string
  ): CommercialJourneyResult => ({
    stageId,
    currentStage: stageLabel(stageId),
    nextStep,
    isLost: false,
  });

  const latestProposal = [...input.proposals].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    return rightTime - leftTime;
  })[0];

  const walkthroughs = input.appointments.filter((a) => a.type === 'walk_through');
  const hasCompletedWalkthrough = walkthroughs.some((a) => a.status === 'completed');
  const hasBookedWalkthrough = walkthroughs.some(
    (a) => a.status !== 'completed' && a.status !== 'canceled'
  );
  const hasScheduledService = input.recentJobs.length > 0;

  if (hasScheduledService) {
    return build('scheduled_service', 'Review the job schedule and confirm the field team is assigned.');
  }
  if (input.activeContract) {
    return build('active_contract', 'Activate delivery by confirming the service calendar and first visit assignment.');
  }

  switch (latestProposal?.status) {
    case 'accepted':
      return build('contract_ready', 'Create or finalize the contract from the accepted proposal.');
    case 'viewed':
      return build('proposal_viewed', 'Follow up with the client while the proposal is under review.');
    case 'sent':
      return build('proposal_sent', 'Follow up with the client or resend the proposal if needed.');
    case 'rejected':
      return {
        stageId: 'proposal_sent',
        currentStage: 'Proposal Rejected',
        nextStep: 'Revise the proposal or close out the opportunity.',
        isLost: true,
        lostLabel: 'Proposal Rejected',
      };
    case 'draft':
    case 'expired':
      return build('proposal_draft', 'Finish pricing and send the proposal to the client.');
    default:
      break;
  }

  if (hasCompletedWalkthrough) {
    return build('walkthrough_completed', 'Build the proposal using the completed walkthrough scope.');
  }
  if (hasBookedWalkthrough) {
    return build('walkthrough_booked', 'Prepare the service location details before the walkthrough happens.');
  }
  if (input.facilities.length > 0) {
    return build('facility_added', 'Book the first walkthrough for the service location.');
  }
  return build('account_created', 'Add the first service location so walkthrough planning can begin.');
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
  const [appointmentNote, setAppointmentNote] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [addingAppointmentNote, setAddingAppointmentNote] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'contacts' | 'assignment' | 'details' | 'service' | 'history'
  >('overview');
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
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [activeCommercialFacilityId, setActiveCommercialFacilityId] = useState<string | null>(null);
  const locationsRef = useRef<HTMLDivElement | null>(null);

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
    residentialTaskLibrary: [],
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
          residentialTaskLibrary: normalizeResidentialTaskList(data.residentialTaskLibrary),
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
      const response = await listFacilities({
        accountId: id,
        limit: 100,
        includeResidentialLinked: true,
      });
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
      console.error('Failed to fetch residential proposal history:', error);
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
      const response = await listAccountActivities(id, { page: 1, limit: 50 });
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
  }, [
    fetchAccount,
    fetchUsers,
    fetchFacilities,
    fetchProposals,
    fetchContracts,
    fetchResidentialQuotes,
    fetchActiveContract,
    fetchActivities,
    fetchContacts,
    fetchRecentJobs,
    fetchAppointments,
  ]);

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

  const handleSaveAssignment = async () => {
    if (!id) return;
    const nextAccountManagerId = formData.accountManagerId || null;

    try {
      setSavingAssignment(true);
      await updateAccount(id, {
        ...formData,
        accountManagerId: nextAccountManagerId,
      });
      toast.success('Assignment updated');
      await fetchAccount();
    } catch (error) {
      console.error('Failed to update assignment:', error);
      toast.error('Failed to update assignment');
    } finally {
      setSavingAssignment(false);
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
      toast.success('Service location created successfully');
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
      console.error('Failed to create service location:', error);
      toast.error('Failed to create service location');
    } finally {
      setCreatingFacility(false);
    }
  };

  const openCreatePropertyModal = () => {
    setEditingProperty(null);
    setPropertyFormData({
      ...DEFAULT_RESIDENTIAL_PROPERTY_FORM,
      defaultTasks: [],
      isPrimary: !(account?.residentialProperties?.length ?? 0),
      status: 'active',
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
      defaultTasks: property.defaultTasks ?? [],
      pets: Boolean(property.pets),
      isPrimary: property.isPrimary,
      status: property.status,
    });
    setShowPropertyModal(true);
  };

  const handleSaveProperty = async () => {
    if (!id || !propertyFormData.name.trim()) {
      toast.error('Service location name is required');
      return;
    }
    try {
      setSavingProperty(true);
      if (editingProperty) {
        await updateResidentialProperty(editingProperty.id, {
          name: propertyFormData.name,
          serviceAddress: propertyFormData.serviceAddress,
          homeProfile: propertyFormData.homeProfile,
          defaultTasks: propertyFormData.defaultTasks,
          accessNotes: propertyFormData.accessNotes,
          parkingAccess: propertyFormData.parkingAccess,
          entryNotes: propertyFormData.entryNotes,
          pets: propertyFormData.pets,
          isPrimary: propertyFormData.isPrimary,
          status: propertyFormData.status,
        });
        toast.success('Residential service location updated');
      } else {
        await createResidentialProperty({
          accountId: id,
          name: propertyFormData.name,
          serviceAddress: propertyFormData.serviceAddress,
          homeProfile: propertyFormData.homeProfile,
          defaultTasks: propertyFormData.defaultTasks,
          accessNotes: propertyFormData.accessNotes,
          parkingAccess: propertyFormData.parkingAccess,
          entryNotes: propertyFormData.entryNotes,
          pets: propertyFormData.pets,
          isPrimary: propertyFormData.isPrimary,
          status: propertyFormData.status,
        });
        toast.success('Residential service location created');
      }
      setShowPropertyModal(false);
      await fetchAccount();
    } catch (error) {
      console.error('Failed to save residential service location:', error);
      toast.error('Failed to save residential service location');
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
      await createAccountActivity(id, { entryType: activityType, note: trimmed });
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

  const handleAddAppointmentNote = async () => {
    if (!selectedAppointmentId) {
      toast.error('Please select an appointment');
      return;
    }

    const trimmed = appointmentNote.trim();
    if (!trimmed) {
      toast.error('Please enter an appointment note');
      return;
    }

    const selectedAppointment = appointments.find((appointment) => appointment.id === selectedAppointmentId);
    if (!selectedAppointment) {
      toast.error('Selected appointment was not found');
      return;
    }

    const nextNotes = selectedAppointment.notes
      ? `${selectedAppointment.notes.trim()}\n\n${trimmed}`
      : trimmed;

    try {
      setAddingAppointmentNote(true);
      await updateAppointment(selectedAppointmentId, {
        notes: nextNotes,
        accountHistoryNote: trimmed,
      });
      setAppointmentNote('');
      toast.success('Appointment note added');
      await Promise.all([fetchAppointments(), fetchActivities()]);
    } catch (error) {
      console.error('Failed to add appointment note:', error);
      toast.error('Failed to add appointment note');
    } finally {
      setAddingAppointmentNote(false);
    }
  };

  const isResidentialAccount = account?.type === 'residential';
  const residentialProperties = useMemo(
    () => account?.residentialProperties ?? [],
    [account?.residentialProperties]
  );

  const residentialStageOrder = useMemo(
    () => new Map(RESIDENTIAL_ACCOUNT_PIPELINE_STAGES.map((stage, index) => [stage.id, index])),
    []
  );

  const residentialPropertyJourneys = useMemo(() => {
    return residentialProperties.map((property) => ({
      property,
      journey: getResidentialPropertyJourneyState({
        property,
        residentialQuotes,
        appointments,
        contracts,
        recentJobs,
      }),
    }));
  }, [residentialProperties, residentialQuotes, appointments, contracts, recentJobs]);

  const defaultFocusedProperty = useMemo(() => {
    return [...residentialPropertyJourneys].sort((left, right) => {
      const leftIndex =
        'stageId' in left.journey ? residentialStageOrder.get(left.journey.stageId) ?? -1 : -1;
      const rightIndex =
        'stageId' in right.journey ? residentialStageOrder.get(right.journey.stageId) ?? -1 : -1;
      if (leftIndex !== rightIndex) return rightIndex - leftIndex;
      if (left.property.isPrimary !== right.property.isPrimary)
        return left.property.isPrimary ? -1 : 1;
      return new Date(right.property.updatedAt).getTime() - new Date(left.property.updatedAt).getTime();
    })[0] ?? null;
  }, [residentialPropertyJourneys, residentialStageOrder]);

  const effectivePropertyId = activePropertyId ?? defaultFocusedProperty?.property.id ?? null;
  const selectedPropertyJourney =
    residentialPropertyJourneys.find((entry) => entry.property.id === effectivePropertyId) ??
    defaultFocusedProperty;

  const fallbackResidentialJourney = getResidentialJourneyState({
    residentialQuotes,
    appointments,
    activeContract,
    recentJobs,
    hasServiceLocation: residentialProperties.length > 0 || facilities.length > 0,
  });

  const activeResidentialJourney = selectedPropertyJourney?.journey ?? fallbackResidentialJourney;

  const focusedResidentialFacilityId =
    selectedPropertyJourney?.property.facility?.id ?? null;
  const focusedResidentialProposal = focusedResidentialFacilityId
    ? [...proposals]
        .filter((proposal) => proposal.facility?.id === focusedResidentialFacilityId)
        .sort((left, right) => {
          const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
          const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
          return rightTime - leftTime;
        })[0] ?? null
    : null;

  const latestProposal = useMemo(
    () =>
      [...proposals].sort((l, r) => {
        const lt = new Date(l.updatedAt || l.createdAt).getTime();
        const rt = new Date(r.updatedAt || r.createdAt).getTime();
        return rt - lt;
      })[0] ?? null,
    [proposals]
  );

  const commercialJourney = useMemo(
    () =>
      getCommercialJourneyState({
        facilities,
        appointments,
        proposals,
        activeContract,
        recentJobs,
      }),
    [facilities, appointments, proposals, activeContract, recentJobs]
  );

  const commercialStageOrder = useMemo(
    () => new Map(COMMERCIAL_ACCOUNT_PIPELINE_STAGES.map((stage, index) => [stage.id, index])),
    []
  );

  const commercialFacilityJourneys = useMemo(() => {
    return facilities.map((facility) => {
      const includeUnscopedRecords = facilities.length === 1;
      const facilityAppointments = appointments.filter(
        (appointment) => appointment.facility?.id === facility.id || (includeUnscopedRecords && !appointment.facility)
      );
      const facilityProposals = proposals.filter(
        (proposal) => proposal.facility?.id === facility.id || (includeUnscopedRecords && !proposal.facility)
      );
      const facilityContracts = contracts.filter(
        (contract) => contract.facility?.id === facility.id || (includeUnscopedRecords && !contract.facility)
      );
      const facilityRecentJobs = recentJobs.filter((job) => job.facility?.id === facility.id);
      const facilityActiveContract =
        facilityContracts.find((contract) => contract.status === 'active') ?? null;

      return {
        facility,
        journey: getCommercialJourneyState({
          facilities: [facility],
          appointments: facilityAppointments,
          proposals: facilityProposals,
          activeContract: facilityActiveContract,
          recentJobs: facilityRecentJobs,
        }),
        latestProposal:
          [...facilityProposals].sort((left, right) => {
            const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
            const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
            return rightTime - leftTime;
          })[0] ?? null,
        activeContract: facilityActiveContract,
      };
    });
  }, [facilities, appointments, proposals, contracts, recentJobs]);

  const defaultFocusedCommercialFacility = useMemo(() => {
    return [...commercialFacilityJourneys].sort((left, right) => {
      const leftIndex = commercialStageOrder.get(left.journey.stageId) ?? -1;
      const rightIndex = commercialStageOrder.get(right.journey.stageId) ?? -1;
      if (leftIndex !== rightIndex) return rightIndex - leftIndex;
      return new Date(right.facility.updatedAt).getTime() - new Date(left.facility.updatedAt).getTime();
    })[0] ?? null;
  }, [commercialFacilityJourneys, commercialStageOrder]);

  const effectiveCommercialFacilityId =
    activeCommercialFacilityId ?? defaultFocusedCommercialFacility?.facility.id ?? null;
  const selectedCommercialFacilityJourney =
    commercialFacilityJourneys.find((entry) => entry.facility.id === effectiveCommercialFacilityId)
    ?? defaultFocusedCommercialFacility;

  const activeCommercialJourney = selectedCommercialFacilityJourney?.journey ?? commercialJourney;
  const focusedCommercialProposal = selectedCommercialFacilityJourney
    ? selectedCommercialFacilityJourney.latestProposal
    : latestProposal;
  const focusedCommercialContract = selectedCommercialFacilityJourney
    ? selectedCommercialFacilityJourney.activeContract
    : activeContract;
  const focusedCommercialFacilityId = selectedCommercialFacilityJourney?.facility.id ?? null;

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

  const accountBackState = {
    state: { backLabel: account.name, backPath: getAccountDetailPath(account) },
  };

  const navigateFromAccount = (path: string) => navigate(path, accountBackState);
  const navigateToFacilityDetail = (facilityId: string) =>
    navigate(`/service-locations/${facilityId}`, accountBackState);
  const navigateToProposalDetail = (proposalId: string) =>
    navigate(`/proposals/${proposalId}`, accountBackState);

  const scrollToLocations = () => {
    if (locationsRef.current) {
      locationsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const residentialLinkedFacilityIds = new Set(
    residentialProperties.map((property) => property.facility?.id).filter(Boolean)
  );
  const residentialServiceLocationCount =
    residentialProperties.length +
    facilities.filter((facility) => !residentialLinkedFacilityIds.has(facility.id)).length;
  const facilitiesCount = isResidentialAccount
    ? residentialServiceLocationCount || (account.serviceAddress ? 1 : 0)
    : facilities.length;

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'contacts' as const, label: 'Contacts' },
    { id: 'assignment' as const, label: 'Assignment' },
    { id: 'details' as const, label: 'Account Details' },
    { id: 'service' as const, label: 'Service' },
    { id: 'history' as const, label: 'History' },
  ];

  const commercialActions = buildCommercialActions({
    stageId: activeCommercialJourney.stageId,
    latestProposal: focusedCommercialProposal,
    activeContract: focusedCommercialContract,
    focusedFacilityId: focusedCommercialFacilityId,
    canWriteFacilities,
    onAddFacility: () => setShowFacilityModal(true),
    onOpenProposal: navigateToProposalDetail,
    onOpenFacility: navigateToFacilityDetail,
    onNavigate: navigateFromAccount,
  });

  const residentialActions = buildResidentialActions({
    stageId: 'stageId' in activeResidentialJourney ? activeResidentialJourney.stageId : null,
    isLost: 'canonicalStatus' in activeResidentialJourney && activeResidentialJourney.canonicalStatus === 'lost',
    focusedProposal: focusedResidentialProposal,
    focusedFacilityId: focusedResidentialFacilityId,
    activeContract,
    onAddProperty: openCreatePropertyModal,
    onOpenProposal: navigateToProposalDetail,
    onNavigate: navigateFromAccount,
    onOpenFacility: navigateToFacilityDetail,
  });

  const journeyView = isResidentialAccount ? (
    <AccountJourneyStepper
      title="Residential Journey"
      description={
        selectedPropertyJourney
          ? `Tracking ${selectedPropertyJourney.property.name} through the sales-to-service flow.`
          : 'Track where this residential customer is in the sales-to-service flow.'
      }
      stages={RESIDENTIAL_ACCOUNT_PIPELINE_STAGES}
      currentStageId={
        'stageId' in activeResidentialJourney
          ? activeResidentialJourney.stageId
          : getResidentialLostStageId()
      }
      isLost={'canonicalStatus' in activeResidentialJourney && activeResidentialJourney.canonicalStatus === 'lost'}
      lostLabel={
        'canonicalStatus' in activeResidentialJourney && activeResidentialJourney.canonicalStatus === 'lost'
          ? activeResidentialJourney.currentStage
          : undefined
      }
      nextStep={activeResidentialJourney.nextStep}
      primaryAction={residentialActions.primary}
      secondaryActions={residentialActions.secondary}
      tertiaryAction={residentialActions.tertiary}
      propertySwitcher={
        residentialProperties.length > 1 ? (
          <Select
            aria-label="Residential service location"
            value={effectivePropertyId ?? ''}
            onChange={(value) => setActivePropertyId(value || null)}
            options={residentialProperties.map((property) => ({
              value: property.id,
              label: `${property.name}${property.isPrimary ? ' (Primary)' : ''}`,
            }))}
          />
        ) : undefined
      }
    />
  ) : (
    <AccountJourneyStepper
      title="Commercial Journey"
      description={
        selectedCommercialFacilityJourney
          ? `Tracking ${selectedCommercialFacilityJourney.facility.name} through the sales-to-service pipeline.`
          : 'Track where this commercial account is in the sales-to-service pipeline.'
      }
      stages={COMMERCIAL_ACCOUNT_PIPELINE_STAGES}
      currentStageId={activeCommercialJourney.stageId}
      isLost={activeCommercialJourney.isLost}
      lostLabel={activeCommercialJourney.lostLabel}
      nextStep={activeCommercialJourney.nextStep}
      primaryAction={commercialActions.primary}
      secondaryActions={commercialActions.secondary}
      tertiaryAction={commercialActions.tertiary}
      propertySwitcher={
        facilities.length > 1 ? (
          <Select
            aria-label="Commercial service location"
            value={effectiveCommercialFacilityId ?? ''}
            onChange={(value) => setActiveCommercialFacilityId(value || null)}
            options={facilities.map((facility) => ({
              value: facility.id,
              label: facility.name,
            }))}
          />
        ) : undefined
      }
    />
  );

  return (
    <div className="space-y-6">
      <AccountHero
        account={account}
        activeContract={activeContract}
        contractTotal={contractTotal}
        recentJobs={recentJobs}
        canAdminAccounts={canAdminAccounts}
        facilitiesCount={facilitiesCount}
        onEdit={() => setShowEditModal(true)}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onNavigate={navigateFromAccount}
        onScrollToLocations={scrollToLocations}
      />

      <div className="space-y-6">
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

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {journeyView}

            {isResidentialAccount ? (
              <>
                <AccountResidentialProperties
                  ref={locationsRef}
                  properties={residentialProperties}
                  facilities={facilities}
                  contracts={contracts}
                  appointments={appointments}
                  recentJobs={recentJobs}
                  residentialQuotes={residentialQuotes}
                  focusedPropertyId={effectivePropertyId}
                  onAddProperty={openCreatePropertyModal}
                  onEditProperty={openEditPropertyModal}
                  onOpenFacility={navigateToFacilityDetail}
                />

                <AccountProposalsContracts
                  accountId={account.id}
                  proposals={proposals}
                  contracts={contracts}
                  proposalTotal={proposalTotal}
                  contractTotal={contractTotal}
                  activeContract={activeContract}
                  onNavigate={navigateFromAccount}
                />
              </>
            ) : (
              <>
                <AccountFacilities
                  ref={locationsRef}
                  facilities={facilities}
                  recentJobs={recentJobs}
                  canWriteFacilities={canWriteFacilities}
                  onAddFacility={() => setShowFacilityModal(true)}
                  onNavigate={navigateFromAccount}
                />

                <AccountProposalsContracts
                  accountId={account.id}
                  proposals={proposals}
                  contracts={contracts}
                  proposalTotal={proposalTotal}
                  contractTotal={contractTotal}
                  activeContract={activeContract}
                  onNavigate={navigateFromAccount}
                />
              </>
            )}

            {account.notes ? (
              <Card className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Notes</h3>
                  {canAdminAccounts && (
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="ml-auto text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-200">
                  {account.notes}
                </p>
              </Card>
            ) : null}
          </div>
        )}

        {activeTab === 'contacts' && (
          <AccountContacts contacts={contacts} accountId={account.id} onNavigate={navigateFromAccount} />
        )}

        {activeTab === 'assignment' && (
          <AccountAssignment
            account={account}
            activeContract={activeContract}
            recentJobs={recentJobs}
            users={users}
            canEditAccountAssignment={canWriteAccounts}
            saving={savingAssignment}
            accountManagerId={formData.accountManagerId || ''}
            onAccountManagerChange={(value) =>
              setFormData((current) => ({ ...current, accountManagerId: value || null }))
            }
            onSave={handleSaveAssignment}
          />
        )}

        {activeTab === 'details' && <AccountDetailsSidebar account={account} />}

        {activeTab === 'service' && (
          <AccountServiceTab
            accountType={account.type}
            activeContract={activeContract}
            appointments={appointments}
            recentJobs={recentJobs}
            onNavigate={navigateFromAccount}
          />
        )}

        {activeTab === 'history' && (
          <AccountHistory
            activities={activities}
            activitiesLoading={activitiesLoading}
            canWriteAccounts={canWriteAccounts}
            appointments={appointments}
            activityNote={activityNote}
            setActivityNote={setActivityNote}
            activityType={activityType}
            setActivityType={setActivityType}
            onAddActivity={handleAddActivity}
            addingActivity={addingActivity}
            appointmentNote={appointmentNote}
            setAppointmentNote={setAppointmentNote}
            selectedAppointmentId={selectedAppointmentId}
            setSelectedAppointmentId={setSelectedAppointmentId}
            onAddAppointmentNote={handleAddAppointmentNote}
            addingAppointmentNote={addingAppointmentNote}
          />
        )}
      </div>

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
        accountType={account.type}
      />
      <Drawer
        isOpen={showPropertyModal && Boolean(isResidentialAccount)}
        onClose={() => setShowPropertyModal(false)}
        title={editingProperty ? 'Edit Residential Service Location' : 'Add Residential Service Location'}
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Service Location Name"
            required
            placeholder="Maple Family Home"
            value={propertyFormData.name}
            onChange={(event) =>
              setPropertyFormData((current) => ({ ...current, name: event.target.value }))
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Home Type"
              placeholder="Select type"
              value={propertyFormData.homeProfile.homeType ?? ''}
              options={RESIDENTIAL_SERVICE_LOCATION_TYPES}
              onChange={(value) =>
                setPropertyFormData((current) => ({
                  ...current,
                  homeProfile: {
                    ...current.homeProfile,
                    homeType: value as NonNullable<typeof current.homeProfile.homeType>,
                  },
                }))
              }
            />
            <Select
              label="Status"
              options={RESIDENTIAL_PROPERTY_STATUSES}
              value={propertyFormData.status}
              onChange={(value) =>
                setPropertyFormData((current) => ({
                  ...current,
                  status: value as ResidentialPropertySummary['status'],
                }))
              }
            />
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Total square feet will be auto-calculated from the areas added to this service location.
          </p>
          <div className="border-t border-surface-200 pt-4 dark:border-surface-700">
            <h4 className="mb-3 text-sm font-medium text-surface-900 dark:text-white">Address</h4>
            <div className="space-y-4">
              <Input
                label="Street Address"
                placeholder="123 Main St"
                value={propertyFormData.serviceAddress.street ?? ''}
                onChange={(event) =>
                  setPropertyFormData((current) => ({
                    ...current,
                    serviceAddress: { ...current.serviceAddress, street: event.target.value || undefined },
                  }))
                }
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  label="City"
                  placeholder="New York"
                  value={propertyFormData.serviceAddress.city ?? ''}
                  onChange={(event) =>
                    setPropertyFormData((current) => ({
                      ...current,
                      serviceAddress: { ...current.serviceAddress, city: event.target.value || undefined },
                    }))
                  }
                />
                <Input
                  label="State"
                  placeholder="NY"
                  value={propertyFormData.serviceAddress.state ?? ''}
                  onChange={(event) =>
                    setPropertyFormData((current) => ({
                      ...current,
                      serviceAddress: { ...current.serviceAddress, state: event.target.value || undefined },
                    }))
                  }
                />
                <Input
                  label="Postal Code"
                  placeholder="10001"
                  value={propertyFormData.serviceAddress.postalCode ?? ''}
                  onChange={(event) =>
                    setPropertyFormData((current) => ({
                      ...current,
                      serviceAddress: { ...current.serviceAddress, postalCode: event.target.value || undefined },
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <FacilityServiceScheduleFields
            address={propertyFormData.serviceAddress as FacilityAddress}
            onChange={(nextAddress) =>
              setPropertyFormData((current) => ({
                ...current,
                serviceAddress: nextAddress as NonNullable<UpdateAccountInput['serviceAddress']>,
              }))
            }
          />
          <Textarea
            label="Access Instructions"
            placeholder="Enter through the side door, gate code, lockbox details..."
            value={propertyFormData.accessNotes}
            onChange={(event) =>
              setPropertyFormData((current) => ({ ...current, accessNotes: event.target.value }))
            }
          />
          <Textarea
            label="Parking Info"
            placeholder="Driveway, street parking, visitor stall..."
            value={propertyFormData.parkingAccess}
            onChange={(event) =>
              setPropertyFormData((current) => ({ ...current, parkingAccess: event.target.value }))
            }
          />
          <Textarea
            label="Notes"
            placeholder="Additional notes about this service location..."
            value={propertyFormData.entryNotes}
            onChange={(event) =>
              setPropertyFormData((current) => ({ ...current, entryNotes: event.target.value }))
            }
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowPropertyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProperty} isLoading={savingProperty} disabled={!propertyFormData.name}>
              {savingProperty ? 'Saving...' : editingProperty ? 'Save Service Location' : 'Create Service Location'}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

function getResidentialLostStageId(): ResidentialAccountPipelineStageId {
  return 'proposal_sent';
}

interface ActionsBundle {
  primary?: JourneyAction;
  secondary: JourneyAction[];
  tertiary?: JourneyAction;
}

function buildCommercialActions(input: {
  stageId: CommercialAccountPipelineStageId;
  latestProposal: Proposal | null;
  activeContract: Contract | null;
  focusedFacilityId: string | null;
  canWriteFacilities: boolean;
  onAddFacility: () => void;
  onOpenProposal: (id: string) => void;
  onOpenFacility: (facilityId: string) => void;
  onNavigate: (path: string) => void;
}): ActionsBundle {
  const { stageId, latestProposal, activeContract } = input;
  const openLatestProposal: JourneyAction | undefined = latestProposal
    ? {
        label: 'Open proposal',
        onClick: () => input.onOpenProposal(latestProposal.id),
      }
    : undefined;
  const openAllProposals: JourneyAction = {
    label: 'View all proposals',
    onClick: () => input.onNavigate('/proposals'),
  };
  const openFacility: JourneyAction | undefined = input.focusedFacilityId
    ? { label: 'Open service location', onClick: () => input.onOpenFacility(input.focusedFacilityId!) }
    : undefined;

  if (activeContract) {
    if (stageId === 'scheduled_service') {
      return {
        primary: { label: 'View jobs', onClick: () => input.onNavigate('/jobs') },
        secondary: [
          ...(openFacility ? [openFacility] : []),
          { label: 'Open active contract', onClick: () => input.onNavigate(`/contracts/${activeContract.id}`) },
        ],
      };
    }
    return {
      primary: { label: 'Open active contract', onClick: () => input.onNavigate(`/contracts/${activeContract.id}`) },
      secondary: [
        ...(openFacility ? [openFacility] : []),
        { label: 'View jobs', onClick: () => input.onNavigate('/jobs') },
      ],
    };
  }

  switch (stageId) {
    case 'account_created':
      return {
        primary: input.canWriteFacilities
          ? { label: 'Add service location', onClick: input.onAddFacility }
          : undefined,
        secondary: [{ label: 'View service locations', onClick: () => input.onNavigate('/service-locations') }],
      };
    case 'facility_added':
      return {
        primary: { label: 'Book walkthrough', onClick: () => input.onNavigate('/appointments') },
        secondary: [
          ...(openFacility ? [openFacility] : []),
          { label: 'View service locations', onClick: () => input.onNavigate('/service-locations') },
        ],
      };
    case 'walkthrough_booked':
      return {
        primary: { label: 'Open appointments', onClick: () => input.onNavigate('/appointments') },
        secondary: [],
      };
    case 'walkthrough_completed':
      return {
        primary: { label: 'Create proposal', onClick: () => input.onNavigate('/proposals') },
        secondary: [{ label: 'View appointments', onClick: () => input.onNavigate('/appointments') }],
      };
    case 'proposal_draft':
      return {
        primary: openLatestProposal ?? { label: 'Create proposal', onClick: () => input.onNavigate('/proposals') },
        secondary: [],
        tertiary: openAllProposals,
      };
    case 'proposal_sent':
    case 'proposal_viewed':
      return {
        primary: openLatestProposal,
        secondary: [],
        tertiary: openAllProposals,
      };
    case 'contract_ready':
      return {
        primary: openLatestProposal,
        secondary: [{ label: 'View contracts', onClick: () => input.onNavigate('/contracts') }],
        tertiary: openAllProposals,
      };
    default:
      return { secondary: [] };
  }
}

function buildResidentialActions(input: {
  stageId: ResidentialAccountPipelineStageId | null;
  isLost: boolean;
  focusedProposal: Proposal | null;
  focusedFacilityId: string | null;
  activeContract: Contract | null;
  onAddProperty: () => void;
  onOpenProposal: (id: string) => void;
  onNavigate: (path: string) => void;
  onOpenFacility: (facilityId: string) => void;
}): ActionsBundle {
  const openFocusedProposal: JourneyAction | undefined = input.focusedProposal
    ? { label: 'Open proposal', onClick: () => input.onOpenProposal(input.focusedProposal!.id) }
    : undefined;
  const openFacility: JourneyAction | undefined = input.focusedFacilityId
    ? { label: 'Open service location', onClick: () => input.onOpenFacility(input.focusedFacilityId!) }
    : undefined;
  const viewServiceLocations: JourneyAction = {
    label: 'View service locations',
    onClick: () => input.onNavigate('/service-locations'),
  };
  const openProposals: JourneyAction = {
    label: 'View proposals',
    onClick: () => input.onNavigate('/proposals'),
  };

  if (input.isLost) {
    return {
      primary: openFocusedProposal ?? openProposals,
      secondary: [openProposals],
    };
  }

  if (input.activeContract) {
    if (input.stageId === 'scheduled_service') {
      return {
        primary: input.focusedFacilityId
          ? { label: 'Review service location', onClick: () => input.onOpenFacility(input.focusedFacilityId!) }
          : viewServiceLocations,
        secondary: [],
      };
    }
    return {
      primary: input.focusedFacilityId
        ? { label: 'Manage service location', onClick: () => input.onOpenFacility(input.focusedFacilityId!) }
        : viewServiceLocations,
      secondary: [],
    };
  }

  switch (input.stageId) {
    case 'account_created':
      return {
        primary: { label: 'Add service location', onClick: input.onAddProperty },
        secondary: [openProposals],
      };
    case 'facility_added':
      return {
        primary: { label: 'Book walkthrough', onClick: () => input.onNavigate('/appointments') },
        secondary: openFacility ? [openFacility] : [viewServiceLocations],
      };
    case 'walkthrough_booked':
      return {
        primary: { label: 'Open appointments', onClick: () => input.onNavigate('/appointments') },
        secondary: openFacility ? [openFacility] : [],
      };
    case 'walkthrough_completed':
      return {
        primary: { label: 'Create proposal', onClick: () => input.onNavigate('/proposals') },
        secondary: openFacility ? [openFacility] : [],
      };
    case 'proposal_draft':
    case 'proposal_sent':
    case 'proposal_viewed':
      return {
        primary: openFocusedProposal ?? openProposals,
        secondary: openFacility ? [openFacility] : [],
        tertiary: openProposals,
      };
    case 'contract_ready':
      return {
        primary: openFocusedProposal,
        secondary: [{ label: 'View contracts', onClick: () => input.onNavigate('/contracts') }],
      };
    default:
      return {
        primary: openFocusedProposal ?? openProposals,
        secondary: openFacility ? [openFacility] : [],
      };
  }
}

export default AccountDetail;
