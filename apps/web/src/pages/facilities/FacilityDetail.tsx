import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Ruler,
  Clock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  getFacility,
  updateFacility,
  listAreas,
  createArea,
  updateArea,
  archiveArea,
  restoreArea,
  deleteArea,
  listAreaTypes,
} from '../../lib/facilities';
import type {
  Facility,
  Area,
  AreaType,
  UpdateFacilityInput,
  CreateAreaInput,
  UpdateAreaInput,
} from '../../types/facility';

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

const CONDITION_LEVELS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const FacilityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const [facilityForm, setFacilityForm] = useState<UpdateFacilityInput>({});
  const [areaForm, setAreaForm] = useState<CreateAreaInput | UpdateAreaInput>({
    facilityId: id || '',
    areaTypeId: '',
    name: '',
    quantity: 1,
    squareFeet: null,
    conditionLevel: 'good',
    notes: null,
  });

  const fetchFacility = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getFacility(id);
      setFacility(data);
      setFacilityForm({
        name: data.name,
        address: data.address,
        buildingType: data.buildingType,
        squareFeet: data.squareFeet ? Number(data.squareFeet) : null,
        status: data.status,
        notes: data.notes,
        accessInstructions: data.accessInstructions,
        parkingInfo: data.parkingInfo,
        specialRequirements: data.specialRequirements,
      });
    } catch (error) {
      console.error('Failed to fetch facility:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAreas = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listAreas({
        facilityId: id,
        includeArchived: true,
      });
      setAreas(response.data);
    } catch (error) {
      console.error('Failed to fetch areas:', error);
    }
  }, [id]);

  const fetchAreaTypes = useCallback(async () => {
    try {
      const response = await listAreaTypes({ limit: 100 });
      setAreaTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch area types:', error);
    }
  }, []);

  useEffect(() => {
    fetchFacility();
    fetchAreas();
    fetchAreaTypes();
  }, [fetchFacility, fetchAreas, fetchAreaTypes]);

  const handleUpdateFacility = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateFacility(id, facilityForm);
      setShowEditModal(false);
      fetchFacility();
    } catch (error) {
      console.error('Failed to update facility:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveArea = async () => {
    if (!id) return;
    try {
      setSaving(true);
      if (editingArea) {
        await updateArea(editingArea.id, areaForm as UpdateAreaInput);
      } else {
        await createArea({ ...areaForm, facilityId: id } as CreateAreaInput);
      }
      setShowAreaModal(false);
      setEditingArea(null);
      resetAreaForm();
      fetchAreas();
    } catch (error) {
      console.error('Failed to save area:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveArea = async (areaId: string) => {
    try {
      await archiveArea(areaId);
      fetchAreas();
    } catch (error) {
      console.error('Failed to archive area:', error);
    }
  };

  const handleRestoreArea = async (areaId: string) => {
    try {
      await restoreArea(areaId);
      fetchAreas();
    } catch (error) {
      console.error('Failed to restore area:', error);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm('Are you sure you want to permanently delete this area?'))
      return;
    try {
      await deleteArea(areaId);
      fetchAreas();
    } catch (error) {
      console.error('Failed to delete area:', error);
    }
  };

  const resetAreaForm = () => {
    setAreaForm({
      facilityId: id || '',
      areaTypeId: '',
      name: '',
      quantity: 1,
      squareFeet: null,
      conditionLevel: 'good',
      notes: null,
    });
  };

  const openEditArea = (area: Area) => {
    setEditingArea(area);
    setAreaForm({
      areaTypeId: area.areaType.id,
      name: area.name,
      quantity: area.quantity,
      squareFeet: area.squareFeet ? Number(area.squareFeet) : null,
      conditionLevel: area.conditionLevel,
      notes: area.notes,
    });
    setShowAreaModal(true);
  };

  const formatAddress = (address: Facility['address']) => {
    const lines = [];
    if (address.street) lines.push(address.street);
    const cityLine = [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(', ');
    if (cityLine) lines.push(cityLine);
    if (address.country) lines.push(address.country);
    return lines.length > 0 ? lines.join('\n') : 'No address';
  };

  const areaColumns = [
    {
      header: 'Area',
      cell: (item: Area) => (
        <div>
          <div className="font-medium text-white">
            {item.name || item.areaType.name}
          </div>
          <div className="text-sm text-gray-400">
            {item.areaType.name} {item.quantity > 1 && `(x${item.quantity})`}
          </div>
        </div>
      ),
    },
    {
      header: 'Size',
      cell: (item: Area) => (
        <div className="flex items-center gap-2 text-gray-300">
          <Ruler className="h-4 w-4 text-gray-500" />
          {item.squareFeet
            ? `${Number(item.squareFeet).toLocaleString()} sq ft`
            : '-'}
        </div>
      ),
    },
    {
      header: 'Est. Time',
      cell: (item: Area) => (
        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="h-4 w-4 text-gray-500" />
          {item.areaType.baseCleaningTimeMinutes
            ? `${item.areaType.baseCleaningTimeMinutes * item.quantity} min`
            : '-'}
        </div>
      ),
    },
    {
      header: 'Condition',
      cell: (item: Area) => (
        <Badge
          variant={
            item.conditionLevel === 'excellent'
              ? 'success'
              : item.conditionLevel === 'good'
                ? 'info'
                : item.conditionLevel === 'fair'
                  ? 'warning'
                  : 'error'
          }
        >
          {item.conditionLevel}
        </Badge>
      ),
    },
    {
      header: 'Status',
      cell: (item: Area) => (
        <Badge variant={item.archivedAt ? 'error' : 'success'}>
          {item.archivedAt ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: Area) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditArea(item);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {item.archivedAt ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestoreArea(item.id);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteArea(item.id);
                }}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleArchiveArea(item.id);
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
      </div>
    );
  }

  if (!facility) {
    return <div className="text-center text-gray-400">Facility not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/facilities')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{facility.name}</h1>
          <p className="text-gray-400">{facility.account.name}</p>
        </div>
        <Button variant="secondary" onClick={() => setShowEditModal(true)}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Facility
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10">
                <Building2 className="h-6 w-6 text-emerald" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Building Type</div>
                <div className="font-medium capitalize text-white">
                  {facility.buildingType || 'Not specified'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
                <MapPin className="h-6 w-6 text-gold" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Address</div>
                <div className="whitespace-pre-line font-medium text-white">
                  {formatAddress(facility.address)}
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Square Feet</div>
                  <div className="font-medium text-white">
                    {facility.squareFeet
                      ? Number(facility.squareFeet).toLocaleString()
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Status</div>
                  <Badge
                    variant={
                      facility.archivedAt
                        ? 'error'
                        : facility.status === 'active'
                          ? 'success'
                          : facility.status === 'pending'
                            ? 'warning'
                            : 'default'
                    }
                  >
                    {facility.archivedAt ? 'Archived' : facility.status}
                  </Badge>
                </div>
              </div>
            </div>

            {(facility.accessInstructions ||
              facility.parkingInfo ||
              facility.specialRequirements) && (
              <div className="space-y-3 border-t border-white/10 pt-4">
                {facility.accessInstructions && (
                  <div>
                    <div className="text-sm text-gray-400">
                      Access Instructions
                    </div>
                    <div className="text-sm text-white">
                      {facility.accessInstructions}
                    </div>
                  </div>
                )}
                {facility.parkingInfo && (
                  <div>
                    <div className="text-sm text-gray-400">Parking Info</div>
                    <div className="text-sm text-white">
                      {facility.parkingInfo}
                    </div>
                  </div>
                )}
                {facility.specialRequirements && (
                  <div>
                    <div className="text-sm text-gray-400">
                      Special Requirements
                    </div>
                    <div className="text-sm text-white">
                      {facility.specialRequirements}
                    </div>
                  </div>
                )}
              </div>
            )}

            {facility.notes && (
              <div className="border-t border-white/10 pt-4">
                <div className="text-sm text-gray-400">Notes</div>
                <div className="text-sm text-white">{facility.notes}</div>
              </div>
            )}
          </div>
        </Card>

        <Card noPadding className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 bg-navy-dark/30 p-4">
            <h2 className="text-lg font-semibold text-white">
              Areas ({areas.filter((a) => !a.archivedAt).length})
            </h2>
            <Button
              size="sm"
              onClick={() => {
                resetAreaForm();
                setEditingArea(null);
                setShowAreaModal(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Area
            </Button>
          </div>

          <Table data={areas} columns={areaColumns} />
        </Card>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Facility"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Facility Name"
            value={facilityForm.name || ''}
            onChange={(e) =>
              setFacilityForm({ ...facilityForm, name: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Street Address"
              value={facilityForm.address?.street || ''}
              onChange={(e) =>
                setFacilityForm({
                  ...facilityForm,
                  address: { ...facilityForm.address, street: e.target.value },
                })
              }
            />
            <Input
              label="City"
              value={facilityForm.address?.city || ''}
              onChange={(e) =>
                setFacilityForm({
                  ...facilityForm,
                  address: { ...facilityForm.address, city: e.target.value },
                })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="State/Province"
              value={facilityForm.address?.state || ''}
              onChange={(e) =>
                setFacilityForm({
                  ...facilityForm,
                  address: { ...facilityForm.address, state: e.target.value },
                })
              }
            />
            <Input
              label="Postal Code"
              value={facilityForm.address?.postalCode || ''}
              onChange={(e) =>
                setFacilityForm({
                  ...facilityForm,
                  address: {
                    ...facilityForm.address,
                    postalCode: e.target.value,
                  },
                })
              }
            />
            <Input
              label="Country"
              value={facilityForm.address?.country || ''}
              onChange={(e) =>
                setFacilityForm({
                  ...facilityForm,
                  address: { ...facilityForm.address, country: e.target.value },
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Building Type"
              options={BUILDING_TYPES}
              value={facilityForm.buildingType || ''}
              onChange={(value) =>
                setFacilityForm({
                  ...facilityForm,
                  buildingType: value || null,
                })
              }
            />
            <Input
              label="Square Feet"
              type="number"
              value={facilityForm.squareFeet || ''}
              onChange={(e) =>
                setFacilityForm({
                  ...facilityForm,
                  squareFeet: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>

          <Textarea
            label="Access Instructions"
            value={facilityForm.accessInstructions || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                accessInstructions: e.target.value || null,
              })
            }
          />

          <Textarea
            label="Parking Info"
            value={facilityForm.parkingInfo || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                parkingInfo: e.target.value || null,
              })
            }
          />

          <Textarea
            label="Special Requirements"
            value={facilityForm.specialRequirements || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                specialRequirements: e.target.value || null,
              })
            }
          />

          <Textarea
            label="Notes"
            value={facilityForm.notes || ''}
            onChange={(e) =>
              setFacilityForm({
                ...facilityForm,
                notes: e.target.value || null,
              })
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFacility} isLoading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAreaModal}
        onClose={() => {
          setShowAreaModal(false);
          setEditingArea(null);
          resetAreaForm();
        }}
        title={editingArea ? 'Edit Area' : 'Add Area'}
      >
        <div className="space-y-4">
          <Select
            label="Area Type"
            placeholder="Select area type"
            options={areaTypes.map((at) => ({ value: at.id, label: at.name }))}
            value={(areaForm as CreateAreaInput).areaTypeId || ''}
            onChange={(value) =>
              setAreaForm({ ...areaForm, areaTypeId: value })
            }
          />

          <Input
            label="Custom Name (optional)"
            placeholder="Leave blank to use area type name"
            value={areaForm.name || ''}
            onChange={(e) =>
              setAreaForm({ ...areaForm, name: e.target.value || null })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={areaForm.quantity || 1}
              onChange={(e) =>
                setAreaForm({
                  ...areaForm,
                  quantity: Number(e.target.value) || 1,
                })
              }
            />
            <Input
              label="Square Feet"
              type="number"
              placeholder="Total for all"
              value={areaForm.squareFeet || ''}
              onChange={(e) =>
                setAreaForm({
                  ...areaForm,
                  squareFeet: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>

          <Select
            label="Condition Level"
            options={CONDITION_LEVELS}
            value={areaForm.conditionLevel || 'good'}
            onChange={(value) =>
              setAreaForm({
                ...areaForm,
                conditionLevel: value as 'excellent' | 'good' | 'fair' | 'poor',
              })
            }
          />

          <Textarea
            label="Notes"
            value={areaForm.notes || ''}
            onChange={(e) =>
              setAreaForm({ ...areaForm, notes: e.target.value || null })
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAreaModal(false);
                setEditingArea(null);
                resetAreaForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveArea}
              isLoading={saving}
              disabled={!(areaForm as CreateAreaInput).areaTypeId}
            >
              {editingArea ? 'Save Changes' : 'Add Area'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FacilityDetail;
