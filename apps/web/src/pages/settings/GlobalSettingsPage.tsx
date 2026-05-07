import React, { useEffect, useState } from 'react';
import {
  Download,
  FileJson,
  Save,
  Upload,
  Trash2,
  Palette,
  Building2,
  Play,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { extractApiErrorMessage } from '../../lib/api';
import {
  getGlobalSettings,
  updateGlobalSettings,
  uploadCompanyLogo,
  removeCompanyLogo,
  getBackgroundServiceSettings,
  getBackgroundServiceLogs,
  runBackgroundServiceNow,
  updateBackgroundServiceSetting,
  exportSystemConfiguration,
  importSystemConfiguration,
} from '../../lib/globalSettings';
import type { GlobalSettings } from '../../types/globalSettings';
import type {
  BackgroundServiceKey,
  BackgroundServiceRunLogPage,
  BackgroundServiceSetting,
} from '../../types/backgroundServiceSettings';

interface BackgroundServiceGuidance {
  label: string;
  description: string;
  recommendedValueLabel: string;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  companyName: '',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
  companyAddress: '',
  companyTimezone: 'UTC',
  taxRate: 0,
  logoDataUrl: null,
  themePrimaryColor: '#1a1a2e',
  themeAccentColor: '#d4af37',
  themeBackgroundColor: '#f5f5f5',
  themeTextColor: '#333333',
};

const BACKGROUND_SERVICE_GUIDANCE: Record<
  BackgroundServiceKey,
  BackgroundServiceGuidance
> = {
  reminders: {
    label: 'Client Reminders',
    description:
      'Sends appointment and follow-up reminders at one scheduled time each day.',
    recommendedValueLabel: '08:00',
  },
  recurring_jobs_autogen: {
    label: 'Recurring Job Creation',
    description:
      'Creates upcoming recurring jobs from active contracts once per day.',
    recommendedValueLabel: '01:00',
  },
  job_alerts: {
    label: 'Job Alert Checks',
    description:
      'Checks for jobs that need attention on a recurring interval throughout the day.',
    recommendedValueLabel: 'Every 15 minutes',
  },
  contract_assignment_overrides: {
    label: 'Contract Assignment Overrides',
    description:
      'Applies scheduled contract assignee overrides on their effectivity date once daily.',
    recommendedValueLabel: '00:00',
  },
  contract_amendment_auto_apply: {
    label: 'Contract Amendment Auto-Apply',
    description:
      'Applies approved contract amendments automatically on their effective date once daily.',
    recommendedValueLabel: '02:00',
  },
};

const BACKGROUND_SERVICE_KEYS: BackgroundServiceKey[] = [
  'reminders',
  'recurring_jobs_autogen',
  'job_alerts',
  'contract_assignment_overrides',
  'contract_amendment_auto_apply',
];

const LOGS_PAGE_LIMIT = 9;
const JOB_ALERT_INTERVAL_OPTIONS = [
  { value: '900000', label: 'Every 15 minutes' },
  { value: '1800000', label: 'Every 30 minutes' },
  { value: '3600000', label: 'Every hour' },
];
const MIN_JOB_ALERT_INTERVAL_MS = 5 * 60 * 1000;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const GlobalSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [backgroundServices, setBackgroundServices] = useState<
    BackgroundServiceSetting[]
  >([]);
  const [backgroundServiceLogs, setBackgroundServiceLogs] = useState<
    Record<BackgroundServiceKey, BackgroundServiceRunLogPage>
  >({
    reminders: {
      serviceKey: 'reminders',
      page: 1,
      limit: LOGS_PAGE_LIMIT,
      totalCount: 0,
      totalPages: 1,
      items: [],
    },
    recurring_jobs_autogen: {
      serviceKey: 'recurring_jobs_autogen',
      page: 1,
      limit: LOGS_PAGE_LIMIT,
      totalCount: 0,
      totalPages: 1,
      items: [],
    },
    job_alerts: {
      serviceKey: 'job_alerts',
      page: 1,
      limit: LOGS_PAGE_LIMIT,
      totalCount: 0,
      totalPages: 1,
      items: [],
    },
    contract_assignment_overrides: {
      serviceKey: 'contract_assignment_overrides',
      page: 1,
      limit: LOGS_PAGE_LIMIT,
      totalCount: 0,
      totalPages: 1,
      items: [],
    },
    contract_amendment_auto_apply: {
      serviceKey: 'contract_amendment_auto_apply',
      page: 1,
      limit: LOGS_PAGE_LIMIT,
      totalCount: 0,
      totalPages: 1,
      items: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingServiceKey, setSavingServiceKey] =
    useState<BackgroundServiceKey | null>(null);
  const [runningServiceKey, setRunningServiceKey] =
    useState<BackgroundServiceKey | null>(null);
  const [activeBackgroundServiceKey, setActiveBackgroundServiceKey] =
    useState<BackgroundServiceKey>('reminders');
  const [exportingConfig, setExportingConfig] = useState(false);
  const [importingConfig, setImportingConfig] = useState(false);
  const [importDryRunResult, setImportDryRunResult] = useState<Record<
    string,
    number
  > | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const [data, serviceData] = await Promise.all([
          getGlobalSettings(),
          getBackgroundServiceSettings(),
        ]);
        const logsEntries = await Promise.all(
          BACKGROUND_SERVICE_KEYS.map(
            async (serviceKey) =>
              [
                serviceKey,
                await getBackgroundServiceLogs(serviceKey, 1, LOGS_PAGE_LIMIT),
              ] as const
          )
        );
        setSettings(data);
        setBackgroundServices(serviceData);
        setBackgroundServiceLogs(
          logsEntries.reduce(
            (acc, [serviceKey, page]) => {
              acc[serviceKey] = page;
              return acc;
            },
            {} as Record<BackgroundServiceKey, BackgroundServiceRunLogPage>
          )
        );
      } catch {
        toast.error('Failed to load global settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      const updated = await updateGlobalSettings({
        companyName: settings.companyName.trim(),
        companyEmail: settings.companyEmail?.trim() || null,
        companyPhone: settings.companyPhone?.trim() || null,
        companyWebsite: settings.companyWebsite?.trim() || null,
        companyAddress: settings.companyAddress?.trim() || null,
        companyTimezone: settings.companyTimezone?.trim() || 'UTC',
        taxRate: Number(settings.taxRate || 0),
        themePrimaryColor: settings.themePrimaryColor,
        themeAccentColor: settings.themeAccentColor,
        themeBackgroundColor: settings.themeBackgroundColor,
        themeTextColor: settings.themeTextColor,
      });
      setSettings(updated);
      toast.success('Global settings updated');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to update settings'));
    } finally {
      setSaving(false);
    }
  };

  const getSanitizedTimeOfDayMs = (
    serviceKey: BackgroundServiceKey,
    value: number
  ): number => {
    if (Number.isFinite(value) && value >= 0 && value <= 86_340_000) {
      return Math.floor(value);
    }
    const [hours, minutes] = BACKGROUND_SERVICE_GUIDANCE[
      serviceKey
    ].recommendedValueLabel
      .split(':')
      .map((part) => Number(part));
    return (hours * 60 + minutes) * 60_000;
  };

  const isIntervalScheduledService = (
    serviceKey: BackgroundServiceKey
  ): boolean => {
    return serviceKey === 'job_alerts';
  };

  const getSanitizedIntervalMs = (
    serviceKey: BackgroundServiceKey,
    value: number
  ): number => {
    if (!isIntervalScheduledService(serviceKey)) {
      return getSanitizedTimeOfDayMs(serviceKey, value);
    }
    if (Number.isFinite(value) && value >= MIN_JOB_ALERT_INTERVAL_MS) {
      return Math.floor(value);
    }
    return 15 * 60 * 1000;
  };

  const timeToMs = (value: string): number => {
    const [hours, minutes] = value.split(':').map((part) => Number(part));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    return Math.min(86_340_000, Math.max(0, (hours * 60 + minutes) * 60_000));
  };

  const msToTime = (
    serviceKey: BackgroundServiceKey,
    value: number
  ): string => {
    const safeValue = getSanitizedTimeOfDayMs(serviceKey, value);
    const totalMinutes = Math.floor(safeValue / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const formatIntervalLabel = (value: number): string => {
    const safeValue = getSanitizedIntervalMs('job_alerts', value);
    const totalMinutes = Math.floor(safeValue / 60_000);
    if (totalMinutes % 60 === 0) {
      const hours = totalMinutes / 60;
      return hours === 1 ? 'Every hour' : `Every ${hours} hours`;
    }
    return `Every ${totalMinutes} minutes`;
  };

  const updateServiceState = (
    serviceKey: BackgroundServiceKey,
    updater: (service: BackgroundServiceSetting) => BackgroundServiceSetting
  ) => {
    setBackgroundServices((prev) =>
      prev.map((item) =>
        item.serviceKey === serviceKey ? updater(item) : item
      )
    );
  };

  const onSaveBackgroundService = async (service: BackgroundServiceSetting) => {
    try {
      setSavingServiceKey(service.serviceKey);
      const sanitizedIntervalMs = getSanitizedIntervalMs(
        service.serviceKey,
        service.intervalMs
      );
      const updated = await updateBackgroundServiceSetting(service.serviceKey, {
        enabled: service.enabled,
        intervalMs: sanitizedIntervalMs,
      });
      updateServiceState(service.serviceKey, () => updated);
      toast.success('Background service updated');
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error, 'Failed to update background service')
      );
    } finally {
      setSavingServiceKey(null);
    }
  };

  const onRunBackgroundService = async (serviceKey: BackgroundServiceKey) => {
    try {
      setRunningServiceKey(serviceKey);
      const currentPage = backgroundServiceLogs[serviceKey]?.page ?? 1;
      const [updated, logs] = await Promise.all([
        runBackgroundServiceNow(serviceKey),
        getBackgroundServiceLogs(serviceKey, currentPage, LOGS_PAGE_LIMIT),
      ]);
      updateServiceState(serviceKey, () => updated);
      setBackgroundServiceLogs((prev) => ({ ...prev, [serviceKey]: logs }));
      toast.success('Background service run triggered');
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error, 'Failed to trigger background service')
      );
    } finally {
      setRunningServiceKey(null);
    }
  };

  const getServiceLabel = (serviceKey: BackgroundServiceKey): string => {
    return BACKGROUND_SERVICE_GUIDANCE[serviceKey].label;
  };

  const formatDateTime = (value: string | null): string =>
    value ? new Date(value).toLocaleString() : 'Never';

  const formatLogDateTime = (value: string): string =>
    new Date(value).toLocaleString();

  const getServiceLogs = (
    serviceKey: BackgroundServiceKey
  ): BackgroundServiceRunLogPage => backgroundServiceLogs[serviceKey];

  const activeBackgroundService =
    backgroundServices.find(
      (service) => service.serviceKey === activeBackgroundServiceKey
    ) ??
    backgroundServices[0] ??
    null;

  const onChangeLogPage = async (
    serviceKey: BackgroundServiceKey,
    page: number
  ) => {
    try {
      const nextPage = await getBackgroundServiceLogs(
        serviceKey,
        page,
        LOGS_PAGE_LIMIT
      );
      setBackgroundServiceLogs((prev) => ({ ...prev, [serviceKey]: nextPage }));
    } catch {
      toast.error('Failed to load background service logs');
    }
  };

  const onSelectLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2MB or smaller');
      event.target.value = '';
      return;
    }

    try {
      setUploadingLogo(true);
      const logoDataUrl = await fileToDataUrl(file);
      const updated = await uploadCompanyLogo(logoDataUrl);
      setSettings(updated);
      toast.success('Logo updated');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to upload logo'));
    } finally {
      event.target.value = '';
      setUploadingLogo(false);
    }
  };

  const onRemoveLogo = async () => {
    try {
      setUploadingLogo(true);
      const updated = await removeCompanyLogo();
      setSettings(updated);
      toast.success('Logo removed');
    } catch {
      toast.error('Failed to remove logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const downloadJson = (data: Record<string, unknown>) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hygieia-system-config-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const onExportSystemConfig = async () => {
    try {
      setExportingConfig(true);
      const data = await exportSystemConfiguration();
      downloadJson(data);
      toast.success('System configuration exported');
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error, 'Failed to export system configuration')
      );
    } finally {
      setExportingConfig(false);
    }
  };

  const readJsonFile = async (file: File): Promise<Record<string, unknown>> => {
    const text =
      typeof file.text === 'function'
        ? await file.text()
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ''));
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
          });
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid JSON file');
    }
    return parsed as Record<string, unknown>;
  };

  const onSelectSystemConfigImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
    dryRun: boolean
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportingConfig(true);
      const data = await readJsonFile(file);
      const result = await importSystemConfiguration(data, dryRun);
      setImportDryRunResult(result.imported);
      toast.success(
        dryRun ? 'Import preview complete' : 'System configuration imported'
      );
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error, 'Failed to import system configuration')
      );
    } finally {
      event.target.value = '';
      setImportingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Global Branding Settings
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Configure company identity used across proposals and outbound emails.
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Company Information
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Company Name"
            value={settings.companyName}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, companyName: e.target.value }))
            }
            required
          />
          <Input
            label="Company Email"
            type="email"
            value={settings.companyEmail || ''}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, companyEmail: e.target.value }))
            }
          />
          <Input
            label="Company Phone"
            value={settings.companyPhone || ''}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, companyPhone: e.target.value }))
            }
          />
          <Input
            label="Website"
            value={settings.companyWebsite || ''}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                companyWebsite: e.target.value,
              }))
            }
          />
          <Input
            label="Company Timezone (IANA)"
            value={settings.companyTimezone || 'UTC'}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                companyTimezone: e.target.value,
              }))
            }
            placeholder="America/New_York"
          />
          <Input
            label="Default Tax Rate (%)"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={Number(settings.taxRate || 0) * 100}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                taxRate:
                  Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100,
              }))
            }
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Address"
            rows={3}
            value={settings.companyAddress || ''}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                companyAddress: e.target.value,
              }))
            }
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-gold" />
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Theme Colors
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input
            label="Primary"
            type="color"
            value={settings.themePrimaryColor}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                themePrimaryColor: e.target.value,
              }))
            }
          />
          <Input
            label="Accent"
            type="color"
            value={settings.themeAccentColor}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                themeAccentColor: e.target.value,
              }))
            }
          />
          <Input
            label="Background"
            type="color"
            value={settings.themeBackgroundColor}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                themeBackgroundColor: e.target.value,
              }))
            }
          />
          <Input
            label="Text"
            type="color"
            value={settings.themeTextColor}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                themeTextColor: e.target.value,
              }))
            }
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Company Logo
          </h2>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onSelectLogo}
              disabled={uploadingLogo}
            />
            <span className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <Upload className="h-4 w-4" />
              {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
            </span>
          </label>
        </div>

        <div className="rounded-lg border border-surface-700 p-4">
          {settings.logoDataUrl ? (
            <div className="space-y-3">
              <img
                src={settings.logoDataUrl}
                alt="Company logo"
                className="max-h-24 w-auto"
              />
              <Button
                variant="ghost"
                onClick={onRemoveLogo}
                disabled={uploadingLogo}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Logo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400">
              No logo uploaded yet.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">
          Preview
        </h2>
        <div
          className="rounded-lg border p-5"
          style={{
            backgroundColor: settings.themeBackgroundColor,
            borderColor: `${settings.themePrimaryColor}33`,
            color: settings.themeTextColor,
          }}
        >
          <div
            className="mb-4 rounded-md p-4"
            style={{
              backgroundColor: settings.themePrimaryColor,
              color: settings.themeAccentColor,
            }}
          >
            {settings.logoDataUrl && (
              <img
                src={settings.logoDataUrl}
                alt="Preview logo"
                className="mb-2 max-h-10 w-auto"
              />
            )}
            <div className="text-xl font-bold">
              {settings.companyName || 'Company Name'}
            </div>
          </div>
          <p className="text-sm">
            This style preview will be used by proposal PDFs, public proposal
            pages, and email templates.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Background Services
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Configure automation without scrolling through every service. Select
            a service to edit its schedule, trigger a run, and review recent
            logs.
          </p>
        </div>
        {activeBackgroundService ? (
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div
              className="flex gap-2 overflow-x-auto rounded-xl border border-surface-200 bg-surface-100 p-2 dark:border-surface-700 dark:bg-surface-900/40 lg:block lg:space-y-2 lg:overflow-visible"
              role="tablist"
              aria-label="Background services"
            >
              {backgroundServices.map((service) => {
                const active =
                  activeBackgroundService.serviceKey === service.serviceKey;
                return (
                  <button
                    key={service.serviceKey}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() =>
                      setActiveBackgroundServiceKey(service.serviceKey)
                    }
                    className={`min-w-[220px] rounded-lg border px-3 py-3 text-left transition-colors lg:min-w-0 lg:w-full ${
                      active
                        ? 'border-primary-500 bg-primary-900/20 text-primary-300'
                        : 'border-transparent text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {getServiceLabel(service.serviceKey)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          service.enabled
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-surface-500/15 text-surface-500'
                        }`}
                      >
                        {service.enabled ? 'On' : 'Off'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-surface-500">
                      {isIntervalScheduledService(service.serviceKey)
                        ? formatIntervalLabel(service.intervalMs)
                        : msToTime(service.serviceKey, service.intervalMs)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              className="rounded-xl border border-surface-200 p-4 dark:border-surface-700"
              role="tabpanel"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">
                    {getServiceLabel(activeBackgroundService.serviceKey)}
                  </h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {
                      BACKGROUND_SERVICE_GUIDANCE[
                        activeBackgroundService.serviceKey
                      ].description
                    }
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                  <input
                    type="checkbox"
                    checked={activeBackgroundService.enabled}
                    onChange={(e) =>
                      updateServiceState(
                        activeBackgroundService.serviceKey,
                        (current) => ({
                          ...current,
                          enabled: e.target.checked,
                        })
                      )
                    }
                    className="h-4 w-4"
                  />
                  Enabled
                </label>
              </div>
              <p className="mb-3 text-xs text-primary-300">
                Recommended{' '}
                {isIntervalScheduledService(activeBackgroundService.serviceKey)
                  ? 'frequency'
                  : 'run time'}
                :{' '}
                {
                  BACKGROUND_SERVICE_GUIDANCE[
                    activeBackgroundService.serviceKey
                  ].recommendedValueLabel
                }
                {!isIntervalScheduledService(activeBackgroundService.serviceKey)
                  ? ` (${settings.companyTimezone || 'UTC'})`
                  : ''}
                .
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {isIntervalScheduledService(
                  activeBackgroundService.serviceKey
                ) ? (
                  <Select
                    label="Run Frequency"
                    options={JOB_ALERT_INTERVAL_OPTIONS}
                    value={String(
                      getSanitizedIntervalMs(
                        activeBackgroundService.serviceKey,
                        activeBackgroundService.intervalMs
                      )
                    )}
                    onChange={(value) =>
                      updateServiceState(
                        activeBackgroundService.serviceKey,
                        (current) => ({
                          ...current,
                          intervalMs: Number(value),
                        })
                      )
                    }
                  />
                ) : (
                  <Input
                    label={`Run Time (${settings.companyTimezone || 'UTC'})`}
                    type="time"
                    value={msToTime(
                      activeBackgroundService.serviceKey,
                      activeBackgroundService.intervalMs
                    )}
                    onChange={(e) =>
                      updateServiceState(
                        activeBackgroundService.serviceKey,
                        (current) => ({
                          ...current,
                          intervalMs: timeToMs(e.target.value),
                        })
                      )
                    }
                  />
                )}
                <Input
                  label="Last Run"
                  value={formatDateTime(activeBackgroundService.lastRunAt)}
                  readOnly
                />
                <Input
                  label="Last Success"
                  value={formatDateTime(activeBackgroundService.lastSuccessAt)}
                  readOnly
                />
                <Input
                  label="Last Error"
                  value={activeBackgroundService.lastError || 'None'}
                  readOnly
                />
              </div>
              <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                {isIntervalScheduledService(activeBackgroundService.serviceKey)
                  ? `Current frequency: ${formatIntervalLabel(activeBackgroundService.intervalMs)}.`
                  : `Current run time: ${msToTime(activeBackgroundService.serviceKey, activeBackgroundService.intervalMs)} (${settings.companyTimezone || 'UTC'}).`}
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onRunBackgroundService(activeBackgroundService.serviceKey)
                  }
                  isLoading={
                    runningServiceKey === activeBackgroundService.serviceKey
                  }
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Now
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    onSaveBackgroundService(activeBackgroundService)
                  }
                  isLoading={
                    savingServiceKey === activeBackgroundService.serviceKey
                  }
                >
                  Save Service
                </Button>
              </div>
              <div className="mt-4 rounded-lg border border-surface-800 bg-surface-900/40 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                  Recent Runs
                </p>
                {getServiceLogs(activeBackgroundService.serviceKey).items
                  .length === 0 ? (
                  <p className="text-xs text-surface-500">No logs yet.</p>
                ) : (
                  <div className="grid gap-2 xl:grid-cols-2">
                    {getServiceLogs(
                      activeBackgroundService.serviceKey
                    ).items.map((log) => (
                      <div
                        key={log.id}
                        className="rounded border border-surface-700 p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={
                              log.status === 'success'
                                ? 'text-xs font-medium text-emerald-400'
                                : 'text-xs font-medium text-red-400'
                            }
                          >
                            {log.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                          <span className="text-xs text-surface-500">
                            {formatLogDateTime(log.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-surface-600 dark:text-surface-400">
                          {log.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {getServiceLogs(activeBackgroundService.serviceKey).totalPages >
                  1 && (
                  <div className="flex items-center justify-end gap-2 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={
                        getServiceLogs(activeBackgroundService.serviceKey)
                          .page <= 1
                      }
                      onClick={() =>
                        onChangeLogPage(
                          activeBackgroundService.serviceKey,
                          getServiceLogs(activeBackgroundService.serviceKey)
                            .page - 1
                        )
                      }
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-surface-500 dark:text-surface-400">
                      Page{' '}
                      {getServiceLogs(activeBackgroundService.serviceKey).page}{' '}
                      of{' '}
                      {
                        getServiceLogs(activeBackgroundService.serviceKey)
                          .totalPages
                      }
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={
                        getServiceLogs(activeBackgroundService.serviceKey)
                          .page >=
                        getServiceLogs(activeBackgroundService.serviceKey)
                          .totalPages
                      }
                      onClick={() =>
                        onChangeLogPage(
                          activeBackgroundService.serviceKey,
                          getServiceLogs(activeBackgroundService.serviceKey)
                            .page + 1
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-surface-200 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
            No background services are configured.
          </p>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl bg-primary-500/10 p-2 text-primary-400">
            <FileJson className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              System Configuration Import / Export
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Move baseline setup between environments: global settings,
              pricing, specialized catalog, fixture types, area types, task
              templates, and area templates. Operational records are not
              included.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
            <h3 className="font-semibold text-surface-900 dark:text-white">
              Export Current Setup
            </h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              Download a portable JSON file for backup, staging refreshes, or
              onboarding another company.
            </p>
            <Button
              className="mt-4"
              onClick={onExportSystemConfig}
              isLoading={exportingConfig}
            >
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>

          <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
            <h3 className="font-semibold text-surface-900 dark:text-white">
              Preview Import
            </h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              Run a dry-run first. It validates the file and shows how many
              setup records would be merged.
            </p>
            <label className="mt-4 inline-flex cursor-pointer">
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={importingConfig}
                onChange={(event) => onSelectSystemConfigImport(event, true)}
              />
              <span className="inline-flex items-center rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800">
                Preview JSON Import
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              Apply Import
            </h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              This merges setup records by stable names and codes. Use only
              after reviewing the preview.
            </p>
            <label className="mt-4 inline-flex cursor-pointer">
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={importingConfig}
                onChange={(event) => onSelectSystemConfigImport(event, false)}
              />
              <span className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
                Import JSON
              </span>
            </label>
          </div>
        </div>

        {importDryRunResult && (
          <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
            <p className="mb-3 text-sm font-semibold text-surface-900 dark:text-white">
              Last Import Summary
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
              {Object.entries(importDryRunResult).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                >
                  <p className="text-xs capitalize text-surface-500 dark:text-surface-400">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </p>
                  <p className="text-lg font-semibold text-surface-900 dark:text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} isLoading={saving}>
          <Save className="mr-2 h-4 w-4" />
          Save Global Settings
        </Button>
      </div>
    </div>
  );
};

export default GlobalSettingsPage;
