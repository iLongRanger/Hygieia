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
import { listResidentialQuotes } from '../../lib/residential';
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
import type { ResidentialQuote } from '../../types/residential';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AccountHero } from './AccountHero';
import { AccountContacts } from './AccountContacts';
import { AccountFacilities } from './AccountFacilities';
import { AccountFinancials } from './AccountFinancials';
import { AccountServiceOverview } from './AccountServiceOverview';
import { AccountHistory } from './AccountHistory';
import { EditAccountModal } from './modals/EditAccountModal';
import { AddFacilityModal } from './modals/AddFacilityModal';

function getResidentialJourneyState(input: {
  residentialQuotes: ResidentialQuote[];
  activeContract: Contract | null;
  recentJobs: Job[];
}) {
  const latestQuote = [...input.residentialQuotes].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    return rightTime - leftTime;
  })[0];

  const hasScheduledService = input.recentJobs.length > 0;

  if (hasScheduledService) {
    return {
      currentStage: 'Scheduled Service',
      nextStep: 'Review the generated jobs and confirm the first visit is assigned correctly.',
    };
  }

  if (input.activeContract) {
    return {
      currentStage: 'Active Contract',
      nextStep: 'Activate delivery by assigning the first visit or confirming auto-generated work.',
    };
  }

  switch (latestQuote?.status) {
    case 'converted':
      return {
        currentStage: 'Contract Ready',
        nextStep: 'Open the linked contract and activate service.',
      };
    case 'accepted':
      return {
        currentStage: 'Quote Accepted',
        nextStep: 'Convert the accepted quote into a residential contract.',
      };
    case 'sent':
    case 'viewed':
      return {
        currentStage: 'Quote Sent',
        nextStep: 'Follow up with the client or resend the quote if needed.',
      };
    case 'declined':
      return {
        currentStage: 'Quote Declined',
        nextStep: 'Revise the residential quote or close the opportunity.',
      };
    case 'draft':
    case 'quoted':
      return {
        currentStage: 'Quote Draft',
        nextStep: 'Finish pricing details and send the residential quote to the client.',
      };
    default:
      return {
        currentStage: 'Account Created',
        nextStep: 'Create the first residential quote for this household.',
      };
  }
}

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
  const [residentialQuotes, setResidentialQuotes] = useState<ResidentialQuote[]>([]);
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
    fetchResidentialQuotes();
    fetchActiveContract();
    fetchActivities();
    fetchContacts();
    fetchRecentJobs();
  }, [fetchAccount, fetchUsers, fetchFacilities, fetchProposals, fetchContracts, fetchResidentialQuotes, fetchActiveContract, fetchActivities, fetchContacts, fetchRecentJobs]);

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

  const isResidentialAccount = account.type === 'residential';
  const residentialJourney = getResidentialJourneyState({
    residentialQuotes,
    activeContract,
    recentJobs,
  });

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

      {isResidentialAccount ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <AccountContacts
              contacts={contacts}
              accountId={account.id}
              onNavigate={(path) => navigate(path)}
            />
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Residential Profile</h3>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    Canonical home and service details used for residential quoting.
                  </p>
                </div>
                <Badge variant="info">Residential</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-500">Service Address</div>
                  <div className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                    {[
                      account.serviceAddress?.street,
                      account.serviceAddress?.city,
                      account.serviceAddress?.state,
                      account.serviceAddress?.postalCode,
                    ].filter(Boolean).join(', ') || 'No service address set'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-500">Home Profile</div>
                  <div className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                    {account.residentialProfile?.homeType
                      ? `${account.residentialProfile.homeType.replace('_', ' ')}`
                      : 'No home type set'}
                    {account.residentialProfile?.squareFeet ? `, ${account.residentialProfile.squareFeet} sq ft` : ''}
                    {account.residentialProfile?.bedrooms !== undefined && account.residentialProfile?.bedrooms !== null
                      ? `, ${account.residentialProfile.bedrooms} bed`
                      : ''}
                    {account.residentialProfile?.fullBathrooms !== undefined && account.residentialProfile?.fullBathrooms !== null
                      ? `, ${account.residentialProfile.fullBathrooms} bath`
                      : ''}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-500">Access</div>
                  <div className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                    {account.residentialProfile?.entryNotes || account.residentialProfile?.parkingAccess || 'No access notes set'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-500">Pipeline</div>
                  <div className="mt-1 text-sm text-surface-900 dark:text-surface-100">
                    {activeContract ? 'Active service' : residentialQuotes.length > 0 ? 'Quoted / in progress' : 'Account created'}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Residential Journey</h3>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    Track where this household is in the residential sales-to-service flow.
                  </p>
                </div>
                <Badge variant={activeContract ? 'success' : residentialQuotes.length > 0 ? 'warning' : 'info'}>
                  {residentialJourney.currentStage}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Current Stage</div>
                  <div className="mt-2 text-base font-semibold text-surface-900 dark:text-surface-100">
                    {residentialJourney.currentStage}
                  </div>
                </div>
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Next Step</div>
                  <div className="mt-2 text-sm text-surface-900 dark:text-surface-100">
                    {residentialJourney.nextStep}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate('/residential/quotes')}>
                  Open Residential Quotes
                </Button>
                {activeContract ? (
                  <Button size="sm" onClick={() => navigate(`/contracts/${activeContract.id}`)}>
                    Open Active Contract
                  </Button>
                ) : null}
                {!activeContract && recentJobs.length > 0 ? (
                  <Button size="sm" onClick={() => navigate('/jobs')}>
                    View Jobs
                  </Button>
                ) : null}
              </div>
            </Card>
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Residential Quotes</h3>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    Quotes linked to this residential account.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/residential/quotes')}>
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
                      onClick={() => navigate('/residential/quotes')}
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
            <AccountServiceOverview
              activeContract={activeContract}
              recentJobs={recentJobs}
              onNavigate={(path) => navigate(path)}
            />
          </div>
        </>
      ) : (
        <>
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
        </>
      )}

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
        isOpen={showFacilityModal && canWriteFacilities && !isResidentialAccount}
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
