import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import InvoiceDetail from '../invoices/InvoiceDetail';

let mockParams: { id?: string } = { id: 'inv-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getInvoiceMock = vi.fn();
const sendInvoiceMock = vi.fn();
const recordPaymentMock = vi.fn();
const voidInvoiceMock = vi.fn();

vi.mock('../../lib/invoices', () => ({
  getInvoice: (...args: unknown[]) => getInvoiceMock(...args),
  sendInvoice: (...args: unknown[]) => sendInvoiceMock(...args),
  recordPayment: (...args: unknown[]) => recordPaymentMock(...args),
  voidInvoice: (...args: unknown[]) => voidInvoiceMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-2026-0001',
  status: 'sent',
  account: { id: 'account-1', name: 'Acme Corp' },
  publicToken: 'public-invoice-token',
  totalAmount: '1200',
  amountPaid: '0',
  balanceDue: '1200',
  issueDate: '2026-02-01T00:00:00.000Z',
  dueDate: '2026-02-15T00:00:00.000Z',
  periodStart: null,
  periodEnd: null,
  subtotal: '1100',
  taxRate: '0.0909',
  taxAmount: '100',
  notes: null,
  items: [
    {
      id: 'item-1',
      itemType: 'service',
      description: 'Monthly service',
      quantity: '1',
      unitPrice: '1100',
      totalPrice: '1100',
    },
  ],
  payments: [],
  activities: [],
};

describe('InvoiceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    mockParams = { id: 'inv-1' };

    getInvoiceMock.mockResolvedValue(invoice);
    sendInvoiceMock.mockResolvedValue({ ...invoice, status: 'sent' });
    recordPaymentMock.mockResolvedValue({ ...invoice, balanceDue: '200', amountPaid: '1000', status: 'partial' });
    voidInvoiceMock.mockResolvedValue({ ...invoice, status: 'void' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders invoice details and line items', async () => {
    render(<InvoiceDetail />);

    expect(await screen.findByText('INV-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Monthly service')).toBeInTheDocument();
  });

  it('sends invoice from detail actions', async () => {
    const user = userEvent.setup();
    render(<InvoiceDetail />);

    await screen.findByText('INV-2026-0001');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(sendInvoiceMock).toHaveBeenCalledWith('inv-1');
    });
  });

  it('records payment using payment form', async () => {
    const user = userEvent.setup();
    render(<InvoiceDetail />);

    await screen.findByText('INV-2026-0001');
    await user.click(screen.getByRole('button', { name: /record payment/i }));

    await user.type(screen.getByLabelText(/^amount$/i), '1000');
    await user.click(screen.getByRole('button', { name: /^record$/i }));

    await waitFor(() => {
      expect(recordPaymentMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          amount: 1000,
        })
      );
    });
  });
});
