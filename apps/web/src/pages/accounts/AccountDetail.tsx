import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Globe,
  Edit2,
  Archive,
  RotateCcw,
  CreditCard,
  Calendar,
  User as UserIcon,
  MapPin,
  Plus,
  FileText,
  FileSignature,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { SafeLink } from '../../components/ui/SafeLink';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  getAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
} from '../../lib/accounts';
import { listFacilities, createFacility } from '../../lib/facilities';
import { listUsers } from '../../lib/users';
import { listProposals } from '../../lib/proposals';
import { listContracts } from '../../lib/contracts';
import type { Account, UpdateAccountInput } from '../../types/crm';
import type { Facility, CreateFacilityInput } from '../../types/facility';
import type { User } from '../../types/user';
import type { Proposal } from '../../types/proposal';
import type { Contract, ContractStatus } from '../../types/contract';

const ACCOUNT_TYPES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
];

const INDUSTRIES = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'education', label: 'Education' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_TERMS = [
  { value: 'NET15', label: 'Net 15' },
  { value: 'NET30', label: 'Net 30' },
  { value: 'NET45', label: 'Net 45' },
  { value: 'NET60', label: 'Net 60' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
];

const BUILDING_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'medical', label: 'Medical' },
  { value: 'educational', label: 'Educational' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'residential', label: 'Residential' },
  { value: 'other', label: 'Other' },
];

const FACILITY_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const CONTRACT_STATUS_VARIANTS: Record<
  ContractStatus,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  draft: 'default',
  pending_signature: 'warning',
  active: 'success',
  expired: 'default',
  terminated: 'error',
  renewed: 'info',
};

const PROPOSAL_STATUS_VARIANTS: Record<
  Proposal['status'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  draft: 'default',
  sent: 'info',
  viewed: 'warning',
  accepted: 'success',
  rejected: 'error',
  expired: 'default',
};

const AccountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [proposalTotal, setProposalTotal] = useState(0);
  const [contractTotal, setContractTotal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingFacility, setCreatingFacility] = useState(false);

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

  useEffect(() => {
    fetchAccount();
    fetchUsers();
    fetchFacilities();
    fetchProposals();
    fetchContracts();
  }, [fetchAccount, fetchUsers, fetchFacilities, fetchProposals, fetchContracts]);

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
      fetchAccount(); // Refresh to update facility count
    } catch (error) {
      console.error('Failed to create facility:', error);
      toast.error('Failed to create facility');
    } finally {
      setCreatingFacility(false);
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'commercial':
        return 'info';
      case 'residential':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!account) {
    return <div className="text-center text-gray-400">Account not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/accounts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{account.name}</h1>
          <p className="text-gray-400">
            {account.industry || 'No industry specified'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Account
          </Button>
          {account.archivedAt ? (
            <Button variant="secondary" onClick={handleRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleArchive}
              className="text-orange-400 hover:text-orange-300"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
                <Building className="h-8 w-8 text-gold" />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {account.name}
                </div>
                <Badge variant={getTypeVariant(account.type)}>
                  {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Billing Email</div>
                  <div className="text-white">
                    {account.billingEmail || 'Not provided'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Billing Phone</div>
                  <div className="text-white">
                    {account.billingPhone || 'Not provided'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Website</div>
                  <div className="text-white">
                    {account.website ? (
                      <SafeLink
                        href={account.website}
                        type="url"
                        className="text-gold hover:underline"
                      >
                        {account.website}
                      </SafeLink>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserIcon className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Account Manager</div>
                  <div className="text-white">
                    {account.accountManager?.fullName || 'Unassigned'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Payment Terms</div>
                  <div className="text-white">
                    {account.paymentTerms?.replace('_', ' ') || 'Not set'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Created</div>
                  <div className="text-white">{formatDate(account.createdAt)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserIcon className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Assigned Team</div>
                  <div className="text-white">Coming soon</div>
                </div>
              </div>
            </div>

            {account.archivedAt && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                <div className="flex items-center gap-2 text-orange-400">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm font-medium">Archived</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  {formatDate(account.archivedAt)}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Account Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-400">Industry</div>
                  <div className="text-white">
                    {account.industry
                      ? account.industry.charAt(0).toUpperCase() +
                        account.industry.slice(1)
                      : 'Not specified'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Credit Limit</div>
                  <div className="text-white">
                    {account.creditLimit
                      ? `$${account.creditLimit.toLocaleString()}`
                      : 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            {account.notes && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">Notes</h3>
                <p className="text-gray-300">{account.notes}</p>
              </div>
            )}

            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Related Records
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card
                  noPadding
                  className="p-4 cursor-pointer hover:bg-navy-darker/50 transition-colors"
                  onClick={() => navigate(`/facilities?accountId=${account.id}`)}
                >
                  <div className="text-2xl font-bold text-gold">
                    {account._count?.facilities ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Facilities</div>
                </Card>
                <Card
                  noPadding
                  className="p-4 cursor-pointer hover:bg-navy-darker/50 transition-colors"
                  onClick={() => navigate(`/contacts?accountId=${account.id}`)}
                >
                  <div className="text-2xl font-bold text-gold">
                    {account._count?.contacts ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Contacts</div>
                </Card>
                <Card
                  noPadding
                  className="p-4 cursor-pointer hover:bg-navy-darker/50 transition-colors"
                  onClick={() => navigate(`/proposals?accountId=${account.id}`)}
                >
                  <div className="text-2xl font-bold text-gold">
                    {proposalTotal}
                  </div>
                  <div className="text-sm text-gray-400">Proposals</div>
                </Card>
                <Card
                  noPadding
                  className="p-4 cursor-pointer hover:bg-navy-darker/50 transition-colors"
                  onClick={() => navigate(`/contracts?accountId=${account.id}`)}
                >
                  <div className="text-2xl font-bold text-gold">
                    {contractTotal}
                  </div>
                  <div className="text-sm text-gray-400">Contracts</div>
                </Card>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold" />
              <h3 className="text-lg font-semibold text-white">Proposals</h3>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/proposals?accountId=${account.id}`)}
            >
              View all
            </Button>
          </div>

          {proposals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No proposals yet</p>
              <p className="text-sm">Create a proposal to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  onClick={() => navigate(`/proposals/${proposal.id}`)}
                  className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-navy-darker/30 hover:bg-navy-darker/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                      <FileText className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {proposal.proposalNumber}
                      </div>
                      <div className="text-sm text-gray-400">
                        {proposal.title}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-emerald">
                        {formatCurrency(Number(proposal.totalAmount))}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatShortDate(proposal.createdAt)}
                      </div>
                    </div>
                    <Badge variant={PROPOSAL_STATUS_VARIANTS[proposal.status]}>
                      {proposal.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-gold" />
              <h3 className="text-lg font-semibold text-white">Contracts</h3>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/contracts?accountId=${account.id}`)}
            >
              View all
            </Button>
          </div>

          {contracts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileSignature className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No contracts yet</p>
              <p className="text-sm">Create a contract to start servicing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                  className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-navy-darker/30 hover:bg-navy-darker/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                      <FileSignature className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {contract.contractNumber}
                      </div>
                      <div className="text-sm text-gray-400">
                        {contract.title}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-emerald">
                        {formatCurrency(Number(contract.monthlyValue))}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatShortDate(contract.startDate)}
                      </div>
                    </div>
                    <Badge variant={CONTRACT_STATUS_VARIANTS[contract.status]}>
                      {contract.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Facilities Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gold" />
            <h3 className="text-lg font-semibold text-white">Facilities</h3>
          </div>
          <Button size="sm" onClick={() => setShowFacilityModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Facility
          </Button>
        </div>

        {facilities.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MapPin className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>No facilities yet</p>
            <p className="text-sm">Add a facility to start managing locations for this account</p>
          </div>
        ) : (
          <div className="space-y-3">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                onClick={() => navigate(`/facilities/${facility.id}`)}
                className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-navy-darker/30 hover:bg-navy-darker/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                    <Building className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{facility.name}</div>
                    <div className="text-sm text-gray-400">
                      {[
                        facility.address?.street,
                        facility.address?.city,
                        facility.address?.state,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'No address'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {facility.buildingType && (
                    <span className="text-sm text-gray-400 capitalize">
                      {facility.buildingType}
                    </span>
                  )}
                  <Badge
                    variant={
                      facility.status === 'active'
                        ? 'success'
                        : facility.status === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {facility.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Account"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Account Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Account Type"
              options={ACCOUNT_TYPES}
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
            />
            <Select
              label="Industry"
              placeholder="Select industry"
              options={INDUSTRIES}
              value={formData.industry || ''}
              onChange={(value) =>
                setFormData({ ...formData, industry: value || null })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Website"
              placeholder="https://example.com"
              value={formData.website || ''}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value || null })
              }
            />
            <Select
              label="Account Manager"
              placeholder="Select manager"
              options={users.map((u) => ({
                value: u.id,
                label: u.fullName,
              }))}
              value={formData.accountManagerId || ''}
              onChange={(value) =>
                setFormData({ ...formData, accountManagerId: value || null })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Team"
              placeholder="Team management coming soon"
              options={[
                { value: 'coming-soon', label: 'Coming soon' },
              ]}
              value=""
              disabled
              hint="Team management module coming soon"
            />
            <Input
              label="Billing Email"
              type="email"
              placeholder="billing@example.com"
              value={formData.billingEmail || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingEmail: e.target.value || null,
                })
              }
            />
            <Input
              label="Billing Phone"
              placeholder="(555) 123-4567"
              value={formData.billingPhone || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingPhone: e.target.value || null,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Terms"
              options={PAYMENT_TERMS}
              value={formData.paymentTerms || 'NET30'}
              onChange={(value) =>
                setFormData({ ...formData, paymentTerms: value })
              }
            />
            <Input
              label="Credit Limit"
              type="number"
              placeholder="10000"
              value={formData.creditLimit || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  creditLimit: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>

          <Textarea
            label="Notes"
            placeholder="Additional notes about this account..."
            value={formData.notes || ''}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value || null })
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              isLoading={saving}
              disabled={!formData.name}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Facility Modal */}
      <Modal
        isOpen={showFacilityModal}
        onClose={() => setShowFacilityModal(false)}
        title="Add Facility"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Facility Name"
            required
            placeholder="Main Office Building"
            value={facilityFormData.name}
            onChange={(e) =>
              setFacilityFormData({ ...facilityFormData, name: e.target.value })
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Building Type"
              placeholder="Select type"
              options={BUILDING_TYPES}
              value={facilityFormData.buildingType || ''}
              onChange={(value) =>
                setFacilityFormData({
                  ...facilityFormData,
                  buildingType: value || null,
                })
              }
            />
            <Select
              label="Status"
              options={FACILITY_STATUSES}
              value={facilityFormData.status || 'active'}
              onChange={(value) =>
                setFacilityFormData({
                  ...facilityFormData,
                  status: value as 'active' | 'inactive' | 'pending',
                })
              }
            />
          </div>

          <Input
            label="Square Feet"
            type="number"
            placeholder="50000"
            value={facilityFormData.squareFeet || ''}
            onChange={(e) =>
              setFacilityFormData({
                ...facilityFormData,
                squareFeet: e.target.value ? Number(e.target.value) : null,
              })
            }
          />

          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-medium text-white mb-3">Address</h4>
            <div className="space-y-4">
              <Input
                label="Street Address"
                placeholder="123 Main St"
                value={facilityFormData.address?.street || ''}
                onChange={(e) =>
                  setFacilityFormData({
                    ...facilityFormData,
                    address: {
                      ...facilityFormData.address,
                      street: e.target.value || undefined,
                    },
                  })
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="City"
                  placeholder="New York"
                  value={facilityFormData.address?.city || ''}
                  onChange={(e) =>
                    setFacilityFormData({
                      ...facilityFormData,
                      address: {
                        ...facilityFormData.address,
                        city: e.target.value || undefined,
                      },
                    })
                  }
                />
                <Input
                  label="State"
                  placeholder="NY"
                  value={facilityFormData.address?.state || ''}
                  onChange={(e) =>
                    setFacilityFormData({
                      ...facilityFormData,
                      address: {
                        ...facilityFormData.address,
                        state: e.target.value || undefined,
                      },
                    })
                  }
                />
                <Input
                  label="Postal Code"
                  placeholder="10001"
                  value={facilityFormData.address?.postalCode || ''}
                  onChange={(e) =>
                    setFacilityFormData({
                      ...facilityFormData,
                      address: {
                        ...facilityFormData.address,
                        postalCode: e.target.value || undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Textarea
            label="Access Instructions"
            placeholder="Enter through the loading dock on the west side..."
            value={facilityFormData.accessInstructions || ''}
            onChange={(e) =>
              setFacilityFormData({
                ...facilityFormData,
                accessInstructions: e.target.value || null,
              })
            }
          />

          <Textarea
            label="Parking Info"
            placeholder="Visitor parking available in lot B..."
            value={facilityFormData.parkingInfo || ''}
            onChange={(e) =>
              setFacilityFormData({
                ...facilityFormData,
                parkingInfo: e.target.value || null,
              })
            }
          />

          <Textarea
            label="Notes"
            placeholder="Additional notes about this facility..."
            value={facilityFormData.notes || ''}
            onChange={(e) =>
              setFacilityFormData({
                ...facilityFormData,
                notes: e.target.value || null,
              })
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowFacilityModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFacility}
              isLoading={creatingFacility}
              disabled={!facilityFormData.name}
            >
              Create Facility
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountDetail;

