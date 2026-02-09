export interface GlobalBranding {
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  companyAddress: string | null;
  logoDataUrl: string | null;
  themePrimaryColor: string;
  themeAccentColor: string;
  themeBackgroundColor: string;
  themeTextColor: string;
}

export type GlobalSettings = GlobalBranding;

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

