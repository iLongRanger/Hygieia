import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import GlobalSettingsPage from '../settings/GlobalSettingsPage';

const getGlobalSettingsMock = vi.fn();
const updateGlobalSettingsMock = vi.fn();
const uploadCompanyLogoMock = vi.fn();
const removeCompanyLogoMock = vi.fn();
const getBackgroundServiceSettingsMock = vi.fn();
const getBackgroundServiceLogsMock = vi.fn();
const updateBackgroundServiceSettingMock = vi.fn();
const runBackgroundServiceNowMock = vi.fn();
const exportSystemConfigurationMock = vi.fn();
const importSystemConfigurationMock = vi.fn();

vi.mock('../../lib/globalSettings', () => ({
  getGlobalSettings: (...args: unknown[]) => getGlobalSettingsMock(...args),
  updateGlobalSettings: (...args: unknown[]) =>
    updateGlobalSettingsMock(...args),
  uploadCompanyLogo: (...args: unknown[]) => uploadCompanyLogoMock(...args),
  removeCompanyLogo: (...args: unknown[]) => removeCompanyLogoMock(...args),
  getBackgroundServiceSettings: (...args: unknown[]) =>
    getBackgroundServiceSettingsMock(...args),
  getBackgroundServiceLogs: (...args: unknown[]) =>
    getBackgroundServiceLogsMock(...args),
  updateBackgroundServiceSetting: (...args: unknown[]) =>
    updateBackgroundServiceSettingMock(...args),
  runBackgroundServiceNow: (...args: unknown[]) =>
    runBackgroundServiceNowMock(...args),
  exportSystemConfiguration: (...args: unknown[]) =>
    exportSystemConfigurationMock(...args),
  importSystemConfiguration: (...args: unknown[]) =>
    importSystemConfigurationMock(...args),
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
    companyTimezone: 'America/New_York',
    taxRate: 0.05,
    logoDataUrl: null,
    themePrimaryColor: '#1a1a2e',
    themeAccentColor: '#d4af37',
    themeBackgroundColor: '#f5f5f5',
    themeTextColor: '#333333',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getGlobalSettingsMock.mockResolvedValue(mockSettings);
    getBackgroundServiceSettingsMock.mockResolvedValue([]);
    getBackgroundServiceLogsMock.mockImplementation((serviceKey: string) =>
      Promise.resolve({
        serviceKey,
        page: 1,
        limit: 9,
        totalCount: 0,
        totalPages: 1,
        items: [],
      })
    );
    updateGlobalSettingsMock.mockResolvedValue(mockSettings);
    uploadCompanyLogoMock.mockResolvedValue(mockSettings);
    removeCompanyLogoMock.mockResolvedValue(mockSettings);
    updateBackgroundServiceSettingMock.mockResolvedValue(null);
    runBackgroundServiceNowMock.mockResolvedValue(null);
    exportSystemConfigurationMock.mockResolvedValue({
      metadata: { schemaVersion: 1, format: 'hygieia-system-configuration' },
    });
    importSystemConfigurationMock.mockResolvedValue({
      dryRun: true,
      imported: { areaTypes: 2, taskTemplates: 5 },
    });
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue(
      'blob:system-config'
    );
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined
    );
  });

  it('loads and renders company settings', async () => {
    render(<GlobalSettingsPage />);
    expect(
      await screen.findByDisplayValue('Hygieia Cleaning Services')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('ops@hygieia.example')).toBeInTheDocument();
    expect(screen.getByLabelText(/default tax rate/i)).toHaveValue(5);
  });

  it('saves edited company settings', async () => {
    const user = userEvent.setup();
    render(<GlobalSettingsPage />);

    const nameInput = await screen.findByLabelText(/company name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Acme Janitorial');
    const taxRateInput = screen.getByLabelText(/default tax rate/i);
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '7');
    await user.click(
      screen.getByRole('button', { name: /save global settings/i })
    );

    await waitFor(() => {
      expect(updateGlobalSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Acme Janitorial',
          taxRate: 0.07,
        })
      );
    });
  });

  it('shows one background service detail panel at a time', async () => {
    const user = userEvent.setup();
    getBackgroundServiceSettingsMock.mockResolvedValue([
      {
        serviceKey: 'reminders',
        enabled: true,
        intervalMs: 28800000,
        lastRunAt: null,
        lastSuccessAt: null,
        lastError: null,
        lastErrorAt: null,
        updatedByUserId: null,
        createdAt: null,
        updatedAt: null,
      },
      {
        serviceKey: 'job_alerts',
        enabled: false,
        intervalMs: 1800000,
        lastRunAt: null,
        lastSuccessAt: null,
        lastError: null,
        lastErrorAt: null,
        updatedByUserId: null,
        createdAt: null,
        updatedAt: null,
      },
    ]);

    render(<GlobalSettingsPage />);

    expect(
      await screen.findByRole('tab', { name: /client reminders/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/sends appointment and follow-up reminders/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /job alert checks/i }));

    expect(
      screen.getByText(/checks for jobs that need attention/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/run frequency/i)).toHaveValue('1800000');
  });

  it('exports system configuration as json', async () => {
    const user = userEvent.setup();
    render(<GlobalSettingsPage />);

    const exportButton = await screen.findByRole('button', {
      name: /export json/i,
    });
    await user.click(exportButton);

    await waitFor(() => {
      expect(exportSystemConfigurationMock).toHaveBeenCalledTimes(1);
    });
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('previews system configuration import from json', async () => {
    const user = userEvent.setup();
    render(<GlobalSettingsPage />);

    const file = new File(
      [
        JSON.stringify({
          metadata: {
            schemaVersion: 1,
            format: 'hygieia-system-configuration',
          },
        }),
      ],
      'system-config.json',
      { type: 'application/json' }
    );

    const previewInput = await screen.findByLabelText(/preview json import/i);
    await user.upload(previewInput, file);

    await waitFor(() => {
      expect(importSystemConfigurationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            format: 'hygieia-system-configuration',
          }),
        }),
        true
      );
    });
    expect(await screen.findByText(/last import summary/i)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
