import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import FacilityDetail from '../facilities/FacilityDetail';
import type { Facility, Area, AreaType, FixtureType, FacilityTask, TaskTemplate } from '../../types/facility';

let mockParams: { id?: string } = { id: 'facility-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getFacilityMock = vi.fn();
const updateFacilityMock = vi.fn();
const listAreasMock = vi.fn();
const createAreaMock = vi.fn();
const updateAreaMock = vi.fn();
const archiveAreaMock = vi.fn();
const restoreAreaMock = vi.fn();
const deleteAreaMock = vi.fn();
const listAreaTypesMock = vi.fn();
const listFixtureTypesMock = vi.fn();
const getAreaTemplateByAreaTypeMock = vi.fn();
const listFacilityTasksMock = vi.fn();
const createFacilityTaskMock = vi.fn();
const updateFacilityTaskMock = vi.fn();
const deleteFacilityTaskMock = vi.fn();
const listTaskTemplatesMock = vi.fn();
const bulkCreateFacilityTasksMock = vi.fn();

vi.mock('../../lib/facilities', () => ({
  getFacility: (...args: unknown[]) => getFacilityMock(...args),
  updateFacility: (...args: unknown[]) => updateFacilityMock(...args),
  listAreas: (...args: unknown[]) => listAreasMock(...args),
  createArea: (...args: unknown[]) => createAreaMock(...args),
  updateArea: (...args: unknown[]) => updateAreaMock(...args),
  archiveArea: (...args: unknown[]) => archiveAreaMock(...args),
  restoreArea: (...args: unknown[]) => restoreAreaMock(...args),
  deleteArea: (...args: unknown[]) => deleteAreaMock(...args),
  listAreaTypes: (...args: unknown[]) => listAreaTypesMock(...args),
  listFixtureTypes: (...args: unknown[]) => listFixtureTypesMock(...args),
  getAreaTemplateByAreaType: (...args: unknown[]) => getAreaTemplateByAreaTypeMock(...args),
  listFacilityTasks: (...args: unknown[]) => listFacilityTasksMock(...args),
  createFacilityTask: (...args: unknown[]) => createFacilityTaskMock(...args),
  updateFacilityTask: (...args: unknown[]) => updateFacilityTaskMock(...args),
  deleteFacilityTask: (...args: unknown[]) => deleteFacilityTaskMock(...args),
  listTaskTemplates: (...args: unknown[]) => listTaskTemplatesMock(...args),
  bulkCreateFacilityTasks: (...args: unknown[]) => bulkCreateFacilityTasksMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const facility: Facility = {
  id: 'facility-1',
  name: 'Main Facility',
  address: { city: 'Vancouver', state: 'BC' },
  squareFeet: '1000',
  buildingType: 'office',
  accessInstructions: null,
  parkingInfo: null,
  specialRequirements: null,
  status: 'active',
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: {
    id: 'account-1',
    name: 'Acme Corp',
    type: 'commercial',
  },
  facilityManager: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin User',
  },
  _count: {
    areas: 1,
    facilityTasks: 0,
  },
};

const areaTypes: AreaType[] = [
  {
    id: 'area-type-1',
    name: 'Office',
    description: null,
    defaultSquareFeet: null,
    baseCleaningTimeMinutes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { areas: 0, taskTemplates: 0 },
  },
];

const areas: Area[] = [
  {
    id: 'area-1',
    name: 'Office A',
    quantity: 1,
    squareFeet: '500',
    floorType: 'vct',
    conditionLevel: 'standard',
    roomCount: 0,
    unitCount: 0,
    trafficLevel: 'medium',
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null,
    facility: {
      id: 'facility-1',
      name: 'Main Facility',
      accountId: 'account-1',
    },
    areaType: {
      id: 'area-type-1',
      name: 'Office',
      defaultSquareFeet: null,
      baseCleaningTimeMinutes: null,
    },
    createdByUser: {
      id: 'user-1',
      fullName: 'Admin User',
    },
    fixtures: [],
    _count: { facilityTasks: 0 },
  },
];

describe('FacilityDetail', () => {
  beforeEach(() => {
    mockParams = { id: 'facility-1' };
    navigateMock.mockReset();
    getFacilityMock.mockResolvedValue(facility);
    listAreasMock.mockResolvedValue({ data: areas });
    listAreaTypesMock.mockResolvedValue({ data: areaTypes });
    listFixtureTypesMock.mockResolvedValue({ data: [] as FixtureType[] });
    listFacilityTasksMock.mockResolvedValue({ data: [] as FacilityTask[] });
    listTaskTemplatesMock.mockResolvedValue({ data: [] as TaskTemplate[] });
    getAreaTemplateByAreaTypeMock.mockResolvedValue({
      defaultSquareFeet: null,
      items: [],
      tasks: [],
    });
    createAreaMock.mockResolvedValue({ id: 'area-2' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders facility details', async () => {
    render(<FacilityDetail />);

    expect(await screen.findByText('Main Facility')).toBeInTheDocument();
    expect(await screen.findByText(/areas \(\d+\)/i)).toBeInTheDocument();
  });

  it('creates a new area from the modal', async () => {
    const user = userEvent.setup();
    render(<FacilityDetail />);

    await user.click(await screen.findByRole('button', { name: /add area/i }));
    await screen.findByRole('option', { name: 'Office' });
    await user.selectOptions(await screen.findByLabelText(/area type/i), 'area-type-1');

    const addButtons = screen.getAllByRole('button', { name: /^add area$/i });
    await user.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(createAreaMock).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: 'facility-1',
          areaTypeId: 'area-type-1',
          applyTemplate: true,
        })
      );
    });
  });
});
