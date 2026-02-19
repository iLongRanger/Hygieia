import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import PublicContractView from '../public/PublicContractView';

let mockParams: { token?: string } = { token: 'public-contract-token' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
  };
});

const getPublicContractMock = vi.fn();
const signPublicContractMock = vi.fn();
const downloadPublicContractPdfMock = vi.fn();

vi.mock('../../lib/publicContracts', () => ({
  getPublicContract: (...args: unknown[]) => getPublicContractMock(...args),
  signPublicContract: (...args: unknown[]) => signPublicContractMock(...args),
  downloadPublicContractPdf: (...args: unknown[]) => downloadPublicContractPdfMock(...args),
}));

const response = {
  data: {
    id: 'contract-1',
    contractNumber: 'CONT-2026-0001',
    title: 'Monthly Janitorial Services',
    status: 'sent',
    startDate: '2026-02-01T00:00:00.000Z',
    endDate: '2027-01-31T00:00:00.000Z',
    serviceFrequency: 'weekly',
    monthlyValue: 3500,
    billingCycle: 'monthly',
    paymentTerms: 'Net 30',
    termsAndConditions: 'Standard terms',
    signedByName: null,
    signedDate: null,
    sentAt: '2026-02-01T00:00:00.000Z',
    account: { name: 'Acme Corp' },
    facility: { name: 'HQ', address: { street: '123 Main', city: 'Austin', state: 'TX' } },
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

describe('PublicContractView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { token: 'public-contract-token' };
    getPublicContractMock.mockResolvedValue(response);
    signPublicContractMock.mockResolvedValue({
      ...response.data,
      status: 'pending_signature',
      signedByName: 'Jane Client',
      signedDate: new Date().toISOString(),
    });
    downloadPublicContractPdfMock.mockResolvedValue(undefined);
  });

  it('loads and renders contract details', async () => {
    render(<PublicContractView />);

    expect(await screen.findByText('Monthly Janitorial Services')).toBeInTheDocument();
    expect(screen.getByText('Contract CONT-2026-0001')).toBeInTheDocument();
  });

  it('signs contract from modal', async () => {
    const user = userEvent.setup();
    render(<PublicContractView />);

    await screen.findByText('Monthly Janitorial Services');
    await user.click(screen.getByRole('button', { name: /sign contract/i }));
    await user.type(screen.getByPlaceholderText(/enter your full name/i), 'Jane Client');
    await user.type(screen.getByPlaceholderText(/enter your email address/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /confirm & sign/i }));

    await waitFor(() => {
      expect(signPublicContractMock).toHaveBeenCalledWith(
        'public-contract-token',
        'Jane Client',
        'jane@example.com'
      );
    });
  });

  it('downloads contract PDF from header action', async () => {
    const user = userEvent.setup();
    render(<PublicContractView />);

    await screen.findByText('Monthly Janitorial Services');
    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(downloadPublicContractPdfMock).toHaveBeenCalledWith(
      'public-contract-token',
      'CONT-2026-0001'
    );
  });
});
