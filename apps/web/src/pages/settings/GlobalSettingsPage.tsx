import React, { useEffect, useState } from 'react';
import { Save, Upload, Trash2, Palette, Building2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
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
} from '../../lib/globalSettings';
import type { GlobalSettings } from '../../types/globalSettings';
import type {
  BackgroundServiceKey,
  BackgroundServiceRunLogPage,
  BackgroundServiceSetting,
} from '../../types/backgroundServiceSettings';

const DEFAULT_SETTINGS: GlobalSettings = {
  companyName: '',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
  companyAddress: '',
  companyTimezone: 'UTC',
  logoDataUrl: null,
  themePrimaryColor: '#1a1a2e',
  themeAccentColor: '#d4af37',
  themeBackgroundColor: '#f5f5f5',
  themeTextColor: '#333333',
};

const BACKGROUND_SERVICE_GUIDANCE: Record<
  BackgroundServiceKey,
  {
    label: string;
    description: string;
    recommendedTime: string;
  }
> = {
  reminders: {
    label: 'Client Reminders',
    description:
      'Sends appointment and follow-up reminders at one scheduled time each day.',
    recommendedTime: '08:00',
  },
  recurring_jobs_autogen: {
    label: 'Recurring Job Creation',
    description:
      'Creates upcoming recurring jobs from active contracts once per day.',
    recommendedTime: '01:00',
  },
  job_alerts: {
    label: 'Job Alert Checks',
    description:
      'Checks for jobs that need attention at one scheduled time each day.',
    recommendedTime: '07:00',
  },
  contract_assignment_overrides: {
    label: 'Contract Assignment Overrides',
    description:
      'Applies scheduled contract assignee overrides on their effectivity date once daily.',
    recommendedTime: '00:00',
  },
  contract_amendment_auto_apply: {
    label: 'Contract Amendment Auto-Apply',
    description:
      'Applies approved contract amendments automatically on their effective date once daily.',
    recommendedTime: '02:00',
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
  const [backgroundServices, setBackgroundServices] = useState<BackgroundServiceSetting[]>([]);
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
  const [savingServiceKey, setSavingServiceKey] = useState<BackgroundServiceKey | null>(null);
  const [runningServiceKey, setRunningServiceKey] = useState<BackgroundServiceKey | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const [data, serviceData] = await Promise.all([
          getGlobalSettings(),
          getBackgroundServiceSettings(),
        ]);
        const logsEntries = await Promise.all(
          BACKGROUND_SERVICE_KEYS.map(async (serviceKey) => [
            serviceKey,
            await getBackgroundServiceLogs(serviceKey, 1, LOGS_PAGE_LIMIT),
          ] as const)
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

  const getSanitizedTimeOfDayMs = (serviceKey: BackgroundServiceKey, value: number): number => {
    if (Number.isFinite(value) && value >= 0 && value <= 86_340_000) {
      return Math.floor(value);
    }
    const [hours, minutes] = BACKGROUND_SERVICE_GUIDANCE[serviceKey].recommendedTime
      .split(':')
      .map((part) => Number(part));
    return (hours * 60 + minutes) * 60_000;
  };

  const timeToMs = (value: string): number => {
    const [hours, minutes] = value.split(':').map((part) => Number(part));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    return Math.min(86_340_000, Math.max(0, (hours * 60 + minutes) * 60_000));
  };

  const msToTime = (serviceKey: BackgroundServiceKey, value: number): string => {
    const safeValue = getSanitizedTimeOfDayMs(serviceKey, value);
    const totalMinutes = Math.floor(safeValue / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const updateServiceState = (
    serviceKey: BackgroundServiceKey,
    updater: (service: BackgroundServiceSetting) => BackgroundServiceSetting
  ) => {
    setBackgroundServices((prev) =>
      prev.map((item) => (item.serviceKey === serviceKey ? updater(item) : item))
    );
  };

  const onSaveBackgroundService = async (service: BackgroundServiceSetting) => {
    try {
      setSavingServiceKey(service.serviceKey);
      const sanitizedIntervalMs = getSanitizedTimeOfDayMs(service.serviceKey, service.intervalMs);
      const updated = await updateBackgroundServiceSetting(service.serviceKey, {
        enabled: service.enabled,
        intervalMs: sanitizedIntervalMs,
      });
      updateServiceState(service.serviceKey, () => updated);
      toast.success('Background service updated');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to update background service'));
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
      toast.error(extractApiErrorMessage(error, 'Failed to trigger background service'));
    } finally {
      setRunningServiceKey(null);
    }
  };

  const getServiceLabel = (serviceKey: BackgroundServiceKey): string => {
    return BACKGROUND_SERVICE_GUIDANCE[serviceKey].label;
  };

  const formatDateTime = (value: string | null): string =>
    value ? new Date(value).toLocaleString() : 'Never';

  const formatLogDateTime = (value: string): string => new Date(value).toLocaleString();

  const getServiceLogs = (serviceKey: BackgroundServiceKey): BackgroundServiceRunLogPage =>
    backgroundServiceLogs[serviceKey];

  const onChangeLogPage = async (serviceKey: BackgroundServiceKey, page: number) => {
    try {
      const nextPage = await getBackgroundServiceLogs(serviceKey, page, LOGS_PAGE_LIMIT);
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
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Global Branding Settings</h1>
        <p className="text-surface-500 dark:text-surface-400">
          Configure company identity used across proposals and outbound emails.
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Company Information</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Company Name"
            value={settings.companyName}
            onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
            required
          />
          <Input
            label="Company Email"
            type="email"
            value={settings.companyEmail || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, companyEmail: e.target.value }))}
          />
          <Input
            label="Company Phone"
            value={settings.companyPhone || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, companyPhone: e.target.value }))}
          />
          <Input
            label="Website"
            value={settings.companyWebsite || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, companyWebsite: e.target.value }))}
          />
          <Input
            label="Company Timezone (IANA)"
            value={settings.companyTimezone || 'UTC'}
            onChange={(e) => setSettings((prev) => ({ ...prev, companyTimezone: e.target.value }))}
            placeholder="America/New_York"
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Address"
            rows={3}
            value={settings.companyAddress || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, companyAddress: e.target.value }))}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-gold" />
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Theme Colors</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input
            label="Primary"
            type="color"
            value={settings.themePrimaryColor}
            onChange={(e) => setSettings((prev) => ({ ...prev, themePrimaryColor: e.target.value }))}
          />
          <Input
            label="Accent"
            type="color"
            value={settings.themeAccentColor}
            onChange={(e) => setSettings((prev) => ({ ...prev, themeAccentColor: e.target.value }))}
          />
          <Input
            label="Background"
            type="color"
            value={settings.themeBackgroundColor}
            onChange={(e) => setSettings((prev) => ({ ...prev, themeBackgroundColor: e.target.value }))}
          />
          <Input
            label="Text"
            type="color"
            value={settings.themeTextColor}
            onChange={(e) => setSettings((prev) => ({ ...prev, themeTextColor: e.target.value }))}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Company Logo</h2>
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
              <img src={settings.logoDataUrl} alt="Company logo" className="max-h-24 w-auto" />
              <Button variant="ghost" onClick={onRemoveLogo} disabled={uploadingLogo}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Logo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400">No logo uploaded yet.</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Preview</h2>
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
            style={{ backgroundColor: settings.themePrimaryColor, color: settings.themeAccentColor }}
          >
            {settings.logoDataUrl && (
              <img src={settings.logoDataUrl} alt="Preview logo" className="mb-2 max-h-10 w-auto" />
            )}
            <div className="text-xl font-bold">{settings.companyName || 'Company Name'}</div>
          </div>
          <p className="text-sm">
            This style preview will be used by proposal PDFs, public proposal pages, and email templates.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Background Services</h2>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          Configure each automatic job to run once per day at a specific company-local time. This keeps
          scheduling predictable and easier to review.
        </p>
        <div className="space-y-4">
          {backgroundServices.map((service) => (
            <div key={service.serviceKey} className="rounded-lg border border-surface-700 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">{getServiceLabel(service.serviceKey)}</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].description}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                  <input
                    type="checkbox"
                    checked={service.enabled}
                    onChange={(e) =>
                      updateServiceState(service.serviceKey, (current) => ({
                        ...current,
                        enabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  Enabled
                </label>
              </div>
              <p className="mb-3 text-xs text-primary-300">
                Recommended run time: {BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].recommendedTime}{' '}
                ({settings.companyTimezone || 'UTC'}).
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Input
                  label={`Run Time (${settings.companyTimezone || 'UTC'})`}
                  type="time"
                  value={msToTime(service.serviceKey, service.intervalMs)}
                  onChange={(e) =>
                    updateServiceState(service.serviceKey, (current) => ({
                      ...current,
                      intervalMs: timeToMs(e.target.value),
                    }))
                  }
                />
                <Input label="Last Run" value={formatDateTime(service.lastRunAt)} readOnly />
                <Input label="Last Success" value={formatDateTime(service.lastSuccessAt)} readOnly />
                <Input label="Last Error" value={service.lastError || 'None'} readOnly />
              </div>
              <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                Current run time: {msToTime(service.serviceKey, service.intervalMs)} (
                {settings.companyTimezone || 'UTC'}).
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRunBackgroundService(service.serviceKey)}
                  isLoading={runningServiceKey === service.serviceKey}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Now
                </Button>
                <Button
                  type="button"
                  onClick={() => onSaveBackgroundService(service)}
                  isLoading={savingServiceKey === service.serviceKey}
                >
                  Save Service
                </Button>
              </div>
              <div className="mt-4 rounded-lg border border-surface-800 bg-surface-900/40 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                  Recent Runs
                </p>
                {getServiceLogs(service.serviceKey).items.length === 0 ? (
                  <p className="text-xs text-surface-500">No logs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getServiceLogs(service.serviceKey).items.map((log) => (
                      <div key={log.id} className="rounded border border-surface-700 p-2">
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
                          <span className="text-xs text-surface-500">{formatLogDateTime(log.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-surface-600 dark:text-surface-400">{log.summary}</p>
                      </div>
                    ))}
                    {getServiceLogs(service.serviceKey).totalPages > 1 && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={getServiceLogs(service.serviceKey).page <= 1}
                          onClick={() =>
                            onChangeLogPage(service.serviceKey, getServiceLogs(service.serviceKey).page - 1)
                          }
                        >
                          Previous
                        </Button>
                        <span className="text-xs text-surface-500 dark:text-surface-400">
                          Page {getServiceLogs(service.serviceKey).page} of{' '}
                          {getServiceLogs(service.serviceKey).totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={
                            getServiceLogs(service.serviceKey).page >=
                            getServiceLogs(service.serviceKey).totalPages
                          }
                          onClick={() =>
                            onChangeLogPage(service.serviceKey, getServiceLogs(service.serviceKey).page + 1)
                          }
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
