import React, { useEffect, useState } from 'react';
import { Save, Upload, Trash2, Palette, Building2 } from 'lucide-react';
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
} from '../../lib/globalSettings';
import type { GlobalSettings } from '../../types/globalSettings';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getGlobalSettings();
        setSettings(data);
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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

