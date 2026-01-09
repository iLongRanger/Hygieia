import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Archive,
  RotateCcw,
  Star,
  CreditCard,
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
  listContacts,
  createContact,
  archiveContact,
  restoreContact,
} from '../../lib/contacts';
import { listAccounts } from '../../lib/accounts';
import type { Contact, CreateContactInput, Account } from '../../types/crm';

const ContactsList = () => {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [formData, setFormData] = useState<CreateContactInput>({
    accountId: null,
    name: '',
    email: null,
    phone: null,
    mobile: null,
    title: null,
    department: null,
    isPrimary: false,
    isBilling: false,
    notes: null,
  });

  const fetchContacts = useCallback(
    async (currentPage: number, currentSearch: string) => {
      try {
        setLoading(true);
        const response = await listContacts({
          search: currentSearch || undefined,
          page: currentPage,
        });
        setContacts(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await listAccounts({ limit: 100 });
      setAccounts(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchContacts(page, search);
  }, [fetchContacts, page, search]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!formData.name) return;

    try {
      setCreating(true);
      await createContact(formData);
      setShowCreateModal(false);
      resetForm();
      fetchContacts(page, search);
    } catch (error) {
      console.error('Failed to create contact:', error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      accountId: null,
      name: '',
      email: null,
      phone: null,
      mobile: null,
      title: null,
      department: null,
      isPrimary: false,
      isBilling: false,
      notes: null,
    });
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveContact(id);
      fetchContacts(page, search);
    } catch (error) {
      console.error('Failed to archive contact:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreContact(id);
      fetchContacts(page, search);
    } catch (error) {
      console.error('Failed to restore contact:', error);
    }
  };

  const columns = [
    {
      header: 'Contact',
      cell: (item: Contact) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{item.name}</span>
            {item.isPrimary && (
              <Star className="h-3 w-3 fill-gold text-gold" />
            )}
            {item.isBilling && (
              <CreditCard className="h-3 w-3 text-emerald" />
            )}
          </div>
          <div className="text-sm text-gray-400">
            {item.title || 'No title'}
          </div>
        </div>
      ),
    },
    {
      header: 'Account',
      cell: (item: Contact) => (
        <span className="text-gray-300">
          {item.account?.name || 'No account'}
        </span>
      ),
    },
    {
      header: 'Email',
      cell: (item: Contact) => (
        <div className="flex items-center gap-2 text-gray-300">
          <Mail className="h-3 w-3 text-gray-400" />
          {item.email || '-'}
        </div>
      ),
    },
    {
      header: 'Phone',
      cell: (item: Contact) => (
        <div className="flex items-center gap-2 text-gray-300">
          <Phone className="h-3 w-3 text-gray-400" />
          {item.phone || item.mobile || '-'}
        </div>
      ),
    },
    {
      header: 'Department',
      cell: (item: Contact) => (
        <span className="text-gray-300">{item.department || '-'}</span>
      ),
    },
    {
      header: 'Status',
      cell: (item: Contact) => (
        <Badge variant={item.archivedAt ? 'error' : 'success'}>
          {item.archivedAt ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: Contact) => (
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
        <h1 className="text-2xl font-bold text-white">Contacts</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Contact
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search contacts..."
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

        <Table data={contacts} columns={columns} isLoading={loading} />

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing {contacts.length} of {total} contacts
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
        title="Add New Contact"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="John Smith"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <Select
              label="Account"
              placeholder="Select account"
              options={accounts.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
              value={formData.accountId || ''}
              onChange={(value) =>
                setFormData({ ...formData, accountId: value || null })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Title"
              placeholder="Facility Manager"
              value={formData.title || ''}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value || null })
              }
            />
            <Input
              label="Department"
              placeholder="Operations"
              value={formData.department || ''}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value || null })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.email || ''}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value || null })
              }
            />
            <Input
              label="Phone"
              placeholder="(555) 123-4567"
              value={formData.phone || ''}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value || null })
              }
            />
          </div>

          <Input
            label="Mobile"
            placeholder="(555) 987-6543"
            value={formData.mobile || ''}
            onChange={(e) =>
              setFormData({ ...formData, mobile: e.target.value || null })
            }
          />

          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) =>
                  setFormData({ ...formData, isPrimary: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-600 bg-navy-light text-emerald focus:ring-emerald"
              />
              <span className="text-sm text-gray-300">Primary Contact</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isBilling}
                onChange={(e) =>
                  setFormData({ ...formData, isBilling: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-600 bg-navy-light text-emerald focus:ring-emerald"
              />
              <span className="text-sm text-gray-300">Billing Contact</span>
            </label>
          </div>

          <Textarea
            label="Notes"
            placeholder="Additional notes about this contact..."
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
              disabled={!formData.name}
            >
              Create Contact
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContactsList;
