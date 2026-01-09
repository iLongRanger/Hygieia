import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Archive,
  RotateCcw,
  DollarSign,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  listLeads,
  createLead,
  archiveLead,
  restoreLead,
  listLeadSources,
} from '../../lib/leads';
import { listUsers } from '../../lib/users';
import type { Lead, CreateLeadInput, LeadSource } from '../../types/crm';
import type { User } from '../../types/user';

const LEAD_STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const LeadsList = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [formData, setFormData] = useState<CreateLeadInput>({
    contactName: '',
    companyName: null,
    primaryEmail: null,
    primaryPhone: null,
    leadSourceId: null,
    status: 'lead',
    estimatedValue: null,
    probability: null,
    expectedCloseDate: null,
    assignedToUserId: null,
    notes: null,
  });

  const fetchLeads = useCallback(
    async (currentPage: number, currentSearch: string) => {
      try {
        setLoading(true);
        const response = await listLeads({
          search: currentSearch || undefined,
          page: currentPage,
        });
        setLeads(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchLeadSources = useCallback(async () => {
    try {
      const response = await listLeadSources({ isActive: true });
      setLeadSources(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch lead sources:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await listUsers({ limit: 100 });
      setUsers(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchLeads(page, search);
  }, [fetchLeads, page, search]);

  useEffect(() => {
    fetchLeadSources();
    fetchUsers();
  }, [fetchLeadSources, fetchUsers]);

  const handleCreate = async () => {
    if (!formData.contactName) return;

    try {
      setCreating(true);
      await createLead(formData);
      setShowCreateModal(false);
      resetForm();
      fetchLeads(page, search);
    } catch (error) {
      console.error('Failed to create lead:', error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contactName: '',
      companyName: null,
      primaryEmail: null,
      primaryPhone: null,
      leadSourceId: null,
      status: 'lead',
      estimatedValue: null,
      probability: null,
      expectedCloseDate: null,
      assignedToUserId: null,
      notes: null,
    });
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveLead(id);
      fetchLeads(page, search);
    } catch (error) {
      console.error('Failed to archive lead:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreLead(id);
      fetchLeads(page, search);
    } catch (error) {
      console.error('Failed to restore lead:', error);
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'won':
        return 'success';
      case 'lost':
        return 'error';
      case 'proposal':
      case 'negotiation':
        return 'warning';
      case 'qualified':
        return 'info';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      header: 'Lead',
      cell: (item: Lead) => (
        <div>
          <div className="font-medium text-white">{item.contactName}</div>
          <div className="text-sm text-gray-400">
            {item.companyName || 'No company'}
          </div>
        </div>
      ),
    },
    {
      header: 'Source',
      cell: (item: Lead) => (
        <Badge
          variant="default"
          style={
            item.leadSource
              ? { backgroundColor: `${item.leadSource.color}20`, color: item.leadSource.color }
              : undefined
          }
        >
          {item.leadSource?.name || 'Unknown'}
        </Badge>
      ),
    },
    {
      header: 'Value',
      cell: (item: Lead) => (
        <div className="flex items-center gap-2 text-gray-300">
          <DollarSign className="h-4 w-4 text-gray-500" />
          {formatCurrency(item.estimatedValue)}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (item: Lead) => (
        <Badge variant={getStatusVariant(item.status)}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      header: 'Assigned To',
      cell: (item: Lead) => (
        <span className="text-gray-300">
          {item.assignedToUser?.fullName || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Active',
      cell: (item: Lead) => (
        <Badge variant={item.archivedAt ? 'error' : 'success'}>
          {item.archivedAt ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: Lead) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            Edit
          </Button>
          {item.archivedAt ? (
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
          ) : (
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
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Lead
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search leads..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="secondary" className="px-3">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Table data={leads} columns={columns} isLoading={loading} />

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing {leads.length} of {total} leads
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
        title="Add New Lead"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              placeholder="John Smith"
              value={formData.contactName}
              onChange={(e) =>
                setFormData({ ...formData, contactName: e.target.value })
              }
            />
            <Input
              label="Company Name"
              placeholder="Acme Corp"
              value={formData.companyName || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  companyName: e.target.value || null,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.primaryEmail || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  primaryEmail: e.target.value || null,
                })
              }
            />
            <Input
              label="Phone"
              placeholder="(555) 123-4567"
              value={formData.primaryPhone || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  primaryPhone: e.target.value || null,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Lead Source"
              placeholder="Select source"
              options={leadSources.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              value={formData.leadSourceId || ''}
              onChange={(value) =>
                setFormData({ ...formData, leadSourceId: value || null })
              }
            />
            <Select
              label="Status"
              options={LEAD_STATUSES}
              value={formData.status || 'lead'}
              onChange={(value) => setFormData({ ...formData, status: value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estimated Value"
              type="number"
              placeholder="10000"
              value={formData.estimatedValue || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedValue: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <Select
              label="Assigned To"
              placeholder="Select user"
              options={users.map((u) => ({
                value: u.id,
                label: u.fullName,
              }))}
              value={formData.assignedToUserId || ''}
              onChange={(value) =>
                setFormData({ ...formData, assignedToUserId: value || null })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Probability (%)"
              type="number"
              min={0}
              max={100}
              placeholder="50"
              value={formData.probability || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  probability: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <Input
              label="Expected Close Date"
              type="date"
              value={formData.expectedCloseDate || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expectedCloseDate: e.target.value || null,
                })
              }
            />
          </div>

          <Textarea
            label="Notes"
            placeholder="Additional notes about this lead..."
            value={formData.notes || ''}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value || null })
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
              disabled={!formData.contactName}
            >
              Create Lead
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeadsList;
