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
  CheckCircle2,
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
  getInspectionTemplate,
  getTemplateForContract,
} from '../../lib/inspections';
import { listFacilities } from '../../lib/facilities';
import { listUsers } from '../../lib/users';
import { listJobs } from '../../lib/jobs';
import { listContracts } from '../../lib/contracts';
import type { CreateInspectionInput, UpdateInspectionInput, InspectionTemplateDetail } from '../../types/inspection';

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

interface JobOption {
  id: string;
  jobNumber: string;
  contract: { id: string; contractNumber: string; title: string };
}

interface ContractOption {
  id: string;
  contractNumber: string;
  title: string;
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
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [selectedTemplateDetail, setSelectedTemplateDetail] = useState<InspectionTemplateDetail | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

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
      const [facilitiesRes, usersRes] = await Promise.all([
        listFacilities({ limit: 100 }),
        listUsers({ limit: 100 }),
      ]);
      setFacilities(facilitiesRes?.data || []);
      setUsers(usersRes?.data || []);
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

  const fetchContractsForFacility = useCallback(async (facilityId: string) => {
    if (!facilityId) {
      setContracts([]);
      return;
    }
    try {
      const res = await listContracts({ facilityId, status: 'active', limit: 100 });
      setContracts(res?.data || []);
    } catch {
      setContracts([]);
    }
  }, []);

  const fetchTemplateDetail = useCallback(async (templateId: string | null) => {
    if (!templateId) {
      setSelectedTemplateDetail(null);
      return;
    }
    try {
      const detail = await getInspectionTemplate(templateId);
      setSelectedTemplateDetail(detail);
    } catch {
      setSelectedTemplateDetail(null);
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
        // Load jobs and contracts for the facility
        await fetchJobsForFacility(inspection.facilityId);
        await fetchContractsForFacility(inspection.facilityId);
        // Load template detail if one exists
        if (inspection.templateId) {
          await fetchTemplateDetail(inspection.templateId);
        }
      } catch {
        toast.error('Failed to load inspection');
        navigate('/inspections');
      }
    },
    [navigate, fetchJobsForFacility, fetchContractsForFacility, fetchTemplateDetail]
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
      templateId: null,
    }));
    setSelectedTemplateDetail(null);
    fetchJobsForFacility(facilityId);
    fetchContractsForFacility(facilityId);
  };

  const handleContractChange = async (contractId: string) => {
    setFormData((prev) => ({
      ...prev,
      contractId: contractId || null,
      templateId: null,
    }));
    setSelectedTemplateDetail(null);

    // Auto-generate template from contract's proposal tasks
    if (contractId) {
      setLoadingTemplate(true);
      try {
        const template = await getTemplateForContract(contractId);
        console.log('Template for contract:', template);
        if (template) {
          setFormData((prev) => ({ ...prev, templateId: template.id }));
          await fetchTemplateDetail(template.id);
        } else {
          toast.error('No tasks found on this contract\'s proposal. The inspection checklist could not be generated.');
        }
      } catch (err) {
        console.error('Failed to load template for contract:', err);
        toast.error('Failed to generate inspection checklist');
      } finally {
        setLoadingTemplate(false);
      }
    }
  };

  const handleJobChange = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    const contractId = job?.contract?.id || null;
    setFormData((prev) => ({
      ...prev,
      jobId: jobId || null,
      contractId,
    }));
    // Trigger template auto-fill when job sets a contract
    if (contractId) {
      handleContractChange(contractId);
    }
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
        console.log('Creating inspection with:', formData);
        const result = await createInspection(formData);
        console.log('Inspection created:', result);
        toast.success('Inspection created successfully');
      }
      navigate('/inspections');
    } catch (error: any) {
      console.error('Failed to create inspection:', error.response?.data || error);
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} inspection`
      );
    } finally {
      setSaving(false);
    }
  };

  // Group template items by category for display
  const groupedTemplateItems = selectedTemplateDetail?.items.reduce<Record<string, typeof selectedTemplateDetail.items>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {}
  );

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
                label="Contract *"
                placeholder="Select an active contract"
                value={formData.contractId || ''}
                onChange={(val) => handleContractChange(val)}
                options={[
                  { value: '', label: 'None' },
                  ...contracts.map((c) => ({
                    value: c.id,
                    label: `${c.contractNumber} — ${c.title}`,
                  })),
                ]}
                disabled={isEditMode || !formData.facilityId}
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

          {/* Inspection Task List — auto-generated from contract */}
          {loadingTemplate && (
            <Card>
              <div className="flex items-center gap-2 text-sm text-surface-400 dark:text-surface-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                Generating inspection checklist from contract tasks...
              </div>
            </Card>
          )}
          {!loadingTemplate && selectedTemplateDetail && groupedTemplateItems && Object.keys(groupedTemplateItems).length > 0 && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary-500" />
                Inspection Task List
                <span className="ml-auto text-xs font-normal text-surface-500 dark:text-surface-400">
                  {selectedTemplateDetail.items.length} items
                </span>
              </h3>
              <p className="mb-4 text-xs text-surface-500 dark:text-surface-400">
                These tasks will be used as the inspection checklist. Generated from the contract's proposal.
              </p>
              <div className="space-y-4">
                {Object.entries(groupedTemplateItems).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-md px-3 py-2 bg-surface-50 dark:bg-surface-800/50"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-surface-300 dark:text-surface-600" />
                          <span className="text-sm text-surface-700 dark:text-surface-300">
                            {item.itemText}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
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
                {formData.contractId && (
                  <div>
                    <span className="text-surface-500 dark:text-surface-400">Contract</span>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {contracts.find((c) => c.id === formData.contractId)?.contractNumber || formData.contractId}
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
                {selectedTemplateDetail && (
                  <div>
                    <span className="text-surface-500 dark:text-surface-400">Checklist</span>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {selectedTemplateDetail.items.length} tasks
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
