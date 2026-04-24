import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ProposalForm from '../proposals/ProposalForm';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { Proposal } from '../../types/proposal';

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

const listAccountsMock = vi.fn();
const listFacilitiesMock = vi.fn();
const listAreasMock = vi.fn();
const listAreaTypesMock = vi.fn();
const listFacilityTasksMock = vi.fn();
const listPricingSettingsMock = vi.fn();
const getProposalMock = vi.fn();
const listProposalsMock = vi.fn();
const createProposalMock = vi.fn();
const updateProposalMock = vi.fn();
const getFacilityPricingReadinessMock = vi.fn();
const getFacilityProposalTemplateMock = vi.fn();
const listResidentialPricingPlansMock = vi.fn();
const previewResidentialQuoteMock = vi.fn();
const getFacilityMock = vi.fn();
const getResidentialPropertyMock = vi.fn();
const listOneTimeServiceCatalogMock = vi.fn();

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
  getFacility: (...args: unknown[]) => getFacilityMock(...args),
  listAreas: (...args: unknown[]) => listAreasMock(...args),
  listAreaTypes: (...args: unknown[]) => listAreaTypesMock(...args),
}));

vi.mock('../../lib/tasks', () => ({
  listFacilityTasks: (...args: unknown[]) => listFacilityTasksMock(...args),
}));

vi.mock('../../lib/proposals', () => ({
  listProposals: (...args: unknown[]) => listProposalsMock(...args),
  getProposal: (...args: unknown[]) => getProposalMock(...args),
  createProposal: (...args: unknown[]) => createProposalMock(...args),
  updateProposal: (...args: unknown[]) => updateProposalMock(...args),
}));

vi.mock('../../lib/pricing', () => ({
  listPricingSettings: (...args: unknown[]) => listPricingSettingsMock(...args),
  getFacilityPricingReadiness: (...args: unknown[]) => getFacilityPricingReadinessMock(...args),
  getFacilityProposalTemplate: (...args: unknown[]) => getFacilityProposalTemplateMock(...args),
}));

vi.mock('../../lib/residential', () => ({
  listResidentialPricingPlans: (...args: unknown[]) => listResidentialPricingPlansMock(...args),
  previewResidentialQuote: (...args: unknown[]) => previewResidentialQuoteMock(...args),
  getResidentialProperty: (...args: unknown[]) => getResidentialPropertyMock(...args),
}));

vi.mock('../../lib/proposalTemplates', () => ({
  listTemplates: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../lib/oneTimeServiceCatalog', () => ({
  listOneTimeServiceCatalog: (...args: unknown[]) => listOneTimeServiceCatalogMock(...args),
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
  industry: null,
  website: null,
  billingEmail: null,
  billingPhone: null,
  billingAddress: null,
  qboCustomerId: null,
  taxId: null,
  paymentTerms: 'NET30',
  creditLimit: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  accountManager: null,
  createdByUser: { id: 'user-1', fullName: 'Admin User' },
  _count: { contacts: 0, facilities: 1 },
};

const residentialAccount: Account = {
  id: 'account-res-1',
  name: 'Willow Residence',
  type: 'residential',
  industry: null,
  website: null,
  billingEmail: 'willow@example.com',
  billingPhone: '555-0101',
  billingAddress: null,
  qboCustomerId: null,
  taxId: null,
  paymentTerms: 'NET30',
  creditLimit: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  accountManager: null,
  createdByUser: { id: 'user-1', fullName: 'Admin User' },
  residentialProperties: [
    {
      id: 'property-1',
      accountId: 'account-res-1',
      name: 'Willow Main Home',
      facility: { id: 'facility-res-1' },
      serviceAddress: { city: 'Seattle', state: 'WA' },
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
      defaultTasks: ['Vacuum floors', 'Dust surfaces'],
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
  _count: { contacts: 0, facilities: 1 },
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
  createdByUser: { id: 'user-1', fullName: 'Admin User' },
  areas: [],
  _count: { areas: 2, facilityTasks: 10 },
};

const residentialFacility: Facility = {
  ...facility,
  id: 'facility-res-1',
  name: 'Willow Main Home',
  buildingType: 'single_family',
  submittedForProposal: true,
  account: {
    id: 'account-res-1',
    name: 'Willow Residence',
    type: 'residential',
  },
  residentialPropertyId: 'property-1',
};

const residentialStandaloneFacility: Facility = {
  ...residentialFacility,
  id: 'facility-res-2',
  name: 'Standalone Residential Location',
  submittedForProposal: false,
  residentialPropertyId: null,
};

const pricingBreakdown = {
  facilityId: 'facility-1',
  facilityName: 'Main Facility',
  buildingType: 'office',
  serviceFrequency: '5x_week',
  totalSquareFeet: 1000,
  areas: [],
  costBreakdown: {
    totalLaborCost: 10,
    totalLaborHours: 1,
    totalInsuranceCost: 1,
    totalAdminOverheadCost: 1,
    totalEquipmentCost: 1,
    totalTravelCost: 1,
    totalSupplyCost: 1,
    totalCostPerVisit: 15,
  },
  monthlyVisits: 20,
  monthlyCostBeforeProfit: 200,
  profitAmount: 50,
  profitMarginApplied: 0.2,
  taskComplexityAddOn: 0,
  taskComplexityAmount: 0,
  subtotal: 250,
  monthlyTotal: 250,
  minimumApplied: false,
  pricingSettingsId: 'pricing-1',
  pricingSettingsName: 'Standard',
};

const activeProposal: Proposal = {
  id: 'proposal-active-1',
  proposalNumber: 'PROP-001',
  title: 'Active Proposal',
  status: 'draft',
  description: null,
  subtotal: 100,
  taxRate: 0.05,
  taxAmount: 5,
  totalAmount: 105,
  validUntil: null,
  sentAt: null,
  viewedAt: null,
  acceptedAt: null,
  rejectedAt: null,
  rejectionReason: null,
  notes: null,
  termsAndConditions: null,
  serviceFrequency: 'weekly',
  serviceSchedule: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  pricingStrategyKey: null,
  pricingStrategyVersion: null,
  pricingPlanId: 'pricing-1',
  pricingSnapshot: null,
  pricingLocked: false,
  pricingLockedAt: null,
  publicToken: null,
  publicTokenExpiresAt: null,
  signatureName: null,
  signatureDate: null,
  signatureIp: null,
  account: {
    id: 'account-1',
    name: 'Acme Corp',
    type: 'commercial',
    defaultPricingPlanId: null,
    contacts: [],
  },
  facility: {
    id: 'facility-1',
    name: 'Main Facility',
    address: { city: 'Vancouver', state: 'BC' },
    defaultPricingPlanId: null,
  },
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
  },
  proposalItems: [],
  proposalServices: [],
};

describe('ProposalForm', () => {
  beforeEach(() => {
    mockParams = {};
    navigateMock.mockReset();
    listAccountsMock.mockReset();
    listFacilitiesMock.mockReset();
    listAreasMock.mockReset();
    listAreaTypesMock.mockReset();
    listFacilityTasksMock.mockReset();
    listPricingSettingsMock.mockReset();
    getProposalMock.mockReset();
    listProposalsMock.mockReset();
    createProposalMock.mockReset();
    updateProposalMock.mockReset();
    getFacilityPricingReadinessMock.mockReset();
    getFacilityProposalTemplateMock.mockReset();
    listResidentialPricingPlansMock.mockReset();
    previewResidentialQuoteMock.mockReset();
    getFacilityMock.mockReset();
    getResidentialPropertyMock.mockReset();
    listOneTimeServiceCatalogMock.mockReset();

    listAccountsMock.mockResolvedValue({ data: [account, residentialAccount] });
    listFacilitiesMock.mockResolvedValue({ data: [facility, residentialFacility] });
    listProposalsMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 200, total: 0, totalPages: 1 } });
    listOneTimeServiceCatalogMock.mockResolvedValue([
      {
        id: 'specialized-1',
        name: 'Window Cleaning',
        code: 'WINDOW_CLEANING',
        description: 'Interior and exterior window cleaning',
        serviceType: 'window_cleaning',
        unitType: 'fixed',
        baseRate: 250,
        defaultQuantity: 1,
        minimumCharge: null,
        maxDiscountPercent: 10,
        requiresSchedule: true,
        isActive: true,
        addOns: [],
      },
    ]);
    getFacilityMock.mockResolvedValue(residentialFacility);
    getResidentialPropertyMock.mockResolvedValue(residentialAccount.residentialProperties![0]);
    listAreasMock.mockResolvedValue({
      data: [
        {
          id: 'area-1',
          name: 'Lobby',
          quantity: 1,
          length: null,
          width: null,
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
          facility: { id: 'facility-1', name: 'Main Facility', accountId: 'account-1' },
          areaType: { id: 'area-type-1', name: 'Lobby', defaultSquareFeet: '500', baseCleaningTimeMinutes: null },
          createdByUser: { id: 'user-1', fullName: 'Admin User' },
          fixtures: [],
          _count: { facilityTasks: 1 },
        },
      ],
    });
    listFacilityTasksMock.mockResolvedValue({
      data: [
        {
          id: 'task-1',
          customName: 'Wipe Surfaces',
          customInstructions: null,
          estimatedMinutes: 20,
          baseMinutesOverride: null,
          perSqftMinutesOverride: null,
          perUnitMinutesOverride: null,
          perRoomMinutesOverride: null,
          isRequired: true,
          cleaningFrequency: 'daily',
          conditionMultiplier: 1,
          priority: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          facility: { id: 'facility-1', name: 'Main Facility', accountId: 'account-1' },
          area: { id: 'area-1', name: 'Lobby', areaType: { id: 'area-type-1', name: 'Lobby' } },
          taskTemplate: null,
          createdByUser: { id: 'user-1', fullName: 'Admin User' },
          fixtureMinutes: [],
        },
      ],
    });
    listPricingSettingsMock.mockResolvedValue({
      data: [
        {
          id: 'pricing-1',
          name: 'Standard',
          pricingType: 'square_foot',
          baseRatePerSqFt: '0.15',
          minimumMonthlyCharge: '0',
          hourlyRate: '0',
          laborCostPerHour: '20',
          laborBurdenPercentage: '0.2',
          sqftPerLaborHour: { office: 2500, other: 2500 },
          insurancePercentage: '0.05',
          adminOverheadPercentage: '0.1',
          travelCostPerVisit: '10',
          equipmentPercentage: '0.03',
          supplyCostPercentage: '0.05',
          supplyCostPerSqFt: null,
          targetProfitMargin: '0.2',
          subcontractorPercentage: '0',
          floorTypeMultipliers: {},
          frequencyMultipliers: {},
          conditionMultipliers: {},
          trafficMultipliers: {},
          taskComplexityAddOns: {},
          isDefault: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ],
    });
    listResidentialPricingPlansMock.mockResolvedValue({
      data: [
        {
          id: 'res-plan-1',
          name: 'Residential Standard',
          strategyKey: 'residential_flat_v1',
          settings: {
            strategyKey: 'residential_flat_v1',
            homeTypeBasePrices: { apartment: 100, condo: 110, townhouse: 120, single_family: 140 },
            sqftBrackets: [],
            bedroomAdjustments: {},
            bathroomAdjustments: { fullBath: 10, halfBath: 5 },
            levelAdjustments: {},
            conditionMultipliers: { light: 1, standard: 1, heavy: 1.2 },
            serviceTypeMultipliers: {
              recurring_standard: 1,
              one_time_standard: 1,
              deep_clean: 1.2,
              move_in_out: 1.3,
              turnover: 1.1,
              post_construction: 1.4,
            },
            frequencyDiscounts: { weekly: 0, biweekly: 0.05, every_4_weeks: 0.1, one_time: 0 },
            firstCleanSurcharge: { enabled: true, type: 'flat', value: 25, appliesTo: ['recurring_standard'] },
            addOnPrices: {
              inside_fridge: {
                pricingType: 'flat',
                unitPrice: 20,
                estimatedMinutes: 15,
                description: 'Inside fridge clean',
              },
            },
            minimumPrice: 100,
            estimatedHours: {
              baseHoursByHomeType: { apartment: 2, condo: 2.5, townhouse: 3, single_family: 3.5 },
              minutesPerBedroom: 15,
              minutesPerFullBath: 10,
              minutesPerHalfBath: 5,
              minutesPer1000SqFt: 20,
              conditionMultipliers: { light: 1, standard: 1, heavy: 1.2 },
              serviceTypeMultipliers: {
                recurring_standard: 1,
                one_time_standard: 1,
                deep_clean: 1.2,
                move_in_out: 1.3,
                turnover: 1.1,
                post_construction: 1.4,
              },
              addOnMinutes: { inside_fridge: 15 },
            },
            manualReviewRules: {
              maxAutoSqft: 5000,
              heavyConditionRequiresReview: true,
              postConstructionRequiresReview: true,
              maxAddOnsBeforeReview: 4,
            },
          },
          isActive: true,
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
        },
      ],
    });
    previewResidentialQuoteMock.mockResolvedValue({
      pricingPlan: {
        id: 'res-plan-1',
        name: 'Residential Standard',
        strategyKey: 'residential_flat_v1',
      },
      breakdown: {
        baseHomePrice: 140,
        sqftAdjustment: 0,
        bedroomAdjustment: 0,
        bathroomAdjustment: 0,
        levelAdjustment: 0,
        baseSubtotal: 140,
        conditionMultiplier: 1,
        serviceMultiplier: 1,
        serviceSubtotal: 140,
        recurringDiscount: 0,
        firstCleanSurcharge: 25,
        addOnTotal: 20,
        minimumApplied: false,
        minimumPrice: 100,
        totalBeforeMinimum: 185,
        finalTotal: 185,
        estimatedHours: 3.5,
        confidenceLevel: 'high',
        manualReviewRequired: false,
        manualReviewReasons: [],
        addOns: [
          {
            code: 'inside_fridge',
            label: 'inside_fridge',
            pricingType: 'flat',
            quantity: 1,
            unitLabel: null,
            unitPrice: 20,
            estimatedMinutes: 15,
            lineTotal: 20,
          },
        ],
        guidance: ['Residential scope is ready for pricing.'],
      },
      settingsSnapshot: {} as never,
    });
    getFacilityPricingReadinessMock.mockResolvedValue({
      isReady: true,
      areaCount: 2,
      totalSquareFeet: 1000,
    });
    getFacilityProposalTemplateMock.mockResolvedValue({
      facility: { name: 'Main Facility' },
      pricing: pricingBreakdown,
      suggestedServices: [
        {
          serviceName: 'Daily Cleaning',
          serviceType: 'daily',
          frequency: 'daily',
          monthlyPrice: 250,
          description: 'Lobby - 500 sq ft\nDaily: Wipe surfaces, Empty trash',
          includedTasks: [],
        },
      ],
      suggestedItems: [],
    });
    createProposalMock.mockResolvedValue({ id: 'proposal-1' });
    updateProposalMock.mockResolvedValue({ id: 'proposal-1' });
    getProposalMock.mockResolvedValue({
      id: 'proposal-1',
      proposalNumber: 'PROP-001',
      title: 'Existing Proposal',
      status: 'draft',
      description: null,
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 0,
      validUntil: null,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      pricingStrategyKey: 'sqft_settings_v1',
      pricingStrategyVersion: '1.0.0',
      pricingPlanId: 'pricing-1',
      pricingSnapshot: null,
      pricingLocked: false,
      pricingLockedAt: null,
      account: {
        id: 'account-1',
        name: 'Acme Corp',
        type: 'commercial',
      },
      facility: {
        id: 'facility-1',
        name: 'Main Facility',
        address: { city: 'Vancouver', state: 'BC' },
      },
      createdByUser: {
        id: 'user-1',
        fullName: 'Admin User',
        email: 'admin@example.com',
      },
      proposalItems: [],
      proposalServices: [],
    } as Proposal);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates required fields before create', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    const buttons = await screen.findAllByRole('button', { name: /create proposal/i });
    await user.click(buttons[0]);

    await waitFor(() => {
      expect(listFacilitiesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
        })
      );
    });
    listAreaTypesMock.mockResolvedValue({
      data: [{ id: 'area-type-1', name: 'Lobby' }],
    });

    expect(createProposalMock).not.toHaveBeenCalled();
  });

  it('creates a proposal when valid', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.selectOptions(await screen.findByLabelText(/service location/i), 'facility-1');
    await user.type(screen.getByLabelText(/proposal title/i), 'Cleaning Proposal');
    const taxRateInput = screen.getAllByRole('spinbutton', { name: /tax rate/i })[0];
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '5');
    await user.click(await screen.findByRole('button', { name: /confirm areas accuracy/i }));
    await user.click(await screen.findByRole('button', { name: /confirm tasks accuracy/i }));

    const createButtons = screen.getAllByRole('button', { name: /create proposal/i });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(createProposalMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/proposals');
    });
  });

  it('auto-fills the proposal title when a commercial facility is selected', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.selectOptions(await screen.findByLabelText(/service location/i), 'facility-1');

    await waitFor(() => {
      expect(screen.getByLabelText(/proposal title/i)).toHaveValue('Cleaning Services - Main Facility');
    });
  });

  it('shows specialized catalog jobs and populates the selected job as a line item', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/proposal type/i), 'specialized');
    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.selectOptions(await screen.findByLabelText(/service location/i), 'facility-1');

    await waitFor(() => {
      expect(listOneTimeServiceCatalogMock).toHaveBeenCalledWith({ includeInactive: false });
    });

    await user.selectOptions(await screen.findByLabelText(/specialized job requested/i), 'specialized-1');

    expect(screen.getByLabelText(/proposal title/i)).toHaveValue('Window Cleaning');
    expect(screen.getByDisplayValue('Window Cleaning - Interior and exterior window cleaning')).toBeInTheDocument();
    expect(screen.getAllByText('$250.00').length).toBeGreaterThan(0);
    expect(screen.queryByText(/service location review before proposal/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/scheduled date/i), '2026-05-01');
    await user.type(screen.getByLabelText(/start time/i), '09:00');
    await user.type(screen.getByLabelText(/end time/i), '12:00');
    const taxRateInput = screen.getAllByRole('spinbutton', { name: /tax rate/i })[0];
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '5');
    await user.click(screen.getAllByRole('button', { name: /create proposal/i })[0]);

    await waitFor(() => {
      expect(listAreasMock).not.toHaveBeenCalled();
      expect(listFacilityTasksMock).not.toHaveBeenCalled();
      expect(createProposalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          proposalType: 'specialized',
          accountId: 'account-1',
          facilityId: 'facility-1',
          proposalItems: expect.arrayContaining([
            expect.objectContaining({
              description: 'Window Cleaning - Interior and exterior window cleaning',
              totalPrice: 250,
            }),
          ]),
        })
      );
    });
  });

  it('auto-populates services from facility pricing using client schedule frequency', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.selectOptions(await screen.findByLabelText(/service location/i), 'facility-1');
    await waitFor(() => {
      expect((screen.getByLabelText(/pricing plan/i) as HTMLSelectElement).value).toBe('pricing-1');
    });
    await user.selectOptions(await screen.findByLabelText(/cleaning frequency/i), 'monthly');

    const calculateButton = await screen.findByRole('button', { name: /calculate & populate/i });
    await user.click(calculateButton);

    expect(await screen.findByText('Daily Cleaning')).toBeInTheDocument();
    await user.click(screen.getByText('Daily Cleaning'));
    expect(screen.getByText('Wipe surfaces')).toBeInTheDocument();
    expect(screen.getByText('Empty trash')).toBeInTheDocument();
    await waitFor(() => {
      expect(getFacilityProposalTemplateMock).toHaveBeenCalledWith(
        'facility-1',
        'monthly',
        'pricing-1',
        undefined,
        undefined
      );
    });
  });

  it('auto-fills the residential proposal title after service type is selected', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/proposal type/i), 'residential');
    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-res-1');
    await user.selectOptions(await screen.findByLabelText(/service location/i), 'facility-res-1');

    expect(screen.getByText('Auto-Populate from Residential Pricing')).toBeInTheDocument();

    expect(screen.getByLabelText(/proposal title/i)).toHaveValue('');

    await user.selectOptions(await screen.findByLabelText(/residential service type/i), 'recurring_standard');

    await waitFor(() => {
      expect(screen.getByLabelText(/proposal title/i)).toHaveValue('Recurring Standard - Willow Main Home');
    });
  });

  it('requires facility review confirmation before create when facility is selected', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.type(screen.getByLabelText(/proposal title/i), 'Facility Proposal');
    const taxRateInput = screen.getAllByRole('spinbutton', { name: /tax rate/i })[0];
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '5');
    await user.selectOptions(await screen.findByLabelText(/service location/i), 'facility-1');

    const createButtons = await screen.findAllByRole('button', { name: /create proposal/i });
    expect(createButtons[0]).toBeDisabled();
    expect(createProposalMock).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: /confirm areas accuracy/i }));
    await user.click(await screen.findByRole('button', { name: /confirm tasks accuracy/i }));

    const submitAfterReview = await screen.findAllByRole('button', { name: /create proposal/i });
    expect(submitAfterReview[0]).toBeEnabled();
    await user.click(submitAfterReview[0]);

    await waitFor(() => {
      expect(createProposalMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/proposals');
    });
  });

  it('hides commercial service locations that already have an active proposal', async () => {
    const user = userEvent.setup();
    listProposalsMock.mockResolvedValue({
      data: [activeProposal],
      pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
    });

    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');

    expect(screen.queryByRole('option', { name: 'Main Facility' })).not.toBeInTheDocument();
    expect(screen.getByText(/no service locations are available without an active proposal/i)).toBeInTheDocument();
  });

  it('locks proposal identity fields when editing an active proposal', async () => {
    mockParams = { id: 'proposal-1' };
    listProposalsMock.mockResolvedValue({
      data: [activeProposal],
      pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
    });

    render(<ProposalForm />);

    expect(await screen.findByDisplayValue('Existing Proposal')).toBeInTheDocument();
    expect(screen.getByLabelText(/proposal type/i)).toBeDisabled();
    expect(screen.getByLabelText(/account/i)).toBeDisabled();
    expect(screen.getByLabelText(/service location/i)).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Main Facility', selected: true })).toBeInTheDocument();
    expect(
      screen.getByText(/proposal type, account, and service location are locked when editing/i)
    ).toBeInTheDocument();
  });

  it('uses the residential quote engine for residential proposals', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await waitFor(() => {
      expect(listFacilitiesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
          includeResidentialLinked: true,
        })
      );
    });

    await user.selectOptions(await screen.findByLabelText(/proposal type/i), 'residential');
    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-res-1');
    await user.selectOptions(await screen.findByLabelText(/service location/i), 'facility-res-1');
    await user.selectOptions(await screen.findByLabelText(/residential service type/i), 'recurring_standard');
    await user.selectOptions(await screen.findByLabelText(/residential frequency/i), 'every_4_weeks');
    const taxRateInput = screen.getAllByRole('spinbutton', { name: /tax rate/i })[0];
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '5');

    expect(await screen.findByLabelText(/residential pricing plan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/residential frequency/i)).toBeInTheDocument();
    const calculateButton = screen.getByRole('button', { name: /calculate & populate/i });
    expect(calculateButton).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /^thu$/i }));
    await user.click(calculateButton);
    await waitFor(() => {
      expect(screen.getAllByText('Recurring Standard').length).toBeGreaterThan(1);
      expect(screen.getByText('Service Scope')).toBeInTheDocument();
      expect(screen.getByText('Lobby')).toBeInTheDocument();
      expect(screen.getByText('Wipe Surfaces')).toBeInTheDocument();
      expect(screen.getByText('Internal Pricing Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Base Home Price:')).toBeInTheDocument();
    });

    await user.click(await screen.findByRole('button', { name: /confirm areas accuracy/i }));
    await user.click(await screen.findByRole('button', { name: /confirm tasks accuracy/i }));
    await user.click(screen.getAllByRole('button', { name: /create proposal/i })[0]);

    await waitFor(() => {
      expect(previewResidentialQuoteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 'property-1',
          serviceType: 'recurring_standard',
          frequency: 'every_4_weeks',
          pricingPlanId: 'res-plan-1',
        })
      );
      expect(createProposalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'account-res-1',
          facilityId: 'facility-res-1',
          pricingPlanId: null,
          serviceFrequency: 'monthly',
          serviceSchedule: expect.objectContaining({
            days: ['thursday'],
          }),
          proposalServices: expect.arrayContaining([
            expect.objectContaining({
              serviceName: 'Recurring Standard',
            }),
          ]),
          pricingSnapshot: expect.objectContaining({
            engine: 'residential_quote_preview_v1',
            residentialPricingPlanId: 'res-plan-1',
            residentialServiceType: 'recurring_standard',
            residentialFrequency: 'every_4_weeks',
          }),
        })
      );
    });
  });

  it('resolves residential service location from live facility data when preload data is incomplete', async () => {
    const user = userEvent.setup();
    listAccountsMock.mockResolvedValue({
      data: [
        account,
        {
          ...residentialAccount,
          residentialProperties: [],
        },
      ],
    });
    listFacilitiesMock.mockResolvedValue({
      data: [
        facility,
        residentialFacility,
      ],
    });
    getFacilityMock.mockResolvedValue(residentialFacility);
    getResidentialPropertyMock.mockResolvedValue(residentialAccount.residentialProperties![0]);

    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/proposal type/i), 'residential');
    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-res-1');
    await user.selectOptions(await screen.findByLabelText(/service location/i), 'facility-res-1');
    await user.selectOptions(await screen.findByLabelText(/residential service type/i), 'recurring_standard');

    const calculateButton = screen.getByRole('button', { name: /calculate & populate/i });
    await user.click(calculateButton);

    await waitFor(() => {
      expect(previewResidentialQuoteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 'property-1',
          serviceType: 'recurring_standard',
        })
      );
    });
  });

  it('only shows residential-linked service locations for residential proposals', async () => {
    const user = userEvent.setup();
    listFacilitiesMock.mockResolvedValue({
      data: [facility, residentialFacility, residentialStandaloneFacility],
    });

    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/proposal type/i), 'residential');
    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-res-1');

    expect(screen.getByRole('option', { name: 'Willow Main Home' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Standalone Residential Location' })).not.toBeInTheDocument();
  });

  it('requires residential service locations to be submitted for proposal', async () => {
    const user = userEvent.setup();
    listFacilitiesMock.mockResolvedValue({
      data: [
        facility,
        { ...residentialFacility, submittedForProposal: false },
      ],
    });

    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/proposal type/i), 'residential');
    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-res-1');

    expect(screen.queryByRole('option', { name: 'Willow Main Home' })).not.toBeInTheDocument();
    expect(screen.getByText(/no residential-linked service locations are available without an active proposal and proposal submission/i)).toBeInTheDocument();
  });

  it('shows a helpful message when a residential account has no linked service locations for proposals', async () => {
    const user = userEvent.setup();
    listAccountsMock.mockResolvedValue({
      data: [
        account,
        {
          ...residentialAccount,
          residentialProperties: [],
        },
      ],
    });
    listFacilitiesMock.mockResolvedValue({
      data: [facility, residentialStandaloneFacility],
    });
    getFacilityMock.mockResolvedValue(residentialStandaloneFacility);

    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/proposal type/i), 'residential');
    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-res-1');

    expect(screen.getByText(/no residential-linked service locations are available/i)).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Standalone Residential Location' })).not.toBeInTheDocument();
  });

  it('updates a proposal in edit mode', async () => {
    mockParams = { id: 'proposal-1' };
    const user = userEvent.setup();

    render(<ProposalForm />);

    await screen.findByDisplayValue('Existing Proposal');
    await user.clear(screen.getByLabelText(/proposal title/i));
    await user.type(screen.getByLabelText(/proposal title/i), 'Updated Proposal');
    const taxRateInput = screen.getAllByRole('spinbutton', { name: /tax rate/i })[0];
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '5');
    await user.click(await screen.findByRole('button', { name: /confirm areas accuracy/i }));
    await user.click(await screen.findByRole('button', { name: /confirm tasks accuracy/i }));
    const updateButtons = screen.getAllByRole('button', { name: /update proposal/i });
    await user.click(updateButtons[0]);

    await waitFor(() => {
      expect(updateProposalMock).toHaveBeenCalledWith('proposal-1', expect.any(Object));
      expect(navigateMock).toHaveBeenCalledWith('/proposals');
    });
  });

  it('revises a rejected proposal in edit mode', async () => {
    mockParams = { id: 'proposal-1' };
    getProposalMock.mockResolvedValueOnce({
      id: 'proposal-1',
      proposalNumber: 'PROP-001',
      title: 'Rejected Proposal',
      status: 'rejected',
      description: null,
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 0,
      validUntil: null,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: new Date().toISOString(),
      rejectionReason: 'Pricing too high',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      pricingStrategyKey: 'sqft_settings_v1',
      pricingStrategyVersion: '1.0.0',
      pricingPlanId: 'pricing-1',
      pricingSnapshot: null,
      pricingLocked: false,
      pricingLockedAt: null,
      facility: {
        id: 'facility-1',
        name: 'Main Facility',
        address: { city: 'Vancouver', state: 'BC' },
      },
      account: {
        id: 'account-1',
        name: 'Acme Corp',
        type: 'commercial',
      },
      createdByUser: {
        id: 'user-1',
        fullName: 'Admin User',
        email: 'admin@example.com',
      },
      proposalItems: [],
      proposalServices: [],
    } as Proposal);
    const user = userEvent.setup();

    render(<ProposalForm />);

    expect(await screen.findByRole('heading', { name: 'Revise Proposal' })).toBeInTheDocument();
    expect(screen.getByText(/reopens the proposal as a draft/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/proposal title/i));
    await user.type(screen.getByLabelText(/proposal title/i), 'Revised Proposal');
    const taxRateInput = screen.getAllByRole('spinbutton', { name: /tax rate/i })[0];
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '5');
    await user.click(await screen.findByRole('button', { name: /confirm areas accuracy/i }));
    await user.click(await screen.findByRole('button', { name: /confirm tasks accuracy/i }));

    const reviseButtons = screen.getAllByRole('button', { name: /revise proposal/i });
    await user.click(reviseButtons[0]);

    await waitFor(() => {
      expect(updateProposalMock).toHaveBeenCalledWith('proposal-1', expect.any(Object));
      expect(navigateMock).toHaveBeenCalledWith('/proposals');
    });
  });

  it('requires tax rate before create submission', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.type(screen.getByLabelText(/proposal title/i), 'No Tax Proposal');

    const createButtons = await screen.findAllByRole('button', { name: /create proposal/i });
    expect(createButtons[0]).toBeDisabled();
    await user.click(createButtons[0]);

    expect(createProposalMock).not.toHaveBeenCalled();
  });
});
