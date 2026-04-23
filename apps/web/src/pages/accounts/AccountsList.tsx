import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Building,
  Archive,
  RotateCcw,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import { getAccountDetailPath } from '../../lib/accountRoutes';
import {
  listAccounts,
  createAccount,
  archiveAccount,
  restoreAccount,
} from '../../lib/accounts';
import { listUsers } from '../../lib/users';
import type { Account, CreateAccountInput } from '../../types/crm';
import type { User } from '../../types/user';
import { maxLengths } from '../../lib/validation';

const ACCOUNT_MANAGER_ROLE_KEYS = new Set(['owner', 'admin', 'manager']);

function canBeAccountManager(user: User): boolean {
  const primaryRoleKey =
    typeof user.role === 'string'
      ? user.role
      : user.roles[0]?.role.key;

  if (primaryRoleKey && ACCOUNT_MANAGER_ROLE_KEYS.has(primaryRoleKey)) {
    return true;
  }

  return user.roles.some(({ role }) => ACCOUNT_MANAGER_ROLE_KEYS.has(role.key));
}

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

const RESIDENTIAL_HOME_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'single_family', label: 'Single Family' },
];

const DEFAULT_RESIDENTIAL_PROFILE = {
  homeType: 'single_family' as const,
  squareFeet: null,
  bedrooms: 0,
  fullBathrooms: 1,
  halfBathrooms: 0,
  levels: 1,
  occupiedStatus: 'occupied' as const,
  condition: 'standard' as const,
  hasPets: false,
  lastProfessionalCleaning: null,
  parkingAccess: null,
  entryNotes: null,
  specialInstructions: null,
  isFirstVisit: false,
};

const AccountsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [accountManagerFilter, setAccountManagerFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canAdminAccounts = hasPermission(PERMISSIONS.ACCOUNTS_ADMIN);
  const assignableAccountManagers = users.filter(canBeAccountManager);

  const [formData, setFormData] = useState<CreateAccountInput>({
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

  const fetchAccounts = useCallback(
    async (currentPage: number, currentSearch: string, filters?: {
      type?: string;
      accountManagerId?: string;
      includeArchived?: boolean;
    }) => {
      try {
        setLoading(true);
        const response = await listAccounts({
          search: currentSearch || undefined,
          page: currentPage,
          type: filters?.type || undefined,
          accountManagerId: filters?.accountManagerId || undefined,
          includeArchived: filters?.includeArchived,
        });
        setAccounts(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
        toast.error('Failed to load accounts');
        setAccounts([]);
      } finally{
        setLoading(false);
      }
    },
    []
  );

  const fetchUsers = useCallback(async () => {
    try {
      const response = await listUsers({ limit: 100 });
      setUsers(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchAccounts(page, search, {
      type: typeFilter,
      accountManagerId: accountManagerFilter,
      includeArchived,
    });
  }, [fetchAccounts, page, search, typeFilter, accountManagerFilter, includeArchived]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    if (!formData.name || !formData.type) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await createAccount(formData);
      toast.success('Account created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchAccounts(page, search, {
        type: typeFilter,
        accountManagerId: accountManagerFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to create account:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
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
  };

  const clearFilters = () => {
    setTypeFilter('');
    setAccountManagerFilter('');
    setIncludeArchived(false);
    setPage(1);
  };

  const hasActiveFilters = typeFilter || accountManagerFilter || includeArchived;

  const handleArchive = async (id: string) => {
    try {
      await archiveAccount(id);
      toast.success('Account archived successfully');
      fetchAccounts(page, search, {
        type: typeFilter,
        accountManagerId: accountManagerFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to archive account:', error);
      toast.error('Failed to archive account');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreAccount(id);
      toast.success('Account restored successfully');
      fetchAccounts(page, search, {
        type: typeFilter,
        accountManagerId: accountManagerFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to restore account:', error);
      toast.error('Failed to restore account');
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'customer':
        return 'success';
      case 'prospect':
        return 'info';
      case 'former':
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      header: 'Account',
      cell: (item: Account) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <Building className="h-5 w-5 text-gold" />
          </div>
          <div>
            <Link
              to={getAccountDetailPath(item)}
              state={{ backLabel: 'Accounts', backPath: '/accounts' }}
              className="font-medium text-surface-900 underline-offset-4 transition-colors hover:text-primary-600 hover:underline dark:text-white dark:hover:text-primary-400"
            >
              {item.name}
            </Link>
            <div className="text-sm text-surface-500 dark:text-surface-400">
              {item.industry || 'No industry'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (item: Account) => (
        <Badge variant={getTypeVariant(item.type)}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
        </Badge>
      ),
    },
    {
      header: 'Account Manager',
      cell: (item: Account) => (
        <span className="text-surface-600 dark:text-surface-400">
          {item.accountManager?.fullName || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Service Locations',
      cell: (item: Account) => (
        <span className="text-surface-600 dark:text-surface-400">{item._count?.facilities ?? 0}</span>
      ),
    },
    {
      header: 'Contacts',
      cell: (item: Account) => (
        <span className="text-surface-600 dark:text-surface-400">{item._count?.contacts ?? 0}</span>
      ),
    },
    {
      header: 'Status',
      cell: (item: Account) => (
        <Badge variant={item.archivedAt ? 'error' : 'success'}>
          {item.archivedAt ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: Account) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getAccountDetailPath(item), { state: { backLabel: 'Accounts', backPath: '/accounts' } })}
          >
            Manage
          </Button>
          {item.archivedAt && canAdminAccounts ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRestore(item.id);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : !item.archivedAt && canAdminAccounts ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(item.id);
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Accounts</h1>
        {canAdminAccounts && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Account
          </Button>
        )}
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search accounts..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant={hasActiveFilters ? 'primary' : 'secondary'}
              className="px-3"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && <span className="ml-2">•</span>}
            </Button>
          </div>

          {showFilterPanel && (
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-200 dark:bg-surface-900/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Type"
                placeholder="All Types"
                options={ACCOUNT_TYPES}
                value={typeFilter}
                onChange={setTypeFilter}
              />
              <Select
                label="Account Manager"
                placeholder="All Managers"
                options={assignableAccountManagers.map((u) => ({
                  value: u.id,
                  label: u.fullName,
                }))}
                value={accountManagerFilter}
                onChange={setAccountManagerFilter}
              />
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-primary-600 dark:text-primary-500 focus:ring-primary-500"
                  />
                  Include Archived
                </label>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <Table data={accounts} columns={columns} isLoading={loading} />

        <div className="border-t border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4">
          <div className="flex items-center justify-between text-sm text-surface-500 dark:text-surface-400">
            <span>
              Showing {accounts.length} of {total} accounts
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Account"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Account Name"
            placeholder="Acme Corporation"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            maxLength={maxLengths.companyName}
            showCharacterCount
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Account Type"
              options={ACCOUNT_TYPES}
              value={formData.type}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  type: value,
                  industry: value === 'residential' ? null : formData.industry,
                  website: value === 'residential' ? null : formData.website,
                  creditLimit: value === 'residential' ? null : formData.creditLimit,
                  residentialProfile:
                    value === 'residential'
                      ? formData.residentialProfile ?? DEFAULT_RESIDENTIAL_PROFILE
                      : null,
                })}
            />
            {formData.type === 'residential' ? (
              <Select
                label="Home Type"
                placeholder="Select home type"
                options={RESIDENTIAL_HOME_TYPES}
                value={formData.residentialProfile?.homeType || ''}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    residentialProfile: {
                      ...DEFAULT_RESIDENTIAL_PROFILE,
                      ...(formData.residentialProfile ?? {}),
                      homeType: value as typeof DEFAULT_RESIDENTIAL_PROFILE.homeType,
                    },
                  })}
              />
            ) : (
              <Select
                label="Industry"
                placeholder="Select industry"
                options={INDUSTRIES}
                value={formData.industry || ''}
                onChange={(value) =>
                  setFormData({ ...formData, industry: value || null })
                }
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formData.type === 'residential' ? (
              <Input
                label="Service Street"
                placeholder="123 Main St"
                value={formData.serviceAddress?.street || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceAddress: {
                      ...(formData.serviceAddress ?? {}),
                      street: e.target.value || undefined,
                    },
                  })}
              />
            ) : (
              <Input
                label="Website"
                placeholder="https://example.com"
                value={formData.website || ''}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value || null })
                }
                maxLength={maxLengths.website}
              />
            )}
            <Select
              label="Account Manager"
              placeholder="Select manager"
              options={assignableAccountManagers.map((u) => ({
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
              maxLength={maxLengths.email}
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
              maxLength={maxLengths.phone}
            />
          </div>

          {formData.type === 'residential' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Service City"
                  placeholder="City"
                  value={formData.serviceAddress?.city || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceAddress: {
                        ...(formData.serviceAddress ?? {}),
                        city: e.target.value || undefined,
                      },
                    })}
                />
                <Input
                  label="Service State"
                  placeholder="State"
                  value={formData.serviceAddress?.state || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceAddress: {
                        ...(formData.serviceAddress ?? {}),
                        state: e.target.value || undefined,
                      },
                    })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Input
                  label="Sq Ft"
                  type="number"
                  value={formData.residentialProfile?.squareFeet || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      residentialProfile: {
                        ...DEFAULT_RESIDENTIAL_PROFILE,
                        ...(formData.residentialProfile ?? {}),
                        squareFeet: e.target.value ? Number(e.target.value) : null,
                      },
                    })}
                />
                <Input
                  label="Bedrooms"
                  type="number"
                  value={formData.residentialProfile?.bedrooms ?? 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      residentialProfile: {
                        ...DEFAULT_RESIDENTIAL_PROFILE,
                        ...(formData.residentialProfile ?? {}),
                        bedrooms: e.target.value ? Number(e.target.value) : 0,
                      },
                    })}
                />
                <Input
                  label="Full Baths"
                  type="number"
                  value={formData.residentialProfile?.fullBathrooms ?? 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      residentialProfile: {
                        ...DEFAULT_RESIDENTIAL_PROFILE,
                        ...(formData.residentialProfile ?? {}),
                        fullBathrooms: e.target.value ? Number(e.target.value) : 0,
                      },
                    })}
                />
                <Input
                  label="Levels"
                  type="number"
                  value={formData.residentialProfile?.levels ?? 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      residentialProfile: {
                        ...DEFAULT_RESIDENTIAL_PROFILE,
                        ...(formData.residentialProfile ?? {}),
                        levels: e.target.value ? Number(e.target.value) : 1,
                      },
                    })}
                />
              </div>
              <Textarea
                label="Access Notes"
                placeholder="Gate code, parking, entry instructions, pet notes..."
                value={formData.residentialProfile?.entryNotes || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    residentialProfile: {
                      ...DEFAULT_RESIDENTIAL_PROFILE,
                      ...(formData.residentialProfile ?? {}),
                      entryNotes: e.target.value || null,
                    },
                  })}
              />
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Terms"
              options={PAYMENT_TERMS}
              value={formData.paymentTerms || 'NET30'}
              onChange={(value) =>
                setFormData({ ...formData, paymentTerms: value })
              }
            />
            {formData.type === 'commercial' ? (
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
            ) : (
              <Input
                label="Service Postal Code"
                placeholder="Postal / ZIP"
                value={formData.serviceAddress?.postalCode || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceAddress: {
                      ...(formData.serviceAddress ?? {}),
                      postalCode: e.target.value || undefined,
                    },
                  })}
              />
            )}
          </div>

          <Textarea
            label="Notes"
            placeholder="Additional notes about this account..."
            value={formData.notes || ''}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value || null })
            }
            maxLength={maxLengths.notes}
            showCharacterCount
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={creating}
              disabled={!formData.name || !formData.type}
            >
              Create Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountsList;
