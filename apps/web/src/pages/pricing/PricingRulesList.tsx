import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  Archive,
  RotateCcw,
  X,
  Calculator,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  listPricingRules,
  createPricingRule,
  archivePricingRule,
  restorePricingRule,
} from '../../lib/pricing';
import { listAreaTypes } from '../../lib/facilities';
import type { PricingRule, CreatePricingRuleInput } from '../../types/crm';

interface AreaType {
  id: string;
  name: string;
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

const PricingRulesList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [pricingTypeFilter, setPricingTypeFilter] = useState<string>('');
  const [cleaningTypeFilter, setCleaningTypeFilter] = useState<string>('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [formData, setFormData] = useState<CreatePricingRuleInput>({
    name: '',
    description: null,
    pricingType: 'hourly',
    baseRate: 0,
    minimumCharge: null,
    squareFootRate: null,
    difficultyMultiplier: 1.0,
    cleaningType: null,
    areaTypeId: null,
    isActive: true,
  });

  const fetchPricingRules = useCallback(
    async (currentPage: number, currentSearch: string, filters?: {
      pricingType?: string;
      cleaningType?: string;
      isActive?: boolean;
      includeArchived?: boolean;
    }) => {
      try {
        setLoading(true);
        const response = await listPricingRules({
          search: currentSearch || undefined,
          page: currentPage,
          pricingType: filters?.pricingType || undefined,
          cleaningType: filters?.cleaningType || undefined,
          isActive: filters?.isActive,
          includeArchived: filters?.includeArchived,
        });
        setPricingRules(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch pricing rules:', error);
        toast.error('Failed to load pricing rules');
        setPricingRules([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchAreaTypes = useCallback(async () => {
    try {
      const response = await listAreaTypes({ limit: 100 });
      setAreaTypes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch area types:', error);
    }
  }, []);

  useEffect(() => {
    fetchPricingRules(page, search, {
      pricingType: pricingTypeFilter,
      cleaningType: cleaningTypeFilter,
      isActive: isActiveFilter ? isActiveFilter === 'true' : undefined,
      includeArchived,
    });
  }, [fetchPricingRules, page, search, pricingTypeFilter, cleaningTypeFilter, isActiveFilter, includeArchived]);

  useEffect(() => {
    fetchAreaTypes();
  }, [fetchAreaTypes]);

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please enter a pricing rule name');
      return;
    }
    if (!formData.baseRate || formData.baseRate <= 0) {
      toast.error('Please enter a valid base rate');
      return;
    }

    try {
      setCreating(true);
      await createPricingRule(formData);
      toast.success('Pricing rule created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchPricingRules(page, search, {
        pricingType: pricingTypeFilter,
        cleaningType: cleaningTypeFilter,
        isActive: isActiveFilter ? isActiveFilter === 'true' : undefined,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to create pricing rule:', error);
      toast.error('Failed to create pricing rule. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: null,
      pricingType: 'hourly',
      baseRate: 0,
      minimumCharge: null,
      squareFootRate: null,
      difficultyMultiplier: 1.0,
      cleaningType: null,
      areaTypeId: null,
      isActive: true,
    });
  };

  const clearFilters = () => {
    setPricingTypeFilter('');
    setCleaningTypeFilter('');
    setIsActiveFilter('');
    setIncludeArchived(false);
    setPage(1);
  };

  const hasActiveFilters = pricingTypeFilter || cleaningTypeFilter || isActiveFilter || includeArchived;

  const handleArchive = async (id: string) => {
    try {
      await archivePricingRule(id);
      toast.success('Pricing rule archived successfully');
      fetchPricingRules(page, search, {
        pricingType: pricingTypeFilter,
        cleaningType: cleaningTypeFilter,
        isActive: isActiveFilter ? isActiveFilter === 'true' : undefined,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to archive pricing rule:', error);
      toast.error('Failed to archive pricing rule');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restorePricingRule(id);
      toast.success('Pricing rule restored successfully');
      fetchPricingRules(page, search, {
        pricingType: pricingTypeFilter,
        cleaningType: cleaningTypeFilter,
        isActive: isActiveFilter ? isActiveFilter === 'true' : undefined,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to restore pricing rule:', error);
      toast.error('Failed to restore pricing rule');
    }
  };

  const formatCurrency = (value: string | null) => {
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

  const columns = [
    {
      header: 'Pricing Rule',
      cell: (item: PricingRule) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
            <Calculator className="h-5 w-5 text-emerald" />
          </div>
          <div>
            <div className="font-medium text-white">{item.name}</div>
            <div className="text-sm text-gray-400">
              {item.areaType?.name || 'All Areas'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (item: PricingRule) => (
        <Badge variant="info">{formatPricingType(item.pricingType)}</Badge>
      ),
    },
    {
      header: 'Base Rate',
      cell: (item: PricingRule) => (
        <div className="flex items-center gap-2 text-gray-300">
          <DollarSign className="h-4 w-4 text-gray-500" />
          {formatCurrency(item.baseRate)}
        </div>
      ),
    },
    {
      header: 'Cleaning Type',
      cell: (item: PricingRule) => (
        <span className="text-gray-300">
          {formatCleaningType(item.cleaningType)}
        </span>
      ),
    },
    {
      header: 'Overrides',
      cell: (item: PricingRule) => (
        <span className="text-gray-300">{item._count?.pricingOverrides || 0}</span>
      ),
    },
    {
      header: 'Status',
      cell: (item: PricingRule) => (
        <div className="flex gap-2">
          <Badge variant={item.isActive ? 'success' : 'default'}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {item.archivedAt && (
            <Badge variant="error">Archived</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (item: PricingRule) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/pricing/${item.id}`)}
          >
            View
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
        <h1 className="text-2xl font-bold text-white">Pricing Rules</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pricing Rule
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search pricing rules..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant={hasActiveFilters ? 'primary' : 'secondary'}
              className="px-3"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && <span className="ml-2">•</span>}
            </Button>
          </div>

          {showFilterPanel && (
            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-navy-darker/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Pricing Type"
                placeholder="All Types"
                options={PRICING_TYPES}
                value={pricingTypeFilter}
                onChange={setPricingTypeFilter}
              />
              <Select
                label="Cleaning Type"
                placeholder="All Cleaning Types"
                options={CLEANING_TYPES}
                value={cleaningTypeFilter}
                onChange={setCleaningTypeFilter}
              />
              <Select
                label="Status"
                placeholder="All Statuses"
                options={[
                  { value: 'true', label: 'Active' },
                  { value: 'false', label: 'Inactive' },
                ]}
                value={isActiveFilter}
                onChange={setIsActiveFilter}
              />
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                  />
                  Include Archived
                </label>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <Table data={pricingRules} columns={columns} isLoading={loading} />

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing {pricingRules.length} of {total} pricing rules
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
        title="Add New Pricing Rule"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Rule Name"
            placeholder="Office Cleaning - Standard Rate"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Pricing Type"
              options={PRICING_TYPES}
              value={formData.pricingType}
              onChange={(value) => setFormData({ ...formData, pricingType: value })}
            />
            <Select
              label="Cleaning Type"
              placeholder="Select cleaning type (optional)"
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
              min={0}
              placeholder="25.00"
              value={formData.baseRate || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  baseRate: e.target.value ? Number(e.target.value) : 0,
                })
              }
            />
            <Input
              label="Minimum Charge ($)"
              type="number"
              step="0.01"
              min={0}
              placeholder="50.00"
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
              min={0}
              placeholder="0.15"
              value={formData.squareFootRate || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  squareFootRate: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Difficulty Multiplier"
              type="number"
              step="0.1"
              min={0}
              max={10}
              placeholder="1.0"
              value={formData.difficultyMultiplier || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  difficultyMultiplier: e.target.value ? Number(e.target.value) : 1.0,
                })
              }
            />
            <Select
              label="Area Type"
              placeholder="All areas (optional)"
              options={areaTypes.map((at) => ({
                value: at.id,
                label: at.name,
              }))}
              value={formData.areaTypeId || ''}
              onChange={(value) =>
                setFormData({ ...formData, areaTypeId: value || null })
              }
            />
          </div>

          <Textarea
            label="Description"
            placeholder="Details about this pricing rule..."
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
              disabled={!formData.name || !formData.baseRate}
            >
              Create Pricing Rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PricingRulesList;
