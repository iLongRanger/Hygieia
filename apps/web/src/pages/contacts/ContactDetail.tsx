import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Smartphone,
  Briefcase,
  Building,
  Edit2,
  Archive,
  RotateCcw,
  Star,
  CreditCard,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import {
  getContact,
  updateContact,
  archiveContact,
  restoreContact,
} from '../../lib/contacts';
import { listAccounts } from '../../lib/accounts';
import type { Contact, Account, UpdateContactInput } from '../../types/crm';

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWriteContacts = hasPermission(PERMISSIONS.CONTACTS_WRITE);
  const canAdminContacts = hasPermission(PERMISSIONS.CONTACTS_ADMIN);

  const [formData, setFormData] = useState<UpdateContactInput>({
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

  const fetchContact = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getContact(id);
      if (data) {
        setContact(data);
        setFormData({
          accountId: data.accountId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          mobile: data.mobile,
          title: data.title,
          department: data.department,
          isPrimary: data.isPrimary,
          isBilling: data.isBilling,
          notes: data.notes,
        });
      }
    } catch (error) {
      console.error('Failed to fetch contact:', error);
      toast.error('Failed to load contact details');
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await listAccounts({ limit: 100 });
      setAccounts(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchContact();
    fetchAccounts();
  }, [fetchContact, fetchAccounts]);

  const handleUpdate = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateContact(id, formData);
      toast.success('Contact updated successfully');
      setShowEditModal(false);
      fetchContact();
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast.error('Failed to update contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveContact(id);
      toast.success('Contact archived successfully');
      fetchContact();
    } catch (error) {
      console.error('Failed to archive contact:', error);
      toast.error('Failed to archive contact');
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    try {
      await restoreContact(id);
      toast.success('Contact restored successfully');
      fetchContact();
    } catch (error) {
      console.error('Failed to restore contact:', error);
      toast.error('Failed to restore contact');
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
      </div>
    );
  }

  if (!contact) {
    return <div className="text-center text-gray-400">Contact not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
          <p className="text-gray-400">{contact.title || 'No title'}</p>
        </div>
        <div className="flex gap-2">
          {canWriteContacts && (
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Contact
            </Button>
          )}
          {contact.archivedAt && canAdminContacts ? (
            <Button variant="secondary" onClick={handleRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          ) : !contact.archivedAt && canAdminContacts ? (
            <Button
              variant="secondary"
              onClick={handleArchive}
              className="text-orange-400 hover:text-orange-300"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
                <UserIcon className="h-8 w-8 text-emerald" />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {contact.name}
                </div>
                <div className="flex gap-2">
                  {contact.isPrimary && (
                    <Badge variant="info">
                      <Star className="mr-1 h-3 w-3" />
                      Primary
                    </Badge>
                  )}
                  {contact.isBilling && (
                    <Badge variant="warning">
                      <CreditCard className="mr-1 h-3 w-3" />
                      Billing
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Email</div>
                  <div className="text-white">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-emerald hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Phone</div>
                  <div className="text-white">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-emerald hover:underline"
                      >
                        {contact.phone}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Smartphone className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Mobile</div>
                  <div className="text-white">
                    {contact.mobile ? (
                      <a
                        href={`tel:${contact.mobile}`}
                        className="text-emerald hover:underline"
                      >
                        {contact.mobile}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Account</div>
                  <div className="text-white">
                    {contact.account ? (
                      <button
                        onClick={() =>
                          navigate(`/accounts/${contact.account?.id}`)
                        }
                        className="text-emerald hover:underline"
                      >
                        {contact.account.name}
                      </button>
                    ) : (
                      'Not linked'
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Title</div>
                  <div className="text-white">{contact.title || 'Not provided'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Created</div>
                  <div className="text-white">{formatDate(contact.createdAt)}</div>
                </div>
              </div>
            </div>

            {contact.archivedAt && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                <div className="flex items-center gap-2 text-orange-400">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm font-medium">Archived</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  {formatDate(contact.archivedAt)}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Contact Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-400">Department</div>
                  <div className="text-white">
                    {contact.department || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Contact Type</div>
                  <div className="flex gap-2">
                    {!contact.isPrimary && !contact.isBilling && (
                      <span className="text-white">Standard Contact</span>
                    )}
                    {contact.isPrimary && (
                      <Badge variant="info">Primary Contact</Badge>
                    )}
                    {contact.isBilling && (
                      <Badge variant="warning">Billing Contact</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {contact.notes && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">Notes</h3>
                <p className="text-gray-300">{contact.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showEditModal && canWriteContacts}
        onClose={() => setShowEditModal(false)}
        title="Edit Contact"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Contact Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="contact@example.com"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile"
              placeholder="(555) 987-6543"
              value={formData.mobile || ''}
              onChange={(e) =>
                setFormData({ ...formData, mobile: e.target.value || null })
              }
            />
            <Input
              label="Title"
              placeholder="Operations Manager"
              value={formData.title || ''}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value || null })
              }
            />
          </div>

          <Input
            label="Department"
            placeholder="Operations"
            value={formData.department || ''}
            onChange={(e) =>
              setFormData({ ...formData, department: e.target.value || null })
            }
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) =>
                  setFormData({ ...formData, isPrimary: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-600 bg-navy-dark text-emerald focus:ring-emerald"
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
                className="h-4 w-4 rounded border-gray-600 bg-navy-dark text-emerald focus:ring-emerald"
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
    </div>
  );
};

export default ContactDetail;


