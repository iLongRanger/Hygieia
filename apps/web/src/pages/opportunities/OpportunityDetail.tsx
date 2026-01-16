import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  DollarSign,
  Calendar,
  Edit2,
  Archive,
  RotateCcw,
  User as UserIcon,
  Building,
  TrendingUp,
  CheckCircle,
  XCircle,
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
  getOpportunity,
  updateOpportunity,
  archiveOpportunity,
  restoreOpportunity,
} from '../../lib/opportunities';
import { listLeads } from '../../lib/leads';
import { listAccounts } from '../../lib/accounts';
import { listUsers } from '../../lib/users';
import type { Opportunity, UpdateOpportunityInput, Lead, Account } from '../../types/crm';
import type { User } from '../../types/user';

const OPPORTUNITY_STATUSES = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'needs_analysis', label: 'Needs Analysis' },
  { value: 'value_proposition', label: 'Value Proposition' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const OpportunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<UpdateOpportunityInput>({
    name: '',
    status: 'prospecting',
    leadId: null,
    accountId: null,
    probability: null,
    expectedValue: null,
    actualValue: null,
    expectedCloseDate: null,
    actualCloseDate: null,
    assignedToUserId: null,
    description: null,
  });

  const fetchOpportunity = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getOpportunity(id);
      if (data) {
        setOpportunity(data);
        setFormData({
          name: data.name,
          status: data.status,
          leadId: data.lead?.id || null,
          accountId: data.account?.id || null,
          probability: data.probability,
          expectedValue: data.expectedValue ? Number(data.expectedValue) : null,
          actualValue: data.actualValue ? Number(data.actualValue) : null,
          expectedCloseDate: data.expectedCloseDate?.split('T')[0] || null,
          actualCloseDate: data.actualCloseDate?.split('T')[0] || null,
          assignedToUserId: data.assignedToUser?.id || null,
          description: data.description,
        });
      }
    } catch (error) {
      console.error('Failed to fetch opportunity:', error);
      toast.error('Failed to load opportunity details');
      setOpportunity(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchLeads = useCallback(async () => {
    try {
      const response = await listLeads({ limit: 100 });
      setLeads(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await listAccounts({ limit: 100 });
      setAccounts(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
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
    fetchOpportunity();
    fetchLeads();
    fetchAccounts();
    fetchUsers();
  }, [fetchOpportunity, fetchLeads, fetchAccounts, fetchUsers]);

  const handleUpdate = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateOpportunity(id, formData);
      toast.success('Opportunity updated successfully');
      setShowEditModal(false);
      fetchOpportunity();
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      toast.error('Failed to update opportunity. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveOpportunity(id);
      toast.success('Opportunity archived successfully');
      fetchOpportunity();
    } catch (error) {
      console.error('Failed to archive opportunity:', error);
      toast.error('Failed to archive opportunity');
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    try {
      await restoreOpportunity(id);
      toast.success('Opportunity restored successfully');
      fetchOpportunity();
    } catch (error) {
      console.error('Failed to restore opportunity:', error);
      toast.error('Failed to restore opportunity');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'closed_won':
        return 'success';
      case 'closed_lost':
        return 'error';
      case 'negotiation':
      case 'value_proposition':
        return 'warning';
      case 'qualification':
      case 'needs_analysis':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
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

  if (!opportunity) {
    return <div className="text-center text-gray-400">Opportunity not found</div>;
  }

  const weightedValue = opportunity.expectedValue && opportunity.probability
    ? (Number(opportunity.expectedValue) * opportunity.probability) / 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/opportunities')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{opportunity.name}</h1>
          <div className="flex items-center gap-2 text-gray-400">
            {opportunity.account && (
              <Link
                to={`/accounts/${opportunity.account.id}`}
                className="hover:text-gold"
              >
                {opportunity.account.name}
              </Link>
            )}
            {opportunity.lead && !opportunity.account && (
              <span>
                {opportunity.lead.companyName || opportunity.lead.contactName}
              </span>
            )}
            {!opportunity.account && !opportunity.lead && 'No association'}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {opportunity.archivedAt ? (
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
        {/* Left column - Main info */}
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
                <Target className="h-8 w-8 text-emerald" />
              </div>
              <div>
                <Badge variant={getStatusVariant(opportunity.status)}>
                  {formatStatus(opportunity.status)}
                </Badge>
                {opportunity.status === 'closed_won' && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-emerald">
                    <CheckCircle className="h-4 w-4" />
                    Won
                  </div>
                )}
                {opportunity.status === 'closed_lost' && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-red-400">
                    <XCircle className="h-4 w-4" />
                    Lost
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-start gap-3">
                <DollarSign className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Expected Value</div>
                  <div className="text-lg font-semibold text-white">
                    {formatCurrency(opportunity.expectedValue)}
                  </div>
                </div>
              </div>

              {opportunity.actualValue && (
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-1 h-4 w-4 text-emerald" />
                  <div>
                    <div className="text-sm text-gray-400">Actual Value</div>
                    <div className="text-lg font-semibold text-emerald">
                      {formatCurrency(opportunity.actualValue)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <TrendingUp className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Probability</div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 rounded-full bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-emerald"
                        style={{ width: `${opportunity.probability || 0}%` }}
                      />
                    </div>
                    <span className="text-white">{opportunity.probability || 0}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="mt-1 h-4 w-4 text-gold" />
                <div>
                  <div className="text-sm text-gray-400">Weighted Value</div>
                  <div className="text-white">
                    {formatCurrency(weightedValue.toString())}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Expected Close</div>
                  <div className="text-white">
                    {formatDate(opportunity.expectedCloseDate)}
                  </div>
                </div>
              </div>

              {opportunity.actualCloseDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-1 h-4 w-4 text-emerald" />
                  <div>
                    <div className="text-sm text-gray-400">Actual Close</div>
                    <div className="text-white">
                      {formatDate(opportunity.actualCloseDate)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <UserIcon className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Assigned To</div>
                  <div className="text-white">
                    {opportunity.assignedToUser?.fullName || 'Unassigned'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Created</div>
                  <div className="text-white">{formatDate(opportunity.createdAt)}</div>
                </div>
              </div>
            </div>

            {opportunity.archivedAt && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                <div className="flex items-center gap-2 text-orange-400">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm font-medium">Archived</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  {formatDate(opportunity.archivedAt)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Right column - Details */}
        <Card className="lg:col-span-2">
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">
                Opportunity Details
              </h3>

              {/* Pipeline Stage Progress */}
              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2">Pipeline Stage</div>
                <div className="flex gap-1">
                  {OPPORTUNITY_STATUSES.slice(0, -2).map((stage, index) => {
                    const currentIndex = OPPORTUNITY_STATUSES.findIndex(
                      (s) => s.value === opportunity.status
                    );
                    const isCompleted = index <= currentIndex;
                    const isCurrent = stage.value === opportunity.status;
                    return (
                      <div
                        key={stage.value}
                        className={`flex-1 h-2 rounded ${
                          isCompleted
                            ? isCurrent
                              ? 'bg-emerald'
                              : 'bg-emerald/50'
                            : 'bg-gray-700'
                        }`}
                        title={stage.label}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">Prospecting</span>
                  <span className="text-xs text-gray-500">Negotiation</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {opportunity.lead && (
                  <div>
                    <div className="text-sm text-gray-400">Linked Lead</div>
                    <div className="text-white">
                      {opportunity.lead.companyName
                        ? `${opportunity.lead.contactName} - ${opportunity.lead.companyName}`
                        : opportunity.lead.contactName}
                    </div>
                  </div>
                )}

                {opportunity.account && (
                  <div>
                    <div className="text-sm text-gray-400">Linked Account</div>
                    <Link
                      to={`/accounts/${opportunity.account.id}`}
                      className="flex items-center gap-2 text-gold hover:underline"
                    >
                      <Building className="h-4 w-4" />
                      {opportunity.account.name}
                    </Link>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-400">Created By</div>
                  <div className="text-white">
                    {opportunity.createdByUser?.fullName || 'Unknown'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400">Last Updated</div>
                  <div className="text-white">{formatDate(opportunity.updatedAt)}</div>
                </div>
              </div>
            </div>

            {opportunity.description && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">Description</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{opportunity.description}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Opportunity"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Opportunity Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Link to Lead"
              placeholder="Select a lead (optional)"
              options={leads.map((l) => ({
                value: l.id,
                label: l.companyName ? `${l.contactName} - ${l.companyName}` : l.contactName,
              }))}
              value={formData.leadId || ''}
              onChange={(value) =>
                setFormData({ ...formData, leadId: value || null })
              }
            />
            <Select
              label="Link to Account"
              placeholder="Select an account (optional)"
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
            <Select
              label="Stage"
              options={OPPORTUNITY_STATUSES}
              value={formData.status || 'prospecting'}
              onChange={(value) => setFormData({ ...formData, status: value })}
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
              label="Expected Value"
              type="number"
              placeholder="25000"
              value={formData.expectedValue || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expectedValue: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            {(formData.status === 'closed_won' || formData.status === 'closed_lost') && (
              <Input
                label="Actual Close Date"
                type="date"
                value={formData.actualCloseDate || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actualCloseDate: e.target.value || null,
                  })
                }
              />
            )}
          </div>

          {formData.status === 'closed_won' && (
            <Input
              label="Actual Value"
              type="number"
              placeholder="25000"
              value={formData.actualValue || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  actualValue: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          )}

          <Textarea
            label="Description"
            placeholder="Details about this opportunity..."
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || null })
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

export default OpportunityDetail;
