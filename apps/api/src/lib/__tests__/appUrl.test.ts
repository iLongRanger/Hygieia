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

describe('appUrl', () => {
  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
    process.env.WEB_APP_URL = originalWebAppUrl;
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

  it('throws when public frontend URL is missing', () => {
    delete process.env.FRONTEND_URL;

    expect(() => requireFrontendBaseUrl()).toThrow(ValidationError);
  });

  it('throws when web app URL is missing', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.WEB_APP_URL;

    expect(() => requireWebAppBaseUrl()).toThrow(ValidationError);
  });
});
