import { ValidationError } from '../middleware/errorHandler';

function normalizeBaseUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

function getPrimaryCorsOrigin(): string | null {
  const configured = process.env.CORS_ORIGIN?.split(',')[0];
  return normalizeBaseUrl(configured);
}

export function getFrontendBaseUrl(): string | null {
  return normalizeBaseUrl(process.env.FRONTEND_URL || process.env.WEB_APP_URL) || getPrimaryCorsOrigin();
}

export function getWebAppBaseUrl(): string | null {
  return normalizeBaseUrl(process.env.WEB_APP_URL || process.env.FRONTEND_URL) || getPrimaryCorsOrigin();
}

export function requireFrontendBaseUrl(): string {
  const baseUrl = getFrontendBaseUrl();
  if (!baseUrl) {
    throw new ValidationError(
      'FRONTEND_URL, WEB_APP_URL, or CORS_ORIGIN must be configured before sending public proposal, quotation, or contract links'
    );
  }

  return baseUrl;
}

export function requireWebAppBaseUrl(): string {
  const baseUrl = getWebAppBaseUrl();
  if (!baseUrl) {
    throw new ValidationError(
      'WEB_APP_URL, FRONTEND_URL, or CORS_ORIGIN must be configured before sending web app links'
    );
  }

  return baseUrl;
}
