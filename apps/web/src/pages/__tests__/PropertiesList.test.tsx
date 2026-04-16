import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import PropertiesList from '../properties/PropertiesList';

const navigateMock = vi.fn();
const listAccountsMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

describe('PropertiesList', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    listAccountsMock.mockResolvedValue({
      data: [
        {
          id: 'account-1',
          name: 'Maple Family',
          type: 'residential',
          industry: null,
          website: null,
          billingEmail: null,
          billingPhone: null,
          billingAddress: null,
          serviceAddress: null,
          qboCustomerId: null,
          taxId: null,
          paymentTerms: 'NET30',
          creditLimit: null,
          residentialProfile: null,
          residentialTaskLibrary: [],
          residentialProperties: [
            {
              id: 'property-1',
              accountId: 'account-1',
              name: 'Maple Main Home',
              facility: { id: 'facility-1' },
              serviceAddress: {
                street: '10 Maple St',
                city: 'Vancouver',
                state: 'BC',
                postalCode: 'V6B 1A1',
              },
              homeProfile: {
                homeType: 'single_family',
                squareFeet: 1800,
                bedrooms: 3,
                fullBathrooms: 2,
                halfBathrooms: 1,
                levels: 2,
                occupiedStatus: 'occupied',
                condition: 'standard',
                hasPets: false,
                lastProfessionalCleaning: null,
                parkingAccess: null,
                entryNotes: null,
                specialInstructions: null,
                isFirstVisit: false,
              },
              defaultTasks: [],
              accessNotes: null,
              parkingAccess: null,
              entryNotes: null,
              pets: false,
              isPrimary: true,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              archivedAt: null,
            },
          ],
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          accountManager: null,
          createdByUser: { id: 'user-1', fullName: 'Owner User' },
          _count: { contacts: 0, facilities: 0 },
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
  });

  it('lists residential properties and opens property detail', async () => {
    const user = userEvent.setup();

    render(<PropertiesList />);

    expect(await screen.findByText('Maple Main Home')).toBeInTheDocument();
    expect(screen.getByText('Maple Family')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open/i }));

    expect(navigateMock).toHaveBeenCalledWith('/properties/property-1', {
      state: {
        backLabel: 'Properties',
        backPath: '/properties',
      },
    });

    await waitFor(() => {
      expect(listAccountsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'residential',
          includeArchived: false,
        })
      );
    });
  });
});
