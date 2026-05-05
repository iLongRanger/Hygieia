import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import ResidentialPricingPlansPage from '../residential/ResidentialPricingPlansPage';
import { useAuthStore } from '../../stores/authStore';

const listResidentialPricingPlansMock = vi.fn();

vi.mock('../../lib/residential', () => ({
  listResidentialPricingPlans: (...args: unknown[]) => listResidentialPricingPlansMock(...args),
  archiveResidentialPricingPlan: vi.fn(),
  createResidentialPricingPlan: vi.fn(),
  restoreResidentialPricingPlan: vi.fn(),
  setDefaultResidentialPricingPlan: vi.fn(),
  updateResidentialPricingPlan: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ResidentialPricingPlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'admin-1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });
    listResidentialPricingPlansMock.mockResolvedValue({ data: [] });
  });

  it('shows the residential pricing guide', async () => {
    render(<ResidentialPricingPlansPage />);

    expect(await screen.findByText('Residential Pricing Guide')).toBeInTheDocument();
    expect(screen.getByText('Build repeatable house-cleaning prices from residential details')).toBeInTheDocument();
    expect(screen.getByText('Home Profile')).toBeInTheDocument();
    expect(screen.getByText('Price Logic')).toBeInTheDocument();
    expect(screen.getByText('Time Estimate')).toBeInTheDocument();
  });
});
