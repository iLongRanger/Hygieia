import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { listFacilities, createFacility } from '../../lib/facilities';
import { listContacts } from '../../lib/contacts';
import { listJobs } from '../../lib/jobs';
import { listUsers } from '../../lib/users';
import { listProposals } from '../../lib/proposals';
import { listContracts } from '../../lib/contracts';
import type {
  Account,
  AccountActivity,
  AccountActivityEntryType,
  UpdateAccountInput,
} from '../../types/crm';
import type { Facility, CreateFacilityInput } from '../../types/facility';
import type { User } from '../../types/user';
import type { Proposal } from '../../types/proposal';
import type { Contract } from '../../types/contract';
import type { Contact } from '../../types/contact';
import type { Job } from '../../types/job';
import { AccountHero } from './AccountHero';
import { AccountContacts } from './AccountContacts';
import { AccountFacilities } from './AccountFacilities';
import { AccountFinancials } from './AccountFinancials';
import { AccountServiceOverview } from './AccountServiceOverview';
import { AccountHistory } from './AccountHistory';
import { EditAccountModal } from './modals/EditAccountModal';
import { AddFacilityModal } from './modals/AddFacilityModal';

const AccountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [proposalTotal, setProposalTotal] = useState(0);
  const [contractTotal, setContractTotal] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingFacility, setCreatingFacility] = useState(false);
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
    paymentTerms: 'NET30',
    creditLimit: null,
    accountManagerId: null,
    notes: null,
  });

  const [facilityFormData, setFacilityFormData] = useState<Omit<CreateFacilityInput, 'accountId'>>({
    name: '',
    address: {},
    squareFeet: null,
    buildingType: null,
    accessInstructions: null,
    parkingInfo: null,
    specialRequirements: null,
    status: 'active',
    notes: null,
  });

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
          paymentTerms: data.paymentTerms,
          creditLimit: data.creditLimit ? Number(data.creditLimit) : null,
          accountManagerId: data.accountManager?.id || null,
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
        limit: 5,
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
      const response = await listJobs({ accountId: id, limit: 10 });
      setRecentJobs(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch recent jobs:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchAccount();
    fetchUsers();
    fetchFacilities();
    fetchProposals();
    fetchContracts();
    fetchActiveContract();
    fetchActivities();
    fetchContacts();
    fetchRecentJobs();
  }, [fetchAccount, fetchUsers, fetchFacilities, fetchProposals, fetchContracts, fetchActiveContract, fetchActivities, fetchContacts, fetchRecentJobs]);

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
        squareFeet: null,
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
    return <div className="text-center text-gray-400">Account not found</div>;
  }

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
        onNavigate={(path) => navigate(path)}
      />

      {/* Dashboard Cards - Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountContacts
          contacts={contacts}
          accountId={account.id}
          onNavigate={(path) => navigate(path)}
        />
        <AccountFacilities
          facilities={facilities}
          canWriteFacilities={canWriteFacilities}
          onAddFacility={() => setShowFacilityModal(true)}
          onNavigate={(path) => navigate(path)}
        />
      </div>

      {/* Dashboard Cards - Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountFinancials
          account={account}
          activeContract={activeContract}
          proposals={proposals}
          contracts={contracts}
          proposalTotal={proposalTotal}
          contractTotal={contractTotal}
          onNavigate={(path) => navigate(path)}
        />
        <AccountServiceOverview
          activeContract={activeContract}
          recentJobs={recentJobs}
          onNavigate={(path) => navigate(path)}
        />
      </div>

      {/* Full-width */}
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
        isOpen={showFacilityModal && canWriteFacilities}
        onClose={() => setShowFacilityModal(false)}
        facilityFormData={facilityFormData}
        setFacilityFormData={setFacilityFormData}
        onSave={handleCreateFacility}
        saving={creatingFacility}
      />
    </div>
  );
};

export default AccountDetail;
