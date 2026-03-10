import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import LeadDetail from '../leads/LeadDetail';
import type { Lead, Appointment, LeadSource } from '../../types/crm';
import type { User } from '../../types/user';
import type { Facility } from '../../types/facility';

let mockParams: { id?: string } = { id: 'lead-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getLeadMock = vi.fn();
const listLeadSourcesMock = vi.fn();
const updateLeadMock = vi.fn();
const convertLeadMock = vi.fn();
const listUsersMock = vi.fn();
const listFacilitiesMock = vi.fn();
const createAppointmentMock = vi.fn();
const listAppointmentsMock = vi.fn();
const rescheduleAppointmentMock = vi.fn();
const completeAppointmentMock = vi.fn();

vi.mock('../../lib/leads', () => ({
  getLead: (...args: unknown[]) => getLeadMock(...args),
  listLeadSources: (...args: unknown[]) => listLeadSourcesMock(...args),
  updateLead: (...args: unknown[]) => updateLeadMock(...args),
  convertLead: (...args: unknown[]) => convertLeadMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
}));

vi.mock('../../lib/appointments', () => ({
  createAppointment: (...args: unknown[]) => createAppointmentMock(...args),
  listAppointments: (...args: unknown[]) => listAppointmentsMock(...args),
  rescheduleAppointment: (...args: unknown[]) => rescheduleAppointmentMock(...args),
  completeAppointment: (...args: unknown[]) => completeAppointmentMock(...args),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      user: { id: 'user-1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin' },
      hasPermission: () => true,
    }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const lead: Lead = {
  id: 'lead-1',
  status: 'lead',
  companyName: 'Acme Corporation',
  contactName: 'Jane Smith',
  primaryEmail: 'jane@example.com',
  primaryPhone: '(555) 123-4567',
  secondaryEmail: null,
  secondaryPhone: null,
  address: null,
  estimatedValue: '5000',
  probability: 50,
  expectedCloseDate: null,
  notes: null,
  lostReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  leadSource: { id: 'source-1', name: 'Website', color: '#10b981' },
  assignedToUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
  createdByUser: { id: 'user-2', fullName: 'Owner User' },
  convertedToAccountId: null,
  convertedAt: null,
  convertedToAccount: null,
  convertedByUser: null,
};

const appointment: Appointment = {
  id: 'appt-1',
  type: 'walk_through',
  status: 'scheduled',
  scheduledStart: new Date('2026-02-20T14:00:00Z').toISOString(),
  scheduledEnd: new Date('2026-02-20T15:00:00Z').toISOString(),
  timezone: 'America/New_York',
  location: null,
  notes: null,
  completedAt: null,
  rescheduledFromId: null,
  lead: {
    id: 'lead-1',
    contactName: 'Jane Smith',
    companyName: 'Acme Corporation',
    status: 'lead',
  },
  account: null,
  assignedToUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
  createdByUser: { id: 'user-2', fullName: 'Owner User' },
};

const leadSource: LeadSource = {
  id: 'source-1',
  name: 'Website',
  description: null,
  color: '#10b981',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { leads: 1 },
};

const user: User = {
  id: 'user-1',
  email: 'admin@example.com',
  fullName: 'Admin User',
  role: 'admin',
  phone: null,
  avatarUrl: null,
  status: 'active',
  lastLoginAt: null,
  preferences: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  roles: [],
};

const subcontractorUser: User = {
  id: 'user-2',
  email: 'subcontractor@example.com',
  fullName: 'Subcontractor User',
  role: 'subcontractor',
  phone: null,
  avatarUrl: null,
  status: 'active',
  lastLoginAt: null,
  preferences: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  roles: [],
};

const facility: Facility = {
  id: 'facility-1',
  name: 'HQ',
  address: {},
  squareFeet: null,
  buildingType: null,
  accessInstructions: null,
  parkingInfo: null,
  specialRequirements: null,
  status: 'active',
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
  facilityManager: null,
  createdByUser: { id: 'user-2', fullName: 'Owner User' },
  _count: { areas: 1, facilityTasks: 1 },
};

const incompleteFacility: Facility = {
  ...facility,
  id: 'facility-2',
  name: 'Incomplete Facility',
  _count: { areas: 0, facilityTasks: 1 },
};

describe('LeadDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'lead-1' };
    navigateMock.mockReset();
    getLeadMock.mockResolvedValue(lead);
    listAppointmentsMock.mockResolvedValue([appointment]);
    listLeadSourcesMock.mockResolvedValue({ data: [leadSource] });
    listUsersMock.mockResolvedValue({
      data: [user, subcontractorUser],
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });
    listFacilitiesMock.mockResolvedValue({ data: [facility], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    createAppointmentMock.mockResolvedValue({ id: 'appt-2' });
    rescheduleAppointmentMock.mockResolvedValue({ id: 'appt-3' });
    completeAppointmentMock.mockResolvedValue({ id: 'appt-1', status: 'completed' });
    updateLeadMock.mockResolvedValue(lead);
    convertLeadMock.mockResolvedValue({
      lead: {
        ...lead,
        convertedToAccountId: 'account-1',
        convertedAt: new Date().toISOString(),
      },
      account: { id: 'account-1', name: 'Acme Corporation' },
      contact: { id: 'contact-1', name: 'Jane Smith', email: 'jane@example.com' },
      facility: { id: 'facility-1', name: 'HQ' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders lead details', async () => {
    render(<LeadDetail />);

    expect(await screen.findByRole('heading', { name: 'Jane Smith' })).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Walkthrough Appointments')).toBeInTheDocument();
  });

  it('converts unconverted lead when scheduling walkthrough appointment', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadDetail />);

    await userEventInstance.click(await screen.findByRole('button', { name: /schedule walkthrough/i }));
    const modal = await screen.findByRole('dialog', { name: /schedule walkthrough/i });
    await userEventInstance.clear(within(modal).getByLabelText(/account name/i));
    await userEventInstance.type(within(modal).getByLabelText(/account name/i), 'Acme Corporation');
    await userEventInstance.clear(within(modal).getByLabelText(/facility name/i));
    await userEventInstance.type(within(modal).getByLabelText(/facility name/i), 'HQ');
    await userEventInstance.clear(within(modal).getByLabelText(/street address/i));
    await userEventInstance.type(within(modal).getByLabelText(/street address/i), '123 Main St');
    await userEventInstance.selectOptions(within(modal).getByLabelText(/assigned rep/i), 'user-1');
    await userEventInstance.clear(within(modal).getByLabelText(/^date$/i));
    await userEventInstance.type(within(modal).getByLabelText(/^date$/i), '2026-02-25');
    await userEventInstance.selectOptions(within(modal).getByLabelText(/start time/i), '09:00');
    await userEventInstance.selectOptions(within(modal).getByLabelText(/end time/i), '10:00');
    await userEventInstance.click(within(modal).getByRole('button', { name: /^schedule$/i }));

    await waitFor(() => {
      expect(convertLeadMock).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({
          createNewAccount: true,
          facilityOption: 'new',
          accountData: expect.objectContaining({
            name: 'Acme Corporation',
          }),
          facilityData: expect.objectContaining({
            name: 'HQ',
            address: expect.objectContaining({
              street: '123 Main St',
            }),
          }),
        })
      );
      expect(createAppointmentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          assignedToUserId: 'user-1',
          type: 'walk_through',
        })
      );
    });
  });

  it('shows only owner admin manager in assigned rep options', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadDetail />);

    await userEventInstance.click(await screen.findByRole('button', { name: /schedule walkthrough/i }));
    const modal = await screen.findByRole('dialog', { name: /schedule walkthrough/i });

    expect(within(modal).getByRole('option', { name: 'Admin User' })).toBeInTheDocument();
    expect(within(modal).queryByRole('option', { name: 'Subcontractor User' })).not.toBeInTheDocument();
  });

  it('updates lead from edit modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadDetail />);

    await userEventInstance.click(await screen.findByRole('button', { name: /edit lead/i }));
    const contactInput = await screen.findByLabelText(/contact name/i);
    await userEventInstance.clear(contactInput);
    await userEventInstance.type(contactInput, 'Jane Updated');
    await userEventInstance.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateLeadMock).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({
          contactName: 'Jane Updated',
        })
      );
    });
  });

  it('shows status as read-only in edit modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadDetail />);

    await userEventInstance.click(await screen.findByRole('button', { name: /edit lead/i }));
    const modal = await screen.findByRole('dialog', { name: /edit lead/i });

    expect(within(modal).queryByLabelText(/status/i)).not.toBeInTheDocument();
    expect(within(modal).getByText(/^status$/i)).toBeInTheDocument();
    expect(within(modal).getByText(/^lead$/i)).toBeInTheDocument();
  });

  it('marks a lead as lost from the dedicated action', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadDetail />);

    await userEventInstance.click(await screen.findByRole('button', { name: /mark lost/i }));
    const modal = await screen.findByRole('dialog', { name: /mark lead as lost/i });

    await userEventInstance.type(within(modal).getByLabelText(/lost reason/i), 'Budget was cut');
    await userEventInstance.click(within(modal).getByRole('button', { name: /^mark lost$/i }));

    await waitFor(() => {
      expect(updateLeadMock).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({
          status: 'lost',
          lostReason: 'Budget was cut',
        })
      );
    });
  });

  it('shows reopen action for lost leads', async () => {
    const userEventInstance = userEvent.setup();
    getLeadMock.mockResolvedValue({
      ...lead,
      status: 'lost',
      lostReason: 'Budget was cut',
    });

    render(<LeadDetail />);

    await userEventInstance.click(await screen.findByRole('button', { name: /reopen lead/i }));

    await waitFor(() => {
      expect(updateLeadMock).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({
          status: 'reopened',
          lostReason: null,
        })
      );
    });
  });

  it('requires review before submitting walkthrough completion', async () => {
    const userEventInstance = userEvent.setup();
    getLeadMock.mockResolvedValue({
      ...lead,
      convertedToAccountId: 'account-1',
      convertedAt: new Date().toISOString(),
      convertedToAccount: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
    });

    render(<LeadDetail />);

    await userEventInstance.click(await screen.findByRole('button', { name: /complete walkthrough/i }));
    const modal = await screen.findByRole('dialog', { name: /complete walkthrough/i });

    await userEventInstance.selectOptions(within(modal).getByLabelText(/facility/i), 'facility-1');
    await userEventInstance.type(within(modal).getByLabelText(/completion notes/i), 'Reviewed facility details');

    await userEventInstance.click(within(modal).getByRole('button', { name: /^review$/i }));

    expect(within(modal).getByText(/step 2 of 2/i)).toBeInTheDocument();
    expect(within(modal).getByText(/hq/i)).toBeInTheDocument();

    await userEventInstance.click(within(modal).getByRole('button', { name: /submit & complete/i }));

    await waitFor(() => {
      expect(completeAppointmentMock).toHaveBeenCalledWith(
        'appt-1',
        expect.objectContaining({
          facilityId: 'facility-1',
          notes: 'Reviewed facility details',
        })
      );
    });
  });

  it('blocks walkthrough review when selected facility has no areas or tasks', async () => {
    const userEventInstance = userEvent.setup();
    getLeadMock.mockResolvedValue({
      ...lead,
      convertedToAccountId: 'account-1',
      convertedAt: new Date().toISOString(),
      convertedToAccount: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
    });
    listFacilitiesMock.mockResolvedValue({
      data: [incompleteFacility],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });

    render(<LeadDetail />);

    await userEventInstance.click(await screen.findByRole('button', { name: /complete walkthrough/i }));
    const modal = await screen.findByRole('dialog', { name: /complete walkthrough/i });

    await userEventInstance.selectOptions(within(modal).getByLabelText(/facility/i), 'facility-2');

    expect(within(modal).getByText(/add at least one area to this facility/i)).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /^review$/i })).toBeDisabled();
    expect(completeAppointmentMock).not.toHaveBeenCalled();
  });
});
