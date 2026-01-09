import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Shield, Mail, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { listUsers, createUser, listRoles } from '../../lib/users';
import type { User, Role, CreateUserInput } from '../../types/user';

const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

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
    status: 'active',
    role: 'cleaner',
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
    if (!formData.email || !formData.password || !formData.fullName) return;

    try {
      setCreating(true);
      await createUser(formData);
      setShowCreateModal(false);
      resetForm();
      fetchUsers(page, search);
    } catch (error) {
      console.error('Failed to create user:', error);
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
      status: 'active',
      role: 'cleaner',
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
          <div className="font-medium text-white">{item.fullName}</div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
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
                <span className="text-gray-300">{ur.role.label}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-400">No roles</span>
          )}
        </div>
      ),
    },
    {
      header: 'Phone',
      cell: (item: User) => (
        <span className="text-gray-300">{item.phone || '-'}</span>
      ),
    },
    {
      header: 'Last Login',
      cell: (item: User) => (
        <span className="text-gray-300">
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
            navigate(`/users/${item.id}`);
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
        <h1 className="text-2xl font-bold text-white">System Users</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
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

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
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

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New User"
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
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              placeholder="(555) 123-4567"
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
              Create User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersList;
