import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import InvoicesList from '../invoices/InvoicesList';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listInvoicesMock = vi.fn();
const batchGenerateInvoicesMock = vi.fn();

vi.mock('../../lib/invoices', () => ({
  listInvoices: (...args: unknown[]) => listInvoicesMock(...args),
  batchGenerateInvoices: (...args: unknown[]) => batchGenerateInvoicesMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InvoicesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    listInvoicesMock.mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-2026-0001',
          status: 'sent',
          issueDate: '2026-02-01T00:00:00.000Z',
          dueDate: '2026-02-15T00:00:00.000Z',
          totalAmount: '1200',
          balanceDue: '1200',
          account: { id: 'account-1', name: 'Acme Corp' },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    batchGenerateInvoicesMock.mockResolvedValue({ generated: 2, skipped: 1 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders invoice list data', async () => {
    render(<InvoicesList />);

    expect(await screen.findByText('INV-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(listInvoicesMock).toHaveBeenCalled();
  });

  it('validates batch generate required dates', async () => {
    const user = userEvent.setup();
    const toast = (await import('react-hot-toast')).default;

    render(<InvoicesList />);
    await screen.findByText('Invoices');

    await user.click(screen.getByRole('button', { name: /batch generate/i }));
    await user.click(screen.getByRole('button', { name: /^generate$/i }));

    expect(toast.error).toHaveBeenCalledWith('Period dates are required');
    expect(batchGenerateInvoicesMock).not.toHaveBeenCalled();
  });

  it('generates invoices for selected period', async () => {
    const user = userEvent.setup();

    render(<InvoicesList />);
    await screen.findByText('Invoices');

    await user.click(screen.getByRole('button', { name: /batch generate/i }));
    fireEvent.change(screen.getByLabelText(/period start/i), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText(/period end/i), { target: { value: '2026-02-28' } });
    await user.click(screen.getByRole('button', { name: /^generate$/i }));

    await waitFor(() => {
      expect(batchGenerateInvoicesMock).toHaveBeenCalledWith({
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
      });
    });
  });
});
