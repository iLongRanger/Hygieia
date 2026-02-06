import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import FacilitiesList from '../facilities/FacilitiesList';
import type { Facility, Account } from '../../types/facility';

const listFacilitiesMock = vi.fn();
const createFacilityMock = vi.fn();
const archiveFacilityMock = vi.fn();
const restoreFacilityMock = vi.fn();
const listAccountsMock = vi.fn();

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
  createFacility: (...args: unknown[]) => createFacilityMock(...args),
  archiveFacility: (...args: unknown[]) => archiveFacilityMock(...args),
  restoreFacility: (...args: unknown[]) => restoreFacilityMock(...args),
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const account: Account = {
  id: 'account-1',
  name: 'Acme Corp',
  type: 'commercial',
};

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
    areas: 2,
    facilityTasks: 5,
  },
};

describe('FacilitiesList', () => {
  beforeEach(() => {
    listFacilitiesMock.mockResolvedValue({
      data: [facility],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listAccountsMock.mockResolvedValue({
      data: [account],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    createFacilityMock.mockResolvedValue({ id: 'facility-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders facilities from API', async () => {
    render(<FacilitiesList />);

    expect(await screen.findByText('Main Facility')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('creates a facility from the modal', async () => {
    const user = userEvent.setup();
    render(<FacilitiesList />);

    await user.click(screen.getByRole('button', { name: /add facility/i }));
    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.type(screen.getByLabelText(/facility name/i), 'New Facility');

    await user.click(screen.getByRole('button', { name: /create facility/i }));

    expect(createFacilityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        name: 'New Facility',
      })
    );
  });
});
