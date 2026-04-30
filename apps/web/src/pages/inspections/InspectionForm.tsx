import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {

  Save,
  ClipboardCheck,
  Building2,
  Calendar,
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
import { listContracts } from '../../lib/contracts';
import { extractApiErrorMessage } from '../../lib/api';
import type { CreateInspectionInput, UpdateInspectionInput, InspectionTemplateDetail } from '../../types/inspection';

interface FacilityOption {
  id: string;
  name: string;
  account: { id: string; name: string; type: string };
}

type InspectionLocationType = 'commercial' | 'residential';

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  roles?: {
    role: {
      key: string;
    };
  }[];
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
  const [activeContractAccountIds, setActiveContractAccountIds] = useState<Set<string>>(new Set());
  const [locationType, setLocationType] = useState<InspectionLocationType>('commercial');
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
  const eligibleAccounts = (() => {
    if (isEditMode) {
      const acct = facilities.find((f) => f.account.id === formData.accountId)?.account;
      return acct ? [acct] : [];
    }
    const seen = new Map<string, FacilityOption['account']>();
    for (const f of facilities) {
      if (
        f.account.type === locationType &&
        activeContractAccountIds.has(f.account.id) &&
        !seen.has(f.account.id)
      ) {
        seen.set(f.account.id, f.account);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();
  const eligibleFacilities = isEditMode
    ? facilities
    : facilities.filter((f) => f.account.id === formData.accountId);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [facilitiesRes, usersRes, activeContractsRes] = await Promise.all([
        listFacilities({ limit: 100 }),
        listUsers({ limit: 100, status: 'active' }),
        listContracts({ status: 'active', limit: 100 }).catch(() => null),
      ]);
      const eligibleInspectorRoles = new Set(['owner', 'admin', 'manager']);
      const eligibleInspectors = (usersRes?.data || []).filter((user) =>
        (user.roles || []).some((assignment) => eligibleInspectorRoles.has(assignment.role.key))
      );
      const accountIds = new Set(
        (activeContractsRes?.data || [])
          .map((c) => c.account?.id)
          .filter((id): id is string => Boolean(id))
      );
      setFacilities(facilitiesRes?.data || []);
      setUsers(eligibleInspectors);
      setActiveContractAccountIds(accountIds);
    } catch {
      toast.error('Failed to load reference data');
    }
  }, []);

  const fetchActiveContractIdForFacility = useCallback(async (facilityId: string) => {
    if (!facilityId) return null;
    try {
      const res = await listContracts({ facilityId, status: 'active', limit: 100 });
      return res?.data?.[0]?.id ?? null;
    } catch {
      return null;
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
          jobId: null,
          contractId: inspection.contractId || null,
          scheduledDate: inspection.scheduledDate.split('T')[0],
          notes: inspection.notes || null,
        });
        // Load template detail if one exists
        if (inspection.templateId) {
          await fetchTemplateDetail(inspection.templateId);
        }
      } catch {
        toast.error('Failed to load inspection');
        navigate('/inspections');
      }
    },
    [navigate, fetchTemplateDetail]
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

  const handleFacilityChange = async (facilityId: string) => {
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

    if (!facilityId) return;

    setLoadingTemplate(true);
    try {
      const contractId = await fetchActiveContractIdForFacility(facilityId);
      if (!contractId) {
        toast.error('No active contract found for this service location.');
        return;
      }
      setFormData((prev) => ({ ...prev, contractId }));
      const template = await getTemplateForContract(contractId);
      if (template) {
        setFormData((prev) => ({ ...prev, templateId: template.id }));
        await fetchTemplateDetail(template.id);
      } else {
        toast.error('No service areas found for this service location. The Hygieia checklist could not be generated.');
      }
    } catch (err) {
      console.error('Failed to load template for service location:', err);
      toast.error('Failed to generate inspection checklist');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleLocationTypeChange = (next: string) => {
    setLocationType(next as InspectionLocationType);
    setFormData((prev) => ({
      ...prev,
      facilityId: '',
      accountId: '',
      contractId: null,
      templateId: null,
    }));
    setSelectedTemplateDetail(null);
  };

  const handleAccountChange = (accountId: string) => {
    setFormData((prev) => ({
      ...prev,
      accountId,
      facilityId: '',
      contractId: null,
      templateId: null,
    }));
    setSelectedTemplateDetail(null);
  };

  const handleChange = (field: keyof CreateInspectionInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.facilityId) {
      toast.error('Please select a service location');
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
    } catch (error) {
      console.error('Failed to create inspection:', error);
      toast.error(extractApiErrorMessage(error, `Failed to ${isEditMode ? 'update' : 'create'} inspection`));
    } finally {
      setSaving(false);
    }
  };

  const templateAreas = selectedTemplateDetail
    ? Array.from(new Set(selectedTemplateDetail.items.map((item) => item.category))).sort((a, b) =>
        a.localeCompare(b)
      )
    : [];

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
          {/* Service Location & Inspector */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary-500" />
              Service Location & Inspector
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Select
                  label="Type *"
                  value={locationType}
                  onChange={handleLocationTypeChange}
                  options={[
                    { value: 'commercial', label: 'Commercial' },
                    { value: 'residential', label: 'Residential' },
                  ]}
                  disabled={isEditMode}
                />
              </div>
              <div className="md:col-span-2">
                <Select
                  label="Account *"
                  placeholder={
                    !isEditMode && eligibleAccounts.length === 0
                      ? `No ${locationType} accounts with active contracts`
                      : 'Select an account'
                  }
                  value={formData.accountId}
                  onChange={handleAccountChange}
                  options={eligibleAccounts.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                  disabled={isEditMode || eligibleAccounts.length === 0}
                />
              </div>
              <div className="md:col-span-2">
                <Select
                  label="Service Location *"
                  placeholder={
                    !formData.accountId
                      ? 'Select an account first'
                      : eligibleFacilities.length === 0
                        ? 'No service locations for this account'
                        : 'Select a service location'
                  }
                  value={formData.facilityId}
                  onChange={handleFacilityChange}
                  options={eligibleFacilities.map((f) => ({
                    value: f.id,
                    label: f.name,
                  }))}
                  disabled={isEditMode || !formData.accountId || eligibleFacilities.length === 0}
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

          {/* Inspection Areas — area-first Hygieia strategy */}
          {loadingTemplate && (
            <Card>
              <div className="flex items-center gap-2 text-sm text-surface-400 dark:text-surface-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                Generating Hygieia area checklist...
              </div>
            </Card>
          )}
          {!loadingTemplate && selectedTemplateDetail && templateAreas.length > 0 && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary-500" />
                Hygieia Standard Inspection Areas
                <span className="ml-auto text-xs font-normal text-surface-500 dark:text-surface-400">
                  {templateAreas.length} areas
                </span>
              </h3>
              <p className="mb-4 text-xs text-surface-500 dark:text-surface-400">
                Area-first inspection: each area is scored against Hygieia standards for cleanliness, maintenance, stocking, and safety.
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {templateAreas.map((area) => (
                  <div
                    key={area}
                    className="flex items-center gap-2 rounded-md px-3 py-2 bg-surface-50 dark:bg-surface-800/50"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-surface-300 dark:text-surface-600" />
                    <span className="text-sm text-surface-700 dark:text-surface-300">{area}</span>
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
                  <span className="text-surface-500 dark:text-surface-400">Service Location</span>
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
                      {templateAreas.length} areas (Hygieia Standard)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-surface-400 dark:text-surface-500">
                Select a service location to see summary information.
              </p>
            )}
          </Card>
        </div>
      </div>
    </form>
  );
};

export default InspectionForm;
