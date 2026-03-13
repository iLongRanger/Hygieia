import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import {
  getFacility,
  updateFacility,
  listAreas,
  createArea,
  updateArea,
  archiveArea,
  restoreArea,
  deleteArea,
  listAreaTypes,
  listFixtureTypes,
  getAreaTemplateByAreaType,
  listFacilityTasks,
  createFacilityTask,
  updateFacilityTask,
  deleteFacilityTask,
  listTaskTemplates,
  submitFacilityForProposal,
} from '../../lib/facilities';
import type {
  Facility,
  Area,
  AreaType,
  UpdateFacilityInput,
  CreateAreaInput,
  UpdateAreaInput,
  FacilityTask,
  CreateFacilityTaskInput,
  UpdateFacilityTaskInput,
  TaskTemplate,
  CleaningFrequency,
  FixtureType,
} from '../../types/facility';
import { FacilityOverview } from './FacilityOverview';
import { FacilityAreas } from './FacilityAreas';
import { FacilityAreaDetail } from './FacilityAreaDetail';
import { EditFacilityModal } from './modals/EditFacilityModal';
import { AreaModal } from './modals/AreaModal';
import { TaskModal } from './modals/TaskModal';
import { TaskSelectionModal } from './modals/TaskSelectionModal';
import { SubmitProposalModal } from './modals/SubmitProposalModal';
import {
  isCleaningFrequency,
  ORDERED_CLEANING_FREQUENCIES,
  CLEANING_FREQUENCIES,
} from './facility-constants';
import type { AreaTemplateTaskSelection, AreaItemInput } from './facility-constants';

const FacilityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<'overview' | 'areas' | 'area-detail'>('overview');
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  // --- Data state ---
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [tasks, setTasks] = useState<FacilityTask[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [fixtureTypes, setFixtureTypes] = useState<FixtureType[]>([]);
  const [areaTemplateTasks, setAreaTemplateTasks] = useState<AreaTemplateTaskSelection[]>([]);
  const [areaTemplateLoading, setAreaTemplateLoading] = useState(false);
  const [areaTemplateUsesBackendTemplateTasks, setAreaTemplateUsesBackendTemplateTasks] =
    useState(false);
  const [areaTaskPipelineStep, setAreaTaskPipelineStep] = useState(0);
  const [reviewedAreaTaskFrequencies, setReviewedAreaTaskFrequencies] =
    useState<Set<CleaningFrequency>>(new Set());
  const [newAreaCustomTaskName, setNewAreaCustomTaskName] = useState('');

  // --- Modal state ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskSelectionModal, setShowTaskSelectionModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingTask, setEditingTask] = useState<FacilityTask | null>(null);
  const [selectedAreaForTask, setSelectedAreaForTask] = useState<Area | null>(null);
  const [taskSelectionTasks, setTaskSelectionTasks] = useState<AreaTemplateTaskSelection[]>([]);
  const [taskSelectionStep, setTaskSelectionStep] = useState(0);
  const [reviewedTaskSelectionFrequencies, setReviewedTaskSelectionFrequencies] =
    useState<Set<CleaningFrequency>>(new Set());
  const [newTaskSelectionCustomName, setNewTaskSelectionCustomName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSubmitProposalModal, setShowSubmitProposalModal] = useState(false);
  const [submitProposalNotes, setSubmitProposalNotes] = useState('');
  const [submittingForProposal, setSubmittingForProposal] = useState(false);

  const getPreferredTaskFrequency = useCallback(
    (preferred?: string | null): CleaningFrequency => {
      const availableFrequencies = ORDERED_CLEANING_FREQUENCIES.filter((frequency) =>
        taskTemplates.some((template) => template.cleaningType === frequency)
      );

      if (preferred && isCleaningFrequency(preferred) && availableFrequencies.includes(preferred)) {
        return preferred;
      }

      return availableFrequencies[0] || 'daily';
    },
    [taskTemplates]
  );

  // --- Form state ---
  const [facilityForm, setFacilityForm] = useState<UpdateFacilityInput>({});
  const [areaForm, setAreaForm] = useState<CreateAreaInput | UpdateAreaInput>({
    facilityId: id || '',
    areaTypeId: '',
    name: '',
    length: null,
    width: null,
    squareFeet: null,
    floorType: 'vct',
    conditionLevel: 'standard',
    roomCount: 0,
    unitCount: 0,
    trafficLevel: 'medium',
    notes: null,
    fixtures: [],
  });
  const [taskForm, setTaskForm] = useState<
    CreateFacilityTaskInput | UpdateFacilityTaskInput
  >({
    facilityId: id || '',
    areaId: null,
    taskTemplateId: null,
    customName: '',
    cleaningFrequency: 'daily',
    priority: 3,
    baseMinutesOverride: null,
    perSqftMinutesOverride: null,
    perUnitMinutesOverride: null,
    perRoomMinutesOverride: null,
    fixtureMinutes: [],
  });

  // --- Memos ---
  const filteredTaskTemplates = useMemo(() => {
    const frequency = taskForm.cleaningFrequency || 'daily';
    const matchingTemplates = taskTemplates.filter(
      (template) => template.cleaningType === frequency
    );
    return matchingTemplates.length > 0 ? matchingTemplates : taskTemplates;
  }, [taskTemplates, taskForm.cleaningFrequency]);

  const currentAreaTaskFrequency =
    ORDERED_CLEANING_FREQUENCIES[areaTaskPipelineStep] || 'daily';
  const currentTaskSelectionFrequency =
    ORDERED_CLEANING_FREQUENCIES[taskSelectionStep] || 'daily';

  const filteredAreaTemplateTasks = useMemo(
    () =>
      areaTemplateTasks.filter(
        (task) => task.cleaningType === currentAreaTaskFrequency
      ),
    [areaTemplateTasks, currentAreaTaskFrequency]
  );
  const filteredTaskSelectionTasks = useMemo(
    () =>
      taskSelectionTasks.filter(
        (task) => task.cleaningType === currentTaskSelectionFrequency
      ),
    [taskSelectionTasks, currentTaskSelectionFrequency]
  );

  const allAreaTaskFrequenciesReviewed =
    reviewedAreaTaskFrequencies.size === ORDERED_CLEANING_FREQUENCIES.length;
  const hasSelectedTaskSelectionTasks = taskSelectionTasks.some((task) => task.include);
  const hasExistingProposalOrContract =
    (facility?._count?.proposals ?? 0) > 0 || (facility?._count?.contracts ?? 0) > 0;

  // --- Effects ---
  useEffect(() => {
    if (!taskForm.taskTemplateId) return;
    const matchesFrequency = filteredTaskTemplates.some(
      (template) => template.id === taskForm.taskTemplateId
    );
    if (!matchesFrequency) {
      setTaskForm((prev) => ({
        ...prev,
        taskTemplateId: filteredTaskTemplates[0]?.id || null,
      }));
    }
  }, [filteredTaskTemplates, taskForm.taskTemplateId]);

  // --- Data fetching ---
  const fetchFacility = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getFacility(id);
      if (data) {
        setFacility(data);
        setFacilityForm({
          name: data.name,
          address: data.address,
          buildingType: data.buildingType,
          status: data.status,
          notes: data.notes,
          accessInstructions: data.accessInstructions,
          parkingInfo: data.parkingInfo,
          specialRequirements: data.specialRequirements,
        });
      }
    } catch (error) {
      console.error('Failed to fetch facility:', error);
      setFacility(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAreas = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listAreas({
        facilityId: id,
        includeArchived: true,
      });
      setAreas(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch areas:', error);
      setAreas([]);
    }
  }, [id]);

  const fetchAreaTypes = useCallback(async () => {
    try {
      const response = await listAreaTypes({ limit: 100 });
      setAreaTypes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch area types:', error);
      setAreaTypes([]);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    try {
      const response = await listFacilityTasks({
        facilityId: id,
        limit: 100,
      });
      setTasks(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setTasks([]);
    }
  }, [id]);

  const fetchTaskTemplates = useCallback(async () => {
    try {
      const response = await listTaskTemplates({ isActive: true, limit: 100 });
      setTaskTemplates(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch task templates:', error);
      setTaskTemplates([]);
    }
  }, []);

  const fetchFixtureTypes = useCallback(async () => {
    try {
      const response = await listFixtureTypes({ isActive: true, limit: 100 });
      setFixtureTypes(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch fixture types:', error);
      setFixtureTypes([]);
    }
  }, []);

  const buildFallbackTemplateTasks = useCallback(
    (areaTypeId: string): AreaTemplateTaskSelection[] =>
      taskTemplates
        .filter(
          (template) =>
            template.isActive
            && (
              template.areaType?.id === areaTypeId
              || template.isGlobal
              || !template.areaType?.id
            )
        )
        .map((template) => ({
          id: `task-template-${template.id}`,
          taskTemplateId: template.id,
          name: template.name,
          cleaningType: isCleaningFrequency(template.cleaningType)
            ? template.cleaningType
            : 'daily',
          estimatedMinutes: template.estimatedMinutes ?? null,
          baseMinutes: Number(template.baseMinutes) || 0,
          perSqftMinutes: Number(template.perSqftMinutes) || 0,
          perUnitMinutes: Number(template.perUnitMinutes) || 0,
          perRoomMinutes: Number(template.perRoomMinutes) || 0,
          include: true,
        })),
    [taskTemplates]
  );

  const applyAreaTemplate = useCallback(async (areaTypeId: string) => {
    if (!areaTypeId || editingArea) {
      setAreaTemplateTasks([]);
      setAreaTemplateUsesBackendTemplateTasks(false);
      return;
    }
    try {
      setAreaTemplateLoading(true);
      const template = await getAreaTemplateByAreaType(areaTypeId);
      const templateItems = template.items?.map((item) => ({
        fixtureTypeId: item.fixtureType.id,
        count: item.defaultCount,
        minutesPerItem: Number(item.minutesPerItem) || 0,
      })) || [];
      const templateTasks = template.tasks?.map((task) => ({
        id: task.id,
        taskTemplateId: task.taskTemplate?.id || null,
        name: task.taskTemplate?.name || task.name || 'Untitled Task',
        cleaningType:
          task.taskTemplate?.cleaningType &&
          isCleaningFrequency(task.taskTemplate.cleaningType)
            ? task.taskTemplate.cleaningType
            : 'daily',
        estimatedMinutes: task.taskTemplate?.estimatedMinutes ?? null,
        baseMinutes: Number(task.taskTemplate?.baseMinutes ?? task.baseMinutes) || 0,
        perSqftMinutes: Number(task.taskTemplate?.perSqftMinutes ?? task.perSqftMinutes) || 0,
        perUnitMinutes: Number(task.taskTemplate?.perUnitMinutes ?? task.perUnitMinutes) || 0,
        perRoomMinutes: Number(task.taskTemplate?.perRoomMinutes ?? task.perRoomMinutes) || 0,
        include: true,
      })) || [];
      const fallbackTasks = buildFallbackTemplateTasks(areaTypeId);
      const tasksForSelection = templateTasks.length > 0 ? templateTasks : fallbackTasks;

      setAreaTemplateTasks(tasksForSelection);
      setAreaTemplateUsesBackendTemplateTasks(templateTasks.length > 0);
      setAreaTaskPipelineStep(0);
      setReviewedAreaTaskFrequencies(new Set());
      setNewAreaCustomTaskName('');
      setAreaForm((prev) => {
        const areaType = areaTypes.find((type) => type.id === areaTypeId);
        const defaultSquareFeet = template.defaultSquareFeet
          ? Number(template.defaultSquareFeet)
          : areaType?.defaultSquareFeet
            ? Number(areaType.defaultSquareFeet)
            : null;
        return {
          ...prev,
          squareFeet: prev.squareFeet ?? defaultSquareFeet,
          fixtures: templateItems,
        };
      });
    } catch (error) {
      console.error('Failed to load area template:', error);
      const fallbackTasks = buildFallbackTemplateTasks(areaTypeId);
      setAreaTemplateTasks(fallbackTasks);
      setAreaTemplateUsesBackendTemplateTasks(false);
      setAreaTaskPipelineStep(0);
      setReviewedAreaTaskFrequencies(new Set());
    } finally {
      setAreaTemplateLoading(false);
    }
  }, [areaTypes, editingArea, buildFallbackTemplateTasks]);

  useEffect(() => {
    fetchFacility();
    fetchAreas();
    fetchAreaTypes();
    fetchTasks();
    fetchTaskTemplates();
    fetchFixtureTypes();
  }, [
    fetchFacility,
    fetchAreas,
    fetchAreaTypes,
    fetchTasks,
    fetchTaskTemplates,
    fetchFixtureTypes,
  ]);

  // --- Computed values ---
  const totalSquareFeetFromAreas = areas
    .filter((area) => !area.archivedAt)
    .reduce((sum, area) => {
      const sqFt = Number(area.squareFeet) || 0;
      const qty = area.quantity || 1;
      return sum + sqFt * qty;
    }, 0);
  const activeAreasCount = areas.filter((area) => !area.archivedAt).length;
  const activeTasksCount = tasks.filter((task) => !task.archivedAt).length;
  const taskFixtureTypes = fixtureTypes.filter((type) => type.category === 'fixture');

  // --- Helpers used by handlers ---
  const getTaskDisplayName = (task: FacilityTask) =>
    (task.customName || task.taskTemplate?.name || '').trim();

  const normalizeTaskName = (name: string) =>
    name.trim().replace(/\s+/g, ' ').toLowerCase();

  const templateSpecificity = (template: TaskTemplate, areaTypeId: string) => {
    if (template.areaType?.id === areaTypeId) return 0;
    if (template.isGlobal) return 1;
    return 2;
  };

  const findDuplicateTask = (params: {
    areaId?: string | null;
    cleaningFrequency: CleaningFrequency;
    taskTemplateId?: string | null;
    customName?: string | null;
    excludeTaskId?: string;
  }) => {
    const incomingName = params.taskTemplateId
      ? taskTemplates.find((template) => template.id === params.taskTemplateId)
          ?.name || ''
      : params.customName || '';
    const normalizedIncomingName = normalizeTaskName(incomingName);

    if (!normalizedIncomingName) return null;

    return (
      tasks.find((task) => {
        if (task.archivedAt) return false;
        if (params.excludeTaskId && task.id === params.excludeTaskId) return false;

        const existingAreaId = task.area?.id || null;
        const incomingAreaId = params.areaId || null;
        if (existingAreaId !== incomingAreaId) return false;

        if (task.cleaningFrequency !== params.cleaningFrequency) return false;

        const existingTaskName = normalizeTaskName(
          task.customName || task.taskTemplate?.name || ''
        );
        return existingTaskName === normalizedIncomingName;
      }) || null
    );
  };

  const getTasksForArea = (areaId: string) => {
    return tasks.filter((t) => t.area?.id === areaId && !t.archivedAt);
  };

  // --- Tab navigation ---
  const handleSelectArea = (area: Area) => {
    setSelectedArea(area);
    setActiveTab('area-detail');
  };

  // --- Form resets ---
  const resetAreaForm = () => {
    setAreaForm({
      facilityId: id || '',
      areaTypeId: '',
      name: '',
      length: null,
      width: null,
      squareFeet: null,
      floorType: 'vct',
      conditionLevel: 'standard',
      roomCount: 0,
      unitCount: 0,
      trafficLevel: 'medium',
      notes: null,
      fixtures: [],
    });
    setAreaTemplateTasks([]);
    setAreaTemplateUsesBackendTemplateTasks(false);
    setAreaTaskPipelineStep(0);
    setReviewedAreaTaskFrequencies(new Set());
    setNewAreaCustomTaskName('');
  };

  const resetTaskForm = () => {
    setTaskForm({
      facilityId: id || '',
      areaId: null,
      taskTemplateId: null,
      customName: '',
      cleaningFrequency: getPreferredTaskFrequency(),
      priority: 3,
      baseMinutesOverride: null,
      perSqftMinutesOverride: null,
      perUnitMinutesOverride: null,
      perRoomMinutesOverride: null,
      fixtureMinutes: [],
    });
  };

  const resetTaskSelectionState = () => {
    setTaskSelectionTasks([]);
    setTaskSelectionStep(0);
    setReviewedTaskSelectionFrequencies(new Set());
    setNewTaskSelectionCustomName('');
  };

  // --- Handlers ---
  const handleUpdateFacility = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateFacility(id, facilityForm);
      setShowEditModal(false);
      fetchFacility();
    } catch (error) {
      console.error('Failed to update facility:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveArea = async () => {
    if (!id) return;
    try {
      setSaving(true);
      if (editingArea) {
        await updateArea(editingArea.id, areaForm as UpdateAreaInput);
      } else {
        const excludeTaskTemplateIds = areaTemplateTasks
          .filter((task) => !task.include && task.taskTemplateId)
          .map((task) => task.taskTemplateId!);

        const createdArea = await createArea({
          ...areaForm,
          facilityId: id,
          applyTemplate: true,
          excludeTaskTemplateIds,
        } as CreateAreaInput);

        if (!areaTemplateUsesBackendTemplateTasks) {
          const selectedTemplateTasks = areaTemplateTasks.filter(
            (task) => task.include && task.taskTemplateId
          );
          if (selectedTemplateTasks.length > 0) {
            await Promise.all(
              selectedTemplateTasks.map((task) =>
                createFacilityTask({
                  facilityId: id,
                  areaId: createdArea.id,
                  taskTemplateId: task.taskTemplateId,
                  cleaningFrequency: isCleaningFrequency(task.cleaningType)
                    ? task.cleaningType
                    : 'daily',
                  priority: 3,
                } as CreateFacilityTaskInput)
              )
            );
          }
        }

        const selectedLegacyTasks = areaTemplateTasks.filter(
          (task) => task.include && !task.taskTemplateId
        );
        if (selectedLegacyTasks.length > 0) {
          await Promise.all(
            selectedLegacyTasks.map((task) =>
              createFacilityTask({
                facilityId: id,
                areaId: createdArea.id,
                taskTemplateId: null,
                customName: task.name,
                baseMinutesOverride: task.baseMinutes,
                perSqftMinutesOverride: task.perSqftMinutes,
                perUnitMinutesOverride: task.perUnitMinutes,
                perRoomMinutesOverride: task.perRoomMinutes,
                cleaningFrequency: isCleaningFrequency(task.cleaningType)
                  ? task.cleaningType
                  : 'daily',
                priority: 3,
              } as CreateFacilityTaskInput)
            )
          );
        }
      }
      setShowAreaModal(false);
      setEditingArea(null);
      resetAreaForm();
      fetchAreas();
      fetchTasks();
    } catch (error) {
      console.error('Failed to save area:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveArea = async (areaId: string) => {
    try {
      await archiveArea(areaId);
      fetchAreas();
    } catch (error) {
      console.error('Failed to archive area:', error);
    }
  };

  const handleRestoreArea = async (areaId: string) => {
    try {
      await restoreArea(areaId);
      fetchAreas();
    } catch (error) {
      console.error('Failed to restore area:', error);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm('Are you sure you want to permanently delete this area?'))
      return;
    try {
      await deleteArea(areaId);
      fetchAreas();
    } catch (error) {
      console.error('Failed to delete area:', error);
    }
  };

  const handleSaveTask = async () => {
    if (!id) return;

    const selectedAreaId = taskForm.areaId ?? selectedAreaForTask?.id ?? null;
    const duplicateTask = findDuplicateTask({
      areaId: selectedAreaId,
      cleaningFrequency: taskForm.cleaningFrequency || 'daily',
      taskTemplateId: taskForm.taskTemplateId,
      customName: taskForm.customName,
      excludeTaskId: editingTask?.id,
    });

    if (duplicateTask) {
      toast.error(
        `Duplicate task "${getTaskDisplayName(
          duplicateTask
        )}" already exists for this area and frequency`
      );
      return;
    }

    try {
      setSaving(true);
      if (editingTask) {
        await updateFacilityTask(
          editingTask.id,
          taskForm as UpdateFacilityTaskInput
        );
        toast.success('Task updated');
      } else {
        await createFacilityTask({
          ...taskForm,
          facilityId: id,
          areaId: selectedAreaId,
        } as CreateFacilityTaskInput);
        toast.success('Task added');
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setSelectedAreaForTask(null);
      resetTaskForm();
      fetchTasks();
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteFacilityTask(taskId);
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleSaveSelectedTasks = async () => {
    if (!id) return;

    const selectedAreaId = selectedAreaForTask?.id || null;
    const includedTasks = taskSelectionTasks.filter((task) => task.include);

    if (includedTasks.length === 0) {
      toast.error('Select at least one task to add');
      return;
    }

    const duplicateTasks = includedTasks.filter((task) =>
      Boolean(
        findDuplicateTask({
          areaId: selectedAreaId,
          cleaningFrequency: isCleaningFrequency(task.cleaningType)
            ? task.cleaningType
            : 'daily',
          taskTemplateId: task.taskTemplateId,
          customName: task.taskTemplateId ? null : task.name,
        })
      )
    );

    const tasksToCreate = includedTasks.filter(
      (task) => !duplicateTasks.some((duplicate) => duplicate.id === task.id)
    );

    if (tasksToCreate.length === 0) {
      toast.error('All selected tasks already exist for this area and frequency');
      return;
    }

    try {
      setSaving(true);
      await Promise.all(
        tasksToCreate.map((task) =>
          createFacilityTask({
            facilityId: id,
            areaId: selectedAreaId,
            taskTemplateId: task.taskTemplateId,
            customName: task.taskTemplateId ? null : task.name,
            baseMinutesOverride: task.taskTemplateId ? null : task.baseMinutes,
            perSqftMinutesOverride: task.taskTemplateId ? null : task.perSqftMinutes,
            perUnitMinutesOverride: task.taskTemplateId ? null : task.perUnitMinutes,
            perRoomMinutesOverride: task.taskTemplateId ? null : task.perRoomMinutes,
            cleaningFrequency: isCleaningFrequency(task.cleaningType)
              ? task.cleaningType
              : 'daily',
            priority: 3,
          } as CreateFacilityTaskInput)
        )
      );
      if (duplicateTasks.length > 0) {
        toast('Skipped duplicate tasks that already exist');
      }
      toast.success(`Added ${tasksToCreate.length} task${tasksToCreate.length === 1 ? '' : 's'}`);
      setShowTaskSelectionModal(false);
      setSelectedAreaForTask(null);
      resetTaskSelectionState();
      fetchTasks();
    } catch (error) {
      console.error('Failed to add tasks:', error);
      toast.error('Failed to add tasks');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForProposal = async () => {
    if (!id) return;
    try {
      setSubmittingForProposal(true);
      const result = await submitFacilityForProposal(id, submitProposalNotes || null);
      setShowSubmitProposalModal(false);
      setSubmitProposalNotes('');
      if (result.alreadyCompleted) {
        toast.success('Facility submitted. Walkthrough was already completed.');
      } else {
        toast.success('Facility submitted. Walkthrough marked completed and lead updated.');
      }
    } catch (error: any) {
      console.error('Failed to submit facility for proposal:', error);
      const message =
        error?.response?.data?.error?.message
        || error?.response?.data?.message
        || 'Failed to submit facility for proposal';
      toast.error(message);
    } finally {
      setSubmittingForProposal(false);
    }
  };

  const handleSaveFacilityDraft = () => {
    setShowSubmitProposalModal(false);
    toast.success('Facility details saved as draft. Walkthrough remains in progress.');
  };

  const buildTaskSelectionsForArea = (area: Area) => {
    const matchingTemplates = taskTemplates
      .filter(
        (template) =>
          template.isActive
          && (
            template.areaType?.id === area.areaType.id
            || template.isGlobal
            || !template.areaType?.id
          )
      )
      .sort((a, b) => {
        const aSpecificity = templateSpecificity(a, area.areaType.id);
        const bSpecificity = templateSpecificity(b, area.areaType.id);
        if (aSpecificity !== bSpecificity) return aSpecificity - bSpecificity;
        const aIndex = ORDERED_CLEANING_FREQUENCIES.indexOf(
          isCleaningFrequency(a.cleaningType) ? a.cleaningType : 'daily'
        );
        const bIndex = ORDERED_CLEANING_FREQUENCIES.indexOf(
          isCleaningFrequency(b.cleaningType) ? b.cleaningType : 'daily'
        );
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.name.localeCompare(b.name);
      });

    const uniqueTemplates = matchingTemplates.filter((template, index, templates) => {
      const normalizedKey = `${normalizeTaskName(template.name)}::${template.cleaningType}`;
      return (
        templates.findIndex(
          (candidate) =>
            `${normalizeTaskName(candidate.name)}::${candidate.cleaningType}` === normalizedKey
        ) === index
      );
    });

    return uniqueTemplates.map((template) => ({
      id: `task-template-${template.id}`,
      taskTemplateId: template.id,
      name: template.name,
      cleaningType: isCleaningFrequency(template.cleaningType)
        ? template.cleaningType
        : 'daily',
      estimatedMinutes: template.estimatedMinutes ?? null,
      baseMinutes: Number(template.baseMinutes) || 0,
      perSqftMinutes: Number(template.perSqftMinutes) || 0,
      perUnitMinutes: Number(template.perUnitMinutes) || 0,
      perRoomMinutes: Number(template.perRoomMinutes) || 0,
      include: true,
    }));
  };

  const openTaskSelectionForArea = (area: Area) => {
    setSelectedAreaForTask(area);
    setEditingTask(null);
    resetTaskSelectionState();
    setTaskSelectionTasks(buildTaskSelectionsForArea(area));
    setShowTaskSelectionModal(true);
  };

  const openBulkTaskForArea = (area: Area) => {
    openTaskSelectionForArea(area);
  };

  const openAddTaskForArea = (area: Area) => {
    openTaskSelectionForArea(area);
  };

  const openEditTask = (task: FacilityTask) => {
    setEditingTask(task);
    setSelectedAreaForTask(
      task.area ? areas.find((a) => a.id === task.area?.id) || null : null
    );
    setTaskForm({
      areaId: task.area?.id || null,
      taskTemplateId: task.taskTemplate?.id || null,
      customName: task.customName || '',
      customInstructions: task.customInstructions || '',
      estimatedMinutes: task.estimatedMinutes,
      baseMinutesOverride: task.baseMinutesOverride ? Number(task.baseMinutesOverride) : null,
      perSqftMinutesOverride: task.perSqftMinutesOverride ? Number(task.perSqftMinutesOverride) : null,
      perUnitMinutesOverride: task.perUnitMinutesOverride ? Number(task.perUnitMinutesOverride) : null,
      perRoomMinutesOverride: task.perRoomMinutesOverride ? Number(task.perRoomMinutesOverride) : null,
      cleaningFrequency: task.cleaningFrequency,
      priority: task.priority,
      fixtureMinutes: task.fixtureMinutes?.map((fixture) => ({
        fixtureTypeId: fixture.fixtureType.id,
        minutesPerFixture: Number(fixture.minutesPerFixture) || 0,
      })) || [],
    });
    setShowTaskModal(true);
  };

  const getTaskFixtureMinutes = (fixtureTypeId: string) => {
    const fixtures = (taskForm as CreateFacilityTaskInput).fixtureMinutes || [];
    return fixtures.find((fixture) => fixture.fixtureTypeId === fixtureTypeId)?.minutesPerFixture || 0;
  };

  const updateTaskFixtureMinutes = (fixtureTypeId: string, minutesPerFixture: number) => {
    setTaskForm((prev) => {
      const current = (prev as CreateFacilityTaskInput).fixtureMinutes || [];
      const index = current.findIndex((fixture) => fixture.fixtureTypeId === fixtureTypeId);
      const updated = [...current];
      if (index >= 0) {
        updated[index] = { fixtureTypeId, minutesPerFixture };
      } else {
        updated.push({ fixtureTypeId, minutesPerFixture });
      }
      return { ...prev, fixtureMinutes: updated };
    });
  };

  const toggleAreaTemplateTaskInclude = (taskId: string, include: boolean) => {
    setAreaTemplateTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, include } : task))
    );
  };

  const markCurrentAreaTaskFrequencyReviewed = () => {
    setReviewedAreaTaskFrequencies((prev) => {
      const next = new Set(prev);
      next.add(currentAreaTaskFrequency);
      return next;
    });
  };

  const goToNextAreaTaskFrequencyStep = () => {
    markCurrentAreaTaskFrequencyReviewed();
    setAreaTaskPipelineStep((prev) =>
      Math.min(prev + 1, ORDERED_CLEANING_FREQUENCIES.length - 1)
    );
  };

  const goToPreviousAreaTaskFrequencyStep = () => {
    setAreaTaskPipelineStep((prev) => Math.max(prev - 1, 0));
  };

  const addCustomAreaTemplateTask = () => {
    const name = newAreaCustomTaskName.trim();
    if (!name) {
      toast.error('Enter a task name');
      return;
    }

    const duplicate = areaTemplateTasks.some(
      (task) =>
        task.cleaningType === currentAreaTaskFrequency &&
        task.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      toast.error('Task already exists in this frequency');
      return;
    }

    setAreaTemplateTasks((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskTemplateId: null,
        name,
        cleaningType: currentAreaTaskFrequency,
        estimatedMinutes: null,
        baseMinutes: 0,
        perSqftMinutes: 0,
        perUnitMinutes: 0,
        perRoomMinutes: 0,
        include: true,
      },
    ]);
    setNewAreaCustomTaskName('');
  };

  const removeCustomAreaTemplateTask = (taskId: string) => {
    setAreaTemplateTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const toggleTaskSelectionInclude = (taskId: string, include: boolean) => {
    setTaskSelectionTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, include } : task))
    );
  };

  const markCurrentTaskSelectionFrequencyReviewed = () => {
    setReviewedTaskSelectionFrequencies((prev) => {
      const next = new Set(prev);
      next.add(currentTaskSelectionFrequency);
      return next;
    });
  };

  const goToNextTaskSelectionStep = () => {
    markCurrentTaskSelectionFrequencyReviewed();
    setTaskSelectionStep((prev) =>
      Math.min(prev + 1, ORDERED_CLEANING_FREQUENCIES.length - 1)
    );
  };

  const goToPreviousTaskSelectionStep = () => {
    setTaskSelectionStep((prev) => Math.max(prev - 1, 0));
  };

  const addCustomTaskSelectionTask = () => {
    const name = newTaskSelectionCustomName.trim();
    if (!name) {
      toast.error('Enter a task name');
      return;
    }

    const duplicate = taskSelectionTasks.some(
      (task) =>
        task.cleaningType === currentTaskSelectionFrequency
        && task.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      toast.error('Task already exists in this frequency');
      return;
    }

    setTaskSelectionTasks((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskTemplateId: null,
        name,
        cleaningType: currentTaskSelectionFrequency,
        estimatedMinutes: null,
        baseMinutes: 0,
        perSqftMinutes: 0,
        perUnitMinutes: 0,
        perRoomMinutes: 0,
        include: true,
      },
    ]);
    setNewTaskSelectionCustomName('');
  };

  const removeCustomTaskSelectionTask = (taskId: string) => {
    setTaskSelectionTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const openEditArea = (area: Area) => {
    setEditingArea(area);
    setAreaForm({
      areaTypeId: area.areaType.id,
      name: area.name,
      length: area.length ? Number(area.length) : null,
      width: area.width ? Number(area.width) : null,
      squareFeet: area.squareFeet ? Number(area.squareFeet) : null,
      floorType: area.floorType || 'vct',
      conditionLevel: area.conditionLevel || 'standard',
      roomCount: area.roomCount || 0,
      unitCount: area.unitCount || 0,
      trafficLevel: area.trafficLevel || 'medium',
      notes: area.notes,
      fixtures: area.fixtures?.map((fixture) => ({
        fixtureTypeId: fixture.fixtureType.id,
        count: fixture.count,
        minutesPerItem: fixture.minutesPerItem ? Number(fixture.minutesPerItem) : 0,
      })) || [],
    });
    setShowAreaModal(true);
  };

  const addItemToArea = () => {
    const availableType = fixtureTypes[0];
    if (!availableType) {
      toast.error('No item types available');
      return;
    }
    setAreaForm((prev) => {
      const fixtures = (prev as CreateAreaInput).fixtures || [];
      return {
        ...prev,
        fixtures: [
          ...fixtures,
          {
            fixtureTypeId: availableType.id,
            count: 1,
            minutesPerItem: Number(availableType.defaultMinutesPerItem) || 0,
          },
        ],
      };
    });
  };

  const updateAreaItem = (index: number, patch: Partial<AreaItemInput>) => {
    setAreaForm((prev) => {
      const fixtures = [...((prev as CreateAreaInput).fixtures || [])];
      fixtures[index] = { ...fixtures[index], ...patch };
      return { ...prev, fixtures };
    });
  };

  const removeAreaItem = (index: number) => {
    setAreaForm((prev) => {
      const fixtures = [...((prev as CreateAreaInput).fixtures || [])];
      fixtures.splice(index, 1);
      return { ...prev, fixtures };
    });
  };

  // --- Early returns ---
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
      </div>
    );
  }

  if (!facility) {
    return <div className="text-center text-gray-400">Facility not found</div>;
  }

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" onClick={() => navigate('/facilities')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{facility.name}</h1>
          <p className="text-gray-400">{facility.account.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {!hasExistingProposalOrContract && (
            <Button
              onClick={() => setShowSubmitProposalModal(true)}
              disabled={activeAreasCount === 0 || activeTasksCount === 0}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit for Proposal
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Facility
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-white/10">
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'overview'
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald" />
          )}
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'areas'
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('areas')}
        >
          Areas ({activeAreasCount})
          {activeTab === 'areas' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald" />
          )}
        </button>
        {selectedArea && (
          <button
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'area-detail'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('area-detail')}
          >
            {selectedArea.name || selectedArea.areaType.name}
            {activeTab === 'area-detail' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald" />
            )}
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <FacilityOverview
          facility={facility}
          totalSquareFeet={totalSquareFeetFromAreas}
          activeAreasCount={activeAreasCount}
          activeTasksCount={activeTasksCount}
        />
      )}
      {activeTab === 'areas' && (
        <FacilityAreas
          areas={areas}
          tasks={tasks}
          onSelectArea={handleSelectArea}
          onAddArea={() => {
            resetAreaForm();
            setEditingArea(null);
            setShowAreaModal(true);
          }}
          onAddTask={openAddTaskForArea}
          onEditArea={openEditArea}
          onArchiveArea={handleArchiveArea}
          onRestoreArea={handleRestoreArea}
          onDeleteArea={handleDeleteArea}
          totalSquareFeet={totalSquareFeetFromAreas}
        />
      )}
      {activeTab === 'area-detail' && selectedArea && (
        <FacilityAreaDetail
          area={selectedArea}
          tasks={getTasksForArea(selectedArea.id)}
          onBack={() => setActiveTab('areas')}
          onEditArea={openEditArea}
          onAddTask={openAddTaskForArea}
          onBulkAddTasks={openBulkTaskForArea}
          onEditTask={openEditTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Modals */}
      <EditFacilityModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        facilityForm={facilityForm}
        setFacilityForm={setFacilityForm}
        onSave={handleUpdateFacility}
        saving={saving}
      />
      <AreaModal
        isOpen={showAreaModal}
        onClose={() => {
          setShowAreaModal(false);
          setEditingArea(null);
          resetAreaForm();
        }}
        editingArea={editingArea}
        areaForm={areaForm}
        setAreaForm={setAreaForm}
        areaTypes={areaTypes}
        fixtureTypes={fixtureTypes}
        applyAreaTemplate={applyAreaTemplate}
        areaTemplateLoading={areaTemplateLoading}
        areaTemplateTasks={areaTemplateTasks}
        filteredAreaTemplateTasks={filteredAreaTemplateTasks}
        currentAreaTaskFrequency={currentAreaTaskFrequency}
        areaTaskPipelineStep={areaTaskPipelineStep}
        reviewedAreaTaskFrequencies={reviewedAreaTaskFrequencies}
        allAreaTaskFrequenciesReviewed={allAreaTaskFrequenciesReviewed}
        newAreaCustomTaskName={newAreaCustomTaskName}
        setNewAreaCustomTaskName={setNewAreaCustomTaskName}
        toggleAreaTemplateTaskInclude={toggleAreaTemplateTaskInclude}
        addCustomAreaTemplateTask={addCustomAreaTemplateTask}
        removeCustomAreaTemplateTask={removeCustomAreaTemplateTask}
        goToNextAreaTaskFrequencyStep={goToNextAreaTaskFrequencyStep}
        goToPreviousAreaTaskFrequencyStep={goToPreviousAreaTaskFrequencyStep}
        addItemToArea={addItemToArea}
        updateAreaItem={updateAreaItem}
        removeAreaItem={removeAreaItem}
        onSave={handleSaveArea}
        saving={saving}
      />
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
          setSelectedAreaForTask(null);
          resetTaskForm();
        }}
        editingTask={editingTask}
        selectedAreaForTask={selectedAreaForTask}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        filteredTaskTemplates={filteredTaskTemplates}
        taskFixtureTypes={taskFixtureTypes}
        getTaskFixtureMinutes={getTaskFixtureMinutes}
        updateTaskFixtureMinutes={updateTaskFixtureMinutes}
        onSave={handleSaveTask}
        saving={saving}
      />
      <TaskSelectionModal
        isOpen={showTaskSelectionModal}
        onClose={() => {
          setShowTaskSelectionModal(false);
          setSelectedAreaForTask(null);
          resetTaskSelectionState();
        }}
        selectedAreaForTask={selectedAreaForTask}
        filteredTaskSelectionTasks={filteredTaskSelectionTasks}
        currentTaskSelectionFrequency={currentTaskSelectionFrequency}
        taskSelectionStep={taskSelectionStep}
        reviewedTaskSelectionFrequencies={reviewedTaskSelectionFrequencies}
        newTaskSelectionCustomName={newTaskSelectionCustomName}
        setNewTaskSelectionCustomName={setNewTaskSelectionCustomName}
        toggleTaskSelectionInclude={toggleTaskSelectionInclude}
        addCustomTaskSelectionTask={addCustomTaskSelectionTask}
        removeCustomTaskSelectionTask={removeCustomTaskSelectionTask}
        goToNextTaskSelectionStep={goToNextTaskSelectionStep}
        goToPreviousTaskSelectionStep={goToPreviousTaskSelectionStep}
        onSave={handleSaveSelectedTasks}
        saving={saving}
        hasSelectedTasks={hasSelectedTaskSelectionTasks}
      />
      <SubmitProposalModal
        isOpen={showSubmitProposalModal}
        onClose={() => {
          if (submittingForProposal) return;
          setShowSubmitProposalModal(false);
        }}
        facilityName={facility.name}
        accountName={facility.account.name}
        totalSquareFeet={totalSquareFeetFromAreas}
        areas={areas}
        tasks={tasks}
        activeAreasCount={activeAreasCount}
        activeTasksCount={activeTasksCount}
        submitProposalNotes={submitProposalNotes}
        setSubmitProposalNotes={setSubmitProposalNotes}
        onCompleteWalkthrough={handleSubmitForProposal}
        onSaveDraft={handleSaveFacilityDraft}
        submitting={submittingForProposal}
      />
    </div>
  );
};

export default FacilityDetail;
