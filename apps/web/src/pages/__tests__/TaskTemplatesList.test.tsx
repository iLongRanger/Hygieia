import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TaskTemplatesList from '../tasks/TaskTemplatesList';
import type { TaskTemplate } from '../../types/task';
import type { AreaType, FixtureType } from '../../types/facility';

const listTaskTemplatesMock = vi.fn();
const createTaskTemplateMock = vi.fn();
const archiveTaskTemplateMock = vi.fn();
const restoreTaskTemplateMock = vi.fn();
const listAreaTypesMock = vi.fn();
const listFixtureTypesMock = vi.fn();

vi.mock('../../lib/tasks', () => ({
  listTaskTemplates: (...args: unknown[]) => listTaskTemplatesMock(...args),
  createTaskTemplate: (...args: unknown[]) => createTaskTemplateMock(...args),
  archiveTaskTemplate: (...args: unknown[]) => archiveTaskTemplateMock(...args),
  restoreTaskTemplate: (...args: unknown[]) => restoreTaskTemplateMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listAreaTypes: (...args: unknown[]) => listAreaTypesMock(...args),
  listFixtureTypes: (...args: unknown[]) => listFixtureTypesMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const areaType: AreaType = {
  id: 'area-1',
  name: 'Office',
  description: null,
  defaultSquareFeet: null,
  baseCleaningTimeMinutes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { areas: 0, taskTemplates: 1 },
};

const fixtureType: FixtureType = {
  id: 'fixture-1',
  name: 'Desk',
  description: null,
  category: 'fixture',
  defaultMinutesPerItem: '1',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const taskTemplate: TaskTemplate = {
  id: 'task-template-1',
  name: 'Vacuum Floors',
  description: null,
  cleaningType: 'daily',
  estimatedMinutes: 30,
  baseMinutes: '0',
  perSqftMinutes: '0',
  perUnitMinutes: '0',
  perRoomMinutes: '0',
  difficultyLevel: 3,
  requiredEquipment: [],
  requiredSupplies: [],
  instructions: null,
  isGlobal: true,
  version: 1,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  areaType: { id: 'area-1', name: 'Office' },
  facility: null,
  createdByUser: { id: 'user-1', fullName: 'Admin User' },
  fixtureMinutes: [],
  _count: { facilityTasks: 2 },
};

describe('TaskTemplatesList', () => {
  beforeEach(() => {
    listTaskTemplatesMock.mockResolvedValue({
      data: [taskTemplate],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listAreaTypesMock.mockResolvedValue({
      data: [areaType],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listFixtureTypesMock.mockResolvedValue({
      data: [fixtureType],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    createTaskTemplateMock.mockResolvedValue({ id: 'task-template-2' });
    archiveTaskTemplateMock.mockResolvedValue({ ...taskTemplate, archivedAt: new Date().toISOString() });
    restoreTaskTemplateMock.mockResolvedValue(taskTemplate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders templates from API', async () => {
    render(<TaskTemplatesList />);

    expect(await screen.findByText('Vacuum Floors')).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();
  });

  it('creates template from modal', async () => {
    const user = userEvent.setup();
    render(<TaskTemplatesList />);

    await user.click(screen.getByRole('button', { name: /create template/i }));
    const modalTitle = await screen.findByText(/create task template/i);
    const modal = modalTitle.parentElement?.parentElement as HTMLElement;
    expect(modal).toBeTruthy();
    await user.type(within(modal).getByLabelText(/template name/i), 'Wipe Desks');
    await user.click(within(modal).getByRole('button', { name: /^create template$/i }));

    await waitFor(() => {
      expect(createTaskTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wipe Desks',
          cleaningType: 'daily',
        })
      );
    });
  });

  it('archives template from row action', async () => {
    const user = userEvent.setup();
    render(<TaskTemplatesList />);

    const templateName = await screen.findByText('Vacuum Floors');
    const row = templateName.closest('tr');
    expect(row).toBeTruthy();
    const rowButtons = within(row as HTMLElement).getAllByRole('button');
    await user.click(rowButtons[rowButtons.length - 1]);

    await waitFor(() => {
      expect(archiveTaskTemplateMock).toHaveBeenCalledWith('task-template-1');
    });
  });
});
