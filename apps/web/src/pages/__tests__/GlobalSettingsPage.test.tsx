import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import GlobalSettingsPage from '../settings/GlobalSettingsPage';

const getGlobalSettingsMock = vi.fn();
const updateGlobalSettingsMock = vi.fn();
const uploadCompanyLogoMock = vi.fn();
const removeCompanyLogoMock = vi.fn();

vi.mock('../../lib/globalSettings', () => ({
  getGlobalSettings: (...args: unknown[]) => getGlobalSettingsMock(...args),
  updateGlobalSettings: (...args: unknown[]) => updateGlobalSettingsMock(...args),
  uploadCompanyLogo: (...args: unknown[]) => uploadCompanyLogoMock(...args),
  removeCompanyLogo: (...args: unknown[]) => removeCompanyLogoMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GlobalSettingsPage', () => {
  const mockSettings = {
    companyName: 'Hygieia Cleaning Services',
    companyEmail: 'ops@hygieia.example',
    companyPhone: '555-0100',
    companyWebsite: 'https://hygieia.example',
    companyAddress: '123 Main St',
    logoDataUrl: null,
    themePrimaryColor: '#1a1a2e',
    themeAccentColor: '#d4af37',
    themeBackgroundColor: '#f5f5f5',
    themeTextColor: '#333333',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getGlobalSettingsMock.mockResolvedValue(mockSettings);
    updateGlobalSettingsMock.mockResolvedValue(mockSettings);
    uploadCompanyLogoMock.mockResolvedValue(mockSettings);
    removeCompanyLogoMock.mockResolvedValue(mockSettings);
  });

  it('loads and renders company settings', async () => {
    render(<GlobalSettingsPage />);
    expect(await screen.findByDisplayValue('Hygieia Cleaning Services')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ops@hygieia.example')).toBeInTheDocument();
  });

  it('saves edited company settings', async () => {
    const user = userEvent.setup();
    render(<GlobalSettingsPage />);

    const nameInput = await screen.findByLabelText(/company name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Acme Janitorial');
    await user.click(screen.getByRole('button', { name: /save global settings/i }));

    await waitFor(() => {
      expect(updateGlobalSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({ companyName: 'Acme Janitorial' })
      );
    });
  });
});
