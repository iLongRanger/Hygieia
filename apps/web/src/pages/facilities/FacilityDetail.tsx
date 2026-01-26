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
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  listFacilityTasks,
  createFacilityTask,
  updateFacilityTask,
  deleteFacilityTask,
  listTaskTemplates,
} from '../../lib/facilities';
import type {
  Facility,
  Area,
  AreaType,
  UpdateFacilityInput,
  CreateAreaInput,
  UpdateAreaInput,
  FacilityTask,
  CreateFacilityTaskInput,
  UpdateFacilityTaskInput,
  TaskTemplate,
  CleaningFrequency,
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
  { value: 'standard', label: 'Standard' },
  { value: 'medium', label: 'Medium Difficulty' },
  { value: 'hard', label: 'Hard/Heavy Traffic' },
];

const FLOOR_TYPES = [
  { value: 'vct', label: 'VCT (Vinyl Composition Tile)' },
  { value: 'carpet', label: 'Carpet' },
  { value: 'hardwood', label: 'Hardwood' },
  { value: 'tile', label: 'Ceramic/Porcelain Tile' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'epoxy', label: 'Epoxy' },
];

const CLEANING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Yearly' },
  { value: 'as_needed', label: 'As Needed' },
];

const FacilityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [tasks, setTasks] = useState<FacilityTask[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingTask, setEditingTask] = useState<FacilityTask | null>(null);
  const [selectedAreaForTask, setSelectedAreaForTask] = useState<Area | null>(
    null
  );
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [facilityForm, setFacilityForm] = useState<UpdateFacilityInput>({});
  const [areaForm, setAreaForm] = useState<CreateAreaInput | UpdateAreaInput>({
    facilityId: id || '',
    areaTypeId: '',
    name: '',
    quantity: 1,
    squareFeet: null,
    floorType: 'vct',
    conditionLevel: 'standard',
    notes: null,
  });
  const [taskForm, setTaskForm] = useState<
    CreateFacilityTaskInput | UpdateFacilityTaskInput
  >({
    facilityId: id || '',
    areaId: null,
    taskTemplateId: null,
    customName: '',
    cleaningFrequency: 'daily',
    priority: 3,
  });

  const fetchFacility = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getFacility(id);
      if (data) {
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
      }
    } catch (error) {
      console.error('Failed to fetch facility:', error);
      setFacility(null);
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
      setAreas(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch areas:', error);
      setAreas([]);
    }
  }, [id]);

  const fetchAreaTypes = useCallback(async () => {
    try {
      const response = await listAreaTypes({ limit: 100 });
      setAreaTypes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch area types:', error);
      setAreaTypes([]);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listFacilityTasks({
        facilityId: id,
        limit: 100,
      });
      setTasks(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setTasks([]);
    }
  }, [id]);

  const fetchTaskTemplates = useCallback(async () => {
    try {
      const response = await listTaskTemplates({ isActive: true, limit: 100 });
      setTaskTemplates(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch task templates:', error);
      setTaskTemplates([]);
    }
  }, []);

  useEffect(() => {
    fetchFacility();
    fetchAreas();
    fetchAreaTypes();
    fetchTasks();
    fetchTaskTemplates();
  }, [
    fetchFacility,
    fetchAreas,
    fetchAreaTypes,
    fetchTasks,
    fetchTaskTemplates,
  ]);

  // Calculate total square feet from all active areas
  const totalSquareFeetFromAreas = areas
    .filter((area) => !area.archivedAt)
    .reduce((sum, area) => {
      const sqFt = Number(area.squareFeet) || 0;
      const qty = area.quantity || 1;
      return sum + sqFt * qty;
    }, 0);

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
      floorType: 'vct',
      conditionLevel: 'standard',
      notes: null,
    });
  };

  const resetTaskForm = () => {
    setTaskForm({
      facilityId: id || '',
      areaId: null,
      taskTemplateId: null,
      customName: '',
      cleaningFrequency: 'daily',
      priority: 3,
    });
  };

  const handleSaveTask = async () => {
    if (!id) return;
    try {
      setSaving(true);
      if (editingTask) {
        await updateFacilityTask(
          editingTask.id,
          taskForm as UpdateFacilityTaskInput
        );
        toast.success('Task updated');
      } else {
        await createFacilityTask({
          ...taskForm,
          facilityId: id,
          areaId: selectedAreaForTask?.id || null,
        } as CreateFacilityTaskInput);
        toast.success('Task added');
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setSelectedAreaForTask(null);
      resetTaskForm();
      fetchTasks();
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteFacilityTask(taskId);
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  const openAddTaskForArea = (area: Area) => {
    setSelectedAreaForTask(area);
    setEditingTask(null);
    resetTaskForm();
    setTaskForm((prev) => ({
      ...prev,
      areaId: area.id,
    }));
    setShowTaskModal(true);
  };

  const openEditTask = (task: FacilityTask) => {
    setEditingTask(task);
    setSelectedAreaForTask(
      task.area ? areas.find((a) => a.id === task.area?.id) || null : null
    );
    setTaskForm({
      areaId: task.area?.id || null,
      taskTemplateId: task.taskTemplate?.id || null,
      customName: task.customName || '',
      customInstructions: task.customInstructions || '',
      estimatedMinutes: task.estimatedMinutes,
      cleaningFrequency: task.cleaningFrequency,
      priority: task.priority,
    });
    setShowTaskModal(true);
  };

  const toggleAreaExpanded = (areaId: string) => {
    setExpandedAreas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(areaId)) {
        newSet.delete(areaId);
      } else {
        newSet.add(areaId);
      }
      return newSet;
    });
  };

  // Group tasks by area
  const getTasksForArea = (areaId: string) => {
    return tasks.filter((t) => t.area?.id === areaId && !t.archivedAt);
  };

  // Group tasks by frequency for display
  const groupTasksByFrequency = (areaTasks: FacilityTask[]) => {
    const grouped: Record<string, FacilityTask[]> = {};
    for (const task of areaTasks) {
      const freq = task.cleaningFrequency;
      if (!grouped[freq]) {
        grouped[freq] = [];
      }
      grouped[freq].push(task);
    }
    return grouped;
  };

  const openEditArea = (area: Area) => {
    setEditingArea(area);
    setAreaForm({
      areaTypeId: area.areaType.id,
      name: area.name,
      quantity: area.quantity,
      squareFeet: area.squareFeet ? Number(area.squareFeet) : null,
      floorType: area.floorType || 'vct',
      conditionLevel: area.conditionLevel || 'standard',
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
      header: 'Floor Type',
      cell: (item: Area) => {
        const floorType = item.floorType || 'vct';
        const floorLabel =
          FLOOR_TYPES.find((f) => f.value === floorType)?.label || floorType;
        return <span className="text-gray-300 capitalize">{floorLabel}</span>;
      },
    },
    {
      header: 'Condition',
      cell: (item: Area) => (
        <Badge
          variant={
            item.conditionLevel === 'standard'
              ? 'success'
              : item.conditionLevel === 'medium'
                ? 'warning'
                : 'error'
          }
        >
          {CONDITION_LEVELS.find((c) => c.value === item.conditionLevel)
            ?.label || item.conditionLevel}
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
                  <div className="text-sm text-gray-400">Total Square Feet</div>
                  <div className="font-medium text-white">
                    {totalSquareFeetFromAreas > 0
                      ? totalSquareFeetFromAreas.toLocaleString()
                      : '-'}
                    {totalSquareFeetFromAreas > 0 && (
                      <span className="text-xs text-gray-500 ml-1">(from {areas.filter(a => !a.archivedAt).length} areas)</span>
                    )}
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

      {/* Tasks Section - Grouped by Area */}
      <Card noPadding className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-emerald" />
            <h2 className="text-lg font-semibold text-white">
              Tasks by Area ({tasks.filter((t) => !t.archivedAt).length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {areas.filter((a) => !a.archivedAt).length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Add areas to start managing tasks
            </div>
          ) : (
            areas
              .filter((a) => !a.archivedAt)
              .map((area) => {
                const areaTasks = getTasksForArea(area.id);
                const tasksByFreq = groupTasksByFrequency(areaTasks);
                const isExpanded = expandedAreas.has(area.id);

                return (
                  <div key={area.id} className="bg-navy-dark/20">
                    {/* Area Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => toggleAreaExpanded(area.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="font-medium text-white">
                            {area.name || area.areaType.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {areaTasks.length} task
                            {areaTasks.length !== 1 ? 's' : ''}
                            {area.squareFeet &&
                              ` • ${Number(area.squareFeet).toLocaleString()} sq ft`}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddTaskForArea(area);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add Task
                      </Button>
                    </div>

                    {/* Expanded Tasks List */}
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-navy-darker/50 px-4 pb-4">
                        {areaTasks.length === 0 ? (
                          <div className="py-6 text-center text-gray-500">
                            No tasks assigned to this area yet
                          </div>
                        ) : (
                          <div className="space-y-4 pt-4">
                            {CLEANING_FREQUENCIES.map(
                              ({ value: freq, label: freqLabel }) => {
                                const freqTasks = tasksByFreq[freq] || [];
                                if (freqTasks.length === 0) return null;

                                return (
                                  <div key={freq}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge
                                        variant="default"
                                        className="text-xs"
                                      >
                                        {freqLabel}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        ({freqTasks.length})
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {freqTasks.map((task) => (
                                        <div
                                          key={task.id}
                                          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 group"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="text-white">
                                              {task.customName ||
                                                task.taskTemplate?.name ||
                                                'Unnamed Task'}
                                            </span>
                                            {task.estimatedMinutes && (
                                              <span className="text-xs text-gray-500">
                                                ({task.estimatedMinutes} min)
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openEditTask(task)}
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleDeleteTask(task.id)
                                              }
                                              className="text-red-400 hover:text-red-300"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </Card>

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

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Floor Type"
              options={FLOOR_TYPES}
              value={areaForm.floorType || 'vct'}
              onChange={(value) =>
                setAreaForm({
                  ...areaForm,
                  floorType: value as any,
                })
              }
            />
            <Select
              label="Condition Level"
              options={CONDITION_LEVELS}
              value={areaForm.conditionLevel || 'standard'}
              onChange={(value) =>
                setAreaForm({
                  ...areaForm,
                  conditionLevel: value as 'standard' | 'medium' | 'hard',
                })
              }
            />
          </div>

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

      {/* Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
          setSelectedAreaForTask(null);
          resetTaskForm();
        }}
        title={
          editingTask
            ? 'Edit Task'
            : `Add Task${selectedAreaForTask ? ` - ${selectedAreaForTask.name || selectedAreaForTask.areaType.name}` : ''}`
        }
      >
        <div className="space-y-4">
          {/* Task Template or Custom */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-200">
              Task Source
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`rounded-lg border p-3 text-left transition-colors ${
                  !taskForm.taskTemplateId
                    ? 'border-emerald bg-emerald/10 text-white'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
                onClick={() =>
                  setTaskForm({ ...taskForm, taskTemplateId: null })
                }
              >
                <div className="font-medium">Custom Task</div>
                <div className="text-xs text-gray-500">
                  Enter task name manually
                </div>
              </button>
              <button
                type="button"
                className={`rounded-lg border p-3 text-left transition-colors ${
                  taskForm.taskTemplateId
                    ? 'border-emerald bg-emerald/10 text-white'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
                onClick={() =>
                  setTaskForm({
                    ...taskForm,
                    taskTemplateId: taskTemplates[0]?.id || null,
                    customName: '',
                  })
                }
              >
                <div className="font-medium">From Template</div>
                <div className="text-xs text-gray-500">
                  Select predefined task
                </div>
              </button>
            </div>
          </div>

          {taskForm.taskTemplateId ? (
            <Select
              label="Task Template"
              placeholder="Select a task template"
              options={taskTemplates.map((tt) => ({
                value: tt.id,
                label: `${tt.name} (${tt.cleaningType})`,
              }))}
              value={taskForm.taskTemplateId || ''}
              onChange={(value) =>
                setTaskForm({ ...taskForm, taskTemplateId: value || null })
              }
            />
          ) : (
            <Input
              label="Task Name"
              placeholder="e.g., Vacuum floors, Empty trash"
              value={taskForm.customName || ''}
              onChange={(e) =>
                setTaskForm({ ...taskForm, customName: e.target.value })
              }
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Frequency"
              options={CLEANING_FREQUENCIES}
              value={taskForm.cleaningFrequency || 'daily'}
              onChange={(value) =>
                setTaskForm({
                  ...taskForm,
                  cleaningFrequency: value as CleaningFrequency,
                })
              }
            />
            <Input
              label="Est. Minutes"
              type="number"
              placeholder="Optional"
              value={taskForm.estimatedMinutes || ''}
              onChange={(e) =>
                setTaskForm({
                  ...taskForm,
                  estimatedMinutes: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </div>

          <Select
            label="Priority"
            options={[
              { value: '1', label: '1 - Highest' },
              { value: '2', label: '2 - High' },
              { value: '3', label: '3 - Normal' },
              { value: '4', label: '4 - Low' },
              { value: '5', label: '5 - Lowest' },
            ]}
            value={String(taskForm.priority || 3)}
            onChange={(value) =>
              setTaskForm({ ...taskForm, priority: Number(value) })
            }
          />

          <Textarea
            label="Instructions (optional)"
            placeholder="Special instructions for this task..."
            value={
              (taskForm as UpdateFacilityTaskInput).customInstructions || ''
            }
            onChange={(e) =>
              setTaskForm({
                ...taskForm,
                customInstructions: e.target.value || null,
              } as UpdateFacilityTaskInput)
            }
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTaskModal(false);
                setEditingTask(null);
                setSelectedAreaForTask(null);
                resetTaskForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTask}
              isLoading={saving}
              disabled={!taskForm.taskTemplateId && !taskForm.customName}
            >
              {editingTask ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FacilityDetail;
