import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import QuotationsList from '../quotations/QuotationsList';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      hasPermission: () => true,
    }),
}));

vi.mock('../../components/ui/Table', () => ({
  Table: ({ data, columns }: any) => (
    <div>
      {data.map((row: any) => (
        <div key={row.id}>
          {columns.map((col: any, index: number) => (
            <span key={index}>
              {col.accessor ? col.accessor(row) : col.cell ? col.cell(row) : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

const listQuotationsMock = vi.fn();
const archiveQuotationMock = vi.fn();
const restoreQuotationMock = vi.fn();

vi.mock('../../lib/quotations', () => ({
  listQuotations: (...args: unknown[]) => listQuotationsMock(...args),
  archiveQuotation: (...args: unknown[]) => archiveQuotationMock(...args),
  restoreQuotation: (...args: unknown[]) => restoreQuotationMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('QuotationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    vi.stubGlobal('confirm', vi.fn(() => true));

    listQuotationsMock.mockResolvedValue({
      data: [
        {
          id: 'qt-1',
          quotationNumber: 'QT-2026-0001',
          title: 'Deep Clean',
          status: 'draft',
          totalAmount: 1200,
          validUntil: '2026-02-20T00:00:00.000Z',
          createdAt: '2026-02-01T00:00:00.000Z',
          archivedAt: null,
          account: { id: 'account-1', name: 'Acme', type: 'commercial' },
          facility: null,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    archiveQuotationMock.mockResolvedValue({});
    restoreQuotationMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders quotations from API data', async () => {
    render(<QuotationsList />);

    expect(await screen.findByText('QT-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Deep Clean')).toBeInTheDocument();
    expect(listQuotationsMock).toHaveBeenCalled();
  });

  it('navigates to create page from header action', async () => {
    const user = userEvent.setup();
    render(<QuotationsList />);

    await screen.findByText('Quotations');
    await user.click(screen.getByRole('button', { name: /new quotation/i }));

    expect(navigateMock).toHaveBeenCalledWith('/quotations/new');
  });

  it('archives a quotation from row action', async () => {
    const user = userEvent.setup();
    render(<QuotationsList />);

    await screen.findByText('QT-2026-0001');
    await user.click(screen.getByTitle('Archive'));

    await waitFor(() => {
      expect(archiveQuotationMock).toHaveBeenCalledWith('qt-1');
    });
  });
});
