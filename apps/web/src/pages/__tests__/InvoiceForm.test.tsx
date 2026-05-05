import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import InvoiceForm from '../invoices/InvoiceForm';

const navigateMock = vi.fn();
const listAccountsMock = vi.fn();
const listFacilitiesMock = vi.fn();
const listContractsMock = vi.fn();
const createInvoiceMock = vi.fn();
const getGlobalSettingsMock = vi.fn();

const toastMock = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  })
);

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
}));

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
}));

vi.mock('../../lib/invoices', () => ({
  createInvoice: (...args: unknown[]) => createInvoiceMock(...args),
}));

vi.mock('../../lib/globalSettings', () => ({
  getGlobalSettings: (...args: unknown[]) => getGlobalSettingsMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: toastMock,
}));

describe('InvoiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAccountsMock.mockResolvedValue({
      data: [
        {
          id: 'account-1',
          name: 'Acme Corp',
        },
      ],
    });
    getGlobalSettingsMock.mockResolvedValue({
      companyName: 'Hygieia',
      companyEmail: null,
      companyPhone: null,
      companyWebsite: null,
      companyAddress: null,
      companyTimezone: 'UTC',
      taxRate: 0.05,
      logoDataUrl: null,
      themePrimaryColor: '#1f2937',
      themeAccentColor: '#0f766e',
      themeBackgroundColor: '#ffffff',
      themeTextColor: '#111827',
    });
    listFacilitiesMock.mockResolvedValue({ data: [] });
    listContractsMock.mockResolvedValue({ data: [] });
    createInvoiceMock.mockResolvedValue({ id: 'invoice-1' });
  });

  it('uses the global tax rate for a manual invoice without an active contract', async () => {
    const user = userEvent.setup();
    render(<InvoiceForm />);

    await user.selectOptions(await screen.findByLabelText(/account/i), 'account-1');
    await waitFor(() => {
      expect(listContractsMock).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'account-1', status: 'active' })
      );
    });

    await user.clear(screen.getByLabelText(/description/i));
    await user.type(screen.getByLabelText(/description/i), 'Manual service');
    await user.clear(screen.getByLabelText(/unit price/i));
    await user.type(screen.getByLabelText(/unit price/i), '100');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() => {
      expect(createInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'account-1',
          taxRate: 0.05,
          items: [
            expect.objectContaining({
              description: 'Manual service',
              unitPrice: 100,
            }),
          ],
        })
      );
    });
    expect(navigateMock).toHaveBeenCalledWith('/invoices/invoice-1');
  });
});
