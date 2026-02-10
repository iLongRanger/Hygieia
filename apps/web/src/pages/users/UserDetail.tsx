import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
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
import type { User, Role, UpdateUserInput } from '../../types/user';

const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'pending', label: 'Pending' },
];

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
          status: data.status,
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
      await updateUser(id, formData);
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
    return <div className="text-center text-gray-400">User not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
          <p className="text-gray-400">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Can permission={PERMISSIONS.USERS_WRITE}>
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit User
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-8 w-8 text-emerald" />
                )}
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {user.fullName}
                </div>
                <Badge variant={getStatusVariant(user.status)}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Email</div>
                  <div className="text-white">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Phone</div>
                  <div className="text-white">{user.phone || 'Not set'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Created</div>
                  <div className="text-white">{formatDate(user.createdAt)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Last Login</div>
                  <div className="text-white">
                    {formatDate(user.lastLoginAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-lg font-semibold text-white">
              <Shield className="mr-2 inline h-5 w-5 text-gold" />
              Assigned Roles
            </h2>
            <Can permission={PERMISSIONS.USERS_WRITE}>
              {availableRoles.length > 0 && (
                <Button size="sm" onClick={() => setShowAddRoleModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              )}
            </Can>
          </div>

          <div className="mt-4 space-y-3">
            {user.roles && user.roles.length > 0 ? (
              user.roles.map((userRole) => (
                <div
                  key={userRole.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-navy-dark/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                      <Shield className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {userRole.role.label}
                      </div>
                      <div className="text-sm text-gray-400">
                        {userRole.role.key}
                      </div>
                    </div>
                  </div>
                  <Can permission={PERMISSIONS.USERS_WRITE}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRole(userRole.role.key)}
                      className="text-red-400 hover:text-red-300"
                      disabled={user.roles.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Can>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                No roles assigned
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit User"
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

          <Select
            label="Status"
            options={USER_STATUSES}
            value={formData.status || 'active'}
            onChange={(value) => setFormData({ ...formData, status: value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
        </Modal>
      </Can>

      {/* Delete Confirmation Modal */}
      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete User"
        >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete this user? This action cannot be
            undone.
          </p>
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="font-medium text-white">{user.fullName}</div>
            <div className="text-sm text-gray-400">{user.email}</div>
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
              Delete User
            </Button>
          </div>
        </div>
        </Modal>
      </Can>

      {/* Add Role Modal */}
      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Modal
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
        </Modal>
      </Can>

      {/* Reset Password Modal */}
      <Can permission={PERMISSIONS.USERS_WRITE}>
        <Modal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
          }}
          title="Reset Password"
        >
        <div className="space-y-4">
          <p className="text-gray-300">
            Set a new password for <strong className="text-white">{user.fullName}</strong>.
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
            <p className="text-sm text-gray-300">
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
        </Modal>
      </Can>
    </div>
  );
};

export default UserDetail;
