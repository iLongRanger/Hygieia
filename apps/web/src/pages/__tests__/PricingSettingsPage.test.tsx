import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import PricingSettingsPage from '../pricing/PricingSettingsPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listPricingSettingsMock = vi.fn();
const getPricingSettingsMock = vi.fn();
const createPricingSettingsMock = vi.fn();
const updatePricingSettingsMock = vi.fn();
const setDefaultPricingSettingsMock = vi.fn();
const archivePricingSettingsMock = vi.fn();
const restorePricingSettingsMock = vi.fn();

vi.mock('../../lib/pricing', () => ({
  listPricingSettings: (...args: unknown[]) => listPricingSettingsMock(...args),
  getPricingSettings: (...args: unknown[]) => getPricingSettingsMock(...args),
  createPricingSettings: (...args: unknown[]) => createPricingSettingsMock(...args),
  updatePricingSettings: (...args: unknown[]) => updatePricingSettingsMock(...args),
  setDefaultPricingSettings: (...args: unknown[]) => setDefaultPricingSettingsMock(...args),
  archivePricingSettings: (...args: unknown[]) => archivePricingSettingsMock(...args),
  restorePricingSettings: (...args: unknown[]) => restorePricingSettingsMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const basePlan = {
  id: 'plan-1',
  name: 'Standard Plan',
  pricingType: 'square_foot',
  baseRatePerSqFt: '0.15',
  minimumMonthlyCharge: '250',
  hourlyRate: '35',
  laborCostPerHour: '18',
  laborBurdenPercentage: '0.25',
  sqftPerLaborHour: {
    office: 2500,
    medical: 1500,
    industrial: 2200,
    retail: 2400,
    educational: 2000,
    warehouse: 3500,
    residential: 2200,
    mixed: 2200,
    other: 2500,
  },
  insurancePercentage: '0.08',
  adminOverheadPercentage: '0.12',
  travelCostPerVisit: '15',
  equipmentPercentage: '0.05',
  supplyCostPercentage: '0.04',
  supplyCostPerSqFt: null,
  targetProfitMargin: '0.25',
  subcontractorPercentage: '0.60',
  floorTypeMultipliers: {
    vct: 1,
    carpet: 1,
    hardwood: 1,
    tile: 1,
    concrete: 1,
    epoxy: 1,
  },
  frequencyMultipliers: {
    '1x_week': 1,
    '2x_week': 1,
    '3x_week': 1,
    '4x_week': 1,
    '5x_week': 1,
    daily: 1,
    monthly: 1,
  },
  conditionMultipliers: {
    standard: 1,
    medium: 1.15,
    hard: 1.3,
  },
  trafficMultipliers: {
    low: 1,
    medium: 1.1,
    high: 1.2,
  },
  taskComplexityAddOns: {
    standard: 0,
    sanitization: 0.2,
    floor_care: 0.25,
    window_cleaning: 0.15,
  },
  isActive: true,
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
};

const secondaryPlan = {
  ...basePlan,
  id: 'plan-2',
  name: 'Secondary Plan',
  isDefault: false,
};

describe('PricingSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();

    listPricingSettingsMock.mockResolvedValue({
      data: [basePlan, secondaryPlan],
    });
    getPricingSettingsMock.mockImplementation(async (id: string) =>
      id === 'plan-2' ? secondaryPlan : basePlan
    );
    createPricingSettingsMock.mockImplementation(async (payload: any) => ({
      ...basePlan,
      id: 'plan-new',
      name: payload.name,
      pricingType: payload.pricingType ?? basePlan.pricingType,
    }));
    updatePricingSettingsMock.mockImplementation(async (_id: string, data: any) => ({
      ...basePlan,
      ...data,
    }));
    setDefaultPricingSettingsMock.mockResolvedValue(basePlan);
    archivePricingSettingsMock.mockResolvedValue(basePlan);
    restorePricingSettingsMock.mockResolvedValue(basePlan);
  });

  it('loads pricing plans and auto-selects default plan details', async () => {
    render(<PricingSettingsPage />);

    expect(await screen.findByText('Pricing Plans')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Standard Plan' })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(getPricingSettingsMock).toHaveBeenCalledWith('plan-1');
    });
  });

  it('creates a new pricing plan from modal', async () => {
    const user = userEvent.setup();
    render(<PricingSettingsPage />);

    await screen.findByText('Pricing Plans');
    await user.click(screen.getByRole('button', { name: /new plan/i }));

    await user.type(screen.getByLabelText(/plan name/i), 'Night Shift Plan');
    await user.click(screen.getByRole('button', { name: /^create plan$/i }));

    await waitFor(() => {
      expect(createPricingSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Night Shift Plan',
        })
      );
    });
  });

  it('updates selected pricing plan in edit mode', async () => {
    const user = userEvent.setup();
    render(<PricingSettingsPage />);

    await screen.findByRole('heading', { name: 'Standard Plan' });
    await user.click(screen.getByRole('button', { name: /edit/i }));

    const baseRateInput = screen.getByLabelText(/base rate per sq ft/i);
    await user.clear(baseRateInput);
    await user.type(baseRateInput, '0.2');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updatePricingSettingsMock).toHaveBeenCalledWith(
        'plan-1',
        expect.objectContaining({
          baseRatePerSqFt: 0.2,
        })
      );
    });
  });
});
