import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import InspectionForm from '../inspections/InspectionForm';
import { mockInspectionDetail, mockPaginatedResponse } from '../../test/mocks';

let mockParams: { id?: string } = {};
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const listFacilitiesMock = vi.fn();
const listUsersMock = vi.fn();
const listContractsMock = vi.fn();
const listInspectionTemplatesMock = vi.fn();
const createInspectionMock = vi.fn();
const updateInspectionMock = vi.fn();
const getInspectionMock = vi.fn();
const getInspectionTemplateMock = vi.fn();
const getTemplateForContractMock = vi.fn();

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
}));

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
}));

vi.mock('../../lib/inspections', () => ({
  listInspectionTemplates: (...args: unknown[]) => listInspectionTemplatesMock(...args),
  createInspection: (...args: unknown[]) => createInspectionMock(...args),
  updateInspection: (...args: unknown[]) => updateInspectionMock(...args),
  getInspection: (...args: unknown[]) => getInspectionMock(...args),
  getInspectionTemplate: (...args: unknown[]) => getInspectionTemplateMock(...args),
  getTemplateForContract: (...args: unknown[]) => getTemplateForContractMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFacility = {
  id: 'facility-1',
  name: 'Main Office',
  account: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
};

const mockActiveContract = {
  id: 'contract-1',
  contractNumber: 'CONT-001',
  title: 'Monthly Service',
  account: { id: 'account-1', name: 'Acme Corporation' },
};

const mockUserOption = {
  id: 'user-1',
  fullName: 'Test User',
  email: 'test@example.com',
  roles: [{ role: { key: 'manager' } }],
};

describe('InspectionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    navigateMock.mockReset();

    listFacilitiesMock.mockResolvedValue(
      mockPaginatedResponse([mockFacility])
    );
    listUsersMock.mockResolvedValue(
      mockPaginatedResponse([mockUserOption])
    );
    listContractsMock.mockResolvedValue(
      mockPaginatedResponse([mockActiveContract])
    );
    listInspectionTemplatesMock.mockResolvedValue(
      mockPaginatedResponse([{ id: 'template-1', name: 'Standard Checklist' }])
    );
    getInspectionTemplateMock.mockResolvedValue({
      id: 'template-1',
      name: 'Standard Checklist',
      items: [],
    });
    getTemplateForContractMock.mockResolvedValue({
      id: 'template-1',
      name: 'Standard Checklist',
    });
    createInspectionMock.mockResolvedValue(mockInspectionDetail());
    updateInspectionMock.mockResolvedValue(mockInspectionDetail());
    getInspectionMock.mockResolvedValue(
      mockInspectionDetail({
        id: 'inspection-1',
        status: 'scheduled',
        facilityId: 'facility-1',
        accountId: 'account-1',
        inspectorUserId: 'user-1',
        scheduledDate: '2026-02-20',
        notes: 'Test notes',
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders create form with empty fields', async () => {
    render(<InspectionForm />);

    expect(await screen.findByText('New Inspection')).toBeInTheDocument();
    expect(screen.getByText('Select a service location')).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    const toast = (await import('react-hot-toast')).default;

    render(<InspectionForm />);
    await screen.findByText('New Inspection');

    await user.click(screen.getByRole('button', { name: /create inspection/i }));

    expect(toast.error).toHaveBeenCalledWith('Please select a service location');
    expect(createInspectionMock).not.toHaveBeenCalled();
  });

  it('creates inspection with valid data', async () => {
    const user = userEvent.setup();
    render(<InspectionForm />);

    await screen.findByText('New Inspection');

    // Select service location
    await user.selectOptions(
      screen.getByLabelText(/service location/i),
      'facility-1'
    );

    // Select inspector
    await user.selectOptions(
      screen.getByLabelText(/inspector/i),
      'user-1'
    );

    // Set scheduled date
    const dateInput = screen.getByLabelText(/scheduled date/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2026-03-01');

    // Submit
    await user.click(screen.getByRole('button', { name: /create inspection/i }));

    await waitFor(() => {
      expect(createInspectionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: 'facility-1',
          accountId: 'account-1',
          inspectorUserId: 'user-1',
          scheduledDate: '2026-03-01',
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/inspections');
    });
  });

  it('loads existing inspection in edit mode', async () => {
    mockParams = { id: 'inspection-1' };

    render(<InspectionForm />);

    expect(await screen.findByText('Edit Inspection')).toBeInTheDocument();
    expect(getInspectionMock).toHaveBeenCalledWith('inspection-1');
  });

  it('updates inspection in edit mode', async () => {
    const user = userEvent.setup();
    mockParams = { id: 'inspection-1' };

    render(<InspectionForm />);
    await screen.findByText('Edit Inspection');

    // Change notes
    const notesInput = screen.getByPlaceholderText(/optional notes/i);
    await user.clear(notesInput);
    await user.type(notesInput, 'Updated notes');

    await user.click(screen.getByRole('button', { name: /update inspection/i }));

    await waitFor(() => {
      expect(updateInspectionMock).toHaveBeenCalledWith(
        'inspection-1',
        expect.objectContaining({
          notes: 'Updated notes',
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/inspections');
    });
  });
});
