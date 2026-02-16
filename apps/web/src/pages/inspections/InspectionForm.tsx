import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  ClipboardCheck,
  Building2,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import {
  createInspection,
  updateInspection,
  getInspection,
  listInspectionTemplates,
} from '../../lib/inspections';
import { listFacilities } from '../../lib/facilities';
import { listUsers } from '../../lib/users';
import { listJobs } from '../../lib/jobs';
import type { CreateInspectionInput, UpdateInspectionInput } from '../../types/inspection';

interface FacilityOption {
  id: string;
  name: string;
  account: { id: string; name: string };
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

interface TemplateOption {
  id: string;
  name: string;
}

interface JobOption {
  id: string;
  jobNumber: string;
  contract: { id: string; contractNumber: string; title: string };
}

const InspectionForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);

  // Form data
  const [formData, setFormData] = useState<CreateInspectionInput>({
    facilityId: '',
    accountId: '',
    inspectorUserId: '',
    templateId: null,
    jobId: null,
    contractId: null,
    scheduledDate: '',
    notes: null,
  });

  // Derived values
  const selectedFacility = facilities.find((f) => f.id === formData.facilityId);
  const selectedJob = jobs.find((j) => j.id === formData.jobId);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [facilitiesRes, usersRes, templatesRes] = await Promise.all([
        listFacilities({ limit: 100 }),
        listUsers({ limit: 100 }),
        listInspectionTemplates({ limit: 100 }),
      ]);
      setFacilities(facilitiesRes?.data || []);
      setUsers(usersRes?.data || []);
      setTemplates(templatesRes?.data || []);
    } catch {
      toast.error('Failed to load reference data');
    }
  }, []);

  const fetchJobsForFacility = useCallback(async (facilityId: string) => {
    if (!facilityId) {
      setJobs([]);
      return;
    }
    try {
      const jobsRes = await listJobs({ facilityId, status: 'scheduled', limit: 100 });
      setJobs(jobsRes?.data || []);
    } catch {
      setJobs([]);
    }
  }, []);

  const fetchInspection = useCallback(
    async (inspectionId: string) => {
      try {
        const inspection = await getInspection(inspectionId);
        if (!['scheduled', 'in_progress'].includes(inspection.status)) {
          toast.error('This inspection cannot be edited');
          navigate('/inspections');
          return;
        }
        setFormData({
          facilityId: inspection.facilityId,
          accountId: inspection.accountId,
          inspectorUserId: inspection.inspectorUserId,
          templateId: inspection.templateId || null,
          jobId: inspection.jobId || null,
          contractId: inspection.contractId || null,
          scheduledDate: inspection.scheduledDate.split('T')[0],
          notes: inspection.notes || null,
        });
        // Load jobs for the facility
        await fetchJobsForFacility(inspection.facilityId);
      } catch {
        toast.error('Failed to load inspection');
        navigate('/inspections');
      }
    },
    [navigate, fetchJobsForFacility]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchReferenceData();
      if (isEditMode && id) {
        await fetchInspection(id);
      }
      setLoading(false);
    };
    loadData();
  }, [fetchReferenceData, fetchInspection, isEditMode, id]);

  const handleFacilityChange = (facilityId: string) => {
    const facility = facilities.find((f) => f.id === facilityId);
    setFormData((prev) => ({
      ...prev,
      facilityId,
      accountId: facility?.account?.id || '',
      jobId: null,
      contractId: null,
    }));
    fetchJobsForFacility(facilityId);
  };

  const handleJobChange = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    setFormData((prev) => ({
      ...prev,
      jobId: jobId || null,
      contractId: job?.contract?.id || null,
    }));
  };

  const handleChange = (field: keyof CreateInspectionInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.facilityId) {
      toast.error('Please select a facility');
      return;
    }
    if (!formData.inspectorUserId) {
      toast.error('Please select an inspector');
      return;
    }
    if (!formData.scheduledDate) {
      toast.error('Please select a scheduled date');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && id) {
        const updateData: UpdateInspectionInput = {
          inspectorUserId: formData.inspectorUserId,
          scheduledDate: formData.scheduledDate,
          notes: formData.notes || null,
        };
        await updateInspection(id, updateData);
        toast.success('Inspection updated successfully');
      } else {
        await createInspection(formData);
        toast.success('Inspection created successfully');
      }
      navigate('/inspections');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} inspection`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400 dark:text-surface-500">Loading...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/inspections')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
            <ClipboardCheck className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
              {isEditMode ? 'Edit Inspection' : 'New Inspection'}
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {isEditMode
                ? 'Update the inspection details below'
                : 'Fill in the details to schedule a new inspection'}
            </p>
          </div>
        </div>
        <Button type="submit" size="sm" isLoading={saving}>
          <Save className="mr-1.5 h-4 w-4" />
          {isEditMode ? 'Update Inspection' : 'Create Inspection'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Form fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Facility & Inspector */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary-500" />
              Facility & Inspector
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Select
                  label="Facility *"
                  placeholder="Select a facility"
                  value={formData.facilityId}
                  onChange={handleFacilityChange}
                  options={facilities.map((f) => ({
                    value: f.id,
                    label: `${f.name} — ${f.account.name}`,
                  }))}
                  disabled={isEditMode}
                />
              </div>
              <Select
                label="Inspector *"
                placeholder="Select an inspector"
                value={formData.inspectorUserId}
                onChange={(val) => handleChange('inspectorUserId', val)}
                options={users.map((u) => ({
                  value: u.id,
                  label: u.fullName,
                }))}
              />
              <Select
                label="Template"
                placeholder="Select a template (optional)"
                value={formData.templateId || ''}
                onChange={(val) => handleChange('templateId', val || null)}
                options={[
                  { value: '', label: 'None' },
                  ...templates.map((t) => ({ value: t.id, label: t.name })),
                ]}
                disabled={isEditMode}
              />
            </div>
          </Card>

          {/* Job & Scheduling */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-500" />
              Job & Scheduling
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Job"
                placeholder="Select a job (optional)"
                value={formData.jobId || ''}
                onChange={handleJobChange}
                options={[
                  { value: '', label: 'None' },
                  ...jobs.map((j) => ({
                    value: j.id,
                    label: j.jobNumber,
                  })),
                ]}
                disabled={isEditMode || !formData.facilityId}
              />
              <Input
                label="Scheduled Date *"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleChange('scheduledDate', e.target.value)}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Notes"
                  placeholder="Optional notes for this inspection..."
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value || null)}
                  rows={3}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right column - Summary */}
        <div>
          <Card className="sticky top-6">
            <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-500" />
              Summary
            </h3>
            {selectedFacility ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-surface-500 dark:text-surface-400">Facility</span>
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    {selectedFacility.name}
                  </p>
                </div>
                <div>
                  <span className="text-surface-500 dark:text-surface-400">Account</span>
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    {selectedFacility.account.name}
                  </p>
                </div>
                {formData.inspectorUserId && (
                  <div>
                    <span className="text-surface-500 dark:text-surface-400">Inspector</span>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {users.find((u) => u.id === formData.inspectorUserId)?.fullName}
                    </p>
                  </div>
                )}
                {selectedJob && (
                  <div>
                    <span className="text-surface-500 dark:text-surface-400">Job</span>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {selectedJob.jobNumber}
                    </p>
                  </div>
                )}
                {formData.scheduledDate && (
                  <div>
                    <span className="text-surface-500 dark:text-surface-400">Scheduled Date</span>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {new Date(formData.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-surface-400 dark:text-surface-500">
                Select a facility to see summary information.
              </p>
            )}
          </Card>
        </div>
      </div>
    </form>
  );
};

export default InspectionForm;
