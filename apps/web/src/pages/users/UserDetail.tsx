import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Edit2,
  Trash2,
  Plus,
  X,
  Calendar,
  Clock,
  Briefcase,
  DollarSign,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { Select } from '../../components/ui/Select';
import { Can } from '../../components/auth/Can';
import {
  getUser,
  updateUser,
  deleteUser,
  listRoles,
  assignRole,
  removeRole,
  changePassword,
} from '../../lib/users';
import { PERMISSIONS } from '../../lib/permissions';
import type { User, Role, UpdateUserInput, UserAddress } from '../../types/user';

const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'pending', label: 'Pending' },
];

const PAY_TYPES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'percentage', label: 'Percentage' },
];

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'casual', label: 'Casual' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'temporary', label: 'Temporary' },
];

const PEOPLE_TABS = [
  'Overview',
  'Access',
  'Employment',
  'Availability',
  'Compliance',
  'Notes',
] as const;

const DEFAULT_CALENDAR_COLOR = '#14b8a6';

const formatWorkerType = (user: User) => {
  if (user.workforceType === 'subcontractor') return 'Subcontractor';
  if (user.workforceType === 'internal_employee') return 'Internal employee';
  return 'Office/admin';
};

const formatPay = (user: User) => {
  if (user.payType === 'percentage') {
    return user.percentagePayRate != null ? `${user.percentagePayRate.toFixed(2)}%` : 'Percentage';
  }
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

const formatAddress = (address?: UserAddress | null) => {
  if (!address) return 'Not set';
  const parts = [address.street, address.city, address.state, address.postalCode, address.country]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Not set';
};

const formatEmploymentType = (value?: string | null) => {
  if (!value) return 'Not set';
  return EMPLOYMENT_TYPES.find((type) => type.value === value)?.label || value;
};

const dateOnly = (value?: string | null) => (value ? value.slice(0, 10) : '');

const formatSimpleJson = (value?: Record<string, unknown> | null) => {
  if (!value || Object.keys(value).length === 0) return 'Not set';
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(', ') : String(item)}`)
    .join('\n');
};

const parseCommaList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof PEOPLE_TABS)[number]>('Overview');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<UpdateUserInput>({});
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchUser = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getUser(id);
      if (data) {
        setUser(data);
        setFormData({
          fullName: data.fullName,
          phone: data.phone,
          address: data.address || emptyAddress(),
          status: data.status,
          calendarColor: data.calendarColor ?? null,
          payType: data.payType ?? null,
          hourlyPayRate: data.hourlyPayRate ?? null,
          percentagePayRate: data.percentagePayRate ?? null,
          employeeNumber: data.employeeNumber ?? null,
          jobTitle: data.jobTitle ?? null,
          department: data.department ?? null,
          employmentType: data.employmentType ?? null,
          supervisorUserId: data.supervisorUserId ?? null,
          startDate: dateOnly(data.startDate),
          terminationDate: dateOnly(data.terminationDate),
          birthDate: dateOnly(data.birthDate),
          emergencyContact: data.emergencyContact ?? null,
          availability: data.availability ?? null,
          skills: data.skills ?? [],
          compliance: data.compliance ?? null,
          onboarding: data.onboarding ?? null,
          hrNotes: data.hrNotes ?? [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      toast.error('Failed to load user details');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await listRoles();
      setRoles(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchRoles();
  }, [fetchUser, fetchRoles]);

  const handleUpdate = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateUser(id, {
        ...formData,
        address: normalizeAddress(formData.address),
      });
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUser();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await deleteUser(id);
      toast.success('User deleted successfully');
      navigate('/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleAssignRole = async () => {
    if (!id || !selectedRole) {
      toast.error('Please select a role');
      return;
    }
    try {
      setSaving(true);
      await assignRole(id, selectedRole);
      toast.success('Role assigned successfully');
      setShowAddRoleModal(false);
      setSelectedRole('');
      fetchUser();
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast.error('Failed to assign role. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (roleKey: string) => {
    if (!id) return;
    try {
      await removeRole(id, roleKey);
      toast.success('Role removed successfully');
      fetchUser();
    } catch (error) {
      console.error('Failed to remove role:', error);
      toast.error('Failed to remove role. Please try again.');
    }
  };

  const handlePasswordChange = async () => {
    if (!id) return;

    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await changePassword(id, newPassword);
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'disabled':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const availableRoles = roles.filter(
    (role) => !user?.roles?.some((ur) => ur.role.key === role.key)
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center text-surface-500 dark:text-surface-400">User not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{user.fullName}</h1>
          <p className="text-surface-500 dark:text-surface-400">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Can permission={PERMISSIONS.USERS_WRITE}>
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Person
            </Button>
          </Can>
          <Can permission={PERMISSIONS.USERS_WRITE}>
            <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
              <Shield className="mr-2 h-4 w-4" />
              Reset Password
            </Button>
          </Can>
          <Can permission={PERMISSIONS.USERS_WRITE}>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(true)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </Can>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-surface-200 dark:border-surface-700">
        {PEOPLE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-emerald text-white'
                : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <UserIcon className="h-8 w-8 text-emerald" />
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold text-surface-900 dark:text-white">{user.fullName}</div>
                  <Badge variant={getStatusVariant(user.status)}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 border-t border-surface-200 pt-4 dark:border-surface-700">
                <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-surface-500" /><div><div className="text-sm text-surface-500">Email</div><div className="text-surface-900 dark:text-white">{user.email}</div></div></div>
                <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-surface-500" /><div><div className="text-sm text-surface-500">Phone</div><div className="text-surface-900 dark:text-white">{user.phone || 'Not set'}</div></div></div>
                <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-surface-500" /><div><div className="text-sm text-surface-500">Address</div><div className="text-surface-900 dark:text-white">{formatAddress(user.address)}</div></div></div>
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Work Summary</h2>
            <div className="space-y-3 text-sm">
              <div><span className="text-surface-500">Worker Type</span><div className="font-medium text-surface-900 dark:text-white">{formatWorkerType(user)}</div></div>
              <div><span className="text-surface-500">Job Title</span><div className="font-medium text-surface-900 dark:text-white">{user.jobTitle || 'Not set'}</div></div>
              <div><span className="text-surface-500">Department</span><div className="font-medium text-surface-900 dark:text-white">{user.department || 'Not set'}</div></div>
              <div><span className="text-surface-500">Pay</span><div className="font-medium text-surface-900 dark:text-white">{formatPay(user)}</div></div>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Timeline</h2>
            <div className="space-y-3 text-sm">
              <div><span className="text-surface-500">Start Date</span><div className="font-medium text-surface-900 dark:text-white">{user.startDate ? new Date(user.startDate).toLocaleDateString() : 'Not set'}</div></div>
              <div><span className="text-surface-500">Created</span><div className="font-medium text-surface-900 dark:text-white">{formatDate(user.createdAt)}</div></div>
              <div><span className="text-surface-500">Last Login</span><div className="font-medium text-surface-900 dark:text-white">{formatDate(user.lastLoginAt)}</div></div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Access' && (
        <Card>
          <div className="flex items-center justify-between border-b border-surface-200 pb-4 dark:border-surface-700">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white"><Shield className="mr-2 inline h-5 w-5 text-gold" />Assigned Roles</h2>
            <Can permission={PERMISSIONS.USERS_WRITE}>
              {availableRoles.length > 0 && <Button size="sm" onClick={() => setShowAddRoleModal(true)}><Plus className="mr-2 h-4 w-4" />Add Role</Button>}
            </Can>
          </div>
          <div className="mt-4 space-y-3">
            {user.roles?.length ? user.roles.map((userRole) => (
              <div key={userRole.id} className="flex items-center justify-between rounded-lg border border-surface-200 bg-surface-100 p-4 dark:border-surface-700 dark:bg-surface-800/30">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10"><Shield className="h-5 w-5 text-gold" /></div><div><div className="font-medium text-surface-900 dark:text-white">{userRole.role.label}</div><div className="text-sm text-surface-500">{userRole.role.key}</div></div></div>
                <Can permission={PERMISSIONS.USERS_WRITE}><Button variant="ghost" size="sm" onClick={() => handleRemoveRole(userRole.role.key)} className="text-red-400 hover:text-red-300" disabled={user.roles.length <= 1}><X className="h-4 w-4" /></Button></Can>
              </div>
            )) : <div className="py-8 text-center text-surface-500">No roles assigned</div>}
          </div>
        </Card>
      )}

      {activeTab === 'Employment' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Employment Details</h2><div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-surface-500">Employee Number</span><div className="font-medium text-surface-900 dark:text-white">{user.employeeNumber || 'Not set'}</div></div><div><span className="text-surface-500">Employment Type</span><div className="font-medium text-surface-900 dark:text-white">{formatEmploymentType(user.employmentType)}</div></div><div><span className="text-surface-500">Supervisor</span><div className="font-medium text-surface-900 dark:text-white">{user.supervisor?.fullName || 'Not set'}</div></div><div><span className="text-surface-500">Termination Date</span><div className="font-medium text-surface-900 dark:text-white">{user.terminationDate ? new Date(user.terminationDate).toLocaleDateString() : 'Not set'}</div></div></div></Card>
          <Card><h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Emergency Contact</h2><div className="space-y-3 text-sm"><div><span className="text-surface-500">Name</span><div className="font-medium text-surface-900 dark:text-white">{user.emergencyContact?.name || 'Not set'}</div></div><div><span className="text-surface-500">Relationship</span><div className="font-medium text-surface-900 dark:text-white">{user.emergencyContact?.relationship || 'Not set'}</div></div><div><span className="text-surface-500">Phone</span><div className="font-medium text-surface-900 dark:text-white">{user.emergencyContact?.phone || 'Not set'}</div></div><div><span className="text-surface-500">Email</span><div className="font-medium text-surface-900 dark:text-white">{user.emergencyContact?.email || 'Not set'}</div></div></div></Card>
        </div>
      )}

      {activeTab === 'Availability' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Skills</h2><div className="flex flex-wrap gap-2">{user.skills?.length ? user.skills.map((skill) => <Badge key={skill} variant="default">{skill}</Badge>) : <span className="text-surface-500">No skills recorded</span>}</div></Card>
          <Card><h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Availability</h2><pre className="whitespace-pre-wrap rounded-lg bg-surface-100 p-3 text-sm text-surface-700 dark:bg-surface-800 dark:text-surface-200">{formatSimpleJson(user.availability)}</pre></Card>
        </div>
      )}

      {activeTab === 'Compliance' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Compliance</h2><pre className="whitespace-pre-wrap rounded-lg bg-surface-100 p-3 text-sm text-surface-700 dark:bg-surface-800 dark:text-surface-200">{formatSimpleJson(user.compliance)}</pre></Card>
          <Card><h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Onboarding</h2><pre className="whitespace-pre-wrap rounded-lg bg-surface-100 p-3 text-sm text-surface-700 dark:bg-surface-800 dark:text-surface-200">{formatSimpleJson(user.onboarding)}</pre></Card>
        </div>
      )}

      {activeTab === 'Notes' && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">HR Notes</h2>
          <div className="space-y-3">
            {user.hrNotes?.length ? user.hrNotes.map((note, index) => (
              <div key={note.id || index} className="rounded-lg border border-surface-200 p-4 dark:border-surface-700"><p className="whitespace-pre-wrap text-surface-800 dark:text-surface-100">{note.note}</p><div className="mt-2 text-xs text-surface-500">{note.createdBy || 'HR'}{note.createdAt ? ` • ${new Date(note.createdAt).toLocaleString()}` : ''}</div></div>
            )) : <div className="text-surface-500">No HR notes recorded</div>}
          </div>
        </Card>
      )}

      {/* Edit Person Modal */}
      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Drawer
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Person"
        >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={formData.fullName || ''}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
          />

          <Input
            label="Phone"
            value={formData.phone || ''}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value || null })
            }
          />

          <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-3">
            <div className="mb-3 text-sm font-semibold text-surface-900 dark:text-white">
              Address
            </div>
            <div className="space-y-4">
              <Input
                label="Street Address"
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
            label="Status"
            options={USER_STATUSES}
            value={formData.status || 'active'}
            onChange={(value) => setFormData({ ...formData, status: value })}
          />

          <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-3">
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
                    percentagePayRate: value === 'hourly' ? null : formData.percentagePayRate,
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
              {formData.payType === 'percentage' && (
                <Input
                  label="Percentage Rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.percentagePayRate ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      percentagePayRate: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-3">
            <div className="mb-3 text-sm font-semibold text-surface-900 dark:text-white">
              Employment Details
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Employee Number" value={formData.employeeNumber || ''} onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value || null })} />
              <Input label="Job Title" value={formData.jobTitle || ''} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value || null })} />
              <Input label="Department" value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value || null })} />
              <Select
                label="Employment Type"
                options={EMPLOYMENT_TYPES}
                value={formData.employmentType || ''}
                onChange={(value) => setFormData({ ...formData, employmentType: (value || null) as User['employmentType'] })}
              />
              <Input label="Start Date" type="date" value={formData.startDate || ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value || null })} />
              <Input label="Termination Date" type="date" value={formData.terminationDate || ''} onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value || null })} />
            </div>
          </div>

          <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-3">
            <div className="mb-3 text-sm font-semibold text-surface-900 dark:text-white">
              Emergency Contact
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Emergency Contact Name" value={formData.emergencyContact?.name || ''} onChange={(e) => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || {}), name: e.target.value || null } })} />
              <Input label="Relationship" value={formData.emergencyContact?.relationship || ''} onChange={(e) => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || {}), relationship: e.target.value || null } })} />
              <Input label="Emergency Phone" value={formData.emergencyContact?.phone || ''} onChange={(e) => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || {}), phone: e.target.value || null } })} />
              <Input label="Emergency Email" type="email" value={formData.emergencyContact?.email || ''} onChange={(e) => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || {}), email: e.target.value || null } })} />
            </div>
          </div>

          <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-3">
            <div className="mb-3 text-sm font-semibold text-surface-900 dark:text-white">
              Skills, Availability, Compliance
            </div>
            <div className="space-y-4">
              <Input
                label="Skills"
                placeholder="Residential, Commercial, Inspection"
                value={(formData.skills || []).join(', ')}
                onChange={(e) => setFormData({ ...formData, skills: parseCommaList(e.target.value) })}
              />
              <Input
                label="Availability Notes"
                placeholder="Mon-Fri 8am-4pm, no Sundays"
                value={typeof formData.availability?.notes === 'string' ? formData.availability.notes : ''}
                onChange={(e) => setFormData({ ...formData, availability: { ...(formData.availability || {}), notes: e.target.value } })}
              />
              <Input
                label="Compliance Notes"
                placeholder="Background check complete, insurance expires..."
                value={typeof formData.compliance?.notes === 'string' ? formData.compliance.notes : ''}
                onChange={(e) => setFormData({ ...formData, compliance: { ...(formData.compliance || {}), notes: e.target.value } })}
              />
              <Input
                label="Onboarding Notes"
                placeholder="Handbook signed, training complete..."
                value={typeof formData.onboarding?.notes === 'string' ? formData.onboarding.notes : ''}
                onChange={(e) => setFormData({ ...formData, onboarding: { ...(formData.onboarding || {}), notes: e.target.value } })}
              />
              <Input
                label="HR Note"
                placeholder="Private HR note"
                value={formData.hrNotes?.[0]?.note || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hrNotes: e.target.value
                      ? [{ ...(formData.hrNotes?.[0] || {}), note: e.target.value }]
                      : [],
                  })
                }
              />
            </div>
          </div>

          <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <Input
                label="Job Calendar Color"
                type="color"
                value={formData.calendarColor || DEFAULT_CALENDAR_COLOR}
                onChange={(e) =>
                  setFormData({ ...formData, calendarColor: e.target.value })
                }
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFormData({ ...formData, calendarColor: null })}
              >
                Use Default
              </Button>
            </div>
            <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
              Jobs assigned to this user use this color in the calendar.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
        </Drawer>
      </Can>

      {/* Delete Confirmation Modal */}
      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Drawer
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Person"
        >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to delete this person? This action cannot be
            undone.
          </p>
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="font-medium text-surface-900 dark:text-white">{user.fullName}</div>
            <div className="text-sm text-surface-500 dark:text-surface-400">{user.email}</div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              isLoading={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Person
            </Button>
          </div>
        </div>
        </Drawer>
      </Can>

      {/* Add Role Modal */}
      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Drawer
          isOpen={showAddRoleModal}
          onClose={() => {
            setShowAddRoleModal(false);
            setSelectedRole('');
          }}
          title="Add Role"
        >
        <div className="space-y-4">
          <Select
            label="Select Role"
            placeholder="Choose a role to assign"
            options={availableRoles.map((r) => ({
              value: r.key,
              label: r.label,
            }))}
            value={selectedRole}
            onChange={(value) => setSelectedRole(value)}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddRoleModal(false);
                setSelectedRole('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              isLoading={saving}
              disabled={!selectedRole}
            >
              Assign Role
            </Button>
          </div>
        </div>
        </Drawer>
      </Can>

      {/* Reset Password Modal */}
      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Drawer
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
          }}
          title="Reset Password"
        >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Set a new password for <strong className="text-surface-900 dark:text-white">{user.fullName}</strong>.
          </p>

          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              The user will be able to login with this new password immediately.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowPasswordModal(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              isLoading={saving}
              disabled={!newPassword || !confirmPassword || newPassword.length < 8}
            >
              Reset Password
            </Button>
          </div>
        </div>
        </Drawer>
      </Can>
    </div>
  );
};

export default UserDetail;
