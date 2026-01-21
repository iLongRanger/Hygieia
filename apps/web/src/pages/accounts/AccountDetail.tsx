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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  getAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
} from '../../lib/accounts';
import { listUsers } from '../../lib/users';
import type { Account, UpdateAccountInput } from '../../types/crm';
import type { User } from '../../types/user';

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

const AccountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

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
          creditLimit: data.creditLimit,
          accountManagerId: data.accountManagerId,
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

  useEffect(() => {
    fetchAccount();
    fetchUsers();
  }, [fetchAccount, fetchUsers]);

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
                      <a
                        href={account.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold hover:underline"
                      >
                        {account.website}
                      </a>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Card noPadding className="p-4">
                  <div className="text-2xl font-bold text-gold">
                    {account._count?.facilities ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Facilities</div>
                </Card>
                <Card noPadding className="p-4">
                  <div className="text-2xl font-bold text-gold">
                    {account._count?.contacts ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Contacts</div>
                </Card>
              </div>
            </div>
          </div>
        </Card>
      </div>

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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
};

export default AccountDetail;
