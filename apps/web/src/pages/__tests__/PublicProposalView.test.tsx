import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import PublicProposalView from '../public/PublicProposalView';

let mockParams: { token?: string } = { token: 'public-token-1' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
  };
});

const getPublicProposalMock = vi.fn();
const acceptPublicProposalMock = vi.fn();
const rejectPublicProposalMock = vi.fn();
const downloadPublicProposalPdfMock = vi.fn();

vi.mock('../../lib/publicProposals', () => ({
  getPublicProposal: (...args: unknown[]) => getPublicProposalMock(...args),
  acceptPublicProposal: (...args: unknown[]) => acceptPublicProposalMock(...args),
  rejectPublicProposal: (...args: unknown[]) => rejectPublicProposalMock(...args),
  downloadPublicProposalPdf: (...args: unknown[]) => downloadPublicProposalPdfMock(...args),
}));

const baseResponse = {
  data: {
    id: 'proposal-1',
    proposalNumber: 'PROP-001',
    title: 'Commercial Cleaning',
    status: 'sent',
    description: 'Routine janitorial services.',
    subtotal: 1000,
    taxRate: 0.1,
    taxAmount: 100,
    totalAmount: 1100,
    validUntil: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
    signatureName: null,
    signatureDate: null,
    account: { name: 'Acme Corp' },
    facility: { name: 'HQ', address: null },
    proposalItems: [],
    proposalServices: [
      {
        serviceName: 'Daily Cleaning',
        serviceType: 'daily',
        frequency: 'daily',
        estimatedHours: null,
        hourlyRate: null,
        monthlyPrice: 1100,
        description: null,
        includedTasks: [],
        sortOrder: 0,
      },
    ],
  },
  branding: {
    companyName: 'Hygieia',
    companyEmail: null,
    companyPhone: null,
    companyWebsite: null,
    companyAddress: null,
    logoDataUrl: null,
    themePrimaryColor: '#1a1a2e',
    themeAccentColor: '#d4af37',
    themeBackgroundColor: '#f8fafc',
    themeTextColor: '#111827',
  },
};

describe('PublicProposalView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { token: 'public-token-1' };
    getPublicProposalMock.mockResolvedValue(baseResponse);
    acceptPublicProposalMock.mockResolvedValue({
      ...baseResponse.data,
      status: 'accepted',
      signatureName: 'Jane Client',
    });
    rejectPublicProposalMock.mockResolvedValue({
      ...baseResponse.data,
      status: 'rejected',
    });
    downloadPublicProposalPdfMock.mockResolvedValue(undefined);
  });

  it('loads and renders public proposal', async () => {
    render(<PublicProposalView />);

    expect(await screen.findByText('Commercial Cleaning')).toBeInTheDocument();
    expect(screen.getByText(/Proposal PROP-001/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });

  it('accepts proposal with signature', async () => {
    const user = userEvent.setup();
    render(<PublicProposalView />);

    await screen.findByText('Commercial Cleaning');
    await user.click(screen.getByRole('button', { name: /accept proposal/i }));
    await user.type(screen.getByPlaceholderText(/enter your full name/i), 'Jane Client');
    await user.click(screen.getByRole('button', { name: /confirm accept/i }));

    await waitFor(() => {
      expect(acceptPublicProposalMock).toHaveBeenCalledWith('public-token-1', 'Jane Client');
    });
    expect(await screen.findByText(/proposal accepted/i)).toBeInTheDocument();
  });

  it('shows not found message for 404', async () => {
    getPublicProposalMock.mockRejectedValueOnce({ response: { status: 404 } });

    render(<PublicProposalView />);

    expect(await screen.findByText(/proposal not available/i)).toBeInTheDocument();
  });

  it('renders object facility address safely', async () => {
    getPublicProposalMock.mockResolvedValueOnce({
      ...baseResponse,
      data: {
        ...baseResponse.data,
        facility: {
          name: 'HQ',
          address: {
            street: '123 Main St',
            city: 'Austin',
            state: 'TX',
            postalCode: '78701',
          },
        },
      },
    });

    render(<PublicProposalView />);

    expect(await screen.findByText('123 Main St, Austin, TX, 78701')).toBeInTheDocument();
  });

  it('renders task groups under frequency categories', async () => {
    getPublicProposalMock.mockResolvedValueOnce({
      ...baseResponse,
      data: {
        ...baseResponse.data,
        proposalServices: [
          {
            serviceName: 'Daily Cleaning',
            serviceType: 'daily',
            frequency: 'daily',
            estimatedHours: null,
            hourlyRate: null,
            monthlyPrice: 1100,
            description:
              'Main area\nDaily: Empty trash\nWeekly: Mop floors\nAs Needed: Spot clean walls\nAnnual: Strip and wax',
            includedTasks: ['Daily: Empty trash', 'Weekly: Mop floors'],
            sortOrder: 0,
          },
        ],
      },
    });

    render(<PublicProposalView />);

    expect((await screen.findAllByText('Daily')).length).toBeGreaterThan(0);
    expect((screen.getAllByText('Weekly')).length).toBeGreaterThan(0);
    expect((screen.getAllByText('Manual')).length).toBeGreaterThan(0);
    expect((screen.getAllByText('Yearly')).length).toBeGreaterThan(0);
  });
});
