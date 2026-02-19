import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import QuotationDetail from '../quotations/QuotationDetail';

let mockParams: { id?: string } = { id: 'qt-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      hasPermission: () => true,
    }),
}));

vi.mock('../../components/ui/Modal', () => ({
  Modal: ({ title, children }: any) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

const getQuotationMock = vi.fn();
const sendQuotationMock = vi.fn();
const acceptQuotationMock = vi.fn();
const rejectQuotationMock = vi.fn();
const archiveQuotationMock = vi.fn();
const restoreQuotationMock = vi.fn();
const deleteQuotationMock = vi.fn();

vi.mock('../../lib/quotations', () => ({
  getQuotation: (...args: unknown[]) => getQuotationMock(...args),
  sendQuotation: (...args: unknown[]) => sendQuotationMock(...args),
  acceptQuotation: (...args: unknown[]) => acceptQuotationMock(...args),
  rejectQuotation: (...args: unknown[]) => rejectQuotationMock(...args),
  archiveQuotation: (...args: unknown[]) => archiveQuotationMock(...args),
  restoreQuotation: (...args: unknown[]) => restoreQuotationMock(...args),
  deleteQuotation: (...args: unknown[]) => deleteQuotationMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const quotation = {
  id: 'qt-1',
  quotationNumber: 'QT-2026-0001',
  title: 'Deep Cleaning',
  status: 'draft',
  description: null,
  subtotal: '1000',
  taxRate: '0.1',
  taxAmount: '100',
  totalAmount: '1100',
  validUntil: '2026-02-20T00:00:00.000Z',
  notes: null,
  termsAndConditions: null,
  sentAt: null,
  viewedAt: null,
  acceptedAt: null,
  rejectedAt: null,
  rejectionReason: null,
  publicToken: 'public-token-1',
  signatureName: null,
  signatureDate: null,
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
  archivedAt: null,
  account: { id: 'account-1', name: 'Acme Corp', type: 'commercial', billingEmail: 'billing@acme.com' },
  facility: { id: 'facility-1', name: 'HQ', address: {} },
  createdByUser: { id: 'user-1', fullName: 'Owner User', email: 'owner@example.com' },
  services: [{ id: 'srv-1', serviceName: 'General', description: null, price: 1100, includedTasks: [], sortOrder: 0 }],
  activities: [],
};

describe('QuotationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'qt-1' };
    navigateMock.mockReset();
    vi.stubGlobal('confirm', vi.fn(() => true));

    getQuotationMock.mockResolvedValue(quotation);
    sendQuotationMock.mockResolvedValue({ data: { ...quotation, status: 'sent' }, publicUrl: 'https://example.com/q/public-token-1' });
    acceptQuotationMock.mockResolvedValue({ ...quotation, status: 'accepted' });
    rejectQuotationMock.mockResolvedValue({ ...quotation, status: 'rejected' });
    archiveQuotationMock.mockResolvedValue({ ...quotation, archivedAt: '2026-02-10T00:00:00.000Z' });
    restoreQuotationMock.mockResolvedValue({ ...quotation, archivedAt: null });
    deleteQuotationMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders quotation details', async () => {
    render(<QuotationDetail />);

    expect(await screen.findByText('QT-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Deep Cleaning')).toBeInTheDocument();
    expect(getQuotationMock).toHaveBeenCalledWith('qt-1');
  });

  it('copies public link to clipboard', async () => {
    const user = userEvent.setup();
    const toast = (await import('react-hot-toast')).default;
    render(<QuotationDetail />);

    await screen.findByText('QT-2026-0001');
    await user.click(screen.getByRole('button', { name: /copy link/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Public link copied');
    });
  });

  it('sends quotation from modal', async () => {
    const user = userEvent.setup();
    render(<QuotationDetail />);

    await screen.findByText('QT-2026-0001');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText('Send Quotation')).toBeInTheDocument();
    const sendButtons = screen.getAllByRole('button', { name: /^send$/i });
    await user.click(sendButtons[sendButtons.length - 1]);

    await waitFor(() => {
      expect(sendQuotationMock).toHaveBeenCalledWith(
        'qt-1',
        expect.objectContaining({
          emailTo: 'billing@acme.com',
        })
      );
    });
  });
});
