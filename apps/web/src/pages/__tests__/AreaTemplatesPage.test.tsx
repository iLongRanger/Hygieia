import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import AreaTemplatesPage from '../areas/AreaTemplatesPage';
import type { AreaType, FixtureType, AreaTemplate, TaskTemplate } from '../../types/facility';

const listAreaTypesMock = vi.fn();
const createAreaTypeMock = vi.fn();
const updateAreaTypeMock = vi.fn();
const deleteAreaTypeMock = vi.fn();
const listFixtureTypesMock = vi.fn();
const createFixtureTypeMock = vi.fn();
const updateFixtureTypeMock = vi.fn();
const deleteFixtureTypeMock = vi.fn();
const listAreaTemplatesMock = vi.fn();
const createAreaTemplateMock = vi.fn();
const updateAreaTemplateMock = vi.fn();
const deleteAreaTemplateMock = vi.fn();
const listTaskTemplatesMock = vi.fn();
const createTaskTemplateMock = vi.fn();

vi.mock('../../lib/facilities', () => ({
  listAreaTypes: (...args: unknown[]) => listAreaTypesMock(...args),
  createAreaType: (...args: unknown[]) => createAreaTypeMock(...args),
  updateAreaType: (...args: unknown[]) => updateAreaTypeMock(...args),
  deleteAreaType: (...args: unknown[]) => deleteAreaTypeMock(...args),
  listFixtureTypes: (...args: unknown[]) => listFixtureTypesMock(...args),
  createFixtureType: (...args: unknown[]) => createFixtureTypeMock(...args),
  updateFixtureType: (...args: unknown[]) => updateFixtureTypeMock(...args),
  deleteFixtureType: (...args: unknown[]) => deleteFixtureTypeMock(...args),
  listAreaTemplates: (...args: unknown[]) => listAreaTemplatesMock(...args),
  createAreaTemplate: (...args: unknown[]) => createAreaTemplateMock(...args),
  updateAreaTemplate: (...args: unknown[]) => updateAreaTemplateMock(...args),
  deleteAreaTemplate: (...args: unknown[]) => deleteAreaTemplateMock(...args),
  listTaskTemplates: (...args: unknown[]) => listTaskTemplatesMock(...args),
}));

vi.mock('../../lib/tasks', () => ({
  createTaskTemplate: (...args: unknown[]) => createTaskTemplateMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const areaType: AreaType = {
  id: 'area-type-1',
  name: 'Office',
  description: 'Office area',
  defaultSquareFeet: '500',
  baseCleaningTimeMinutes: 20,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: {
    areas: 1,
    taskTemplates: 1,
  },
};

const fixtureType: FixtureType = {
  id: 'fixture-1',
  name: 'Desk',
  description: 'Office desk',
  category: 'furniture',
  defaultMinutesPerItem: '2',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const taskTemplate: TaskTemplate = {
  id: 'task-1',
  name: 'Dust Surfaces',
  description: null,
  cleaningType: 'daily',
  estimatedMinutes: 15,
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
  areaType: {
    id: 'area-type-1',
    name: 'Office',
  },
  facility: null,
  createdByUser: {
    id: 'admin-1',
    fullName: 'Admin User',
  },
  fixtureMinutes: [],
  _count: {
    facilityTasks: 0,
  },
};

const areaTemplate: AreaTemplate = {
  id: 'template-1',
  name: 'Office Standard Template',
  defaultSquareFeet: '500',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  areaType: {
    id: 'area-type-1',
    name: 'Office',
    defaultSquareFeet: '500',
  },
  items: [
    {
      id: 'item-1',
      defaultCount: 4,
      minutesPerItem: '2',
      sortOrder: 1,
      fixtureType,
    },
  ],
  tasks: [
    {
      id: 'template-task-1',
      sortOrder: 1,
      name: null,
      baseMinutes: null,
      perSqftMinutes: null,
      perUnitMinutes: null,
      perRoomMinutes: null,
      taskTemplate: {
        id: 'task-1',
        name: 'Dust Surfaces',
        cleaningType: 'daily',
        estimatedMinutes: 15,
        baseMinutes: '0',
        perSqftMinutes: '0',
        perUnitMinutes: '0',
        perRoomMinutes: '0',
        difficultyLevel: 3,
      },
    },
  ],
  createdByUser: {
    id: 'admin-1',
    fullName: 'Admin User',
  },
};

describe('AreaTemplatesPage', () => {
  beforeEach(() => {
    listAreaTypesMock.mockResolvedValue({
      data: [areaType],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listFixtureTypesMock.mockResolvedValue({
      data: [fixtureType],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listAreaTemplatesMock.mockResolvedValue({
      data: [areaTemplate],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listTaskTemplatesMock.mockResolvedValue({
      data: [taskTemplate],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    createAreaTemplateMock.mockResolvedValue({
      ...areaTemplate,
      id: 'template-2',
      name: 'New Template',
    });
    updateAreaTemplateMock.mockResolvedValue({
      ...areaTemplate,
      id: 'template-1',
      name: 'Office Standard Template',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads templates and displays the templates table', async () => {
    render(<AreaTemplatesPage />);

    expect(await screen.findByRole('heading', { name: 'Area Templates' })).toBeInTheDocument();
    expect(screen.getByText('Office Standard Template')).toBeInTheDocument();
  });

  it('creates a new template from modal', async () => {
    const user = userEvent.setup();
    render(<AreaTemplatesPage />);

    await screen.findByRole('heading', { name: 'Area Templates' });
    await user.click(screen.getByRole('button', { name: /new template/i }));

    await user.selectOptions(await screen.findByLabelText(/area type/i), 'area-type-1');
    await user.type(screen.getByLabelText(/template name \(optional\)/i), 'New Template');
    await user.click(screen.getByRole('button', { name: /save template/i }));

    await waitFor(() => {
      expect(
        createAreaTemplateMock.mock.calls.length + updateAreaTemplateMock.mock.calls.length
      ).toBeGreaterThan(0);
    });
  });
});
