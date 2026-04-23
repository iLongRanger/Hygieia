export interface GlobalBranding {
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  companyAddress: string | null;
  companyTimezone: string;
  logoDataUrl: string | null;
  themePrimaryColor: string;
  themeAccentColor: string;
  themeBackgroundColor: string;
  themeTextColor: string;
}

export type GlobalSettings = GlobalBranding;

// Branding payload shape returned by public endpoints (fields may be missing).
export interface PublicBranding {
  companyName?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyWebsite?: string | null;
  companyAddress?: string | null;
  companyTimezone?: string | null;
  logoDataUrl?: string | null;
  themePrimaryColor?: string | null;
  themeAccentColor?: string | null;
  themeBackgroundColor?: string | null;
  themeTextColor?: string | null;
}

export interface UpdateGlobalSettingsInput {
  companyName?: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyWebsite?: string | null;
  companyAddress?: string | null;
  companyTimezone?: string;
  logoDataUrl?: string | null;
  themePrimaryColor?: string;
  themeAccentColor?: string;
  themeBackgroundColor?: string;
  themeTextColor?: string;
}

