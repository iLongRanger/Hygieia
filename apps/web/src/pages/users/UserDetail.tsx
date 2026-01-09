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
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import {
  getUser,
  updateUser,
  deleteUser,
  listRoles,
  assignRole,
  removeRole,
} from '../../lib/users';
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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<UpdateUserInput>({});
  const [selectedRole, setSelectedRole] = useState<string>('');

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
      setShowEditModal(false);
      fetchUser();
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await deleteUser(id);
      navigate('/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleAssignRole = async () => {
    if (!id || !selectedRole) return;
    try {
      setSaving(true);
      await assignRole(id, selectedRole);
      setShowAddRoleModal(false);
      setSelectedRole('');
      fetchUser();
    } catch (error) {
      console.error('Failed to assign role:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (roleKey: string) => {
    if (!id) return;
    try {
      await removeRole(id, roleKey);
      fetchUser();
    } catch (error) {
      console.error('Failed to remove role:', error);
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
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit User
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
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
            {availableRoles.length > 0 && (
              <Button size="sm" onClick={() => setShowAddRoleModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRole(userRole.role.key)}
                    className="text-red-400 hover:text-red-300"
                    disabled={user.roles.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
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

      {/* Delete Confirmation Modal */}
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

      {/* Add Role Modal */}
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
    </div>
  );
};

export default UserDetail;
