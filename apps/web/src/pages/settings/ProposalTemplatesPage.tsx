import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Star,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  archiveTemplate,
  restoreTemplate,
  deleteTemplate,
} from '../../lib/proposalTemplates';
import type {
  ProposalTemplate,
  CreateTemplateInput,
} from '../../types/proposalTemplate';

const ProposalTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: '',
    termsAndConditions: '',
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listTemplates(showArchived);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({ name: '', termsAndConditions: '', isDefault: false });
    setModalOpen(true);
  };

  const openEditModal = (template: ProposalTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      termsAndConditions: template.termsAndConditions,
      isDefault: template.isDefault,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.termsAndConditions.trim()) {
      toast.error('Name and terms content are required');
      return;
    }

    try {
      setSaving(true);
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
        toast.success('Template updated');
      } else {
        await createTemplate(formData);
        toast.success('Template created');
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (template: ProposalTemplate) => {
    if (!confirm(`Archive template "${template.name}"?`)) return;
    try {
      await archiveTemplate(template.id);
      toast.success('Template archived');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to archive template');
    }
  };

  const handleRestore = async (template: ProposalTemplate) => {
    try {
      await restoreTemplate(template.id);
      toast.success('Template restored');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to restore template');
    }
  };

  const handleDelete = async (template: ProposalTemplate) => {
    if (!confirm(`Permanently delete template "${template.name}"? This cannot be undone.`)) return;
    try {
      await deleteTemplate(template.id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Proposal Templates</h1>
          <p className="text-gray-400">Manage terms & conditions templates for proposals</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-600"
          />
          Show archived
        </label>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
            <p className="text-gray-400 mb-4">
              Create your first terms & conditions template to speed up proposal creation.
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className={template.archivedAt ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-medium text-white truncate">
                      {template.name}
                    </h3>
                    {template.isDefault && (
                      <Badge variant="success" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                    {template.archivedAt && (
                      <Badge variant="warning">Archived</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 whitespace-pre-wrap">
                    {template.termsAndConditions}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Created by {template.createdByUser.fullName} &middot;{' '}
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  {!template.archivedAt && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(template)}
                        className="text-orange-400 hover:text-orange-300"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {template.archivedAt && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(template)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g., Standard Commercial Terms"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Terms & Conditions"
            placeholder="Enter the terms and conditions text..."
            value={formData.termsAndConditions}
            onChange={(e) =>
              setFormData({ ...formData, termsAndConditions: e.target.value })
            }
            rows={12}
            required
          />
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault || false}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="rounded border-gray-600"
            />
            Set as default template (auto-selected for new proposals)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProposalTemplatesPage;
