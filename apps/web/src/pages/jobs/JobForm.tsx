import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Users,
  User,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { createJob, updateJob, getJob } from '../../lib/jobs';
import { listContracts } from '../../lib/contracts';
import { listTeams } from '../../lib/teams';
import { listUsers } from '../../lib/users';
import { useAuthStore } from '../../stores/authStore';
import type { Contract } from '../../types/contract';
import type { CreateJobInput, UpdateJobInput } from '../../types/job';

interface Team {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

const toTimeInputValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  // Normalize API ISO values (e.g. 2026-02-27T17:59:00.000Z) to HTML time input format (HH:mm)
  if (value.includes('T')) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(11, 16);
    }
  }
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return null;
};

const JobForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const userRole = useAuthStore((state) => state.user?.role);
  const isSubcontractor = userRole === 'subcontractor';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Form data
  const [formData, setFormData] = useState<CreateJobInput>({
    contractId: '',
    accountId: '',
    facilityId: '',
    assignedTeamId: null,
    assignedToUserId: null,
    scheduledDate: '',
    scheduledStartTime: null,
    scheduledEndTime: null,
    estimatedHours: null,
    notes: null,
  });

  // Selected contract for display
  const selectedContract = contracts.find((c) => c.id === formData.contractId);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [contractsRes, teamsRes, usersRes] = await Promise.all([
        listContracts({ status: 'active' as any, limit: 100 }),
        listTeams({ limit: 100 }),
        listUsers({ limit: 100 }),
      ]);
      setContracts(contractsRes?.data || []);
      setTeams(teamsRes?.data || []);
      setUsers(usersRes?.data || []);
    } catch {
      toast.error('Failed to load reference data');
    }
  }, []);

  const fetchJob = useCallback(
    async (jobId: string) => {
      try {
        const job = await getJob(jobId);
        if (!['scheduled', 'in_progress'].includes(job.status)) {
          toast.error('This job cannot be edited');
          navigate('/jobs');
          return;
        }
        setFormData({
          contractId: job.contract?.id || '',
          accountId: job.account.id,
          facilityId: job.facility.id,
          assignedTeamId: job.assignedTeam?.id || null,
          assignedToUserId: job.assignedToUser?.id || null,
          scheduledDate: job.scheduledDate.split('T')[0],
          scheduledStartTime: toTimeInputValue(job.scheduledStartTime),
          scheduledEndTime: toTimeInputValue(job.scheduledEndTime),
          estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
          notes: job.notes || null,
        });
      } catch {
        toast.error('Failed to load job');
        navigate('/jobs');
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (isSubcontractor) {
      toast.error('Subcontractors cannot edit jobs');
      navigate('/jobs');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      await fetchReferenceData();
      if (isEditMode && id) {
        await fetchJob(id);
      }
      setLoading(false);
    };
    loadData();
  }, [fetchReferenceData, fetchJob, isEditMode, id, isSubcontractor, navigate]);

  const handleContractChange = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    setFormData((prev) => ({
      ...prev,
      contractId,
      accountId: contract?.account?.id || '',
      facilityId: contract?.facility?.id || '',
    }));
  };

  const handleChange = (field: keyof CreateJobInput, value: unknown) => {
    setFormData((prev) => {
      if (field === 'assignedTeamId') {
        return {
          ...prev,
          assignedTeamId: (value as string | null) || null,
          assignedToUserId: (value as string | null) ? null : prev.assignedToUserId,
        };
      }
      if (field === 'assignedToUserId') {
        return {
          ...prev,
          assignedToUserId: (value as string | null) || null,
          assignedTeamId: (value as string | null) ? null : prev.assignedTeamId,
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode && !formData.contractId) {
      toast.error('Please select a contract');
      return;
    }
    if (!formData.scheduledDate) {
      toast.error('Please select a scheduled date');
      return;
    }
    if (!formData.facilityId) {
      toast.error('Selected contract has no facility assigned');
      return;
    }
    if (formData.assignedTeamId && formData.assignedToUserId) {
      toast.error('Assign either a subcontractor team or an internal employee');
      return;
    }

    // Combine time inputs with scheduledDate to create valid ISO strings
    const toDateTime = (time: string | null) => {
      if (!time) return null;
      return `${formData.scheduledDate}T${time}:00`;
    };

    setSaving(true);
    try {
      if (isEditMode && id) {
        const updateData: UpdateJobInput = {
          assignedTeamId: formData.assignedTeamId || null,
          assignedToUserId: formData.assignedToUserId || null,
          scheduledDate: formData.scheduledDate,
          scheduledStartTime: toDateTime(formData.scheduledStartTime as string | null),
          scheduledEndTime: toDateTime(formData.scheduledEndTime as string | null),
          estimatedHours: formData.estimatedHours || null,
          notes: formData.notes || null,
        };
        await updateJob(id, updateData);
        toast.success('Job updated successfully');
      } else {
        const createData: CreateJobInput = {
          ...formData,
          scheduledStartTime: toDateTime(formData.scheduledStartTime as string | null),
          scheduledEndTime: toDateTime(formData.scheduledEndTime as string | null),
        };
        await createJob(createData);
        toast.success('Job created successfully');
      }
      navigate('/jobs');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} job`
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
            onClick={() => navigate('/jobs')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
            <Briefcase className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
              {isEditMode ? 'Edit Job' : 'New Job'}
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {isEditMode
                ? 'Update the job details below'
                : 'Fill in the details to create a new job'}
            </p>
          </div>
        </div>
        <Button type="submit" size="sm" isLoading={saving}>
          <Save className="mr-1.5 h-4 w-4" />
          {isEditMode ? 'Update Job' : 'Create Job'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Form fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract & Assignment */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-500" />
              Contract & Assignment
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Select
                  label="Contract *"
                  placeholder="Select a contract"
                  value={formData.contractId}
                  onChange={handleContractChange}
                  options={contracts.map((c) => ({
                    value: c.id,
                    label: `${c.contractNumber} — ${c.account.name}${c.facility ? ` (${c.facility.name})` : ''}`,
                  }))}
                  disabled={isEditMode}
                />
              </div>
              <Select
                label="Subcontractor Team"
                placeholder="Select subcontractor team (optional)"
                value={formData.assignedTeamId || ''}
                onChange={(val) =>
                  handleChange('assignedTeamId', val || null)
                }
                options={[
                  { value: '', label: 'None' },
                  ...teams.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
              <Select
                label="Internal Employee"
                placeholder="Select internal employee (optional)"
                value={formData.assignedToUserId || ''}
                onChange={(val) =>
                  handleChange('assignedToUserId', val || null)
                }
                options={[
                  { value: '', label: 'None' },
                  ...users.map((u) => ({
                    value: u.id,
                    label: u.fullName,
                  })),
                ]}
              />
              <div className="md:col-span-2 text-xs text-surface-500 dark:text-surface-400">
                Choose one assignment mode: subcontractor team or internal employee.
              </div>
            </div>
          </Card>

          {/* Scheduling */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-500" />
              Scheduling
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Scheduled Date *"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) =>
                  handleChange('scheduledDate', e.target.value)
                }
              />
              <Input
                label="Estimated Hours"
                type="number"
                placeholder="e.g. 4"
                min="0"
                step="0.5"
                value={formData.estimatedHours ?? ''}
                onChange={(e) =>
                  handleChange(
                    'estimatedHours',
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
              />
              <Input
                label="Start Time"
                type="time"
                value={formData.scheduledStartTime || ''}
                onChange={(e) =>
                  handleChange(
                    'scheduledStartTime',
                    e.target.value || null
                  )
                }
              />
              <Input
                label="End Time"
                type="time"
                value={formData.scheduledEndTime || ''}
                onChange={(e) =>
                  handleChange(
                    'scheduledEndTime',
                    e.target.value || null
                  )
                }
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Notes"
                  placeholder="Optional notes for this job..."
                  value={formData.notes || ''}
                  onChange={(e) =>
                    handleChange('notes', e.target.value || null)
                  }
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
              <Building2 className="h-4 w-4 text-primary-500" />
              Summary
            </h3>
            {selectedContract ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-surface-500 dark:text-surface-400">
                    Contract
                  </span>
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    {selectedContract.contractNumber}
                  </p>
                </div>
                <div>
                  <span className="text-surface-500 dark:text-surface-400">
                    Account
                  </span>
                  <p className="font-medium text-surface-900 dark:text-surface-100">
                    {selectedContract.account.name}
                  </p>
                </div>
                {selectedContract.facility && (
                  <div>
                    <span className="text-surface-500 dark:text-surface-400">
                      Facility
                    </span>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {selectedContract.facility.name}
                    </p>
                  </div>
                )}
                {formData.scheduledDate && (
                  <div>
                    <span className="text-surface-500 dark:text-surface-400">
                      Scheduled Date
                    </span>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {new Date(
                        formData.scheduledDate + 'T00:00:00'
                      ).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {formData.estimatedHours && (
                  <div>
                    <span className="text-surface-500 dark:text-surface-400">
                      Estimated Hours
                    </span>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {formData.estimatedHours}h
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-surface-400 dark:text-surface-500">
                Select a contract to see summary information.
              </p>
            )}
          </Card>
        </div>
      </div>
    </form>
  );
};

export default JobForm;
