import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Building2,
  MapPin,
  Archive,
  RotateCcw,
  X,
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
  listFacilities,
  createFacility,
  archiveFacility,
  restoreFacility,
  listAccounts,
} from '../../lib/facilities';
import type {
  Facility,
  Account,
  CreateFacilityInput,
} from '../../types/facility';
import { maxLengths } from '../../lib/validation';

const BUILDING_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'medical', label: 'Medical' },
  { value: 'retail', label: 'Retail' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'educational', label: 'Educational' },
  { value: 'residential', label: 'Residential' },
  { value: 'mixed', label: 'Mixed Use' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const FacilitiesList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [buildingTypeFilter, setBuildingTypeFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [formData, setFormData] = useState<CreateFacilityInput>({
    accountId: '',
    name: '',
    address: {},
    buildingType: null,
    squareFeet: null,
    notes: null,
  });

  const fetchFacilities = useCallback(
    async (currentPage: number, currentSearch: string, filters?: {
      accountId?: string;
      status?: string;
      buildingType?: string;
      includeArchived?: boolean;
    }) => {
      try {
        setLoading(true);
        const response = await listFacilities({
          search: currentSearch || undefined,
          page: currentPage,
          accountId: filters?.accountId || undefined,
          status: filters?.status || undefined,
          buildingType: filters?.buildingType || undefined,
          includeArchived: filters?.includeArchived,
        });
        setFacilities(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch facilities:', error);
        toast.error('Failed to load facilities');
        setFacilities([]);
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
    fetchFacilities(page, search, {
      accountId: accountFilter,
      status: statusFilter,
      buildingType: buildingTypeFilter,
      includeArchived,
    });
  }, [fetchFacilities, page, search, accountFilter, statusFilter, buildingTypeFilter, includeArchived]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!formData.accountId || !formData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await createFacility(formData);
      toast.success('Facility created successfully');
      setShowCreateModal(false);
      setFormData({
        accountId: '',
        name: '',
        address: {},
        buildingType: null,
        squareFeet: null,
        notes: null,
      });
      fetchFacilities(page, search, {
        accountId: accountFilter,
        status: statusFilter,
        buildingType: buildingTypeFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to create facility:', error);
      toast.error('Failed to create facility');
    } finally {
      setCreating(false);
    }
  };

  const clearFilters = () => {
    setAccountFilter('');
    setStatusFilter('');
    setBuildingTypeFilter('');
    setIncludeArchived(false);
    setPage(1);
  };

  const hasActiveFilters = accountFilter || statusFilter || buildingTypeFilter || includeArchived;

  const handleArchive = async (id: string) => {
    try {
      await archiveFacility(id);
      toast.success('Facility archived successfully');
      fetchFacilities(page, search, {
        accountId: accountFilter,
        status: statusFilter,
        buildingType: buildingTypeFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to archive facility:', error);
      toast.error('Failed to archive facility');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreFacility(id);
      toast.success('Facility restored successfully');
      fetchFacilities(page, search, {
        accountId: accountFilter,
        status: statusFilter,
        buildingType: buildingTypeFilter,
        includeArchived,
      });
    } catch (error) {
      console.error('Failed to restore facility:', error);
      toast.error('Failed to restore facility');
    }
  };

  const formatAddress = (address: Facility['address']) => {
    if (!address) return 'No address';
    const parts = [address.city, address.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address';
  };

  const columns = [
    {
      header: 'Facility',
      cell: (item: Facility) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
            <Building2 className="h-5 w-5 text-emerald" />
          </div>
          <div>
            <div className="font-medium text-white">{item.name}</div>
            <div className="text-sm text-gray-400">
              {item.account?.name || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Location',
      cell: (item: Facility) => (
        <div className="flex items-center gap-2 text-gray-300">
          <MapPin className="h-4 w-4 text-gray-500" />
          {formatAddress(item.address)}
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (item: Facility) => (
        <span className="capitalize text-gray-300">
          {item.buildingType || '-'}
        </span>
      ),
    },
    {
      header: 'Size',
      cell: (item: Facility) => {
        const totalSqft = item.areas.reduce((sum, area) => {
          const sqft = area.squareFeet ? Number(area.squareFeet) : 0;
          return sum + sqft * area.quantity;
        }, 0);
        return (
          <span className="text-gray-300">
            {totalSqft > 0 ? `${totalSqft.toLocaleString()} sq ft` : '-'}
          </span>
        );
      },
    },
    {
      header: 'Areas',
      cell: (item: Facility) => (
        <span className="text-gray-300">{item._count?.areas ?? 0}</span>
      ),
    },
    {
      header: 'Status',
      cell: (item: Facility) => (
        <Badge
          variant={
            item.archivedAt
              ? 'error'
              : item.status === 'active'
                ? 'success'
                : item.status === 'pending'
                  ? 'warning'
                  : 'default'
          }
        >
          {item.archivedAt ? 'Archived' : item.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: Facility) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/facilities/${item.id}`);
            }}
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
        <h1 className="text-2xl font-bold text-white">Facilities</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Facility
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search facilities..."
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
                label="Account"
                placeholder="All Accounts"
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                }))}
                value={accountFilter}
                onChange={setAccountFilter}
              />
              <Select
                label="Status"
                placeholder="All Statuses"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <Select
                label="Building Type"
                placeholder="All Types"
                options={BUILDING_TYPES}
                value={buildingTypeFilter}
                onChange={setBuildingTypeFilter}
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

        <Table
          data={facilities}
          columns={columns}
          isLoading={loading}
          onRowClick={(item) => navigate(`/facilities/${item.id}`)}
        />

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing {facilities.length} of {total} facilities
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
        title="Add New Facility"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Account"
            placeholder="Select an account"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            value={formData.accountId}
            onChange={(value) => setFormData({ ...formData, accountId: value })}
          />

          <Input
            label="Facility Name"
            placeholder="Enter facility name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            maxLength={maxLengths.name}
            showCharacterCount
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Street Address"
              placeholder="123 Main St"
              value={formData.address.street || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value },
                })
              }
              maxLength={maxLengths.street}
            />
            <Input
              label="City"
              placeholder="Vancouver"
              value={formData.address.city || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value },
                })
              }
              maxLength={maxLengths.city}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="State/Province"
              placeholder="BC"
              value={formData.address.state || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value },
                })
              }
              maxLength={maxLengths.state}
            />
            <Input
              label="Postal Code"
              placeholder="V6B 1A1"
              value={formData.address.postalCode || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, postalCode: e.target.value },
                })
              }
              maxLength={maxLengths.postalCode}
            />
            <Input
              label="Country"
              placeholder="Canada"
              value={formData.address.country || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, country: e.target.value },
                })
              }
              maxLength={maxLengths.country}
            />
          </div>

          <Select
            label="Building Type"
            placeholder="Select type"
            options={BUILDING_TYPES}
            value={formData.buildingType || ''}
            onChange={(value) =>
              setFormData({ ...formData, buildingType: value || null })
            }
          />
          <p className="text-xs text-gray-400 -mt-2">
            Total square feet will be auto-calculated from areas you add to this facility.
          </p>

          <Textarea
            label="Notes"
            placeholder="Additional notes about this facility..."
            value={formData.notes || ''}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value || null })
            }
            maxLength={maxLengths.notes}
            showCharacterCount
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
              disabled={!formData.accountId || !formData.name}
            >
              Create Facility
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FacilitiesList;


