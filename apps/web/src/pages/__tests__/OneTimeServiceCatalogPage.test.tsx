import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import OneTimeServiceCatalogPage from '../quotations/OneTimeServiceCatalogPage';

const listOneTimeServiceCatalogMock = vi.fn();

vi.mock('../../lib/oneTimeServiceCatalog', () => ({
  listOneTimeServiceCatalog: (...args: unknown[]) => listOneTimeServiceCatalogMock(...args),
  createOneTimeServiceCatalogItem: vi.fn(),
  updateOneTimeServiceCatalogItem: vi.fn(),
  deleteOneTimeServiceCatalogItem: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OneTimeServiceCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOneTimeServiceCatalogMock.mockResolvedValue([]);
  });

  it('shows the specialized job pricing guide', async () => {
    render(<OneTimeServiceCatalogPage />);

    expect(await screen.findByText('Specialized Job Pricing Guide')).toBeInTheDocument();
    expect(screen.getByText('Build one-time job standards that proposals can reuse')).toBeInTheDocument();
    expect(screen.getByText('Rate + Unit')).toBeInTheDocument();
    expect(screen.getByText('Proposal Use')).toBeInTheDocument();
  });
});
