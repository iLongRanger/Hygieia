import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  LayoutTemplate,
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
  listTaskTemplates,
} from '../../lib/facilities';
import { createTaskTemplate } from '../../lib/tasks';
import type {
  AreaType,
  FixtureType,
  AreaTemplate,
  CreateAreaTemplateInput,
  TaskTemplate,
} from '../../types/facility';

type TemplateItemInput = NonNullable<CreateAreaTemplateInput['items']>[0];
type TemplateTaskInput = NonNullable<CreateAreaTemplateInput['taskTemplates']>[0];

const ITEM_CATEGORIES = [
  { value: 'fixture', label: 'Fixture' },
  { value: 'furniture', label: 'Furniture' },
];

const CLEANING_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'move_out', label: 'Move Out' },
  { value: 'post_construction', label: 'Post Construction' },
];

const AreaTemplatesPage = () => {
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [fixtureTypes, setFixtureTypes] = useState<FixtureType[]>([]);
  const [areaTemplates, setAreaTemplates] = useState<AreaTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingTaskTemplates, setLoadingTaskTemplates] = useState(true);

  const [showItemManagerModal, setShowItemManagerModal] = useState(false);
  const [showAreaTypeManagerModal, setShowAreaTypeManagerModal] = useState(false);
  const [showTemplateEditorModal, setShowTemplateEditorModal] = useState(false);
  const [showTaskTemplateModal, setShowTaskTemplateModal] = useState(false);

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
    taskTemplates: [],
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDeleteId, setTemplateDeleteId] = useState<string | null>(null);
  const [selectedTaskTemplateId, setSelectedTaskTemplateId] = useState('');
  const [taskTemplateForm, setTaskTemplateForm] = useState({
    name: '',
    cleaningType: 'daily',
    areaTypeId: '',
    estimatedMinutes: 30,
    isGlobal: true,
  });
  const [taskTemplateSaving, setTaskTemplateSaving] = useState(false);

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

  const fetchAreaTemplates = useCallback(async (ensureTemplate?: AreaTemplate) => {
    try {
      setLoadingTemplates(true);
      const response = await listAreaTemplates({ limit: 100 });
      const templates = response?.data || [];
      const mergedTemplates =
        ensureTemplate && !templates.some((template) => template.id === ensureTemplate.id)
          ? [ensureTemplate, ...templates]
          : templates;
      setAreaTemplates(mergedTemplates);
      if (!selectedTemplate && !ensureTemplate && mergedTemplates.length) {
        setSelectedTemplate(mergedTemplates[0]);
        hydrateTemplateForm(mergedTemplates[0]);
      }
    } catch (error) {
      console.error('Failed to fetch area templates:', error);
      setAreaTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedTemplate]);

  const fetchTaskTemplates = useCallback(async () => {
    try {
      setLoadingTaskTemplates(true);
      const response = await listTaskTemplates({ isActive: true, limit: 100 });
      setTaskTemplates(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch task templates:', error);
      setTaskTemplates([]);
    } finally {
      setLoadingTaskTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchAreaTypes();
    fetchFixtureTypes();
    fetchAreaTemplates();
    fetchTaskTemplates();
  }, [fetchAreaTypes, fetchFixtureTypes, fetchAreaTemplates, fetchTaskTemplates]);

  const hydrateTemplateForm = (template: AreaTemplate) => {
    const linkedTasks = template.tasks
      .filter((task) => task.taskTemplate)
      .map((task) => ({
        id: task.taskTemplate!.id,
        sortOrder: task.sortOrder,
      }));

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
      taskTemplates: linkedTasks,
    });
    setSelectedTaskTemplateId('');
  };

  const resetTemplateForm = () => {
    setSelectedTemplate(null);
    setTemplateForm({
      areaTypeId: '',
      name: '',
      defaultSquareFeet: null,
      items: [],
      taskTemplates: [],
    });
    setSelectedTaskTemplateId('');
  };

  const openTemplateEditor = (template?: AreaTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      hydrateTemplateForm(template);
    } else {
      resetTemplateForm();
    }
    setShowTemplateEditorModal(true);
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

    try {
      setTemplateSaving(true);
      if (selectedTemplate) {
        const updated = await updateAreaTemplate(selectedTemplate.id, templateForm);
        toast.success('Area template updated');
        setSelectedTemplate(updated);
        hydrateTemplateForm(updated);
        setAreaTemplates((prev) =>
          prev.map((template) => (template.id === updated.id ? updated : template))
        );
        setShowTemplateEditorModal(false);
        await fetchAreaTemplates(updated);
      } else {
        const created = await createAreaTemplate(templateForm);
        toast.success('Area template created');
        setSelectedTemplate(created);
        hydrateTemplateForm(created);
        setAreaTemplates((prev) => [created, ...prev.filter((template) => template.id !== created.id)]);
        setShowTemplateEditorModal(false);
        await fetchAreaTemplates(created);
      }
    } catch (error) {
      console.error('Failed to save area template:', error);
      toast.error('Failed to save area template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const resetTaskTemplateForm = () => {
    setTaskTemplateForm({
      name: '',
      cleaningType: 'daily',
      areaTypeId: '',
      estimatedMinutes: 30,
      isGlobal: true,
    });
  };

  const handleSaveTaskTemplate = async () => {
    if (!taskTemplateForm.name.trim()) {
      toast.error('Enter a task template name');
      return;
    }

    try {
      setTaskTemplateSaving(true);
      const created = await createTaskTemplate({
        name: taskTemplateForm.name.trim(),
        cleaningType: taskTemplateForm.cleaningType,
        areaTypeId: taskTemplateForm.areaTypeId || null,
        estimatedMinutes: taskTemplateForm.estimatedMinutes || 0,
        baseMinutes: 0,
        perSqftMinutes: 0,
        perUnitMinutes: 0,
        perRoomMinutes: 0,
        difficultyLevel: 3,
        requiredEquipment: [],
        requiredSupplies: [],
        instructions: null,
        isGlobal: taskTemplateForm.isGlobal,
        isActive: true,
        fixtureMinutes: [],
      });
      toast.success('Task template created');
      setShowTaskTemplateModal(false);
      resetTaskTemplateForm();
      setSelectedTaskTemplateId(created.id);
      fetchTaskTemplates();
    } catch (error) {
      console.error('Failed to create task template:', error);
      toast.error('Failed to create task template');
    } finally {
      setTaskTemplateSaving(false);
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

  const addTemplateTaskTemplate = () => {
    if (!selectedTaskTemplateId) {
      toast.error('Select a task template to add');
      return;
    }

    setTemplateForm((prev) => {
      const current = prev.taskTemplates || [];
      if (current.some((task) => task.id === selectedTaskTemplateId)) {
        toast.error('Task template already added');
        return prev;
      }
      return {
        ...prev,
        taskTemplates: [
          ...current,
          {
            id: selectedTaskTemplateId,
            sortOrder: current.length + 1,
          },
        ],
      };
    });
    setSelectedTaskTemplateId('');
  };

  const updateTemplateTaskTemplate = (index: number, patch: Partial<TemplateTaskInput>) => {
    setTemplateForm((prev) => {
      const tasks = [...(prev.taskTemplates || [])];
      tasks[index] = { ...tasks[index], ...patch };
      return { ...prev, taskTemplates: tasks };
    });
  };

  const removeTemplateTaskTemplate = (index: number) => {
    setTemplateForm((prev) => {
      const tasks = [...(prev.taskTemplates || [])];
      tasks.splice(index, 1);
      return { ...prev, taskTemplates: tasks };
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

  const templateColumns = [
    {
      header: 'Template',
      cell: (template: AreaTemplate) => (
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-white">
              {template.name || template.areaType.name}
            </div>
            <div className="text-xs text-gray-500">{template.areaType.name}</div>
          </div>
          {selectedTemplate?.id === template.id && (
            <Badge variant="success">Editing</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Default Sq Ft',
      cell: (template: AreaTemplate) => (
        <span className="text-gray-300">
          {template.defaultSquareFeet ? Number(template.defaultSquareFeet).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      header: 'Items',
      cell: (template: AreaTemplate) => (
        <span className="text-gray-300">{template.items?.length ?? 0}</span>
      ),
    },
    {
      header: 'Tasks',
      cell: (template: AreaTemplate) => (
        <span className="text-gray-300">{template.tasks?.length ?? 0}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (template: AreaTemplate) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openTemplateEditor(template);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setTemplateDeleteId(template.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="h-6 w-6 text-emerald" />
          <div>
            <h1 className="text-2xl font-bold text-white">Area Templates</h1>
            <p className="text-gray-400">Configure default tasks and items for each area type.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowAreaTypeManagerModal(true)}>
            Manage Area Types
          </Button>
          <Button onClick={() => setShowItemManagerModal(true)}>
            Manage Item Types
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <LayoutTemplate className="h-5 w-5 text-emerald" />
            Templates
          </div>
          <Button onClick={() => openTemplateEditor()}>
            New Template
          </Button>
        </div>
        <div className="mt-4">
          <Table
            data={areaTemplates}
            columns={templateColumns}
            isLoading={loadingTemplates}
            onRowClick={(template) => {
              openTemplateEditor(template);
            }}
          />
        </div>
      </Card>

      <Modal
        isOpen={showItemManagerModal}
        onClose={() => setShowItemManagerModal(false)}
        title="Item Types"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-400">
              Manage item types used in templates.
            </div>
            <Button onClick={openCreateItemModal}>
              <Plus className="mr-2 h-4 w-4" />
              New Item Type
            </Button>
          </div>
          <Table data={fixtureTypes} columns={itemColumns} isLoading={loadingItems} />
        </div>
      </Modal>

      <Modal
        isOpen={showAreaTypeManagerModal}
        onClose={() => setShowAreaTypeManagerModal(false)}
        title="Area Types"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-400">
              Manage area types used in templates.
            </div>
            <Button onClick={openCreateAreaTypeModal}>
              <Plus className="mr-2 h-4 w-4" />
              New Area Type
            </Button>
          </div>
          <Table data={areaTypes} columns={areaTypeColumns} isLoading={areaTypesLoading} />
        </div>
      </Modal>

      <Modal
        isOpen={showTemplateEditorModal}
        onClose={() => setShowTemplateEditorModal(false)}
        title={selectedTemplate ? 'Edit Template' : 'Create Template'}
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {selectedTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <p className="text-sm text-gray-400">
                Define defaults for space size, items, and tasks.
              </p>
            </div>
            {selectedTemplate && (
              <Button variant="danger" size="sm" onClick={() => setTemplateDeleteId(selectedTemplate.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-navy-dark/30 p-4 sm:grid-cols-2">
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

          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Default Items</h3>
                <p className="text-xs text-gray-500">Assign item counts and timing per area.</p>
              </div>
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

          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Default Tasks</h3>
                <p className="text-xs text-gray-500">Attach reusable task templates to this area.</p>
              </div>
              <div className="flex items-end gap-2">
                <Select
                  label="Task Template"
                  placeholder={loadingTaskTemplates ? 'Loading...' : 'Select task template'}
                  options={taskTemplates.map((task) => ({
                    value: task.id,
                    label: `${task.name} (${task.cleaningType})`,
                  }))}
                  value={selectedTaskTemplateId}
                  onChange={(value) => setSelectedTaskTemplateId(value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addTemplateTaskTemplate}
                  disabled={loadingTaskTemplates || taskTemplates.length === 0}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Task
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTaskTemplateModal(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Quick Create
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {(templateForm.taskTemplates || []).map((task, index) => {
                const template = taskTemplates.find((option) => option.id === task.id);
                return (
                  <div
                    key={`${task.id}-${index}`}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-navy-dark/30 p-3 sm:grid-cols-4"
                  >
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-500">Task Template</div>
                      <div className="text-sm font-medium text-white">
                        {template ? template.name : 'Missing template'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {template
                          ? `${template.cleaningType} · Est ${template.estimatedMinutes ?? 0} min`
                          : 'Select a valid template'}
                      </div>
                    </div>
                    <Input
                      label="Sort"
                      type="number"
                      min={0}
                      value={task.sortOrder ?? 0}
                      onChange={(e) => updateTemplateTaskTemplate(index, { sortOrder: Number(e.target.value) || 0 })}
                    />
                    <div className="flex items-end">
                      <Button variant="ghost" size="sm" onClick={() => removeTemplateTaskTemplate(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
              {(templateForm.taskTemplates || []).length === 0 && (
                <div className="text-sm text-gray-500">No task templates added yet.</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={resetTemplateForm}>
              Reset
            </Button>
            <Button onClick={handleSaveTemplate} isLoading={templateSaving}>
              Save Template
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showTaskTemplateModal}
        onClose={() => setShowTaskTemplateModal(false)}
        title="Quick Create Task Template"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Task Name"
            placeholder="e.g., Empty trash, Dust surfaces"
            value={taskTemplateForm.name}
            onChange={(e) => setTaskTemplateForm({ ...taskTemplateForm, name: e.target.value })}
          />
          <Select
            label="Cleaning Type"
            options={CLEANING_TYPES}
            value={taskTemplateForm.cleaningType}
            onChange={(value) => setTaskTemplateForm({ ...taskTemplateForm, cleaningType: value })}
          />
          <Select
            label="Area Type (optional)"
            placeholder="Select area type"
            options={[{ value: '', label: 'None' }, ...areaTypes.map((at) => ({ value: at.id, label: at.name }))]}
            value={taskTemplateForm.areaTypeId}
            onChange={(value) => setTaskTemplateForm({ ...taskTemplateForm, areaTypeId: value })}
          />
          <Input
            label="Estimated Minutes"
            type="number"
            min={0}
            value={taskTemplateForm.estimatedMinutes}
            onChange={(e) =>
              setTaskTemplateForm({ ...taskTemplateForm, estimatedMinutes: Number(e.target.value) || 0 })
            }
          />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={taskTemplateForm.isGlobal}
              onChange={(e) => setTaskTemplateForm({ ...taskTemplateForm, isGlobal: e.target.checked })}
              className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
            />
            Global Template
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTaskTemplateModal(false);
                resetTaskTemplateForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTaskTemplate} isLoading={taskTemplateSaving}>
              Create Task Template
            </Button>
          </div>
        </div>
      </Modal>

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
