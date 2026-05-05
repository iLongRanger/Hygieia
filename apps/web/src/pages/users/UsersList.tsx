import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, DollarSign, Eye, Mail, Plus, Search, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Drawer } from '../../components/ui/Drawer';
import { Select } from '../../components/ui/Select';
import { Can } from '../../components/auth/Can';
import { PERMISSIONS } from '../../lib/permissions';
import { listUsers, createUser, listRoles } from '../../lib/users';
import type { User, Role, CreateUserInput, UserAddress } from '../../types/user';
import { maxLengths } from '../../lib/validation';

const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const PAY_TYPES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'percentage', label: 'Percentage' },
];

const formatWorkerType = (user: User) => {
  if (user.workforceType === 'subcontractor') return 'Subcontractor';
  if (user.workforceType === 'internal_employee') return 'Internal employee';
  return 'Office/admin';
};

const formatPay = (user: User) => {
  if (user.payType === 'percentage') return 'Percentage';
  if (user.payType === 'hourly') {
    return user.hourlyPayRate != null ? `$${user.hourlyPayRate.toFixed(2)}/hr` : 'Hourly rate not set';
  }
  return 'Pay not set';
};

const emptyAddress = (): UserAddress => ({
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
});

const normalizeAddress = (address?: UserAddress | null): UserAddress | null => {
  if (!address) return null;
  const normalized = {
    street: address.street?.trim() || null,
    city: address.city?.trim() || null,
    state: address.state?.trim() || null,
    postalCode: address.postalCode?.trim() || null,
    country: address.country?.trim() || null,
  };
  return Object.values(normalized).some(Boolean) ? normalized : null;
};

const UsersList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    fullName: '',
    phone: null,
    address: emptyAddress(),
    status: 'active',
    role: 'cleaner',
    payType: 'hourly',
    hourlyPayRate: null,
  });

  const fetchUsers = useCallback(
    async (currentPage: number, currentSearch: string) => {
      try {
        setLoading(true);
        const response = await listUsers({
          search: currentSearch || undefined,
          page: currentPage,
        });
        setUsers(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to load users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchRoles = useCallback(async () => {
    try {
      const response = await listRoles();
      setRoles(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [fetchUsers, page, search]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await createUser({
        ...formData,
        address: normalizeAddress(formData.address),
      });
      toast.success('User created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchUsers(page, search);
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create user. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      phone: null,
      address: emptyAddress(),
      status: 'active',
      role: 'cleaner',
      payType: 'hourly',
      hourlyPayRate: null,
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      header: 'User',
      cell: (item: User) => (
        <div>
          <div className="font-medium text-surface-900 dark:text-white">{item.fullName}</div>
          <div className="flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
            <Mail className="h-3 w-3" />
            {item.email}
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (item: User) => (
        <div className="flex flex-wrap gap-1">
          {item.roles && item.roles.length > 0 ? (
            item.roles.map((ur) => (
              <div key={ur.id} className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-gold" />
                <span className="text-surface-600 dark:text-surface-400">{ur.role.label}</span>
              </div>
            ))
          ) : (
            <span className="text-surface-500 dark:text-surface-400">No roles</span>
          )}
        </div>
      ),
    },
    {
      header: 'Worker / Pay',
      cell: (item: User) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm font-medium text-surface-700 dark:text-surface-200">
            <Briefcase className="h-3.5 w-3.5 text-emerald" />
            {formatWorkerType(item)}
          </div>
          <div className="flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
            <DollarSign className="h-3.5 w-3.5" />
            {formatPay(item)}
          </div>
        </div>
      ),
    },
    {
      header: 'Phone',
      cell: (item: User) => (
        <span className="text-surface-600 dark:text-surface-400">{item.phone || '-'}</span>
      ),
    },
    {
      header: 'Last Login',
      cell: (item: User) => (
        <span className="text-surface-600 dark:text-surface-400">
          {item.lastLoginAt
            ? new Date(item.lastLoginAt).toLocaleDateString()
            : 'Never'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (item: User) => (
        <Badge variant={getStatusVariant(item.status)}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: User) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/users/${item.id}`, { state: { backLabel: 'People', backPath: '/users' } });
          }}
        >
          <Eye className="mr-1 h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">People</h1>
        <Can permission={PERMISSIONS.USERS_WRITE}>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Person
          </Button>
        </Can>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search users..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <Table data={users} columns={columns} isLoading={loading} />

        <div className="border-t border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30 p-4">
          <div className="flex items-center justify-between text-sm text-surface-500 dark:text-surface-400">
            <span>
              Showing {users.length} of {total} users
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

      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Drawer
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add Person"
          size="lg"
        >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Smith"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            maxLength={maxLengths.fullName}
            showCharacterCount
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              maxLength={maxLengths.email}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              placeholder="(555) 123-4567"
              value={formData.phone || ''}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value || null })
              }
              maxLength={maxLengths.phone}
            />
            <Select
              label="Status"
              options={USER_STATUSES}
              value={formData.status || 'active'}
              onChange={(value) => setFormData({ ...formData, status: value })}
            />
          </div>

          <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/20">
            <div className="mb-3 text-sm font-semibold text-surface-900 dark:text-white">
              Address
            </div>
            <div className="space-y-4">
              <Input
                label="Street Address"
                placeholder="123 Main St"
                value={formData.address?.street || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...(formData.address || emptyAddress()), street: e.target.value },
                  })
                }
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="City"
                  value={formData.address?.city || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...(formData.address || emptyAddress()), city: e.target.value },
                    })
                  }
                />
                <Input
                  label="State / Province"
                  value={formData.address?.state || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...(formData.address || emptyAddress()), state: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Postal Code"
                  value={formData.address?.postalCode || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...(formData.address || emptyAddress()), postalCode: e.target.value },
                    })
                  }
                />
                <Input
                  label="Country"
                  value={formData.address?.country || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...(formData.address || emptyAddress()), country: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Select
            label="Role"
            placeholder="Select role"
            options={roles.map((r) => ({
              value: r.key,
              label: r.label,
            }))}
            value={formData.role || 'cleaner'}
            onChange={(value) =>
              setFormData({ ...formData, role: value || 'cleaner' })
            }
          />

          <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/20">
            <div className="mb-3">
              <div className="text-sm font-semibold text-surface-900 dark:text-white">
                Payroll Settings
              </div>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                Roles control permissions. These fields control worker pay and reporting.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Pay Type"
                options={PAY_TYPES}
                value={formData.payType || ''}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    payType: value as 'hourly' | 'percentage',
                    hourlyPayRate: value === 'percentage' ? null : formData.hourlyPayRate,
                  })
                }
              />
              {formData.payType === 'hourly' && (
                <Input
                  label="Hourly Rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.hourlyPayRate ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hourlyPayRate: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              )}
            </div>
          </div>

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
              disabled={!formData.email || !formData.password || !formData.fullName}
            >
              Create Person
            </Button>
          </div>
        </div>
        </Drawer>
      </Can>
    </div>
  );
};

export default UsersList;
