import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Edit2,
  Archive,
  RotateCcw,
  CheckCircle,
  Calendar,
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
  getTaskTemplate,
  updateTaskTemplate,
  archiveTaskTemplate,
  restoreTaskTemplate,
} from '../../lib/tasks';
import { listAreaTypes } from '../../lib/facilities';
import type { TaskTemplate, UpdateTaskTemplateInput } from '../../types/task';
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

const TaskTemplateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<TaskTemplate | null>(null);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<UpdateTaskTemplateInput>({
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

  const fetchTemplate = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getTaskTemplate(id);
      if (data) {
        setTemplate(data);
        setFormData({
          name: data.name,
          description: data.description,
          cleaningType: data.cleaningType,
          areaTypeId: data.areaTypeId,
          estimatedMinutes: data.estimatedMinutes,
          difficultyLevel: data.difficultyLevel,
          requiredEquipment: data.requiredEquipment,
          requiredSupplies: data.requiredSupplies,
          instructions: data.instructions,
          isGlobal: data.isGlobal,
          isActive: data.isActive,
        });
      }
    } catch (error) {
      console.error('Failed to fetch task template:', error);
      toast.error('Failed to load task template details');
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAreaTypes = useCallback(async () => {
    try {
      const response = await listAreaTypes({ limit: 100 });
      setAreaTypes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch area types:', error);
    }
  }, []);

  useEffect(() => {
    fetchTemplate();
    fetchAreaTypes();
  }, [fetchTemplate, fetchAreaTypes]);

  const handleUpdate = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateTaskTemplate(id, formData);
      toast.success('Task template updated successfully');
      setShowEditModal(false);
      fetchTemplate();
    } catch (error) {
      console.error('Failed to update task template:', error);
      toast.error('Failed to update task template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveTaskTemplate(id);
      toast.success('Task template archived successfully');
      fetchTemplate();
    } catch (error) {
      console.error('Failed to archive task template:', error);
      toast.error('Failed to archive task template');
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    try {
      await restoreTaskTemplate(id);
      toast.success('Task template restored successfully');
      fetchTemplate();
    } catch (error) {
      console.error('Failed to restore task template:', error);
      toast.error('Failed to restore task template');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
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

  if (!template) {
    return <div className="text-center text-gray-400">Task template not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{template.name}</h1>
          <p className="text-gray-400">
            {template.cleaningType.replace('_', ' ').toUpperCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Template
          </Button>
          {template.archivedAt ? (
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
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
                <Clock className="h-8 w-8 text-emerald" />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {template.name}
                </div>
                <Badge
                  variant={template.isActive ? 'success' : 'error'}
                >
                  {template.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Estimated Time</div>
                  <div className="text-white">{template.estimatedMinutes} minutes</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Difficulty Level</div>
                  <div className="text-white">Level {template.difficultyLevel}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-400">Created</div>
                  <div className="text-white">{formatDate(template.createdAt)}</div>
                </div>
              </div>

              {template.isGlobal && (
                <div>
                  <Badge variant="info">Global Template</Badge>
                </div>
              )}
            </div>

            {template.archivedAt && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                <div className="flex items-center gap-2 text-orange-400">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm font-medium">Archived</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  {formatDate(template.archivedAt)}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="space-y-6">
            {template.description && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">Description</h3>
                <p className="text-gray-300">{template.description}</p>
              </div>
            )}

            {template.instructions && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">Instructions</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{template.instructions}</p>
              </div>
            )}

            {template.requiredEquipment && template.requiredEquipment.length > 0 && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">Required Equipment</h3>
                <div className="flex flex-wrap gap-2">
                  {template.requiredEquipment.map((item, index) => (
                    <Badge key={index} variant="default">{item}</Badge>
                  ))}
                </div>
              </div>
            )}

            {template.requiredSupplies && template.requiredSupplies.length > 0 && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">Required Supplies</h3>
                <div className="flex flex-wrap gap-2">
                  {template.requiredSupplies.map((item, index) => (
                    <Badge key={index} variant="default">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Task Template"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Task Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Textarea
            label="Description"
            placeholder="Brief description of this task..."
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
              label="Area Type"
              placeholder="Select area type"
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
              value={formData.estimatedMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedMinutes: Number(e.target.value),
                })
              }
            />
            <Select
              label="Difficulty Level"
              options={DIFFICULTY_LEVELS}
              value={String(formData.difficultyLevel)}
              onChange={(value) =>
                setFormData({ ...formData, difficultyLevel: Number(value) })
              }
            />
          </div>

          <Textarea
            label="Instructions"
            placeholder="Detailed instructions for completing this task..."
            value={formData.instructions || ''}
            onChange={(e) =>
              setFormData({ ...formData, instructions: e.target.value || null })
            }
          />

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isGlobal}
                onChange={(e) =>
                  setFormData({ ...formData, isGlobal: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-600 bg-navy-dark text-emerald focus:ring-emerald"
              />
              <span className="text-sm text-gray-300">Global Template</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-600 bg-navy-dark text-emerald focus:ring-emerald"
              />
              <span className="text-sm text-gray-300">Active</span>
            </label>
          </div>

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

export default TaskTemplateDetail;
