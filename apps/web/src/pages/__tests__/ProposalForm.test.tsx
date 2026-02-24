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
const listFacilityTasksMock = vi.fn();
const listPricingSettingsMock = vi.fn();
const getProposalMock = vi.fn();
const createProposalMock = vi.fn();
const updateProposalMock = vi.fn();
const getFacilityPricingReadinessMock = vi.fn();
const getFacilityProposalTemplateMock = vi.fn();

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
  listAreas: (...args: unknown[]) => listAreasMock(...args),
  listFacilityTasks: (...args: unknown[]) => listFacilityTasksMock(...args),
}));

vi.mock('../../lib/proposals', () => ({
  getProposal: (...args: unknown[]) => getProposalMock(...args),
  createProposal: (...args: unknown[]) => createProposalMock(...args),
  updateProposal: (...args: unknown[]) => updateProposalMock(...args),
}));

vi.mock('../../lib/pricing', () => ({
  listPricingSettings: (...args: unknown[]) => listPricingSettingsMock(...args),
  getFacilityPricingReadiness: (...args: unknown[]) => getFacilityPricingReadinessMock(...args),
  getFacilityProposalTemplate: (...args: unknown[]) => getFacilityProposalTemplateMock(...args),
}));

vi.mock('../../lib/proposalTemplates', () => ({
  listTemplates: vi.fn().mockResolvedValue([]),
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
  _count: { areas: 2, facilityTasks: 10 },
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

describe('ProposalForm', () => {
  beforeEach(() => {
    mockParams = {};
    navigateMock.mockReset();
    listAccountsMock.mockReset();
    listFacilitiesMock.mockReset();
    listAreasMock.mockReset();
    listFacilityTasksMock.mockReset();
    listPricingSettingsMock.mockReset();
    getProposalMock.mockReset();
    createProposalMock.mockReset();
    updateProposalMock.mockReset();
    getFacilityPricingReadinessMock.mockReset();
    getFacilityProposalTemplateMock.mockReset();

    listAccountsMock.mockResolvedValue({ data: [account] });
    listFacilitiesMock.mockResolvedValue({ data: [facility] });
    listAreasMock.mockResolvedValue({
      data: [
        {
          id: 'area-1',
          name: 'Lobby',
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
          description: 'Standard cleaning',
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
      facility: null,
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

    expect(createProposalMock).not.toHaveBeenCalled();
  });

  it('creates a proposal when valid', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.type(screen.getByLabelText(/proposal title/i), 'Cleaning Proposal');

    const createButtons = screen.getAllByRole('button', { name: /create proposal/i });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(createProposalMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/proposals');
    });
  });

  it('auto-populates services from facility pricing', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.selectOptions(await screen.findByLabelText(/facility/i), 'facility-1');
    await waitFor(() => {
      expect((screen.getByLabelText(/pricing plan/i) as HTMLSelectElement).value).toBe('pricing-1');
    });

    const calculateButton = await screen.findByRole('button', { name: /calculate & populate/i });
    await user.click(calculateButton);

    expect(await screen.findByText('Daily Cleaning')).toBeInTheDocument();
    await waitFor(() => {
      expect(getFacilityProposalTemplateMock).toHaveBeenCalledWith(
        'facility-1',
        'daily',
        'pricing-1',
        undefined,
        undefined
      );
    });
  });

  it('requires facility review confirmation before create when facility is selected', async () => {
    const user = userEvent.setup();
    render(<ProposalForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await user.type(screen.getByLabelText(/proposal title/i), 'Facility Proposal');
    await user.selectOptions(await screen.findByLabelText(/facility/i), 'facility-1');

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

  it('updates a proposal in edit mode', async () => {
    mockParams = { id: 'proposal-1' };
    const user = userEvent.setup();

    render(<ProposalForm />);

    await screen.findByDisplayValue('Existing Proposal');
    await user.clear(screen.getByLabelText(/proposal title/i));
    await user.type(screen.getByLabelText(/proposal title/i), 'Updated Proposal');
    const updateButtons = screen.getAllByRole('button', { name: /update proposal/i });
    await user.click(updateButtons[0]);

    await waitFor(() => {
      expect(updateProposalMock).toHaveBeenCalledWith('proposal-1', expect.any(Object));
      expect(navigateMock).toHaveBeenCalledWith('/proposals');
    });
  });
});
