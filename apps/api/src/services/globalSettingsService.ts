import { prisma } from '../lib/prisma';
import type { GlobalBranding } from '../types/branding';

const DEFAULT_BRANDING: GlobalBranding = {
  companyName: process.env.COMPANY_NAME || 'Hygieia Cleaning Services',
  companyEmail: process.env.COMPANY_EMAIL || null,
  companyPhone: process.env.COMPANY_PHONE || null,
  companyWebsite: process.env.COMPANY_WEBSITE || null,
  companyAddress: process.env.COMPANY_ADDRESS || null,
  logoDataUrl: process.env.COMPANY_LOGO_PATH || null,
  themePrimaryColor: '#1a1a2e',
  themeAccentColor: '#d4af37',
  themeBackgroundColor: '#f5f5f5',
  themeTextColor: '#333333',
};

export interface UpdateGlobalSettingsInput {
  companyName?: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyWebsite?: string | null;
  companyAddress?: string | null;
  logoDataUrl?: string | null;
  themePrimaryColor?: string;
  themeAccentColor?: string;
  themeBackgroundColor?: string;
  themeTextColor?: string;
}

function mergeWithDefaults(input: Partial<GlobalBranding> | null | undefined): GlobalBranding {
  return {
    companyName: input?.companyName || DEFAULT_BRANDING.companyName,
    companyEmail: input?.companyEmail ?? DEFAULT_BRANDING.companyEmail,
    companyPhone: input?.companyPhone ?? DEFAULT_BRANDING.companyPhone,
    companyWebsite: input?.companyWebsite ?? DEFAULT_BRANDING.companyWebsite,
    companyAddress: input?.companyAddress ?? DEFAULT_BRANDING.companyAddress,
    logoDataUrl: input?.logoDataUrl ?? DEFAULT_BRANDING.logoDataUrl,
    themePrimaryColor: input?.themePrimaryColor || DEFAULT_BRANDING.themePrimaryColor,
    themeAccentColor: input?.themeAccentColor || DEFAULT_BRANDING.themeAccentColor,
    themeBackgroundColor: input?.themeBackgroundColor || DEFAULT_BRANDING.themeBackgroundColor,
    themeTextColor: input?.themeTextColor || DEFAULT_BRANDING.themeTextColor,
  };
}

export async function getGlobalSettings(): Promise<GlobalBranding> {
  const settings = await prisma.globalSettings.findUnique({
    where: { id: 'global' },
  });

  return mergeWithDefaults(settings);
}

export async function updateGlobalSettings(input: UpdateGlobalSettingsInput): Promise<GlobalBranding> {
  const updated = await prisma.globalSettings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      companyName: input.companyName ?? DEFAULT_BRANDING.companyName,
      companyEmail: input.companyEmail ?? DEFAULT_BRANDING.companyEmail,
      companyPhone: input.companyPhone ?? DEFAULT_BRANDING.companyPhone,
      companyWebsite: input.companyWebsite ?? DEFAULT_BRANDING.companyWebsite,
      companyAddress: input.companyAddress ?? DEFAULT_BRANDING.companyAddress,
      logoDataUrl: input.logoDataUrl ?? DEFAULT_BRANDING.logoDataUrl,
      themePrimaryColor: input.themePrimaryColor ?? DEFAULT_BRANDING.themePrimaryColor,
      themeAccentColor: input.themeAccentColor ?? DEFAULT_BRANDING.themeAccentColor,
      themeBackgroundColor: input.themeBackgroundColor ?? DEFAULT_BRANDING.themeBackgroundColor,
      themeTextColor: input.themeTextColor ?? DEFAULT_BRANDING.themeTextColor,
    },
    update: {
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.companyEmail !== undefined ? { companyEmail: input.companyEmail } : {}),
      ...(input.companyPhone !== undefined ? { companyPhone: input.companyPhone } : {}),
      ...(input.companyWebsite !== undefined ? { companyWebsite: input.companyWebsite } : {}),
      ...(input.companyAddress !== undefined ? { companyAddress: input.companyAddress } : {}),
      ...(input.logoDataUrl !== undefined ? { logoDataUrl: input.logoDataUrl } : {}),
      ...(input.themePrimaryColor !== undefined ? { themePrimaryColor: input.themePrimaryColor } : {}),
      ...(input.themeAccentColor !== undefined ? { themeAccentColor: input.themeAccentColor } : {}),
      ...(input.themeBackgroundColor !== undefined ? { themeBackgroundColor: input.themeBackgroundColor } : {}),
      ...(input.themeTextColor !== undefined ? { themeTextColor: input.themeTextColor } : {}),
    },
  });

  return mergeWithDefaults(updated);
}

export async function clearGlobalLogo(): Promise<GlobalBranding> {
  return updateGlobalSettings({ logoDataUrl: null });
}

export function getDefaultBranding(): GlobalBranding {
  return DEFAULT_BRANDING;
}

