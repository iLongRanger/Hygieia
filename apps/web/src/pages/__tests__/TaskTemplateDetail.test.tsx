import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TaskTemplateDetail from '../tasks/TaskTemplateDetail';
import type { TaskTemplate } from '../../types/task';
import type { AreaType, FixtureType } from '../../types/facility';

let mockParams: { id?: string } = { id: 'task-template-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getTaskTemplateMock = vi.fn();
const updateTaskTemplateMock = vi.fn();
const archiveTaskTemplateMock = vi.fn();
const restoreTaskTemplateMock = vi.fn();
const listAreaTypesMock = vi.fn();
const listFixtureTypesMock = vi.fn();

vi.mock('../../lib/tasks', () => ({
  getTaskTemplate: (...args: unknown[]) => getTaskTemplateMock(...args),
  updateTaskTemplate: (...args: unknown[]) => updateTaskTemplateMock(...args),
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

const template: TaskTemplate = {
  id: 'task-template-1',
  name: 'Vacuum Floors',
  description: 'Vacuum all floor surfaces',
  cleaningType: 'daily',
  estimatedMinutes: 30,
  baseMinutes: '0',
  perSqftMinutes: '0',
  perUnitMinutes: '0',
  perRoomMinutes: '0',
  difficultyLevel: 3,
  requiredEquipment: ['Vacuum'],
  requiredSupplies: ['Bags'],
  instructions: 'Start from corners',
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

describe('TaskTemplateDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'task-template-1' };
    navigateMock.mockReset();
    getTaskTemplateMock.mockResolvedValue(template);
    updateTaskTemplateMock.mockResolvedValue(template);
    archiveTaskTemplateMock.mockResolvedValue({ ...template, archivedAt: new Date().toISOString() });
    restoreTaskTemplateMock.mockResolvedValue(template);
    listAreaTypesMock.mockResolvedValue({
      data: [areaType],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listFixtureTypesMock.mockResolvedValue({
      data: [fixtureType],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders template details', async () => {
    render(<TaskTemplateDetail />);

    expect(await screen.findByText('Vacuum Floors')).toBeInTheDocument();
    expect(screen.getByText('Vacuum all floor surfaces')).toBeInTheDocument();
    expect(screen.getByText('Instructions')).toBeInTheDocument();
  });

  it('updates template from edit modal', async () => {
    const user = userEvent.setup();
    render(<TaskTemplateDetail />);

    await user.click(await screen.findByRole('button', { name: /edit template/i }));
    const nameInput = await screen.findByLabelText(/task template name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Vacuum & Mop');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateTaskTemplateMock).toHaveBeenCalledWith(
        'task-template-1',
        expect.objectContaining({
          name: 'Vacuum & Mop',
        })
      );
    });
  });

  it('archives template from detail action', async () => {
    const user = userEvent.setup();
    render(<TaskTemplateDetail />);

    await user.click(await screen.findByRole('button', { name: /archive/i }));

    await waitFor(() => {
      expect(archiveTaskTemplateMock).toHaveBeenCalledWith('task-template-1');
    });
  });
});
