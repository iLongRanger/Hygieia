import { z } from 'zod';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const DATA_URL_IMAGE_REGEX =
  /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/;

export const updateGlobalSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(255).optional(),
  companyEmail: z.string().email('Invalid company email').max(255).nullable().optional(),
  companyPhone: z.string().max(20).nullable().optional(),
  companyWebsite: z.string().url('Invalid website URL').max(500).nullable().optional(),
  companyAddress: z.string().max(2000).nullable().optional(),
  logoDataUrl: z.string().max(2_800_000).regex(DATA_URL_IMAGE_REGEX, 'Invalid logo image format').nullable().optional(),
  themePrimaryColor: z.string().regex(HEX_COLOR_REGEX, 'Primary color must be a hex value').optional(),
  themeAccentColor: z.string().regex(HEX_COLOR_REGEX, 'Accent color must be a hex value').optional(),
  themeBackgroundColor: z.string().regex(HEX_COLOR_REGEX, 'Background color must be a hex value').optional(),
  themeTextColor: z.string().regex(HEX_COLOR_REGEX, 'Text color must be a hex value').optional(),
});

export const updateLogoSchema = z.object({
  logoDataUrl: z
    .string()
    .max(2_800_000, 'Logo exceeds size limit')
    .regex(DATA_URL_IMAGE_REGEX, 'Invalid logo image format'),
});

export type UpdateGlobalSettingsInput = z.infer<typeof updateGlobalSettingsSchema>;
export type UpdateLogoInput = z.infer<typeof updateLogoSchema>;

