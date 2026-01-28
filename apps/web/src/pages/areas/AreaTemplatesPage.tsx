import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  LayoutTemplate,
  Box,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  listAreaTypes,
  createAreaType,
  updateAreaType,
  deleteAreaType,
  listFixtureTypes,
  createFixtureType,
  updateFixtureType,
  deleteFixtureType,
  listAreaTemplates,
  createAreaTemplate,
  updateAreaTemplate,
  deleteAreaTemplate,
} from '../../lib/facilities';
import type {
  AreaType,
  FixtureType,
  AreaTemplate,
  CreateAreaTemplateInput,
} from '../../types/facility';

type TemplateItemInput = NonNullable<CreateAreaTemplateInput['items']>[0];
type TemplateTaskInput = NonNullable<CreateAreaTemplateInput['tasks']>[0];

const ITEM_CATEGORIES = [
  { value: 'fixture', label: 'Fixture' },
  { value: 'furniture', label: 'Furniture' },
];

const AreaTemplatesPage = () => {
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [fixtureTypes, setFixtureTypes] = useState<FixtureType[]>([]);
  const [areaTemplates, setAreaTemplates] = useState<AreaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);

  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({
    id: '',
    name: '',
    description: '',
    category: 'fixture',
    defaultMinutesPerItem: 0,
    isActive: true,
  });
  const [itemSaving, setItemSaving] = useState(false);
  const [itemDeleteId, setItemDeleteId] = useState<string | null>(null);

  const [areaTypesLoading, setAreaTypesLoading] = useState(false);
  const [showAreaTypeModal, setShowAreaTypeModal] = useState(false);
  const [areaTypeForm, setAreaTypeForm] = useState({
    id: '',
    name: '',
    description: '',
    defaultSquareFeet: 0,
    baseCleaningTimeMinutes: 0,
  });
  const [areaTypeSaving, setAreaTypeSaving] = useState(false);
  const [areaTypeDeleteId, setAreaTypeDeleteId] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<AreaTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<CreateAreaTemplateInput>({
    areaTypeId: '',
    name: '',
    defaultSquareFeet: null,
    items: [],
    tasks: [],
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDeleteId, setTemplateDeleteId] = useState<string | null>(null);

  const fetchAreaTypes = useCallback(async () => {
    try {
      setAreaTypesLoading(true);
      const response = await listAreaTypes({ limit: 100 });
      setAreaTypes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch area types:', error);
      setAreaTypes([]);
    } finally {
      setAreaTypesLoading(false);
    }
  }, []);

  const fetchFixtureTypes = useCallback(async () => {
    try {
      setLoadingItems(true);
      const response = await listFixtureTypes({ limit: 100 });
      setFixtureTypes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch item types:', error);
      setFixtureTypes([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const fetchAreaTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const response = await listAreaTemplates({ limit: 100 });
      setAreaTemplates(response?.data || []);
      if (!selectedTemplate && response?.data?.length) {
        setSelectedTemplate(response.data[0]);
        hydrateTemplateForm(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch area templates:', error);
      setAreaTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    fetchAreaTypes();
    fetchFixtureTypes();
    fetchAreaTemplates();
  }, [fetchAreaTypes, fetchFixtureTypes, fetchAreaTemplates]);

  const hydrateTemplateForm = (template: AreaTemplate) => {
    setTemplateForm({
      areaTypeId: template.areaType.id,
      name: template.name || '',
      defaultSquareFeet: template.defaultSquareFeet ? Number(template.defaultSquareFeet) : null,
      items: template.items.map((item) => ({
        fixtureTypeId: item.fixtureType.id,
        defaultCount: item.defaultCount,
        minutesPerItem: Number(item.minutesPerItem) || 0,
        sortOrder: item.sortOrder,
      })),
      tasks: template.tasks.map((task) => ({
        name: task.name,
        baseMinutes: Number(task.baseMinutes) || 0,
        perSqftMinutes: Number(task.perSqftMinutes) || 0,
        perUnitMinutes: Number(task.perUnitMinutes) || 0,
        perRoomMinutes: Number(task.perRoomMinutes) || 0,
        sortOrder: task.sortOrder,
      })),
    });
  };

  const resetTemplateForm = () => {
    setSelectedTemplate(null);
    setTemplateForm({
      areaTypeId: '',
      name: '',
      defaultSquareFeet: null,
      items: [],
      tasks: [],
    });
  };

  const openCreateItemModal = () => {
    setItemForm({
      id: '',
      name: '',
      description: '',
      category: 'fixture',
      defaultMinutesPerItem: 0,
      isActive: true,
    });
    setShowItemModal(true);
  };

  const openCreateAreaTypeModal = () => {
    setAreaTypeForm({
      id: '',
      name: '',
      description: '',
      defaultSquareFeet: 0,
      baseCleaningTimeMinutes: 0,
    });
    setShowAreaTypeModal(true);
  };

  const openEditAreaTypeModal = (areaType: AreaType) => {
    setAreaTypeForm({
      id: areaType.id,
      name: areaType.name,
      description: areaType.description || '',
      defaultSquareFeet: areaType.defaultSquareFeet ? Number(areaType.defaultSquareFeet) : 0,
      baseCleaningTimeMinutes: areaType.baseCleaningTimeMinutes || 0,
    });
    setShowAreaTypeModal(true);
  };

  const handleSaveAreaType = async () => {
    if (!areaTypeForm.name.trim()) {
      toast.error('Please enter an area type name');
      return;
    }

    try {
      setAreaTypeSaving(true);
      if (areaTypeForm.id) {
        await updateAreaType(areaTypeForm.id, {
          name: areaTypeForm.name.trim(),
          description: areaTypeForm.description || null,
          defaultSquareFeet: areaTypeForm.defaultSquareFeet || null,
          baseCleaningTimeMinutes: areaTypeForm.baseCleaningTimeMinutes || null,
        });
        toast.success('Area type updated');
      } else {
        await createAreaType({
          name: areaTypeForm.name.trim(),
          description: areaTypeForm.description || null,
          defaultSquareFeet: areaTypeForm.defaultSquareFeet || null,
          baseCleaningTimeMinutes: areaTypeForm.baseCleaningTimeMinutes || null,
        });
        toast.success('Area type created');
      }
      setShowAreaTypeModal(false);
      await fetchAreaTypes();
    } catch (error) {
      console.error('Failed to save area type:', error);
      toast.error('Failed to save area type');
    } finally {
      setAreaTypeSaving(false);
    }
  };

  const handleDeleteAreaType = async () => {
    if (!areaTypeDeleteId) return;
    try {
      await deleteAreaType(areaTypeDeleteId);
      toast.success('Area type deleted');
      setAreaTypeDeleteId(null);
      await fetchAreaTypes();
    } catch (error) {
      console.error('Failed to delete area type:', error);
      toast.error('Failed to delete area type');
    }
  };

  const openEditItemModal = (item: FixtureType) => {
    setItemForm({
      id: item.id,
      name: item.name,
      description: item.description || '',
      category: item.category,
      defaultMinutesPerItem: Number(item.defaultMinutesPerItem) || 0,
      isActive: item.isActive,
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) {
      toast.error('Please enter an item type name');
      return;
    }

    try {
      setItemSaving(true);
      if (itemForm.id) {
        await updateFixtureType(itemForm.id, {
          name: itemForm.name.trim(),
          description: itemForm.description || null,
          category: itemForm.category as 'fixture' | 'furniture',
          defaultMinutesPerItem: itemForm.defaultMinutesPerItem,
          isActive: itemForm.isActive,
        });
        toast.success('Item type updated');
      } else {
        await createFixtureType({
          name: itemForm.name.trim(),
          description: itemForm.description || null,
          category: itemForm.category as 'fixture' | 'furniture',
          defaultMinutesPerItem: itemForm.defaultMinutesPerItem,
          isActive: itemForm.isActive,
        });
        toast.success('Item type created');
      }
      setShowItemModal(false);
      await fetchFixtureTypes();
    } catch (error) {
      console.error('Failed to save item type:', error);
      toast.error('Failed to save item type');
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemDeleteId) return;
    try {
      await deleteFixtureType(itemDeleteId);
      toast.success('Item type deleted');
      setItemDeleteId(null);
      await fetchFixtureTypes();
    } catch (error) {
      console.error('Failed to delete item type:', error);
      toast.error('Failed to delete item type');
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.areaTypeId) {
      toast.error('Select an area type');
      return;
    }
    const hasEmptyTask = (templateForm.tasks || []).some((task) => !task.name?.trim());
    if (hasEmptyTask) {
      toast.error('All tasks must have a name');
      return;
    }

    try {
      setTemplateSaving(true);
      if (selectedTemplate) {
        const updated = await updateAreaTemplate(selectedTemplate.id, templateForm);
        toast.success('Area template updated');
        setSelectedTemplate(updated);
        hydrateTemplateForm(updated);
      } else {
        const created = await createAreaTemplate(templateForm);
        toast.success('Area template created');
        setSelectedTemplate(created);
        hydrateTemplateForm(created);
      }
      await fetchAreaTemplates();
    } catch (error) {
      console.error('Failed to save area template:', error);
      toast.error('Failed to save area template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateDeleteId) return;
    try {
      await deleteAreaTemplate(templateDeleteId);
      toast.success('Area template deleted');
      setTemplateDeleteId(null);
      resetTemplateForm();
      await fetchAreaTemplates();
    } catch (error) {
      console.error('Failed to delete area template:', error);
      toast.error('Failed to delete area template');
    }
  };

  const addTemplateItemRow = () => {
    const defaultType = fixtureTypes[0];
    if (!defaultType) {
      toast.error('Create an item type first');
      return;
    }
    setTemplateForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          fixtureTypeId: defaultType.id,
          defaultCount: 1,
          minutesPerItem: Number(defaultType.defaultMinutesPerItem) || 0,
          sortOrder: (prev.items?.length || 0) + 1,
        },
      ],
    }));
  };

  const updateTemplateItem = (index: number, patch: Partial<TemplateItemInput>) => {
    setTemplateForm((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  };

  const removeTemplateItem = (index: number) => {
    setTemplateForm((prev) => {
      const items = [...(prev.items || [])];
      items.splice(index, 1);
      return { ...prev, items };
    });
  };

  const addTemplateTaskRow = () => {
    setTemplateForm((prev) => ({
      ...prev,
      tasks: [
        ...(prev.tasks || []),
        {
          name: '',
          baseMinutes: 0,
          perSqftMinutes: 0,
          perUnitMinutes: 0,
          perRoomMinutes: 0,
          sortOrder: (prev.tasks?.length || 0) + 1,
        },
      ],
    }));
  };

  const updateTemplateTask = (index: number, patch: Partial<TemplateTaskInput>) => {
    setTemplateForm((prev) => {
      const tasks = [...(prev.tasks || [])];
      tasks[index] = { ...tasks[index], ...patch };
      return { ...prev, tasks };
    });
  };

  const removeTemplateTask = (index: number) => {
    setTemplateForm((prev) => {
      const tasks = [...(prev.tasks || [])];
      tasks.splice(index, 1);
      return { ...prev, tasks };
    });
  };

  const itemColumns = [
    {
      header: 'Item Type',
      cell: (item: FixtureType) => (
        <div>
          <div className="font-medium text-white">{item.name}</div>
          <div className="text-xs text-gray-500">{item.description || 'No description'}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      cell: (item: FixtureType) => (
        <Badge variant="default">{item.category}</Badge>
      ),
    },
    {
      header: 'Minutes/Item',
      cell: (item: FixtureType) => (
        <span className="text-gray-300">{Number(item.defaultMinutesPerItem).toFixed(2)}</span>
      ),
    },
    {
      header: 'Status',
      cell: (item: FixtureType) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (item: FixtureType) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditItemModal(item);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await updateFixtureType(item.id, { isActive: !item.isActive });
                toast.success(item.isActive ? 'Item type deactivated' : 'Item type activated');
                fetchFixtureTypes();
              } catch (error) {
                console.error('Failed to toggle item type:', error);
                toast.error('Failed to update item type');
              }
            }}
            title={item.isActive ? 'Deactivate' : 'Activate'}
          >
            {item.isActive ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setItemDeleteId(item.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const areaTypeColumns = [
    {
      header: 'Area Type',
      cell: (item: AreaType) => (
        <div>
          <div className="font-medium text-white">{item.name}</div>
          <div className="text-xs text-gray-500">{item.description || 'No description'}</div>
        </div>
      ),
    },
    {
      header: 'Default Sq Ft',
      cell: (item: AreaType) => (
        <span className="text-gray-300">
          {item.defaultSquareFeet ? Number(item.defaultSquareFeet).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      header: 'Base Minutes',
      cell: (item: AreaType) => (
        <span className="text-gray-300">
          {item.baseCleaningTimeMinutes ?? '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (item: AreaType) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditAreaTypeModal(item);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setAreaTypeDeleteId(item.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutTemplate className="h-6 w-6 text-emerald" />
        <div>
          <h1 className="text-2xl font-bold text-white">Area Templates</h1>
          <p className="text-gray-400">Configure default tasks and items for each area type.</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Box className="h-5 w-5 text-orange-400" />
            Item Types
          </div>
          <Button onClick={openCreateItemModal}>
            <Plus className="mr-2 h-4 w-4" />
            New Item Type
          </Button>
        </div>
        <div className="mt-4">
          <Table data={fixtureTypes} columns={itemColumns} isLoading={loadingItems} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <LayoutTemplate className="h-5 w-5 text-emerald" />
            Area Types
          </div>
          <Button onClick={openCreateAreaTypeModal}>
            <Plus className="mr-2 h-4 w-4" />
            New Area Type
          </Button>
        </div>
        <div className="mt-4">
          <Table data={areaTypes} columns={areaTypeColumns} isLoading={areaTypesLoading} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card noPadding className="overflow-hidden xl:col-span-1">
          <div className="border-b border-white/10 bg-navy-dark/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Templates</h3>
              <Button variant="secondary" size="sm" onClick={resetTemplateForm}>
                New
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loadingTemplates ? (
              <div className="p-4 text-sm text-gray-500">Loading templates...</div>
            ) : areaTemplates.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No templates yet.</div>
            ) : (
              areaTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`cursor-pointer border-b border-white/5 p-4 transition-colors hover:bg-white/5 ${
                    selectedTemplate?.id === template.id ? 'bg-emerald/10' : ''
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template);
                    hydrateTemplateForm(template);
                  }}
                >
                  <div className="font-medium text-white">
                    {template.name || template.areaType.name}
                  </div>
                  <div className="text-sm text-gray-400">{template.areaType.name}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {selectedTemplate ? 'Edit Template' : 'Create Template'}
            </h2>
            {selectedTemplate && (
              <Button variant="danger" size="sm" onClick={() => setTemplateDeleteId(selectedTemplate.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Area Type"
              placeholder="Select area type"
              options={areaTypes.map((at) => ({ value: at.id, label: at.name }))}
              value={templateForm.areaTypeId || ''}
              onChange={(value) => setTemplateForm({ ...templateForm, areaTypeId: value })}
            />
            <Input
              label="Template Name (optional)"
              placeholder="Office Default"
              value={templateForm.name || ''}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            />
            <Input
              label="Default Sq Ft"
              type="number"
              min={0}
              value={templateForm.defaultSquareFeet ?? ''}
              onChange={(e) =>
                setTemplateForm({
                  ...templateForm,
                  defaultSquareFeet: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200">Default Items</h3>
              <Button variant="ghost" size="sm" onClick={addTemplateItemRow}>
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {(templateForm.items || []).map((item, index) => (
                <div key={`${item.fixtureTypeId}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-navy-dark/30 p-3 sm:grid-cols-5">
                  <Select
                    label="Item"
                    options={fixtureTypes.map((ft) => ({
                      value: ft.id,
                      label: `${ft.name} (${ft.category})`,
                    }))}
                    value={item.fixtureTypeId}
                    onChange={(value) => {
                      const selected = fixtureTypes.find((ft) => ft.id === value);
                      updateTemplateItem(index, {
                        fixtureTypeId: value,
                        minutesPerItem: selected ? Number(selected.defaultMinutesPerItem) || 0 : item.minutesPerItem,
                      });
                    }}
                  />
                  <Input
                    label="Default Count"
                    type="number"
                    min={0}
                    value={item.defaultCount}
                    onChange={(e) => updateTemplateItem(index, { defaultCount: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Minutes/Item"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.minutesPerItem}
                    onChange={(e) => updateTemplateItem(index, { minutesPerItem: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Sort"
                    type="number"
                    min={0}
                    value={item.sortOrder ?? 0}
                    onChange={(e) => updateTemplateItem(index, { sortOrder: Number(e.target.value) || 0 })}
                  />
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={() => removeTemplateItem(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {(templateForm.items || []).length === 0 && (
                <div className="text-sm text-gray-500">No items added yet.</div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200">Default Tasks</h3>
              <Button variant="ghost" size="sm" onClick={addTemplateTaskRow}>
                <Plus className="mr-1 h-4 w-4" />
                Add Task
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {(templateForm.tasks || []).map((task, index) => (
                <div key={`${task.name}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-navy-dark/30 p-3 sm:grid-cols-6">
                  <Input
                    label="Task Name"
                    value={task.name}
                    onChange={(e) => updateTemplateTask(index, { name: e.target.value })}
                  />
                  <Input
                    label="Base Min"
                    type="number"
                    min={0}
                    step="0.01"
                    value={task.baseMinutes}
                    onChange={(e) => updateTemplateTask(index, { baseMinutes: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Per Sq Ft"
                    type="number"
                    min={0}
                    step="0.0001"
                    value={task.perSqftMinutes}
                    onChange={(e) => updateTemplateTask(index, { perSqftMinutes: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Per Unit"
                    type="number"
                    min={0}
                    step="0.01"
                    value={task.perUnitMinutes}
                    onChange={(e) => updateTemplateTask(index, { perUnitMinutes: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Per Room"
                    type="number"
                    min={0}
                    step="0.01"
                    value={task.perRoomMinutes}
                    onChange={(e) => updateTemplateTask(index, { perRoomMinutes: Number(e.target.value) || 0 })}
                  />
                  <div className="flex items-end gap-2">
                    <Input
                      label="Sort"
                      type="number"
                      min={0}
                      value={task.sortOrder ?? 0}
                      onChange={(e) => updateTemplateTask(index, { sortOrder: Number(e.target.value) || 0 })}
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeTemplateTask(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {(templateForm.tasks || []).length === 0 && (
                <div className="text-sm text-gray-500">No tasks added yet.</div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={resetTemplateForm}>
              Reset
            </Button>
            <Button onClick={handleSaveTemplate} isLoading={templateSaving}>
              Save Template
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={itemForm.id ? 'Edit Item Type' : 'Create Item Type'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Office Chair"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Optional notes"
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
          />
          <Select
            label="Category"
            options={ITEM_CATEGORIES}
            value={itemForm.category}
            onChange={(value) => setItemForm({ ...itemForm, category: value })}
          />
          <Input
            label="Default Minutes per Item"
            type="number"
            min={0}
            step="0.01"
            value={itemForm.defaultMinutesPerItem}
            onChange={(e) =>
              setItemForm({ ...itemForm, defaultMinutesPerItem: Number(e.target.value) || 0 })
            }
          />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={itemForm.isActive}
              onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })}
              className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
            />
            Active
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowItemModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem} isLoading={itemSaving}>
              Save Item Type
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAreaTypeModal}
        onClose={() => setShowAreaTypeModal(false)}
        title={areaTypeForm.id ? 'Edit Area Type' : 'Create Area Type'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Office"
            value={areaTypeForm.name}
            onChange={(e) => setAreaTypeForm({ ...areaTypeForm, name: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Optional notes"
            value={areaTypeForm.description}
            onChange={(e) => setAreaTypeForm({ ...areaTypeForm, description: e.target.value })}
          />
          <Input
            label="Default Square Feet"
            type="number"
            min={0}
            value={areaTypeForm.defaultSquareFeet || ''}
            onChange={(e) =>
              setAreaTypeForm({ ...areaTypeForm, defaultSquareFeet: Number(e.target.value) || 0 })
            }
          />
          <Input
            label="Base Cleaning Minutes"
            type="number"
            min={0}
            value={areaTypeForm.baseCleaningTimeMinutes || ''}
            onChange={(e) =>
              setAreaTypeForm({ ...areaTypeForm, baseCleaningTimeMinutes: Number(e.target.value) || 0 })
            }
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAreaTypeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAreaType} isLoading={areaTypeSaving}>
              Save Area Type
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(itemDeleteId)}
        onClose={() => setItemDeleteId(null)}
        onConfirm={handleDeleteItem}
        title="Delete Item Type"
        message="Are you sure you want to delete this item type? This cannot be undone."
        variant="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(templateDeleteId)}
        onClose={() => setTemplateDeleteId(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Area Template"
        message="Are you sure you want to delete this area template? This cannot be undone."
        variant="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(areaTypeDeleteId)}
        onClose={() => setAreaTypeDeleteId(null)}
        onConfirm={handleDeleteAreaType}
        title="Delete Area Type"
        message="Are you sure you want to delete this area type? This cannot be undone."
        variant="danger"
      />
    </div>
  );
};

export default AreaTemplatesPage;
