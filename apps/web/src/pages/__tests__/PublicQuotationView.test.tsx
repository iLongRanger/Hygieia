import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import PublicQuotationView from '../public/PublicQuotationView';

let mockParams: { token?: string } = { token: 'public-token-1' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
  };
});

const getPublicQuotationMock = vi.fn();
const acceptPublicQuotationMock = vi.fn();
const rejectPublicQuotationMock = vi.fn();

vi.mock('../../lib/publicQuotations', () => ({
  getPublicQuotation: (...args: unknown[]) => getPublicQuotationMock(...args),
  acceptPublicQuotation: (...args: unknown[]) => acceptPublicQuotationMock(...args),
  rejectPublicQuotation: (...args: unknown[]) => rejectPublicQuotationMock(...args),
}));

const baseResponse = {
  data: {
    id: 'qt-1',
    quotationNumber: 'QT-2026-0001',
    title: 'Post-Construction Cleanup',
    status: 'sent',
    description: 'One-time cleanup service',
    subtotal: 1000,
    taxRate: 0.1,
    taxAmount: 100,
    totalAmount: 1100,
    validUntil: '2026-02-20T00:00:00.000Z',
    createdAt: '2026-02-01T00:00:00.000Z',
    sentAt: '2026-02-01T00:00:00.000Z',
    termsAndConditions: null,
    signatureName: null,
    signatureDate: null,
    account: { name: 'Acme Corp' },
    facility: { name: 'HQ', address: {} },
    createdByUser: { fullName: 'Owner User', email: 'owner@example.com' },
    services: [
      {
        serviceName: 'Deep Clean',
        description: null,
        price: 1100,
        includedTasks: ['Debris removal'],
        sortOrder: 0,
      },
    ],
  },
  branding: {
    companyName: 'Hygieia',
    companyEmail: 'hello@example.com',
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

describe('PublicQuotationView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { token: 'public-token-1' };
    getPublicQuotationMock.mockResolvedValue(baseResponse);
    acceptPublicQuotationMock.mockResolvedValue({
      ...baseResponse.data,
      status: 'accepted',
      signatureName: 'Jane Client',
      signatureDate: new Date().toISOString(),
    });
    rejectPublicQuotationMock.mockResolvedValue({
      ...baseResponse.data,
      status: 'rejected',
    });
  });

  it('loads and renders public quotation', async () => {
    render(<PublicQuotationView />);

    expect(await screen.findByText('Post-Construction Cleanup')).toBeInTheDocument();
    expect(screen.getByText('QT-2026-0001')).toBeInTheDocument();
  });

  it('accepts quotation with signature', async () => {
    const user = userEvent.setup();
    render(<PublicQuotationView />);

    await screen.findByText('Post-Construction Cleanup');
    await user.click(screen.getByRole('button', { name: /accept quotation/i }));
    await user.type(screen.getByPlaceholderText(/enter your full name/i), 'Jane Client');
    await user.click(screen.getByRole('button', { name: /accept & sign/i }));

    await waitFor(() => {
      expect(acceptPublicQuotationMock).toHaveBeenCalledWith('public-token-1', 'Jane Client');
    });
    expect(await screen.findByText(/quotation accepted/i)).toBeInTheDocument();
  });

  it('shows unavailable state when token is invalid', async () => {
    getPublicQuotationMock.mockRejectedValueOnce({ response: { status: 404 } });

    render(<PublicQuotationView />);

    expect(await screen.findByText(/quotation not found/i)).toBeInTheDocument();
  });
});
