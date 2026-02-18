import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  listInspectionTemplates,
  createInspectionTemplate,
  updateInspectionTemplate,
  archiveInspectionTemplate,
  restoreInspectionTemplate,
  getInspectionTemplate,
} from '../../lib/inspections';
import type {
  InspectionTemplate,
  InspectionTemplateDetail,
} from '../../types/inspection';
import type { Pagination } from '../../types/crm';

interface TemplateItemForm {
  category: string;
  itemText: string;
  weight: number;
}

const InspectionTemplatesPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<InspectionTemplateDetail | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formItems, setFormItems] = useState<TemplateItemForm[]>([]);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<InspectionTemplateDetail | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listInspectionTemplates({
        includeArchived: showArchived,
        limit: 50,
      });
      setTemplates(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleExpand = async (templateId: string) => {
    if (expandedTemplate === templateId) {
      setExpandedTemplate(null);
      setExpandedDetail(null);
      return;
    }
    try {
      const detail = await getInspectionTemplate(templateId);
      setExpandedDetail(detail);
      setExpandedTemplate(templateId);
    } catch {
      toast.error('Failed to load template details');
    }
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormItems([{ category: '', itemText: '', weight: 1 }]);
  };

  const startEdit = async (templateId: string) => {
    try {
      const detail = await getInspectionTemplate(templateId);
      setEditing(detail);
      setCreating(false);
      setFormName(detail.name);
      setFormDescription(detail.description || '');
      setFormItems(
        detail.items.map((i) => ({
          category: i.category,
          itemText: i.itemText,
          weight: i.weight,
        }))
      );
    } catch {
      toast.error('Failed to load template');
    }
  };

  const handleSave = async () => {
    const validItems = formItems.filter((i) => i.category && i.itemText);
    if (!formName || validItems.length === 0) {
      toast.error('Name and at least one item are required');
      return;
    }

    try {
      if (editing) {
        await updateInspectionTemplate(editing.id, {
          name: formName,
          description: formDescription || null,
          items: validItems.map((i, idx) => ({
            category: i.category,
            itemText: i.itemText,
            weight: i.weight,
            sortOrder: idx,
          })),
        });
        toast.success('Template updated');
      } else {
        await createInspectionTemplate({
          name: formName,
          description: formDescription || null,
          items: validItems.map((i, idx) => ({
            category: i.category,
            itemText: i.itemText,
            weight: i.weight,
            sortOrder: idx,
          })),
        });
        toast.success('Template created');
      }
      setCreating(false);
      setEditing(null);
      fetchTemplates();
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveInspectionTemplate(id);
      toast.success('Template archived');
      fetchTemplates();
    } catch {
      toast.error('Failed to archive template');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreInspectionTemplate(id);
      toast.success('Template restored');
      fetchTemplates();
    } catch {
      toast.error('Failed to restore template');
    }
  };

  const addItem = () => {
    setFormItems((prev) => [...prev, { category: '', itemText: '', weight: 1 }]);
  };

  const removeItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TemplateItemForm, value: string | number) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const isFormOpen = creating || editing !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/inspections')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <ClipboardList className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Inspection Templates
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Reusable checklists for quality inspections
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          <Button size="sm" onClick={startCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Create/Edit form */}
      {isFormOpen && (
        <Card>
          <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              {editing ? 'Edit Template' : 'New Template'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Template Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Standard Office Inspection"
              />
              <Input
                label="Description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Checklist Items
                </label>
                <Button variant="ghost" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {formItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      className="w-40"
                      value={item.category}
                      onChange={(e) => updateItem(index, 'category', e.target.value)}
                      placeholder="Category"
                    />
                    <Input
                      className="flex-1"
                      value={item.itemText}
                      onChange={(e) => updateItem(index, 'itemText', e.target.value)}
                      placeholder="Checklist item text"
                    />
                    <select
                      className="rounded-lg border border-surface-300 bg-white px-2 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                      value={item.weight}
                      onChange={(e) => updateItem(index, 'weight', parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((w) => (
                        <option key={w} value={w}>Wt {w}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1.5 text-surface-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Templates list */}
      <Card>
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 w-full rounded-lg skeleton" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-8 w-8 text-surface-400 mb-4" />
            <p className="text-sm text-surface-500">No templates yet</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {templates.map((template) => (
              <div key={template.id}>
                <div
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer"
                  onClick={() => handleExpand(template.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedTemplate === template.id ? (
                      <ChevronDown className="h-4 w-4 text-surface-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-surface-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {template.name}
                        {template.archivedAt && (
                          <Badge variant="default" size="sm" className="ml-2">Archived</Badge>
                        )}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        {template._count.items} items &middot; Used {template._count.inspections} times
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="p-1.5 text-surface-400 hover:text-primary-600"
                      onClick={() => startEdit(template.id)}
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {template.archivedAt ? (
                      <button
                        className="p-1.5 text-surface-400 hover:text-green-600"
                        onClick={() => handleRestore(template.id)}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        className="p-1.5 text-surface-400 hover:text-orange-600"
                        onClick={() => handleArchive(template.id)}
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Expanded detail */}
                {expandedTemplate === template.id && expandedDetail && (
                  <div className="px-8 pb-4">
                    {expandedDetail.description && (
                      <p className="text-sm text-surface-500 dark:text-surface-400 mb-3">
                        {expandedDetail.description}
                      </p>
                    )}
                    <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3">
                      {Object.entries(
                        expandedDetail.items.reduce<Record<string, typeof expandedDetail.items>>((acc, item) => {
                          if (!acc[item.category]) acc[item.category] = [];
                          acc[item.category].push(item);
                          return acc;
                        }, {})
                      ).map(([category, items]) => (
                        <div key={category} className="mb-3 last:mb-0">
                          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">
                            {category}
                          </p>
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-1 pl-3">
                              <span className="text-sm text-surface-700 dark:text-surface-300">
                                {item.itemText}
                              </span>
                              <span className="text-xs text-surface-400">
                                Weight: {item.weight}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default InspectionTemplatesPage;
