import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ChevronDown, ChevronUp, FileSignature } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { PERMISSIONS } from '../../lib/permissions';
import { useAuthStore } from '../../stores/authStore';
import { listAreas, listAreaTypes, listFacilityTasks, listTaskTemplates } from '../../lib/facilities';
import {
  applyContractAmendment,
  approveContractAmendment,
  getContractAmendment,
  updateContractAmendment,
} from '../../lib/contracts';
import type { ContractAmendment, ContractAmendmentStatus } from '../../types/contract';
import type { Area, AreaType, FacilityTask, TaskTemplate } from '../../types/facility';

type ContractAmendmentWithContract = ContractAmendment & {
  contract?: {
    id: string;
    contractNumber: string;
    title: string;
    facilityId?: string | null;
    monthlyValue?: number | null;
    serviceFrequency?: string | null;
    serviceSchedule?: Record<string, unknown> | null;
    billingCycle?: string | null;
    paymentTerms?: string | null;
    autoRenew?: boolean | null;
    renewalNoticeDays?: number | null;
    termsAndConditions?: string | null;
    specialInstructions?: string | null;
    account?: { name: string } | null;
    facility?: { name: string } | null;
  } | null;
};

const STATUS_VARIANTS: Record<ContractAmendmentStatus, 'default' | 'warning' | 'success' | 'info' | 'error'> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'info',
  applied: 'success',
  canceled: 'error',
};

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function formatCurrency(value: unknown): string {
  if (typeof value !== 'number') return formatValue(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function normalizeDay(day: string): string {
  const d = day.toLowerCase();
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function formatSchedule(value: unknown): string {
  if (!value || typeof value !== 'object') return formatValue(value);
  const schedule = value as { days?: string[]; allowedWindowStart?: string; allowedWindowEnd?: string };
  const days = Array.isArray(schedule.days) ? schedule.days.map(normalizeDay).join(', ') : '';
  const window =
    schedule.allowedWindowStart && schedule.allowedWindowEnd
      ? `${schedule.allowedWindowStart} - ${schedule.allowedWindowEnd}`
      : '';
  if (!days && !window) return formatValue(value);
  if (days && window) return `${days} | ${window}`;
  return days || window;
}

function compactLines(lines: Array<string | null | undefined>): string[] {
  return lines.filter((line): line is string => Boolean(line && line.trim()));
}

export default function AmendmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canApprove = hasPermission(PERMISSIONS.CONTRACTS_ADMIN);
  const canWrite = hasPermission(PERMISSIONS.CONTRACTS_WRITE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amendment, setAmendment] = useState<ContractAmendmentWithContract | null>(null);
  const [areaMap, setAreaMap] = useState<Record<string, string>>({});
  const [areaTypeMap, setAreaTypeMap] = useState<Record<string, string>>({});
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [taskTemplateMap, setTaskTemplateMap] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const canEdit = useMemo(
    () =>
      canWrite &&
      (amendment?.status === 'draft' || amendment?.status === 'pending_approval'),
    [amendment?.status, canWrite]
  );

  const contractDiffRows = useMemo(() => {
    if (!amendment?.contract) return [];

    const current = amendment.contract;
    const rows: Array<{ label: string; current: unknown; proposed: unknown; type?: 'currency' | 'schedule' | 'text' }> = [];
    const pushIfChanged = (
      label: string,
      proposed: unknown,
      currentValue: unknown,
      type: 'currency' | 'schedule' | 'text' = 'text'
    ) => {
      if (proposed === null || proposed === undefined) return;
      rows.push({ label, current: currentValue, proposed, type });
    };

    pushIfChanged('Monthly Value', amendment.monthlyValue, current.monthlyValue, 'currency');
    pushIfChanged('End Date', amendment.endDate, current.endDate);
    pushIfChanged('Service Frequency', amendment.serviceFrequency, current.serviceFrequency);
    pushIfChanged('Service Schedule', amendment.serviceSchedule, current.serviceSchedule, 'schedule');
    pushIfChanged('Billing Cycle', amendment.billingCycle, current.billingCycle);
    pushIfChanged('Payment Terms', amendment.paymentTerms, current.paymentTerms);
    pushIfChanged('Auto Renew', amendment.autoRenew, current.autoRenew);
    pushIfChanged('Renewal Notice Days', amendment.renewalNoticeDays, current.renewalNoticeDays);
    pushIfChanged('Terms and Conditions', amendment.termsAndConditions, current.termsAndConditions);
    pushIfChanged('Special Instructions', amendment.specialInstructions, current.specialInstructions);

    return rows;
  }, [amendment]);

  const areaTaskDiffRows = useMemo(() => {
    if (!amendment) return [];
    const rows: Array<{ label: string; current: string; proposed: string }> = [];

    const areaCreate = amendment.areaChanges?.create?.length ?? 0;
    const areaUpdate = amendment.areaChanges?.update?.length ?? 0;
    const areaRemove = amendment.areaChanges?.archiveIds?.length ?? 0;
    const taskCreate = amendment.taskChanges?.create?.length ?? 0;
    const taskUpdate = amendment.taskChanges?.update?.length ?? 0;
    const taskRemove = amendment.taskChanges?.archiveIds?.length ?? 0;

    if (areaCreate || areaUpdate || areaRemove) {
      rows.push({
        label: 'Area Changes',
        current: 'Current area setup',
        proposed: `+${areaCreate} add, ${areaUpdate} update, ${areaRemove} remove`,
      });
    }

    if (taskCreate || taskUpdate || taskRemove) {
      rows.push({
        label: 'Task Changes',
        current: 'Current task setup',
        proposed: `+${taskCreate} add, ${taskUpdate} update, ${taskRemove} remove`,
      });
    }

    return rows;
  }, [amendment]);

  const areaDiffDetails = useMemo(() => {
    if (!amendment) return { created: [], updated: [], removed: [] as string[] };
    return {
      created: amendment.areaChanges?.create ?? [],
      updated: amendment.areaChanges?.update ?? [],
      removed: amendment.areaChanges?.archiveIds ?? [],
    };
  }, [amendment]);

  const taskDiffDetails = useMemo(() => {
    if (!amendment) return { created: [], updated: [], removed: [] as string[] };
    return {
      created: amendment.taskChanges?.create ?? [],
      updated: amendment.taskChanges?.update ?? [],
      removed: amendment.taskChanges?.archiveIds ?? [],
    };
  }, [amendment]);

  const changeSummary = useMemo(() => {
    const areaAdded = areaDiffDetails.created.length;
    const areaUpdated = areaDiffDetails.updated.length;
    const areaRemoved = areaDiffDetails.removed.length;
    const taskAdded = taskDiffDetails.created.length;
    const taskUpdated = taskDiffDetails.updated.length;
    const taskRemoved = taskDiffDetails.removed.length;

    return {
      contractFieldsChanged: contractDiffRows.length,
      contractFieldLabels: contractDiffRows.map((row) => row.label),
      areaAdded,
      areaUpdated,
      areaRemoved,
      taskAdded,
      taskUpdated,
      taskRemoved,
    };
  }, [contractDiffRows, areaDiffDetails, taskDiffDetails]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = (await getContractAmendment(id)) as ContractAmendmentWithContract;
      setAmendment(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setEffectiveDate((data.effectiveDate || '').slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch amendment:', error);
      toast.error('Failed to load amendment');
      navigate('/amendments');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const facilityId = amendment?.contract?.facilityId;
    if (!facilityId) return;

    let isMounted = true;
    const loadLookups = async () => {
      try {
        const [areasResp, areaTypesResp, tasksResp, templatesResp] = await Promise.all([
          listAreas({ facilityId, limit: 100 }),
          listAreaTypes({ limit: 100 }),
          listFacilityTasks({ facilityId, limit: 100 }),
          listTaskTemplates({ facilityId, limit: 100, includeArchived: true }),
        ]);

        if (!isMounted) return;

        const nextAreaMap: Record<string, string> = {};
        (areasResp.data as Area[]).forEach((area) => {
          nextAreaMap[area.id] = area.name || area.areaType?.name || 'Unnamed area';
        });
        setAreaMap(nextAreaMap);

        const nextAreaTypeMap: Record<string, string> = {};
        (areaTypesResp.data as AreaType[]).forEach((areaType) => {
          nextAreaTypeMap[areaType.id] = areaType.name;
        });
        setAreaTypeMap(nextAreaTypeMap);

        const nextTaskMap: Record<string, string> = {};
        (tasksResp.data as FacilityTask[]).forEach((task) => {
          nextTaskMap[task.id] = task.customName || task.taskTemplate?.name || 'Unnamed task';
        });
        setTaskMap(nextTaskMap);

        const nextTemplateMap: Record<string, string> = {};
        (templatesResp.data as TaskTemplate[]).forEach((tpl) => {
          nextTemplateMap[tpl.id] = tpl.name;
        });
        setTaskTemplateMap(nextTemplateMap);
      } catch (error) {
        console.error('Failed to load amendment diff lookups:', error);
      }
    };

    loadLookups();
    return () => {
      isMounted = false;
    };
  }, [amendment?.contract?.facilityId]);

  const handleSave = async () => {
    if (!amendment?.contractId) return;
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!effectiveDate) {
      toast.error('Effective date is required');
      return;
    }

    try {
      setSaving(true);
      const updated = (await updateContractAmendment(amendment.contractId, amendment.id, {
        title: title.trim(),
        description: description.trim() || null,
        effectiveDate,
      })) as ContractAmendmentWithContract;
      setAmendment(updated);
      toast.success('Amendment updated');
    } catch (error: any) {
      console.error('Failed to update amendment:', error);
      toast.error(error?.response?.data?.error?.message || 'Failed to update amendment');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!amendment?.contractId) return;
    try {
      setSaving(true);
      const updated = (await approveContractAmendment(amendment.contractId, amendment.id)) as ContractAmendmentWithContract;
      setAmendment(updated);
      toast.success('Amendment approved');
    } catch (error: any) {
      console.error('Failed to approve amendment:', error);
      toast.error(error?.response?.data?.error?.message || 'Failed to approve amendment');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (!amendment?.contractId) return;
    if (!confirm('Apply this amendment now?')) return;
    try {
      setSaving(true);
      const updated = (await applyContractAmendment(amendment.contractId, amendment.id)) as ContractAmendmentWithContract;
      setAmendment(updated);
      toast.success('Amendment applied');
    } catch (error: any) {
      console.error('Failed to apply amendment:', error);
      toast.error(error?.response?.data?.error?.message || 'Failed to apply amendment');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !amendment) {
    return (
      <div className="space-y-4">
        <Card className="h-28 animate-pulse" />
        <Card className="h-72 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/amendments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Amendments
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{amendment.title}</h1>
            <Badge variant={STATUS_VARIANTS[amendment.status]}>
              {amendment.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canApprove && (amendment.status === 'draft' || amendment.status === 'pending_approval') && (
            <Button onClick={handleApprove} isLoading={saving}>
              Approve
            </Button>
          )}
          {canApprove && amendment.status === 'approved' && (
            <Button onClick={handleApply} isLoading={saving}>
              Apply
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate(`/contracts/${amendment.contractId}`)}
          >
            <FileSignature className="mr-2 h-4 w-4" />
            Open Contract
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-white">Change Summary</div>
          <Button variant="ghost" size="sm" onClick={() => setShowDetails((prev) => !prev)}>
            {showDetails ? (
              <>
                Hide details
                <ChevronUp className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Show details
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        {contractDiffRows.length === 0 && areaTaskDiffRows.length === 0 ? (
          <div className="text-sm text-gray-400">No explicit changes were captured in this amendment.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-md border border-surface-700 bg-surface-900/40 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Contract fields changed</div>
                <div className="mt-1 text-2xl font-semibold text-white">{changeSummary.contractFieldsChanged}</div>
                {changeSummary.contractFieldLabels.length > 0 && (
                  <div className="mt-1 text-xs text-gray-400">
                    {changeSummary.contractFieldLabels.slice(0, 3).join(', ')}
                    {changeSummary.contractFieldLabels.length > 3 ? '...' : ''}
                  </div>
                )}
              </div>
              <div className="rounded-md border border-surface-700 bg-surface-900/40 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Area changes</div>
                <div className="mt-1 text-sm text-gray-200">
                  Added: <span className="text-emerald-300">{changeSummary.areaAdded}</span> | Updated:{' '}
                  <span className="text-amber-300">{changeSummary.areaUpdated}</span> | Removed:{' '}
                  <span className="text-red-300">{changeSummary.areaRemoved}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {changeSummary.areaAdded > 0 && (
                    <span className="rounded-full border border-emerald-800 bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-300">
                      Added
                    </span>
                  )}
                  {changeSummary.areaUpdated > 0 && (
                    <span className="rounded-full border border-amber-800 bg-amber-900/30 px-2 py-0.5 text-xs text-amber-300">
                      Updated
                    </span>
                  )}
                  {changeSummary.areaRemoved > 0 && (
                    <span className="rounded-full border border-red-800 bg-red-900/30 px-2 py-0.5 text-xs text-red-300">
                      Removed
                    </span>
                  )}
                  {changeSummary.areaAdded === 0 &&
                    changeSummary.areaUpdated === 0 &&
                    changeSummary.areaRemoved === 0 && (
                      <span className="rounded-full border border-surface-700 bg-surface-800 px-2 py-0.5 text-xs text-gray-300">
                        No area changes
                      </span>
                    )}
                </div>
              </div>
              <div className="rounded-md border border-surface-700 bg-surface-900/40 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Task changes</div>
                <div className="mt-1 text-sm text-gray-200">
                  Added: <span className="text-emerald-300">{changeSummary.taskAdded}</span> | Updated:{' '}
                  <span className="text-amber-300">{changeSummary.taskUpdated}</span> | Removed:{' '}
                  <span className="text-red-300">{changeSummary.taskRemoved}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {changeSummary.taskAdded > 0 && (
                    <span className="rounded-full border border-emerald-800 bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-300">
                      Added
                    </span>
                  )}
                  {changeSummary.taskUpdated > 0 && (
                    <span className="rounded-full border border-amber-800 bg-amber-900/30 px-2 py-0.5 text-xs text-amber-300">
                      Updated
                    </span>
                  )}
                  {changeSummary.taskRemoved > 0 && (
                    <span className="rounded-full border border-red-800 bg-red-900/30 px-2 py-0.5 text-xs text-red-300">
                      Removed
                    </span>
                  )}
                  {changeSummary.taskAdded === 0 &&
                    changeSummary.taskUpdated === 0 &&
                    changeSummary.taskRemoved === 0 && (
                      <span className="rounded-full border border-surface-700 bg-surface-800 px-2 py-0.5 text-xs text-gray-300">
                        No task changes
                      </span>
                    )}
                </div>
              </div>
            </div>

            {showDetails && areaTaskDiffRows.length > 0 && (
              <div className="rounded-lg border border-surface-700 bg-surface-900/30 p-3">
                <div className="mb-2 text-sm font-semibold text-white">Scope Changes</div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {areaTaskDiffRows.map((row) => (
                    <div key={row.label} className="rounded-md border border-surface-700 bg-surface-900/40 p-3">
                      <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">{row.label}</div>
                      <div className="text-sm text-emerald-300">{row.proposed}</div>
                    </div>
                  ))}
                </div>

                {(areaDiffDetails.created.length > 0 ||
                  areaDiffDetails.updated.length > 0 ||
                  areaDiffDetails.removed.length > 0) && (
                  <div className="mt-4 rounded-md border border-surface-700 bg-surface-950/40 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Area Diff Details
                    </div>
                    <div className="space-y-2 text-sm">
                      {areaDiffDetails.created.map((item, index) => (
                        <div key={`area-create-${index}`} className="rounded border border-emerald-900/30 bg-emerald-900/10 p-2 text-emerald-200">
                          <div className="text-xs font-semibold uppercase text-emerald-300">Added Area</div>
                          <div className="mt-1 whitespace-pre-wrap">
                            {compactLines([
                              `Name: ${item.name || 'Untitled area'}`,
                              `Area Type: ${areaTypeMap[item.areaTypeId] || 'Selected area type'}`,
                              item.squareFeet != null ? `Sqft: ${item.squareFeet}` : null,
                              item.floorType ? `Floor: ${item.floorType}` : null,
                              item.conditionLevel ? `Condition: ${item.conditionLevel}` : null,
                              item.trafficLevel ? `Traffic: ${item.trafficLevel}` : null,
                              item.notes ? `Notes: ${item.notes}` : null,
                            ]).join(' | ')}
                          </div>
                        </div>
                      ))}

                      {areaDiffDetails.updated.map((item, index) => (
                        <div key={`area-update-${index}`} className="rounded border border-amber-900/30 bg-amber-900/10 p-2 text-amber-100">
                          <div className="text-xs font-semibold uppercase text-amber-300">Updated Area</div>
                          <div className="mt-1 whitespace-pre-wrap">
                            {compactLines([
                              `Area: ${areaMap[item.id] || 'Existing area'}`,
                              item.name !== undefined ? `Name: ${item.name || 'Untitled area'}` : null,
                              item.areaTypeId ? `Area Type: ${areaTypeMap[item.areaTypeId] || 'Selected area type'}` : null,
                              item.squareFeet != null ? `Sqft: ${item.squareFeet}` : null,
                              item.floorType ? `Floor: ${item.floorType}` : null,
                              item.conditionLevel ? `Condition: ${item.conditionLevel}` : null,
                              item.trafficLevel ? `Traffic: ${item.trafficLevel}` : null,
                              item.notes !== undefined ? `Notes: ${item.notes || '-'}` : null,
                            ]).join(' | ')}
                          </div>
                        </div>
                      ))}

                      {areaDiffDetails.removed.map((id, index) => (
                        <div key={`area-remove-${index}`} className="rounded border border-red-900/30 bg-red-900/10 p-2 text-red-100">
                          <div className="text-xs font-semibold uppercase text-red-300">Removed Area</div>
                          <div className="mt-1">Area: {areaMap[id] || 'Removed area'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(taskDiffDetails.created.length > 0 ||
                  taskDiffDetails.updated.length > 0 ||
                  taskDiffDetails.removed.length > 0) && (
                  <div className="mt-4 rounded-md border border-surface-700 bg-surface-950/40 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Task Diff Details
                    </div>
                    <div className="space-y-2 text-sm">
                      {taskDiffDetails.created.map((item, index) => (
                        <div key={`task-create-${index}`} className="rounded border border-emerald-900/30 bg-emerald-900/10 p-2 text-emerald-200">
                          <div className="text-xs font-semibold uppercase text-emerald-300">Added Task</div>
                          <div className="mt-1 whitespace-pre-wrap">
                            {compactLines([
                              `Name: ${item.customName || 'Template task'}`,
                              item.taskTemplateId ? `Template: ${taskTemplateMap[item.taskTemplateId] || 'Selected template task'}` : null,
                              item.areaId ? `Area: ${areaMap[item.areaId] || 'Selected area'}` : null,
                              item.cleaningFrequency ? `Frequency: ${item.cleaningFrequency}` : null,
                              item.estimatedMinutes != null ? `Est. Minutes: ${item.estimatedMinutes}` : null,
                              item.customInstructions ? `Instructions: ${item.customInstructions}` : null,
                            ]).join(' | ')}
                          </div>
                        </div>
                      ))}

                      {taskDiffDetails.updated.map((item, index) => (
                        <div key={`task-update-${index}`} className="rounded border border-amber-900/30 bg-amber-900/10 p-2 text-amber-100">
                          <div className="text-xs font-semibold uppercase text-amber-300">Updated Task</div>
                          <div className="mt-1 whitespace-pre-wrap">
                            {compactLines([
                              `Task: ${taskMap[item.id] || 'Existing task'}`,
                              item.customName !== undefined ? `Name: ${item.customName || 'Template task'}` : null,
                              item.taskTemplateId ? `Template: ${taskTemplateMap[item.taskTemplateId] || 'Selected template task'}` : null,
                              item.areaId ? `Area: ${areaMap[item.areaId] || 'Selected area'}` : null,
                              item.cleaningFrequency ? `Frequency: ${item.cleaningFrequency}` : null,
                              item.estimatedMinutes != null ? `Est. Minutes: ${item.estimatedMinutes}` : null,
                              item.customInstructions !== undefined ? `Instructions: ${item.customInstructions || '-'}` : null,
                            ]).join(' | ')}
                          </div>
                        </div>
                      ))}

                      {taskDiffDetails.removed.map((id, index) => (
                        <div key={`task-remove-${index}`} className="rounded border border-red-900/30 bg-red-900/10 p-2 text-red-100">
                          <div className="text-xs font-semibold uppercase text-red-300">Removed Task</div>
                          <div className="mt-1">Task: {taskMap[id] || 'Removed task'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showDetails && contractDiffRows.length > 0 && (
              <div className="rounded-lg border border-surface-700 bg-surface-900/30 p-3">
                <div className="mb-2 text-sm font-semibold text-white">Contract Value Changes</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-700 text-left text-xs uppercase tracking-wide text-gray-400">
                        <th className="py-2 pr-3">Field</th>
                        <th className="py-2 pr-3">Current</th>
                        <th className="py-2">Proposed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractDiffRows.map((row) => {
                        const render = (value: unknown) => {
                          if (row.type === 'currency') return formatCurrency(value);
                          if (row.type === 'schedule') return formatSchedule(value);
                          return formatValue(value);
                        };
                        return (
                          <tr key={row.label} className="border-b border-surface-800 align-top">
                            <td className="py-2 pr-3 font-medium text-gray-200">{row.label}</td>
                            <td className="py-2 pr-3 text-red-300 whitespace-pre-wrap">{render(row.current)}</td>
                            <td className="py-2 text-emerald-300 whitespace-pre-wrap">{render(row.proposed)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Contract</div>
            <div className="text-sm text-white">
              {amendment.contract?.contractNumber || '-'} - {amendment.contract?.title || '-'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Account</div>
            <div className="text-sm text-white">{amendment.contract?.account?.name || '-'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Facility</div>
            <div className="text-sm text-white">{amendment.contract?.facility?.name || 'No facility'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Effective Date</div>
            <div className="text-sm text-white">{formatDate(amendment.effectiveDate)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Proposed By</div>
            <div className="text-sm text-white">{amendment.proposedByUser.fullName}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Created</div>
            <div className="text-sm text-white">{formatDate(amendment.createdAt)}</div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 text-lg font-semibold text-white">Edit Amendment</div>
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
          />
          <Input
            type="date"
            label="Effective Date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            disabled={!canEdit}
          />
          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={saving} disabled={!canEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
