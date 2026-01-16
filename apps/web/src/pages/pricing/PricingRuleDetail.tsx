import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  DollarSign,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Table } from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  getPricingRule,
  updatePricingRule,
  deletePricingRule,
  listPricingOverrides,
  createPricingOverride,
  approvePricingOverride,
  deletePricingOverride,
} from '../../lib/pricing';
import { listFacilities } from '../../lib/facilities';
import type {
  PricingRule,
  UpdatePricingRuleInput,
  PricingOverride,
  CreatePricingOverrideInput,
} from '../../types/crm';

interface Facility {
  id: string;
  name: string;
  account: {
    id: string;
    name: string;
  };
}

const PRICING_TYPES = [
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'square_foot', label: 'Per Square Foot' },
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'per_unit', label: 'Per Unit' },
];

const CLEANING_TYPES = [
  { value: 'standard', label: 'Standard Cleaning' },
  { value: 'deep_clean', label: 'Deep Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'specialty', label: 'Specialty Service' },
  { value: 'post_construction', label: 'Post-Construction' },
];

const PricingRuleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pricingRule, setPricingRule] = useState<PricingRule | null>(null);
  const [overrides, setOverrides] = useState<PricingOverride[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateOverrideModal, setShowCreateOverrideModal] = useState(false);
  const [creatingOverride, setCreatingOverride] = useState(false);

  const [formData, setFormData] = useState<UpdatePricingRuleInput>({});
  const [overrideFormData, setOverrideFormData] = useState<CreatePricingOverrideInput>({
    facilityId: '',
    pricingRuleId: id || '',
    overrideRate: 0,
    overrideReason: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: null,
  });

  const fetchPricingRule = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getPricingRule(id);
      setPricingRule(data);
      setFormData({
        name: data.name,
        description: data.description,
        pricingType: data.pricingType,
        baseRate: Number(data.baseRate),
        minimumCharge: data.minimumCharge ? Number(data.minimumCharge) : null,
        squareFootRate: data.squareFootRate ? Number(data.squareFootRate) : null,
        difficultyMultiplier: Number(data.difficultyMultiplier),
        cleaningType: data.cleaningType,
        isActive: data.isActive,
      });
    } catch (error) {
      console.error('Failed to fetch pricing rule:', error);
      toast.error('Failed to load pricing rule');
      navigate('/pricing');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchOverrides = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listPricingOverrides({ pricingRuleId: id, limit: 100 });
      setOverrides(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch overrides:', error);
    }
  }, [id]);

  const fetchFacilities = useCallback(async () => {
    try {
      const response = await listFacilities({ limit: 100 });
      setFacilities(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
    }
  }, []);

  useEffect(() => {
    fetchPricingRule();
    fetchOverrides();
    fetchFacilities();
  }, [fetchPricingRule, fetchOverrides, fetchFacilities]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updatePricingRule(id, formData);
      toast.success('Pricing rule updated successfully');
      setIsEditing(false);
      fetchPricingRule();
    } catch (error) {
      console.error('Failed to update pricing rule:', error);
      toast.error('Failed to update pricing rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deletePricingRule(id);
      toast.success('Pricing rule deleted successfully');
      navigate('/pricing');
    } catch (error) {
      console.error('Failed to delete pricing rule:', error);
      toast.error('Failed to delete pricing rule');
    }
  };

  const handleCreateOverride = async () => {
    if (!overrideFormData.facilityId || !overrideFormData.overrideRate || !overrideFormData.overrideReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreatingOverride(true);
      await createPricingOverride({
        ...overrideFormData,
        pricingRuleId: id || '',
      });
      toast.success('Pricing override created successfully');
      setShowCreateOverrideModal(false);
      setOverrideFormData({
        facilityId: '',
        pricingRuleId: id || '',
        overrideRate: 0,
        overrideReason: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: null,
      });
      fetchOverrides();
    } catch (error) {
      console.error('Failed to create override:', error);
      toast.error('Failed to create pricing override');
    } finally {
      setCreatingOverride(false);
    }
  };

  const handleApproveOverride = async (overrideId: string) => {
    try {
      await approvePricingOverride(overrideId);
      toast.success('Override approved');
      fetchOverrides();
    } catch (error) {
      console.error('Failed to approve override:', error);
      toast.error('Failed to approve override');
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      await deletePricingOverride(overrideId);
      toast.success('Override deleted');
      fetchOverrides();
    } catch (error) {
      console.error('Failed to delete override:', error);
      toast.error('Failed to delete override');
    }
  };

  const formatCurrency = (value: string | number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Number(value));
  };

  const formatPricingType = (type: string) => {
    const found = PRICING_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const formatCleaningType = (type: string | null) => {
    if (!type) return '-';
    const found = CLEANING_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const overrideColumns = [
    {
      header: 'Facility',
      cell: (item: PricingOverride) => (
        <div>
          <div className="font-medium text-white">{item.facility.name}</div>
          <div className="text-sm text-gray-400">{item.facility.account.name}</div>
        </div>
      ),
    },
    {
      header: 'Override Rate',
      cell: (item: PricingOverride) => (
        <span className="text-white">{formatCurrency(item.overrideRate)}</span>
      ),
    },
    {
      header: 'Reason',
      cell: (item: PricingOverride) => (
        <span className="text-gray-300 line-clamp-2">{item.overrideReason}</span>
      ),
    },
    {
      header: 'Effective',
      cell: (item: PricingOverride) => (
        <span className="text-gray-300">
          {new Date(item.effectiveDate).toLocaleDateString()}
          {item.expiryDate && ` - ${new Date(item.expiryDate).toLocaleDateString()}`}
        </span>
      ),
    },
    {
      header: 'Approved',
      cell: (item: PricingOverride) => (
        <Badge variant={item.approvedByUser ? 'success' : 'warning'}>
          {item.approvedByUser ? 'Approved' : 'Pending'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: PricingOverride) => (
        <div className="flex gap-2">
          {!item.approvedByUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleApproveOverride(item.id)}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteOverride(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!pricingRule) {
    return (
      <div className="text-center text-gray-400">Pricing rule not found</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/pricing')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{pricingRule.name}</h1>
          <p className="text-gray-400">Pricing Rule Details</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10">
              <Calculator className="h-6 w-6 text-emerald" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Pricing Details</h2>
              <p className="text-sm text-gray-400">Configuration for this pricing rule</p>
            </div>
          </div>

          <div className="space-y-4">
            {isEditing ? (
              <>
                <Input
                  label="Rule Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Pricing Type"
                    options={PRICING_TYPES}
                    value={formData.pricingType || ''}
                    onChange={(value) => setFormData({ ...formData, pricingType: value })}
                  />
                  <Select
                    label="Cleaning Type"
                    placeholder="Select cleaning type"
                    options={CLEANING_TYPES}
                    value={formData.cleaningType || ''}
                    onChange={(value) =>
                      setFormData({ ...formData, cleaningType: value || null })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Base Rate ($)"
                    type="number"
                    step="0.01"
                    value={formData.baseRate || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, baseRate: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Minimum Charge ($)"
                    type="number"
                    step="0.01"
                    value={formData.minimumCharge || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minimumCharge: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                {formData.pricingType === 'square_foot' && (
                  <Input
                    label="Square Foot Rate ($)"
                    type="number"
                    step="0.0001"
                    value={formData.squareFootRate || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        squareFootRate: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                )}
                <Input
                  label="Difficulty Multiplier"
                  type="number"
                  step="0.1"
                  value={formData.difficultyMultiplier || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, difficultyMultiplier: Number(e.target.value) })
                  }
                />
                <Textarea
                  label="Description"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value || null })
                  }
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-300">
                    Active
                  </label>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-400">Pricing Type</span>
                  <p className="text-white">{formatPricingType(pricingRule.pricingType)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Cleaning Type</span>
                  <p className="text-white">{formatCleaningType(pricingRule.cleaningType)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Base Rate</span>
                  <p className="text-white">{formatCurrency(pricingRule.baseRate)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Minimum Charge</span>
                  <p className="text-white">{formatCurrency(pricingRule.minimumCharge)}</p>
                </div>
                {pricingRule.squareFootRate && (
                  <div>
                    <span className="text-sm text-gray-400">Square Foot Rate</span>
                    <p className="text-white">{formatCurrency(pricingRule.squareFootRate)}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-400">Difficulty Multiplier</span>
                  <p className="text-white">{pricingRule.difficultyMultiplier}x</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Area Type</span>
                  <p className="text-white">{pricingRule.areaType?.name || 'All Areas'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Status</span>
                  <div className="mt-1">
                    <Badge variant={pricingRule.isActive ? 'success' : 'default'}>
                      {pricingRule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                {pricingRule.description && (
                  <div className="col-span-2">
                    <span className="text-sm text-gray-400">Description</span>
                    <p className="text-white">{pricingRule.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-white">Condition Multipliers</h3>
          <div className="space-y-3">
            {pricingRule.conditionMultipliers && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Excellent</span>
                  <Badge variant="success">{pricingRule.conditionMultipliers.excellent}x</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Good</span>
                  <Badge variant="info">{pricingRule.conditionMultipliers.good}x</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Fair</span>
                  <Badge variant="warning">{pricingRule.conditionMultipliers.fair}x</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Poor</span>
                  <Badge variant="error">{pricingRule.conditionMultipliers.poor}x</Badge>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 bg-navy-dark/30 p-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Pricing Overrides</h3>
            <p className="text-sm text-gray-400">Facility-specific rate adjustments</p>
          </div>
          <Button onClick={() => setShowCreateOverrideModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Override
          </Button>
        </div>
        <Table data={overrides} columns={overrideColumns} />
      </Card>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Pricing Rule"
        message="Are you sure you want to delete this pricing rule? This action cannot be undone and will also delete all associated overrides."
        variant="danger"
      />

      <Modal
        isOpen={showCreateOverrideModal}
        onClose={() => setShowCreateOverrideModal(false)}
        title="Add Pricing Override"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Facility"
            placeholder="Select a facility"
            options={facilities.map((f) => ({
              value: f.id,
              label: `${f.name} (${f.account.name})`,
            }))}
            value={overrideFormData.facilityId}
            onChange={(value) =>
              setOverrideFormData({ ...overrideFormData, facilityId: value })
            }
          />

          <Input
            label="Override Rate ($)"
            type="number"
            step="0.01"
            min={0}
            placeholder="30.00"
            value={overrideFormData.overrideRate || ''}
            onChange={(e) =>
              setOverrideFormData({
                ...overrideFormData,
                overrideRate: e.target.value ? Number(e.target.value) : 0,
              })
            }
          />

          <Textarea
            label="Reason for Override"
            placeholder="Explain why this facility has a different rate..."
            value={overrideFormData.overrideReason}
            onChange={(e) =>
              setOverrideFormData({ ...overrideFormData, overrideReason: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Effective Date"
              type="date"
              value={overrideFormData.effectiveDate || ''}
              onChange={(e) =>
                setOverrideFormData({ ...overrideFormData, effectiveDate: e.target.value })
              }
            />
            <Input
              label="Expiry Date (Optional)"
              type="date"
              value={overrideFormData.expiryDate || ''}
              onChange={(e) =>
                setOverrideFormData({
                  ...overrideFormData,
                  expiryDate: e.target.value || null,
                })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateOverrideModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOverride}
              isLoading={creatingOverride}
              disabled={
                !overrideFormData.facilityId ||
                !overrideFormData.overrideRate ||
                !overrideFormData.overrideReason
              }
            >
              Create Override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PricingRuleDetail;
