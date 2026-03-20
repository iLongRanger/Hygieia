import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import PublicResidentialQuoteView from '../public/PublicResidentialQuoteView';

let mockParams: { token?: string } = { token: 'residential-token-1' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
  };
});

const getPublicResidentialQuoteMock = vi.fn();
const acceptPublicResidentialQuoteMock = vi.fn();
const declinePublicResidentialQuoteMock = vi.fn();

vi.mock('../../lib/residential', () => ({
  getPublicResidentialQuote: (...args: unknown[]) => getPublicResidentialQuoteMock(...args),
  acceptPublicResidentialQuote: (...args: unknown[]) => acceptPublicResidentialQuoteMock(...args),
  declinePublicResidentialQuote: (...args: unknown[]) => declinePublicResidentialQuoteMock(...args),
}));

const baseResponse = {
  data: {
    id: 'rq-1',
    quoteNumber: 'RQ-20260320-0001',
    title: 'Biweekly Townhouse Cleaning',
    status: 'sent',
    serviceType: 'recurring_standard',
    frequency: 'biweekly',
    customerName: 'Jane Client',
    customerEmail: 'jane@example.com',
    customerPhone: '555-1000',
    subtotal: '220',
    recurringDiscount: '18',
    firstCleanSurcharge: '30',
    addOnTotal: '25',
    totalAmount: '257',
    estimatedHours: '3.5',
    preferredStartDate: '2026-03-28',
    sentAt: '2026-03-20T00:00:00.000Z',
    viewedAt: null,
    acceptedAt: null,
    declinedAt: null,
    declineReason: null,
    signatureName: null,
    signatureDate: null,
    homeProfile: {
      squareFeet: 1800,
      bedrooms: 3,
      fullBathrooms: 2,
      halfBathrooms: 1,
      levels: 2,
      condition: 'standard',
      occupiedStatus: 'occupied',
      hasPets: false,
    },
    addOns: [
      {
        id: 'addon-1',
        code: 'inside_fridge',
        label: 'Inside Fridge',
        description: 'Clean inside fridge',
        quantity: 1,
        pricingType: 'flat',
        unitLabel: null,
        unitPrice: '25',
        estimatedMinutes: 20,
        lineTotal: '25',
        sortOrder: 0,
      },
    ],
  },
  branding: {
    companyName: 'Hygieia',
    companyEmail: 'hello@example.com',
    companyPhone: '555-2000',
    companyWebsite: null,
    companyAddress: null,
    companyTimezone: 'UTC',
    logoDataUrl: null,
    themePrimaryColor: '#1a1a2e',
    themeAccentColor: '#d4af37',
    themeBackgroundColor: '#f8fafc',
    themeTextColor: '#111827',
  },
};

describe('PublicResidentialQuoteView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { token: 'residential-token-1' };
    getPublicResidentialQuoteMock.mockResolvedValue(baseResponse);
    acceptPublicResidentialQuoteMock.mockResolvedValue({
      ...baseResponse.data,
      status: 'accepted',
      signatureName: 'Jane Client',
      signatureDate: new Date().toISOString(),
    });
    declinePublicResidentialQuoteMock.mockResolvedValue({
      ...baseResponse.data,
      status: 'declined',
    });
  });

  it('loads and renders public residential quote', async () => {
    render(<PublicResidentialQuoteView />);

    expect(await screen.findByText('Biweekly Townhouse Cleaning')).toBeInTheDocument();
    expect(screen.getByText('RQ-20260320-0001')).toBeInTheDocument();
  });

  it('accepts residential quote with signature', async () => {
    const user = userEvent.setup();
    render(<PublicResidentialQuoteView />);

    await screen.findByText('Biweekly Townhouse Cleaning');
    await user.click(screen.getByRole('button', { name: /accept quote/i }));
    await user.type(screen.getByPlaceholderText(/enter your full name/i), 'Jane Client');
    await user.click(screen.getByRole('button', { name: /accept & sign/i }));

    await waitFor(() => {
      expect(acceptPublicResidentialQuoteMock).toHaveBeenCalledWith('residential-token-1', 'Jane Client');
    });
    expect(await screen.findByText(/residential quote accepted/i)).toBeInTheDocument();
  });

  it('shows unavailable state when token is invalid', async () => {
    getPublicResidentialQuoteMock.mockRejectedValueOnce({ response: { status: 404 } });

    render(<PublicResidentialQuoteView />);

    expect(await screen.findByText(/residential quote not found/i)).toBeInTheDocument();
  });
});
