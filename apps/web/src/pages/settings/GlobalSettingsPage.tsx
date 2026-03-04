import React, { useEffect, useState } from 'react';
import { Save, Upload, Trash2, Palette, Building2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
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
  BackgroundServiceRunLog,
  BackgroundServiceRunLogsByService,
  BackgroundServiceSetting,
} from '../../types/backgroundServiceSettings';

const DEFAULT_SETTINGS: GlobalSettings = {
  companyName: '',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
  companyAddress: '',
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
    recommendedMinutes: number;
    minMinutes: number;
    maxMinutes: number;
  }
> = {
  reminders: {
    label: 'Client Reminders',
    description:
      'Sends appointment and follow-up reminders. Use a shorter interval for faster reminder delivery.',
    recommendedMinutes: 15,
    minMinutes: 5,
    maxMinutes: 240,
  },
  recurring_jobs_autogen: {
    label: 'Recurring Job Creation',
    description:
      'Creates upcoming recurring jobs from active contracts. This can run less often because schedules do not change every minute.',
    recommendedMinutes: 360,
    minMinutes: 60,
    maxMinutes: 10080,
  },
  job_alerts: {
    label: 'Job Alert Checks',
    description:
      'Checks for jobs nearing end time with no check-in and alerts your team. Keep this fairly frequent.',
    recommendedMinutes: 15,
    minMinutes: 5,
    maxMinutes: 240,
  },
};

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
  const [backgroundServiceLogs, setBackgroundServiceLogs] = useState<BackgroundServiceRunLogsByService>({
    reminders: [],
    recurring_jobs_autogen: [],
    job_alerts: [],
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
        const [data, serviceData, logs] = await Promise.all([
          getGlobalSettings(),
          getBackgroundServiceSettings(),
          getBackgroundServiceLogs(10),
        ]);
        setSettings(data);
        setBackgroundServices(serviceData);
        setBackgroundServiceLogs(logs);
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
        themePrimaryColor: settings.themePrimaryColor,
        themeAccentColor: settings.themeAccentColor,
        themeBackgroundColor: settings.themeBackgroundColor,
        themeTextColor: settings.themeTextColor,
      });
      setSettings(updated);
      toast.success('Global settings updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const getSanitizedIntervalMs = (
    serviceKey: BackgroundServiceKey,
    intervalMs: number
  ): number => {
    const guide = BACKGROUND_SERVICE_GUIDANCE[serviceKey];
    const rawMinutes = Number.isFinite(intervalMs) ? intervalMs / 60000 : guide.recommendedMinutes;
    const clampedMinutes = Math.min(guide.maxMinutes, Math.max(guide.minMinutes, Math.round(rawMinutes)));
    return clampedMinutes * 60_000;
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
      const sanitizedIntervalMs = getSanitizedIntervalMs(service.serviceKey, service.intervalMs);
      const updated = await updateBackgroundServiceSetting(service.serviceKey, {
        enabled: service.enabled,
        intervalMs: sanitizedIntervalMs,
      });
      updateServiceState(service.serviceKey, () => updated);
      toast.success('Background service updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to update background service');
    } finally {
      setSavingServiceKey(null);
    }
  };

  const onRunBackgroundService = async (serviceKey: BackgroundServiceKey) => {
    try {
      setRunningServiceKey(serviceKey);
      const [updated, logs] = await Promise.all([
        runBackgroundServiceNow(serviceKey),
        getBackgroundServiceLogs(10),
      ]);
      updateServiceState(serviceKey, () => updated);
      setBackgroundServiceLogs(logs);
      toast.success('Background service run triggered');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to trigger background service');
    } finally {
      setRunningServiceKey(null);
    }
  };

  const getServiceLabel = (serviceKey: BackgroundServiceKey): string => {
    return BACKGROUND_SERVICE_GUIDANCE[serviceKey].label;
  };

  const formatDateTime = (value: string | null): string =>
    value ? new Date(value).toLocaleString() : 'Never';

  const formatMinutesReadable = (minutes: number): string => {
    if (minutes < 1440) return `${minutes} minutes`;

    const days = Math.floor(minutes / 1440);
    const remainingMinutes = minutes % 1440;
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;

    const dayPart = `${days} day${days === 1 ? '' : 's'}`;
    if (hours === 0 && mins === 0) return dayPart;
    if (mins === 0) return `${dayPart} ${hours} hour${hours === 1 ? '' : 's'}`;
    if (hours === 0) return `${dayPart} ${mins} minute${mins === 1 ? '' : 's'}`;
    return `${dayPart} ${hours} hour${hours === 1 ? '' : 's'} ${mins} minute${mins === 1 ? '' : 's'}`;
  };

  const formatLogDateTime = (value: string): string => new Date(value).toLocaleString();

  const getServiceLogs = (serviceKey: BackgroundServiceKey): BackgroundServiceRunLog[] =>
    backgroundServiceLogs[serviceKey] || [];

  const getServiceIntervalMinutes = (service: BackgroundServiceSetting): number =>
    Math.max(1, Math.round(getSanitizedIntervalMs(service.serviceKey, service.intervalMs) / 60000));

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
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to upload logo');
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
        <h1 className="text-2xl font-bold text-white">Global Branding Settings</h1>
        <p className="text-gray-400">
          Configure company identity used across proposals and outbound emails.
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Company Information</h2>
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
          <h2 className="text-lg font-semibold text-white">Theme Colors</h2>
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
          <h2 className="text-lg font-semibold text-white">Company Logo</h2>
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
            <p className="text-sm text-gray-400">No logo uploaded yet.</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Preview</h2>
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
        <h2 className="mb-4 text-lg font-semibold text-white">Background Services</h2>
        <p className="mb-4 text-sm text-gray-400">
          Configure automatic system jobs using minutes (not technical milliseconds). Use the
          recommended values unless you need faster or slower updates.
        </p>
        <div className="space-y-4">
          {backgroundServices.map((service) => (
            <div key={service.serviceKey} className="rounded-lg border border-surface-700 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{getServiceLabel(service.serviceKey)}</h3>
                  <p className="text-xs text-gray-400">
                    {BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].description}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-300">
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
                Recommended: every{' '}
                {formatMinutesReadable(BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].recommendedMinutes)}.
                Allowed range: {formatMinutesReadable(BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].minMinutes)}-
                {formatMinutesReadable(BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].maxMinutes)}.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Input
                  label="Run Every (minutes)"
                  type="number"
                  min={BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].minMinutes}
                  max={BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].maxMinutes}
                  value={String(getServiceIntervalMinutes(service))}
                  onChange={(e) =>
                    updateServiceState(service.serviceKey, (current) => ({
                      ...current,
                      intervalMs: getSanitizedIntervalMs(
                        service.serviceKey,
                        Number(e.target.value || BACKGROUND_SERVICE_GUIDANCE[service.serviceKey].recommendedMinutes) *
                          60_000
                      ),
                    }))
                  }
                />
                <Input label="Last Run" value={formatDateTime(service.lastRunAt)} readOnly />
                <Input label="Last Success" value={formatDateTime(service.lastSuccessAt)} readOnly />
                <Input label="Last Error" value={service.lastError || 'None'} readOnly />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Current interval: {formatMinutesReadable(getServiceIntervalMinutes(service))}.
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Recent Runs
                </p>
                {getServiceLogs(service.serviceKey).length === 0 ? (
                  <p className="text-xs text-gray-500">No logs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getServiceLogs(service.serviceKey).map((log) => (
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
                          <span className="text-xs text-gray-500">{formatLogDateTime(log.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-300">{log.summary}</p>
                      </div>
                    ))}
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

