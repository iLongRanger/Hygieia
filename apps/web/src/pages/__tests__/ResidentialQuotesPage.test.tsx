import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ResidentialQuotesPage from '../residential/ResidentialQuotesPage';
import { useAuthStore } from '../../stores/authStore';

const listAccountsMock = vi.fn();
const listResidentialQuotesMock = vi.fn();
const listResidentialPricingPlansMock = vi.fn();
const previewResidentialQuoteMock = vi.fn();
const listAreasMock = vi.fn();
const listFacilityTasksMock = vi.fn();

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

vi.mock('../../lib/residential', () => ({
  listResidentialQuotes: (...args: unknown[]) => listResidentialQuotesMock(...args),
  listResidentialPricingPlans: (...args: unknown[]) => listResidentialPricingPlansMock(...args),
  previewResidentialQuote: (...args: unknown[]) => previewResidentialQuoteMock(...args),
  createResidentialQuote: vi.fn(),
  updateResidentialQuote: vi.fn(),
  sendResidentialQuote: vi.fn(),
  requestResidentialQuoteReview: vi.fn(),
  approveResidentialQuoteReview: vi.fn(),
  acceptResidentialQuote: vi.fn(),
  declineResidentialQuote: vi.fn(),
  convertResidentialQuote: vi.fn(),
  archiveResidentialQuote: vi.fn(),
  restoreResidentialQuote: vi.fn(),
}));

vi.mock('../../lib/facilities', () => ({
  listAreas: (...args: unknown[]) => listAreasMock(...args),
}));

vi.mock('../../lib/tasks', () => ({
  listFacilityTasks: (...args: unknown[]) => listFacilityTasksMock(...args),
}));

describe('ResidentialQuotesPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      isAuthenticated: true,
    });

    listResidentialQuotesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    listResidentialPricingPlansMock.mockResolvedValue({
      data: [
        {
          id: 'plan-1',
          name: 'Default Plan',
          strategyKey: 'residential_flat_v1',
          settings: {
            baseRate: 150,
            minimumPrice: 120,
            sqftTiers: [],
            conditionMultipliers: {},
            frequencyDiscounts: {},
            addOnPrices: {},
          },
          isActive: true,
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          createdByUser: { id: 'owner-1', fullName: 'Owner User', email: 'owner@example.com' },
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listAccountsMock.mockResolvedValue({
      data: [
        {
          id: 'account-1',
          name: 'Maple Family',
          type: 'residential',
          industry: null,
          website: null,
          billingEmail: 'maple@example.com',
          billingPhone: '555-0100',
          billingAddress: null,
          serviceAddress: {
            street: '10 Maple St',
            city: 'Vancouver',
            state: 'BC',
            postalCode: 'V6B 1A1',
            country: 'Canada',
          },
          qboCustomerId: null,
          taxId: null,
          paymentTerms: 'NET30',
          creditLimit: null,
          residentialProfile: null,
          residentialTaskLibrary: ['Legacy task'],
          residentialProperties: [
            {
              id: 'property-1',
              accountId: 'account-1',
              name: 'Maple Home',
              facility: { id: 'facility-1' },
              serviceAddress: {
                street: '10 Maple St',
                city: 'Vancouver',
                state: 'BC',
                postalCode: 'V6B 1A1',
                country: 'Canada',
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
              defaultTasks: ['Legacy task'],
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
          createdByUser: { id: 'owner-1', fullName: 'Owner User' },
          _count: { contacts: 0, facilities: 0 },
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listAreasMock.mockResolvedValue({
      data: [
        {
          id: 'area-1',
          name: 'Kitchen',
        },
      ],
      pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
    });
    listFacilityTasksMock.mockResolvedValue({
      data: [
        {
          id: 'task-1',
          customName: null,
          taskTemplate: {
            id: 'template-1',
            name: 'Clean kitchen counters',
          },
        },
      ],
      pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
    });
    previewResidentialQuoteMock.mockResolvedValue({
      pricingPlanId: 'plan-1',
      strategyKey: 'residential_flat_v1',
      breakdown: {
        serviceSubtotal: '150',
        addOnTotal: '0',
        recurringDiscount: '0',
        firstCleanSurcharge: '0',
        finalTotal: '150',
        estimatedHours: 3,
        confidenceLevel: 'high',
        manualReviewRequired: false,
        manualReviewReasons: [],
        addOns: [],
      },
      warnings: [],
      settingsSnapshot: {},
    });
  });

  it('shows structured property scope readiness for the selected residential property', async () => {
    const user = userEvent.setup();

    render(<ResidentialQuotesPage />);

    await user.click(await screen.findByRole('button', { name: /new residential quote/i }));

    expect(await screen.findByText(/property scope readiness/i)).toBeInTheDocument();
    expect(await screen.findByText(/1 areas • 1 tasks/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this quote will use the structured property tasks from areas and task setup/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(listFacilityTasksMock).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId: 'facility-1' })
      );
    });
  });
});
