import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Clock,
  Archive,
  RotateCcw,
  CheckCircle,
  XCircle,
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
  listTaskTemplates,
  createTaskTemplate,
  archiveTaskTemplate,
  restoreTaskTemplate,
} from '../../lib/tasks';
import { listAreaTypes } from '../../lib/facilities';
import type { TaskTemplate, CreateTaskTemplateInput } from '../../types/task';
import type { AreaType } from '../../types/facility';

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

const DIFFICULTY_LEVELS = [
  { value: '1', label: '1 - Very Easy' },
  { value: '2', label: '2 - Easy' },
  { value: '3', label: '3 - Medium' },
  { value: '4', label: '4 - Hard' },
  { value: '5', label: '5 - Very Hard' },
];

const TaskTemplatesList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [formData, setFormData] = useState<CreateTaskTemplateInput>({
    name: '',
    description: null,
    cleaningType: 'daily',
    areaTypeId: null,
    estimatedMinutes: 30,
    difficultyLevel: 3,
    requiredEquipment: [],
    requiredSupplies: [],
    instructions: null,
    isGlobal: true,
    isActive: true,
  });

  const fetchTemplates = useCallback(
    async (currentPage: number, currentSearch: string) => {
      try {
        setLoading(true);
        const response = await listTaskTemplates({
          search: currentSearch || undefined,
          page: currentPage,
        });
        setTemplates(response?.data || []);
        if (response?.pagination) {
          setTotal(response.pagination.total);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch task templates:', error);
        toast.error('Failed to load task templates');
        setTemplates([]);
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
    fetchTemplates(page, search);
  }, [fetchTemplates, page, search]);

  useEffect(() => {
    fetchAreaTypes();
  }, [fetchAreaTypes]);

  const handleCreate = async () => {
    if (!formData.name || !formData.cleaningType) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await createTaskTemplate(formData);
      toast.success('Task template created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchTemplates(page, search);
    } catch (error) {
      console.error('Failed to create task template:', error);
      toast.error('Failed to create task template. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: null,
      cleaningType: 'daily',
      areaTypeId: null,
      estimatedMinutes: 30,
      difficultyLevel: 3,
      requiredEquipment: [],
      requiredSupplies: [],
      instructions: null,
      isGlobal: true,
      isActive: true,
    });
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveTaskTemplate(id);
      toast.success('Task template archived successfully');
      fetchTemplates(page, search);
    } catch (error) {
      console.error('Failed to archive template:', error);
      toast.error('Failed to archive task template');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreTaskTemplate(id);
      toast.success('Task template restored successfully');
      fetchTemplates(page, search);
    } catch (error) {
      console.error('Failed to restore template:', error);
      toast.error('Failed to restore task template');
    }
  };

  const columns = [
    {
      header: 'Task Template',
      cell: (item: TaskTemplate) => (
        <div>
          <div className="font-medium text-white">{item.name}</div>
          <div className="text-sm text-gray-400">
            {item.areaType?.name || 'All Areas'}
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (item: TaskTemplate) => (
        <Badge variant="info">{item.cleaningType.replace('_', ' ')}</Badge>
      ),
    },
    {
      header: 'Time',
      cell: (item: TaskTemplate) => (
        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="h-4 w-4 text-gray-500" />
          {item.estimatedMinutes} min
        </div>
      ),
    },
    {
      header: 'Difficulty',
      cell: (item: TaskTemplate) => (
        <span className="text-gray-300">
          {'★'.repeat(item.difficultyLevel)}
          {'☆'.repeat(5 - item.difficultyLevel)}
        </span>
      ),
    },
    {
      header: 'Scope',
      cell: (item: TaskTemplate) => (
        <Badge variant={item.isGlobal ? 'success' : 'default'}>
          {item.isGlobal ? 'Global' : 'Facility'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      cell: (item: TaskTemplate) => (
        <div className="flex items-center gap-2">
          {item.isActive ? (
            <CheckCircle className="h-4 w-4 text-emerald" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-500" />
          )}
          <Badge
            variant={
              item.archivedAt ? 'error' : item.isActive ? 'success' : 'default'
            }
          >
            {item.archivedAt
              ? 'Archived'
              : item.isActive
                ? 'Active'
                : 'Inactive'}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Uses',
      cell: (item: TaskTemplate) => (
        <span className="text-gray-300">{item._count?.facilityTasks ?? 0}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (item: TaskTemplate) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/tasks/${item.id}`)}
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
        <h1 className="text-2xl font-bold text-white">Task Templates</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="border-b border-white/10 bg-navy-dark/30 p-4">
          <div className="flex gap-4">
            <div className="w-full max-w-sm">
              <Input
                placeholder="Search templates..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="secondary" className="px-3">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Table data={templates} columns={columns} isLoading={loading} />

        <div className="border-t border-white/10 bg-navy-dark/30 p-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing {templates.length} of {total} templates
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
        title="Create Task Template"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g., Vacuum Carpets"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Textarea
            label="Description"
            placeholder="Describe the task..."
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || null })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Cleaning Type"
              options={CLEANING_TYPES}
              value={formData.cleaningType}
              onChange={(value) =>
                setFormData({ ...formData, cleaningType: value })
              }
            />
            <Select
              label="Area Type (optional)"
              placeholder="All areas"
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estimated Minutes"
              type="number"
              min={1}
              value={formData.estimatedMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedMinutes: Number(e.target.value) || 30,
                })
              }
            />
            <Select
              label="Difficulty Level"
              options={DIFFICULTY_LEVELS}
              value={String(formData.difficultyLevel)}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  difficultyLevel: Number(value) || 3,
                })
              }
            />
          </div>

          <Textarea
            label="Instructions"
            placeholder="Step-by-step instructions..."
            value={formData.instructions || ''}
            onChange={(e) =>
              setFormData({ ...formData, instructions: e.target.value || null })
            }
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
              disabled={!formData.name || !formData.cleaningType}
            >
              Create Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaskTemplatesList;
