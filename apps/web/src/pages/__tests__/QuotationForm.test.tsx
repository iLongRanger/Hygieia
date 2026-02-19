import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import QuotationForm from '../quotations/QuotationForm';

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

vi.mock('../../components/ui/Select', () => ({
  Select: ({ label, value, onChange, options }: any) => (
    <label>
      {label}
      <select aria-label={label} value={value} onChange={(e) => onChange?.(e)}>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

const listAccountsMock = vi.fn();
const listFacilitiesMock = vi.fn();
const getQuotationMock = vi.fn();
const createQuotationMock = vi.fn();
const updateQuotationMock = vi.fn();

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
}));

vi.mock('../../lib/quotations', () => ({
  getQuotation: (...args: unknown[]) => getQuotationMock(...args),
  createQuotation: (...args: unknown[]) => createQuotationMock(...args),
  updateQuotation: (...args: unknown[]) => updateQuotationMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('QuotationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    navigateMock.mockReset();

    listAccountsMock.mockResolvedValue({
      data: [{ id: 'account-1', name: 'Acme Corp' }],
      pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
    });
    listFacilitiesMock.mockResolvedValue({
      data: [{ id: 'facility-1', name: 'HQ' }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    createQuotationMock.mockResolvedValue({ id: 'qt-1' });
    updateQuotationMock.mockResolvedValue({ id: 'qt-1' });
    getQuotationMock.mockResolvedValue({
      id: 'qt-1',
      account: { id: 'account-1', name: 'Acme Corp' },
      facility: { id: 'facility-1', name: 'HQ' },
      title: 'Deep Cleaning',
      description: 'Desc',
      validUntil: '2026-03-10T00:00:00.000Z',
      taxRate: 0.08,
      notes: null,
      termsAndConditions: null,
      services: [
        {
          id: 'srv-1',
          serviceName: 'General Clean',
          description: '',
          price: 250,
          includedTasks: [],
          sortOrder: 0,
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates required account before save', async () => {
    const user = userEvent.setup();
    const toast = (await import('react-hot-toast')).default;

    render(<QuotationForm />);
    await screen.findByText('New Quotation');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(toast.error).toHaveBeenCalledWith('Please select an account');
    expect(createQuotationMock).not.toHaveBeenCalled();
  });

  it('creates quotation with valid form data', async () => {
    const user = userEvent.setup();
    render(<QuotationForm />);

    await screen.findByText('New Quotation');
    await user.selectOptions(screen.getByLabelText(/account/i), 'account-1');
    await user.type(screen.getByLabelText(/title/i), 'Emergency Cleanup');
    await user.type(screen.getByLabelText(/service name/i), 'Emergency Service');
    await user.clear(screen.getByLabelText(/price/i));
    await user.type(screen.getByLabelText(/price/i), '500');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(createQuotationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'account-1',
          title: 'Emergency Cleanup',
          services: [
            expect.objectContaining({
              serviceName: 'Emergency Service',
              price: 500,
            }),
          ],
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/quotations/qt-1');
    });
  });

  it('loads quotation in edit mode and updates on save', async () => {
    const user = userEvent.setup();
    mockParams = { id: 'qt-1' };

    render(<QuotationForm />);

    expect(await screen.findByText('Edit Quotation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updateQuotationMock).toHaveBeenCalledWith(
        'qt-1',
        expect.objectContaining({
          accountId: 'account-1',
          title: 'Deep Cleaning',
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/quotations/qt-1');
    });
  });
});
