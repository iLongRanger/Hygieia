import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { ClientProfileModal } from '../ClientProfileModal';

// Mock the API functions
vi.mock('../../../lib/accounts', () => ({
  getAccount: vi.fn(),
}));

vi.mock('../../../lib/leads', () => ({
  getLead: vi.fn(),
}));

vi.mock('../../../lib/facilities', () => ({
  listFacilities: vi.fn(),
}));

vi.mock('../../../lib/proposals', () => ({
  listProposals: vi.fn(),
}));

vi.mock('../../../lib/contracts', () => ({
  listContracts: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { getAccount } from '../../../lib/accounts';
import { getLead } from '../../../lib/leads';
import { listFacilities } from '../../../lib/facilities';
import { listProposals } from '../../../lib/proposals';
import { listContracts } from '../../../lib/contracts';

const mockAccount = {
  id: 'account-1',
  name: 'Test Company',
  type: 'commercial',
  industry: 'healthcare',
  billingEmail: 'billing@test.com',
  billingPhone: '555-1234',
  paymentTerms: 'NET30',
  accountManager: {
    id: 'user-1',
    fullName: 'John Manager',
    email: 'john@example.com',
  },
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin',
  },
  _count: {
    contacts: 3,
    facilities: 2,
  },
};

const mockLead = {
  id: 'lead-1',
  status: 'qualified',
  companyName: 'Lead Company',
  contactName: 'Jane Lead',
  primaryEmail: 'jane@lead.com',
  primaryPhone: '555-5678',
  estimatedValue: '50000',
  convertedToAccountId: null,
  convertedAt: null,
};

const mockConvertedLead = {
  ...mockLead,
  id: 'lead-2',
  status: 'converted',
  convertedToAccountId: 'account-1',
  convertedAt: '2026-01-15T00:00:00Z',
};

const mockFacilities = {
  data: [
    {
      id: 'facility-1',
      name: 'Main Office',
      address: { city: 'New York', state: 'NY' },
      status: 'active',
    },
    {
      id: 'facility-2',
      name: 'Warehouse',
      address: { city: 'Newark', state: 'NJ' },
      status: 'pending',
    },
  ],
};

const mockProposals = {
  data: [
    {
      id: 'proposal-1',
      proposalNumber: 'PRO-001',
      title: 'Cleaning Services',
      status: 'sent',
      totalAmount: '5000',
      createdAt: '2026-01-10T00:00:00Z',
    },
  ],
};

const mockContracts = {
  data: [
    {
      id: 'contract-1',
      contractNumber: 'CON-001',
      title: 'Monthly Cleaning',
      status: 'active',
      monthlyValue: '2500',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T00:00:00Z',
    },
  ],
};

describe('ClientProfileModal', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ClientProfileModal
          isOpen={false}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      expect(screen.queryByText('View Full Profile')).not.toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      (getAccount as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Account data display', () => {
    beforeEach(() => {
      (getAccount as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount);
      (listFacilities as ReturnType<typeof vi.fn>).mockResolvedValue(mockFacilities);
      (listProposals as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposals);
      (listContracts as ReturnType<typeof vi.fn>).mockResolvedValue(mockContracts);
    });

    it('should display account information', async () => {
      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('billing@test.com')).toBeInTheDocument();
      });

      expect(screen.getByText('commercial')).toBeInTheDocument();
      expect(screen.getByText('healthcare')).toBeInTheDocument();
    });

    it('should display facilities', async () => {
      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Main Office')).toBeInTheDocument();
      });

      expect(screen.getByText('New York, NY')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
    });

    it('should display proposals', async () => {
      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('PRO-001')).toBeInTheDocument();
      });

      expect(screen.getByText(/Cleaning Services/)).toBeInTheDocument();
    });

    it('should display contracts', async () => {
      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('CON-001')).toBeInTheDocument();
      });

      expect(screen.getByText(/Monthly Cleaning/)).toBeInTheDocument();
    });

    it('should display quick stats', async () => {
      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Active Contracts')).toBeInTheDocument();
      });

      expect(screen.getByText('Monthly Value')).toBeInTheDocument();
      // "Facilities" and "Proposals" may appear multiple times (in stats and sections)
      expect(screen.getAllByText('Facilities').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Proposals').length).toBeGreaterThan(0);
    });
  });

  describe('Lead data display', () => {
    it('should display unconverted lead information with message', async () => {
      (getLead as ReturnType<typeof vi.fn>).mockResolvedValue(mockLead);

      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          leadId="lead-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Jane Lead')).toBeInTheDocument();
      });

      expect(screen.getByText('jane@lead.com')).toBeInTheDocument();
      expect(screen.getByText(/unconverted lead/i)).toBeInTheDocument();
    });

    it('should fetch account data for converted lead', async () => {
      (getLead as ReturnType<typeof vi.fn>).mockResolvedValue(mockConvertedLead);
      (getAccount as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount);
      (listFacilities as ReturnType<typeof vi.fn>).mockResolvedValue(mockFacilities);
      (listProposals as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposals);
      (listContracts as ReturnType<typeof vi.fn>).mockResolvedValue(mockContracts);

      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          leadId="lead-2"
        />
      );

      await waitFor(() => {
        expect(getAccount).toHaveBeenCalledWith('account-1');
      });

      await waitFor(() => {
        expect(screen.getByText('billing@test.com')).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    beforeEach(() => {
      (getAccount as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount);
      (listFacilities as ReturnType<typeof vi.fn>).mockResolvedValue(mockFacilities);
      (listProposals as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposals);
      (listContracts as ReturnType<typeof vi.fn>).mockResolvedValue(mockContracts);
    });

    it('should call onClose when Close button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <ClientProfileModal
          isOpen={true}
          onClose={handleClose}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('billing@test.com')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /^close$/i });
      await user.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should navigate to account detail when View Full Profile is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <ClientProfileModal
          isOpen={true}
          onClose={handleClose}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('billing@test.com')).toBeInTheDocument();
      });

      const viewFullButton = screen.getByRole('button', { name: /view full profile/i });
      await user.click(viewFullButton);

      expect(handleClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/accounts/account-1');
    });

    it('should navigate to lead detail when View Full Profile is clicked for lead', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      (getLead as ReturnType<typeof vi.fn>).mockResolvedValue(mockLead);

      render(
        <ClientProfileModal
          isOpen={true}
          onClose={handleClose}
          leadId="lead-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('jane@lead.com')).toBeInTheDocument();
      });

      const viewFullButton = screen.getByRole('button', { name: /view full profile/i });
      await user.click(viewFullButton);

      expect(handleClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/leads/lead-1');
    });
  });

  describe('Empty states', () => {
    it('should handle empty facilities list', async () => {
      (getAccount as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount);
      (listFacilities as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
      (listProposals as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
      (listContracts as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('billing@test.com')).toBeInTheDocument();
      });

      // Should not show facilities section header when empty
      expect(screen.queryByText('Main Office')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      (getAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

      render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });
  });

  describe('Data refetch on prop changes', () => {
    it('should refetch data when accountId changes', async () => {
      (getAccount as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount);
      (listFacilities as ReturnType<typeof vi.fn>).mockResolvedValue(mockFacilities);
      (listProposals as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposals);
      (listContracts as ReturnType<typeof vi.fn>).mockResolvedValue(mockContracts);

      const { rerender } = render(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-1"
        />
      );

      await waitFor(() => {
        expect(getAccount).toHaveBeenCalledWith('account-1');
      });

      vi.clearAllMocks();
      (getAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockAccount,
        id: 'account-2',
        name: 'Another Company',
        billingEmail: 'another@test.com',
      });
      (listFacilities as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
      (listProposals as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
      (listContracts as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

      rerender(
        <ClientProfileModal
          isOpen={true}
          onClose={() => {}}
          accountId="account-2"
        />
      );

      await waitFor(() => {
        expect(getAccount).toHaveBeenCalledWith('account-2');
      });
    });
  });
});
