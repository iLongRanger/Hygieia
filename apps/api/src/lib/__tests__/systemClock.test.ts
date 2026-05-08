import { afterEach, describe, expect, it } from '@jest/globals';
import { getSystemNow, isSystemTimeOverrideActive } from '../systemClock';

const originalEnv = { ...process.env };

describe('systemClock', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses SYSTEM_TIME_OVERRIDE outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.SYSTEM_TIME_OVERRIDE = '2026-04-17T12:30:00.000Z';

    expect(isSystemTimeOverrideActive()).toBe(true);
    expect(getSystemNow().toISOString()).toBe('2026-04-17T12:30:00.000Z');
  });

  it('falls back to real time when the override is invalid', () => {
    process.env.NODE_ENV = 'development';
    process.env.SYSTEM_TIME_OVERRIDE = 'not-a-date';

    expect(isSystemTimeOverrideActive()).toBe(true);
    expect(Number.isNaN(getSystemNow().getTime())).toBe(false);
  });

  it('ignores overrides in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.SYSTEM_TIME_OVERRIDE = '2026-04-17T12:30:00.000Z';

    expect(isSystemTimeOverrideActive()).toBe(false);
    expect(getSystemNow().toISOString()).not.toBe('2026-04-17T12:30:00.000Z');
  });
});
