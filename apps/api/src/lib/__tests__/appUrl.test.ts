import { afterEach, describe, expect, it } from '@jest/globals';
import {
  getFrontendBaseUrl,
  getWebAppBaseUrl,
  requireFrontendBaseUrl,
  requireWebAppBaseUrl,
} from '../appUrl';
import { ValidationError } from '../../middleware/errorHandler';

const originalFrontendUrl = process.env.FRONTEND_URL;
const originalWebAppUrl = process.env.WEB_APP_URL;
const originalCorsOrigin = process.env.CORS_ORIGIN;

describe('appUrl', () => {
  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
    process.env.WEB_APP_URL = originalWebAppUrl;
    process.env.CORS_ORIGIN = originalCorsOrigin;
  });

  it('normalizes configured base URLs', () => {
    process.env.FRONTEND_URL = 'https://app.example.com/';
    process.env.WEB_APP_URL = 'https://portal.example.com///';

    expect(getFrontendBaseUrl()).toBe('https://app.example.com');
    expect(getWebAppBaseUrl()).toBe('https://portal.example.com');
  });

  it('falls back from WEB_APP_URL to FRONTEND_URL for web app links', () => {
    delete process.env.WEB_APP_URL;
    process.env.FRONTEND_URL = 'https://app.example.com/';

    expect(getWebAppBaseUrl()).toBe('https://app.example.com');
  });

  it('falls back to the primary CORS origin when frontend URLs are missing', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.WEB_APP_URL;
    process.env.CORS_ORIGIN = 'http://localhost:5173,http://192.168.1.29:5173';

    expect(getFrontendBaseUrl()).toBe('http://localhost:5173');
    expect(getWebAppBaseUrl()).toBe('http://localhost:5173');
  });

  it('throws when public frontend URL is missing', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.WEB_APP_URL;
    delete process.env.CORS_ORIGIN;

    expect(() => requireFrontendBaseUrl()).toThrow(ValidationError);
  });

  it('throws when web app URL is missing', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.WEB_APP_URL;
    delete process.env.CORS_ORIGIN;

    expect(() => requireWebAppBaseUrl()).toThrow(ValidationError);
  });
});
